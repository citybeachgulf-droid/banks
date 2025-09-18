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
  return numbers
    .map((n) => String(n).replace(/[\s-]/g, ''))
    .filter((n) => n.length > 0);
};

