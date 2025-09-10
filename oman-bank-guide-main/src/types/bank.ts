export interface Bank {
  id: string;
  name: string;
  nameEn: string;
  establishedYear: number;
  headquarters: string;
  website: string;
  type: 'commercial' | 'islamic' | 'investment' | 'specialized';
  branches: Branch[];
}

export interface Branch {
  id: string;
  bankId: string;
  name: string;
  city: string;
  area: string;
  address: string;
  phone: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  employees: Employee[];
  services: string[];
  workingHours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
}

export interface Employee {
  id: string;
  branchId: string;
  name: string;
  position: string;
  department: string;
  phone?: string;
  email?: string;
  hasConsent: boolean;
  addedDate: string;
  linkedinUrl?: string;
}

export interface BankData {
  banks: Bank[];
  lastUpdated: string;
}