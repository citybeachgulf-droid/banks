import { Bank, BankData } from '@/types/bank';

// Initial data for major banks in Oman
export const initialBanks: Bank[] = [
  {
    id: 'bank-dhofar',
    name: 'بنك ظفار',
    nameEn: 'Bank Dhofar',
    establishedYear: 1990,
    headquarters: 'مسقط، سلطنة عمان',
    website: 'https://www.bankdhofar.com',
    type: 'commercial',
    branches: [
      {
        id: 'bd-ruwi',
        bankId: 'bank-dhofar',
        name: 'فرع روي',
        city: 'مسقط',
        area: 'روي',
        address: 'شارع السلطان قابوس، روي',
        phone: '+968 24564000',
        coordinates: { lat: 23.6141, lng: 58.5449 },
        employees: [],
        services: ['حسابات توفير', 'قروض شخصية', 'بطاقات ائتمان', 'تحويلات'],
        workingHours: {
          sunday: { open: '08:00', close: '14:00', isOpen: true },
          monday: { open: '08:00', close: '14:00', isOpen: true },
          tuesday: { open: '08:00', close: '14:00', isOpen: true },
          wednesday: { open: '08:00', close: '14:00', isOpen: true },
          thursday: { open: '08:00', close: '14:00', isOpen: true },
          friday: { open: '00:00', close: '00:00', isOpen: false },
          saturday: { open: '00:00', close: '00:00', isOpen: false }
        }
      },
      {
        id: 'bd-qurum',
        bankId: 'bank-dhofar',
        name: 'فرع القرم',
        city: 'مسقط',
        area: 'القرم',
        address: 'مجمع الأفنيوز، القرم',
        phone: '+968 24564100',
        coordinates: { lat: 23.6089, lng: 58.4887 },
        employees: [],
        services: ['حسابات توفير', 'قروض عقارية', 'بطاقات ائتمان'],
        workingHours: {
          sunday: { open: '08:00', close: '14:00', isOpen: true },
          monday: { open: '08:00', close: '14:00', isOpen: true },
          tuesday: { open: '08:00', close: '14:00', isOpen: true },
          wednesday: { open: '08:00', close: '14:00', isOpen: true },
          thursday: { open: '08:00', close: '14:00', isOpen: true },
          friday: { open: '00:00', close: '00:00', isOpen: false },
          saturday: { open: '00:00', close: '00:00', isOpen: false }
        }
      }
    ]
  },
  {
    id: 'national-bank-oman',
    name: 'البنك الأهلي العماني',
    nameEn: 'National Bank of Oman',
    establishedYear: 1973,
    headquarters: 'مسقط، سلطنة عمان',
    website: 'https://www.nbo.om',
    type: 'commercial',
    branches: [
      {
        id: 'nbo-main',
        bankId: 'national-bank-oman',
        name: 'الفرع الرئيسي',
        city: 'مسقط',
        area: 'روي',
        address: 'شارع السلطان قابوس، روي',
        phone: '+968 24449000',
        coordinates: { lat: 23.6145, lng: 58.5455 },
        employees: [],
        services: ['حسابات جارية', 'حسابات توفير', 'قروض تجارية', 'خدمات الخزانة'],
        workingHours: {
          sunday: { open: '08:00', close: '14:30', isOpen: true },
          monday: { open: '08:00', close: '14:30', isOpen: true },
          tuesday: { open: '08:00', close: '14:30', isOpen: true },
          wednesday: { open: '08:00', close: '14:30', isOpen: true },
          thursday: { open: '08:00', close: '14:30', isOpen: true },
          friday: { open: '00:00', close: '00:00', isOpen: false },
          saturday: { open: '00:00', close: '00:00', isOpen: false }
        }
      }
    ]
  },
  {
    id: 'bank-muscat',
    name: 'بنك مسقط',
    nameEn: 'Bank Muscat',
    establishedYear: 1982,
    headquarters: 'مسقط، سلطنة عمان',
    website: 'https://www.bankmuscat.com',
    type: 'commercial',
    branches: [
      {
        id: 'bm-main',
        bankId: 'bank-muscat',
        name: 'الفرع الرئيسي',
        city: 'مسقط',
        area: 'روي',
        address: 'شارع السلطان قابوس، مجمع مسقط الجراند مول',
        phone: '+968 24768000',
        coordinates: { lat: 23.6128, lng: 58.5439 },
        employees: [],
        services: ['حسابات شخصية', 'قروض السيارات', 'بطاقات ائتمان', 'حلول الاستثمار'],
        workingHours: {
          sunday: { open: '08:00', close: '14:00', isOpen: true },
          monday: { open: '08:00', close: '14:00', isOpen: true },
          tuesday: { open: '08:00', close: '14:00', isOpen: true },
          wednesday: { open: '08:00', close: '14:00', isOpen: true },
          thursday: { open: '08:00', close: '14:00', isOpen: true },
          friday: { open: '00:00', close: '00:00', isOpen: false },
          saturday: { open: '00:00', close: '00:00', isOpen: false }
        }
      },
      {
        id: 'bm-nizwa',
        bankId: 'bank-muscat',
        name: 'فرع نزوى',
        city: 'نزوى',
        area: 'مركز المدينة',
        address: 'دوار نزوى، بجانب سوق نزوى',
        phone: '+968 25411000',
        coordinates: { lat: 22.9333, lng: 57.5333 },
        employees: [],
        services: ['حسابات توفير', 'قروض شخصية', 'تحويلات'],
        workingHours: {
          sunday: { open: '08:00', close: '14:00', isOpen: true },
          monday: { open: '08:00', close: '14:00', isOpen: true },
          tuesday: { open: '08:00', close: '14:00', isOpen: true },
          wednesday: { open: '08:00', close: '14:00', isOpen: true },
          thursday: { open: '08:00', close: '14:00', isOpen: true },
          friday: { open: '00:00', close: '00:00', isOpen: false },
          saturday: { open: '00:00', close: '00:00', isOpen: false }
        }
      }
    ]
  },
  {
    id: 'ahli-bank',
    name: 'الأهلي بنك',
    nameEn: 'Ahli Bank',
    establishedYear: 1993,
    headquarters: 'مسقط، سلطنة عمان',
    website: 'https://www.ahlibank.om',
    type: 'commercial',
    branches: [
      {
        id: 'ab-main',
        bankId: 'ahli-bank',
        name: 'الفرع الرئيسي',
        city: 'مسقط',
        area: 'شاطئ القرم',
        address: 'شارع شاطئ القرم، مقابل فندق انتركونتيننتال',
        phone: '+968 24498000',
        coordinates: { lat: 23.6185, lng: 58.4791 },
        employees: [],
        services: ['الخدمات المصرفية الشخصية', 'الخدمات المصرفية التجارية', 'بطاقات ائتمان'],
        workingHours: {
          sunday: { open: '08:00', close: '14:00', isOpen: true },
          monday: { open: '08:00', close: '14:00', isOpen: true },
          tuesday: { open: '08:00', close: '14:00', isOpen: true },
          wednesday: { open: '08:00', close: '14:00', isOpen: true },
          thursday: { open: '08:00', close: '14:00', isOpen: true },
          friday: { open: '00:00', close: '00:00', isOpen: false },
          saturday: { open: '00:00', close: '00:00', isOpen: false }
        }
      }
    ]
  },
  {
    id: 'bank-nizwa',
    name: 'بنك نزوى',
    nameEn: 'Bank Nizwa',
    establishedYear: 2012,
    headquarters: 'مسقط، سلطنة عمان',
    website: 'https://www.banknizwa.om',
    type: 'islamic',
    branches: [
      {
        id: 'bn-main',
        bankId: 'bank-nizwa',
        name: 'الفرع الرئيسي',
        city: 'مسقط',
        area: 'القرم',
        address: 'مبنى تجاري، شارع السلطان قابوس، القرم',
        phone: '+968 24449500',
        coordinates: { lat: 23.6085, lng: 58.4901 },
        employees: [],
        services: ['الخدمات المصرفية الإسلامية', 'التمويل العقاري', 'بطاقات متوافقة مع الشريعة'],
        workingHours: {
          sunday: { open: '08:00', close: '14:00', isOpen: true },
          monday: { open: '08:00', close: '14:00', isOpen: true },
          tuesday: { open: '08:00', close: '14:00', isOpen: true },
          wednesday: { open: '08:00', close: '14:00', isOpen: true },
          thursday: { open: '08:00', close: '14:00', isOpen: true },
          friday: { open: '00:00', close: '00:00', isOpen: false },
          saturday: { open: '00:00', close: '00:00', isOpen: false }
        }
      }
    ]
  }
];

export const loadBankData = (): BankData => {
  const savedData = localStorage.getItem('oman-banks-data');
  if (savedData) {
    return JSON.parse(savedData);
  }
  
  const initialData: BankData = {
    banks: initialBanks,
    lastUpdated: new Date().toISOString()
  };
  
  saveBankData(initialData);
  return initialData;
};

export const saveBankData = (data: BankData): void => {
  localStorage.setItem('oman-banks-data', JSON.stringify(data));
};

export const exportToCSV = (data: any[], filename: string): void => {
  const headers = Object.keys(data[0] || {});
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};