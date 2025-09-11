import asyncio
import csv
import os
import sys
from dataclasses import dataclass
from typing import List, Optional

from tqdm import tqdm

try:
    from playwright.async_api import async_playwright, Page
except Exception as exc:
    print("Playwright is not installed. Install requirements first: pip install -r requirements.txt", file=sys.stderr)
    raise


@dataclass
class Person:
    name: str
    title: str
    contact: str


async def set_linkedin_cookies(page: Page, li_at: Optional[str]) -> None:
    if not li_at:
        return
    # Set the li_at cookie for LinkedIn domain to access protected pages
    await page.context.add_cookies([
        {
            "name": "li_at",
            "value": li_at,
            "domain": ".linkedin.com",
            "path": "/",
            "httpOnly": True,
            "secure": True,
            "sameSite": "Lax",
        }
    ])


async def scrape_people(url: str, li_at: Optional[str], limit: int) -> List[Person]:
    results: List[Person] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            locale="en-US",
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1366, "height": 900},
        )
        page = await context.new_page()
        await set_linkedin_cookies(page, li_at)

        # Navigate to the people page
        await page.goto(url, wait_until="domcontentloaded")

        # Handle potential auth walls
        current_url = page.url
        if any(x in current_url for x in ["/authwall", "/login", "/checkpoint/"]):
            print("Warning: Page requires authentication. Pass --li-at or set LI_AT env.", file=sys.stderr)

        # Wait for people cards if present
        try:
            await page.wait_for_selector("[data-test-reusable-org-people-profiles-entity-result], .artdeco-entity-lockup", timeout=10000)
        except Exception:
            # continue anyway, maybe limited view
            pass

        # Attempt lazy-scroll to load more items
        last_height = 0
        with tqdm(total=limit if limit > 0 else None, desc="Loading profiles", unit="profiles") as bar:
            while True:
                # Extract visible cards
                cards = await page.query_selector_all("[data-test-reusable-org-people-profiles-entity-result], .artdeco-entity-lockup")
                for card in cards:
                    if len(results) >= limit > 0:
                        break
                    name_el = await card.query_selector("span[aria-hidden='true'], .artdeco-entity-lockup__title")
                    name = (await name_el.inner_text()).strip() if name_el else ""
                    title_el = await card.query_selector(".artdeco-entity-lockup__subtitle, .entity-result__primary-subtitle, .artdeco-entity-lockup__description")
                    title = (await title_el.inner_text()).strip() if title_el else ""
                    # Contact info: try profile URL first, else location/headline if visible
                    profile_link_el = await card.query_selector("a.app-aware-link, a[data-test-app-aware-link]")
                    contact = ""
                    if profile_link_el:
                        href = await profile_link_el.get_attribute("href")
                        if href:
                            contact = href
                    if not contact:
                        contact_el = await card.query_selector(".artdeco-entity-lockup__caption, .entity-result__secondary-subtitle")
                        contact = (await contact_el.inner_text()).strip() if contact_el else ""

                    if name or title or contact:
                        person = Person(name=name, title=title, contact=contact)
                        # Avoid duplicates
                        if not results or results[-1] != person:
                            results.append(person)
                            bar.update(1)
                            if limit > 0 and len(results) >= limit:
                                break

                if limit > 0 and len(results) >= limit:
                    break

                # Scroll down to load more
                await page.evaluate("window.scrollBy(0, document.body.scrollHeight)")
                await page.wait_for_timeout(1200)
                new_height = await page.evaluate("document.body.scrollHeight")
                if new_height == last_height:
                    break
                last_height = new_height

        await browser.close()
    return results


def write_csv(people: List[Person], out_path: str) -> None:
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["name", "title", "contact"])
        for p in people:
            writer.writerow([p.name, p.title, p.contact])


def parse_args(argv: List[str]):
    import argparse
    parser = argparse.ArgumentParser(description="Scrape LinkedIn company people: name, title, contact")
    parser.add_argument("url", help="LinkedIn company people URL, e.g. https://www.linkedin.com/company/<slug>/people/")
    parser.add_argument("-o", "--out", default="people.csv", help="Output CSV path (default: people.csv)")
    parser.add_argument("-l", "--limit", type=int, default=50, help="Max profiles to fetch (0 for all visible)")
    parser.add_argument("--li-at", dest="li_at", default=os.getenv("LI_AT"), help="LinkedIn li_at cookie value or set env LI_AT")
    return parser.parse_args(argv)


async def main_async():
    args = parse_args(sys.argv[1:])
    people = await scrape_people(args.url, args.li_at, args.limit)
    write_csv(people, args.out)
    print(f"Saved {len(people)} profiles to {args.out}")


def main():
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        print("Interrupted", file=sys.stderr)


if __name__ == "__main__":
    main()

