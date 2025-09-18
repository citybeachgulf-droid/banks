export type PickedContact = {
  id?: string;
  name?: string;
  tel?: Array<string | { value?: string } | any>;
  email?: string[];
  address?: string[];
  org?: string;
  raw?: any;
};

// Detects Web Contacts Picker API support
export const isContactsApiSupported = (): boolean => {
  // @ts-ignore - navigator.contacts is experimental
  return typeof (navigator as any).contacts?.select === 'function';
};

// Request contacts via Web Contacts Picker API
export const pickContacts = async (): Promise<PickedContact[]> => {
  // @ts-ignore - navigator.contacts is experimental
  const contactsApi = (navigator as any).contacts;
  if (!contactsApi || typeof contactsApi.select !== 'function') {
    throw new Error('Contacts API is not supported in this browser');
  }

  const props = ['name', 'tel', 'email', 'address', 'icon', 'org'];
  const options = { multiple: true }; // allow multiple selection
  const contacts = await contactsApi.select(props, options);
  const normalized: PickedContact[] = (contacts || []).map((c: any) => ({
    id: c.id || undefined,
    name: Array.isArray(c.name) ? c.name[0] : c.name,
    tel: Array.isArray(c.tel) ? c.tel : [],
    email: c.email || [],
    address: c.address || [],
    org: Array.isArray(c.org) ? c.org[0] : c.org,
    raw: c
  }));
  return normalized;
};

export const containsBankKeyword = (value: string): boolean => {
  if (!value) return false;
  const lower = value.toLowerCase();
  // Arabic and English variants
  return (
    lower.includes('bank') ||
    lower.includes('بنك') ||
    lower.includes('مصرف') ||
    lower.includes('البنك')
  );
};

export const extractPhoneNumbers = (contact: PickedContact): string[] => {
  const source = Array.isArray(contact.tel) ? contact.tel : [];
  const numbers = source.flatMap((t: any) => {
    if (typeof t === 'string') return [t];
    if (t && typeof t.value === 'string') return [t.value];
    return [];
  });
  const normalizeArabicDigits = (input: string): string => {
    let out = '';
    for (const ch of input || '') {
      const code = ch.charCodeAt(0);
      // Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩
      if (code >= 0x0660 && code <= 0x0669) {
        out += String(code - 0x0660);
        continue;
      }
      // Eastern Arabic-Indic digits ۰۱۲۳۴۵۶۷۸۹
      if (code >= 0x06f0 && code <= 0x06f9) {
        out += String(code - 0x06f0);
        continue;
      }
      out += ch;
    }
    return out;
  };

  const sanitized = numbers
    .map((n) => normalizeArabicDigits(String(n)))
    // keep leading + for international, strip other non-digits
    .map((n) => {
      const trimmed = n.trim();
      if (trimmed.startsWith('+')) {
        return '+' + trimmed.slice(1).replace(/[^0-9]/g, '');
      }
      return trimmed.replace(/[^0-9]/g, '');
    })
    .map((n) => n.replace(/^(00)(\d+)/, '+$2'))
    .filter((n) => n.length > 0);

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const p of sanitized) {
    if (!seen.has(p)) {
      seen.add(p);
      unique.push(p);
    }
  }
  return unique;
};

// ---------------- iOS Fallback: CSV/VCF Parsing ----------------

const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field);
        field = '';
      } else if (ch === '\n') {
        current.push(field);
        rows.push(current);
        current = [];
        field = '';
      } else if (ch === '\r') {
        // ignore CR
      } else {
        field += ch;
      }
    }
  }
  // push last field/row
  current.push(field);
  if (current.length > 1 || current[0] !== '') rows.push(current);
  return rows;
};

const normalizeHeader = (h: string): string => {
  const lower = h.trim().toLowerCase();
  if (['name', 'full name', 'fullname', 'fn'].includes(lower)) return 'name';
  if (['phone', 'tel', 'mobile', 'phone1', 'phone 1', 'primary phone'].includes(lower)) return 'tel1';
  if (['phone2', 'tel2', 'secondary phone', 'phone 2'].includes(lower)) return 'tel2';
  if (['email', 'e-mail'].includes(lower)) return 'email';
  if (['org', 'organization', 'company', 'employer'].includes(lower)) return 'org';
  if (['address', 'addr'].includes(lower)) return 'address';
  return lower;
};

export const parseCSVContacts = (text: string): PickedContact[] => {
  const rows = parseCSV(text).filter((r) => r.some((c) => c && c.trim() !== ''));
  if (rows.length === 0) return [];
  const headers = rows[0].map(normalizeHeader);
  const contacts: PickedContact[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = row[j] ?? '';
    }
    const tel: string[] = [];
    if (record['tel']) tel.push(record['tel']);
    if (record['tel1']) tel.push(record['tel1']);
    if (record['tel2']) tel.push(record['tel2']);
    if (record['phone']) tel.push(record['phone']);
    const contact: PickedContact = {
      id: undefined,
      name: record['name'] || undefined,
      tel,
      email: record['email'] ? [record['email']] : [],
      address: record['address'] ? [record['address']] : [],
      org: record['org'] || undefined,
      raw: record
    };
    contacts.push(contact);
  }
  return contacts;
};

export const parseVCFContacts = (text: string): PickedContact[] => {
  // Unfold folded lines (lines starting with space are continuations)
  const unfolded = text.replace(/\r\n[\t ]/g, '');
  const blocks = unfolded.split(/BEGIN:VCARD/i).slice(1).map((b) => b.split(/END:VCARD/i)[0]);
  const results: PickedContact[] = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let name: string | undefined;
    let org: string | undefined;
    const tel: string[] = [];
    for (const line of lines) {
      const [keyPart, valuePartRaw] = line.split(':');
      if (!valuePartRaw) continue;
      const key = keyPart.toUpperCase();
      const value = valuePartRaw.trim();
      if (key.startsWith('FN')) {
        name = value;
      } else if (key.startsWith('ORG')) {
        org = value.split(';')[0];
      } else if (key.startsWith('TEL')) {
        tel.push(value.replace(/[^+\d]/g, ''));
      }
    }
    if (name || org || tel.length > 0) {
      results.push({ name, org, tel, email: [], address: [], raw: block });
    }
  }
  return results;
};

export const parseContactsFromText = (fileName: string, text: string): PickedContact[] => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv')) return parseCSVContacts(text);
  if (lower.endsWith('.vcf') || lower.endsWith('.vcard')) return parseVCFContacts(text);
  // Try both, prefer VCF if it yields results
  const v = parseVCFContacts(text);
  if (v.length > 0) return v;
  return parseCSVContacts(text);
};

