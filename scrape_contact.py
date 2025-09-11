#!/usr/bin/env python3
"""
CLI tool: Extract client name and contact info (emails, phones, WhatsApp, socials) from a single web page URL.

Usage:
  python scrape_contact.py --url https://example.com --region SA

Notes:
  - Does NOT crawl subpages; only analyzes the provided page.
  - Phone numbers are parsed using a default region (ISO-3166), configurable via --region.
  - Output is JSON to stdout.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from typing import Dict, List, Optional, Set
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
import phonenumbers


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)


EMAIL_REGEX = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


SOCIAL_DOMAINS = {
    "facebook": ["facebook.com", "fb.com"],
    "instagram": ["instagram.com"],
    "x": ["x.com", "twitter.com"],
    "linkedin": ["linkedin.com"],
    "tiktok": ["tiktok.com"],
    "snapchat": ["snapchat.com"],
    "youtube": ["youtube.com", "youtu.be"],
}


WHATSAPP_PATTERNS = [
    re.compile(r"https?://(api\.)?whatsapp\.com/send\?[^\s\"']*", re.IGNORECASE),
    re.compile(r"https?://wa\.me/[^\s\"']+", re.IGNORECASE),
]


@dataclass
class PageContacts:
    url: str
    name: Optional[str]
    emails: List[str]
    phones: List[str]
    whatsapp: List[str]
    socials: Dict[str, List[str]]


def unique_preserve_order(items: List[str]) -> List[str]:
    seen: Set[str] = set()
    result: List[str] = []
    for item in items:
        if not item:
            continue
        normalized = item.strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def fetch_html(url: str, timeout_seconds: int = 20) -> str:
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "ar,en;q=0.9"}
    with requests.Session() as session:
        session.headers.update(headers)
        response = session.get(url, timeout=timeout_seconds, allow_redirects=True)
        response.raise_for_status()
        return response.text


def parse_jsonld_for_name_and_contacts(soup: BeautifulSoup) -> Dict[str, object]:
    extracted: Dict[str, object] = {"name": None, "emails": [], "phones": [], "socials": {}, "whatsapp": []}
    scripts = soup.find_all("script", attrs={"type": "application/ld+json"})
    for script in scripts:
        text = script.string or script.get_text() or ""
        if not text.strip():
            continue
        try:
            data = json.loads(text)
        except Exception:
            # Some sites have invalid JSON-LD; skip gracefully
            continue

        def handle_entity(entity: object):
            nonlocal extracted
            if not isinstance(entity, dict):
                return
            entity_type = entity.get("@type")
            if isinstance(entity_type, list):
                entity_type = next((t for t in entity_type if isinstance(t, str)), None)

            # Candidate name fields
            candidate_name = entity.get("name") or entity.get("legalName") or entity.get("alternateName")
            if isinstance(candidate_name, str) and not extracted.get("name"):
                extracted["name"] = candidate_name.strip()

            # Emails
            email_value = entity.get("email")
            if isinstance(email_value, str):
                extracted["emails"].append(email_value.strip())
            elif isinstance(email_value, list):
                for e in email_value:
                    if isinstance(e, str):
                        extracted["emails"].append(e.strip())

            # Phones
            tel_value = entity.get("telephone") or entity.get("tel")
            if isinstance(tel_value, str):
                extracted["phones"].append(tel_value.strip())
            elif isinstance(tel_value, list):
                for t in tel_value:
                    if isinstance(t, str):
                        extracted["phones"].append(t.strip())

            # sameAs socials
            same_as = entity.get("sameAs")
            if isinstance(same_as, list):
                for link in same_as:
                    if isinstance(link, str):
                        add_social_link(extracted, link)

            # contactPoint array
            contact_points = entity.get("contactPoint")
            if isinstance(contact_points, list):
                for cp in contact_points:
                    if not isinstance(cp, dict):
                        continue
                    email_cp = cp.get("email")
                    if isinstance(email_cp, str):
                        extracted["emails"].append(email_cp.strip())
                    tel_cp = cp.get("telephone")
                    if isinstance(tel_cp, str):
                        extracted["phones"].append(tel_cp.strip())

        if isinstance(data, list):
            for item in data:
                handle_entity(item)
        elif isinstance(data, dict):
            handle_entity(data)

    # Deduplicate
    extracted["emails"] = unique_preserve_order(extracted["emails"])  # type: ignore[index]
    extracted["phones"] = unique_preserve_order(extracted["phones"])  # type: ignore[index]
    for key, links in list(extracted.get("socials", {}).items()):  # type: ignore[union-attr]
        extracted["socials"][key] = unique_preserve_order(links)  # type: ignore[index]
    extracted["whatsapp"] = unique_preserve_order(extracted.get("whatsapp", []))  # type: ignore[arg-type]
    return extracted


def add_social_link(container: Dict[str, object], url: str) -> None:
    url_lower = url.lower()
    for platform, domains in SOCIAL_DOMAINS.items():
        if any(domain in url_lower for domain in domains):
            socials = container.setdefault("socials", {})  # type: ignore[assignment]
            if isinstance(socials, dict):
                socials.setdefault(platform, [])  # type: ignore[assignment]
                if isinstance(socials[platform], list):
                    socials[platform].append(url)  # type: ignore[index]


def extract_emails_from_text(text: str) -> List[str]:
    return unique_preserve_order([m.group(0) for m in EMAIL_REGEX.finditer(text)])


def extract_phones_from_text(text: str, default_region: str) -> List[str]:
    results: List[str] = []
    try:
        for match in phonenumbers.PhoneNumberMatcher(text, default_region):
            number = match.number
            if phonenumbers.is_possible_number(number) and phonenumbers.is_valid_number(number):
                results.append(phonenumbers.format_number(number, phonenumbers.PhoneNumberFormat.E164))
    except Exception:
        # In case of parsing errors, just return what we have
        pass
    return unique_preserve_order(results)


def extract_whatsapp_links(soup: BeautifulSoup, base_url: str) -> List[str]:
    links: List[str] = []
    # From hrefs
    for a in soup.find_all("a", href=True):
        href = a.get("href") or ""
        abs_link = urljoin(base_url, href)
        for pattern in WHATSAPP_PATTERNS:
            if pattern.search(abs_link):
                links.append(abs_link)
                break
    # From raw text (rare but possible)
    full_text = soup.get_text("\n", strip=False)
    for pattern in WHATSAPP_PATTERNS:
        for m in pattern.finditer(full_text):
            links.append(m.group(0))
    return unique_preserve_order(links)


def extract_social_links(soup: BeautifulSoup, base_url: str) -> Dict[str, List[str]]:
    result: Dict[str, List[str]] = {}
    for a in soup.find_all("a", href=True):
        href = a.get("href") or ""
        abs_link = urljoin(base_url, href)
        add_social_link(result, abs_link)
    # Deduplicate per platform
    for k, v in list(result.items()):
        result[k] = unique_preserve_order(v)
    return result


def guess_name(soup: BeautifulSoup) -> Optional[str]:
    # 1) JSON-LD will be handled separately; here we fall back to meta/title/h1
    # og:site_name or og:title
    og_site_name = soup.find("meta", attrs={"property": "og:site_name"})
    if og_site_name and og_site_name.get("content"):
        return og_site_name.get("content").strip()
    og_title = soup.find("meta", attrs={"property": "og:title"})
    if og_title and og_title.get("content"):
        return og_title.get("content").strip()
    # <title>
    if soup.title and soup.title.string:
        title_text = soup.title.string.strip()
        if title_text:
            return title_text
    # <h1>
    h1 = soup.find("h1")
    if h1 and h1.get_text():
        text = h1.get_text(" ", strip=True)
        if text:
            return text
    return None


def analyze_page(url: str, default_region: str) -> PageContacts:
    try:
        html = fetch_html(url)
    except Exception as exc:
        # Return minimal structure with error information to stderr
        print(f"Error fetching URL '{url}': {exc}", file=sys.stderr)
        return PageContacts(url=url, name=None, emails=[], phones=[], whatsapp=[], socials={})

    soup = BeautifulSoup(html, "lxml")

    # LinkedIn pages are highly dynamic and require login; advise using the dedicated CLI
    if "linkedin.com" in url.lower():
        name = "LinkedIn"
        return PageContacts(
            url=url,
            name=name,
            emails=[],
            phones=[],
            whatsapp=[],
            socials={"socials": ["linkedin"]},
        )

    # JSON-LD first
    jsonld = parse_jsonld_for_name_and_contacts(soup)

    # Fallback name
    name = jsonld.get("name") if isinstance(jsonld.get("name"), str) else None
    if not name:
        name = guess_name(soup)

    # Emails from full text
    full_text = soup.get_text("\n", strip=False)
    emails = unique_preserve_order(list(jsonld.get("emails", [])) + extract_emails_from_text(full_text))

    # Phones from JSON-LD and text
    phones_from_jsonld = [p for p in jsonld.get("phones", []) if isinstance(p, str)]
    phones_parsed = extract_phones_from_text(full_text, default_region)
    phones = unique_preserve_order(phones_from_jsonld + phones_parsed)

    # WhatsApp
    whatsapp_from_jsonld = [w for w in jsonld.get("whatsapp", []) if isinstance(w, str)]
    whatsapp_links = extract_whatsapp_links(soup, url)
    whatsapp = unique_preserve_order(whatsapp_from_jsonld + whatsapp_links)

    # Socials
    socials = extract_social_links(soup, url)
    # Merge with JSON-LD socials if present
    jsonld_socials = jsonld.get("socials")
    if isinstance(jsonld_socials, dict):
        for platform, links in jsonld_socials.items():
            if not isinstance(links, list):
                continue
            merged = unique_preserve_order((socials.get(platform, []) or []) + links)
            socials[platform] = merged

    return PageContacts(
        url=url,
        name=name,
        emails=emails,
        phones=phones,
        whatsapp=whatsapp,
        socials=socials,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract client name and contact info from a web page URL",
    )
    parser.add_argument("--url", required=True, help="Target page URL")
    parser.add_argument(
        "--region",
        default="SA",
        help="Default phone region (ISO-3166), e.g. SA, AE, KW, QA, OM, BH",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = analyze_page(args.url, args.region)
    print(
        json.dumps(
            {
                "url": result.url,
                "name": result.name,
                "emails": result.emails,
                "phones": result.phones,
                "whatsapp": result.whatsapp,
                "socials": result.socials,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

