import { useEffect, useMemo, useState } from 'react';
import { BankData, Bank, Branch, Employee } from '@/types/bank';
import { loadBankData, saveBankData } from '@/utils/bankData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Phone, Building2, Users, Linkedin, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { containsBankKeyword, extractPhoneNumbers, isContactsApiSupported, pickContacts, parseContactsFromText } from '@/utils/contacts';

const BranchEmployees = () => {
  const [bankData, setBankData] = useState<BankData>({ banks: [], lastUpdated: '' });
  const [selectedBankId, setSelectedBankId] = useState<string>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);

  useEffect(() => {
    const data = loadBankData();
    setBankData(data);
  }, []);

  useEffect(() => {
    const onUpdated = () => setBankData(loadBankData());
    window.addEventListener('bank-data-updated', onUpdated);
    return () => window.removeEventListener('bank-data-updated', onUpdated);
  }, []);

  const banks = bankData.banks;

  const branchesForSelectedBank = useMemo(() => {
    if (selectedBankId === 'all') {
      return banks.flatMap((b) => b.branches.map((br) => ({ ...br, bankName: b.name })) as any);
    }
    const bank = banks.find((b) => b.id === selectedBankId);
    return (bank?.branches || []).map((br) => ({ ...br, bankName: bank?.name })) as any;
  }, [banks, selectedBankId]);

  const filteredBranches = useMemo(() => {
    let items = branchesForSelectedBank;
    if (selectedBranchId !== 'all') {
      items = items.filter((br: any) => br.id === selectedBranchId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((br: any) =>
        br.name.toLowerCase().includes(q) ||
        br.city.toLowerCase().includes(q) ||
        br.employees.some((e: any) =>
          e.name.toLowerCase().includes(q) || (e.phone || '').toLowerCase().includes(q)
        )
      );
    }
    return items;
  }, [branchesForSelectedBank, selectedBranchId, search]);

  const employeesCount = useMemo(() => {
    return filteredBranches.reduce((sum: number, br: Branch) => sum + br.employees.length, 0);
  }, [filteredBranches]);

  const handleImportContacts = async () => {
    try {
      setIsImporting(true);
      if (!isContactsApiSupported()) {
        toast({ title: 'غير مدعوم', description: 'استخدم استيراد ملف CSV/VCF على آيفون وسفاري', variant: 'destructive' });
        setIsImporting(false);
        return;
      }

      const contacts = await pickContacts();
      const bankish = contacts.filter((c) =>
        containsBankKeyword(c.name || '') || containsBankKeyword(c.org || '')
      );

      if (bankish.length === 0) {
        toast({ title: 'لا توجد نتائج', description: 'لم يتم العثور على جهات اتصال تحتوي على كلمة بنك' });
        setIsImporting(false);
        return;
      }

      const current = loadBankData();
      const banksByName = new Map<string, Bank>(current.banks.map((b) => [b.name, b]));
      const banksByNameEn = new Map<string, Bank>(current.banks.map((b) => [b.nameEn, b]));

      const randomId = () => Math.random().toString(36).slice(2) + '-' + Date.now();

      let totalAdded = 0;

      for (const bank of current.banks) {
        for (const branch of bank.branches) {
          // Ensure arrays exist
          branch.employees = branch.employees || [];
        }
      }

      for (const c of bankish) {
        const targetBank = banksByName.get(c.org || '') || banksByNameEn.get(c.org || '');
        const phoneNumbers = extractPhoneNumbers(c);

        // If we cannot map to a specific bank by org, try infer from name tokens matching existing bank names
        const nameTokens = (c.name || '').split(/\s+/).filter(Boolean);
        const inferredBank =
          targetBank ||
          current.banks.find((b) => nameTokens.some((t) => b.name.includes(t) || b.nameEn.toLowerCase().includes(t.toLowerCase())));

        if (!inferredBank) {
          continue;
        }

        // Choose a branch to attach to: if user selected a specific branch of this bank, use it; else first branch
        let targetBranch: Branch | undefined;
        if (selectedBankId !== 'all' && inferredBank.id === selectedBankId && selectedBranchId !== 'all') {
          targetBranch = inferredBank.branches.find((br) => br.id === selectedBranchId);
        }
        if (!targetBranch) {
          targetBranch = inferredBank.branches[0];
        }
        if (!targetBranch) continue;

        const existingByPhone = new Set(
          targetBranch.employees.filter((e) => e.phone).map((e) => (e.phone as string).replace(/[\s-]/g, ''))
        );

        const name = c.name || 'موظف غير معروف';
        const position = 'غير محدد';
        const department = '';

        let addedForThisContact = false;
        if (phoneNumbers.length === 0) {
          const emp: Employee = {
            id: 'emp-' + randomId(),
            branchId: targetBranch.id,
            name,
            position,
            department,
            hasConsent: false,
            addedDate: new Date().toISOString()
          };
          targetBranch.employees.push(emp);
          totalAdded += 1;
          addedForThisContact = true;
        } else {
          for (const phone of phoneNumbers) {
            if (existingByPhone.has(phone)) continue;
            const emp: Employee = {
              id: 'emp-' + randomId(),
              branchId: targetBranch.id,
              name,
              position,
              department,
              phone,
              hasConsent: false,
              addedDate: new Date().toISOString()
            };
            targetBranch.employees.push(emp);
            existingByPhone.add(phone);
            totalAdded += 1;
            addedForThisContact = true;
          }
        }
      }

      const updated: BankData = {
        ...current,
        lastUpdated: new Date().toISOString()
      };
      saveBankData(updated);
      setBankData(updated);

      toast({ title: 'تم الاستيراد', description: `تمت إضافة ${totalAdded} موظف من جهات الاتصال` });
    } catch (err: any) {
      toast({ title: 'فشل الاستيراد', description: err?.message || 'حدث خطأ غير متوقع', variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsFileLoading(true);
      const text = await file.text();
      const contacts = parseContactsFromText(file.name, text);
      if (!contacts.length) {
        toast({ title: 'لا توجد بيانات', description: 'تعذر قراءة جهات الاتصال من الملف', variant: 'destructive' });
        return;
      }

      const bankish = contacts.filter((c) =>
        containsBankKeyword(c.name || '') || containsBankKeyword(c.org || '')
      );

      if (bankish.length === 0) {
        toast({ title: 'لا توجد نتائج', description: 'لم يتم العثور على جهات اتصال تحتوي على كلمة بنك' });
        return;
      }

      const current = loadBankData();
      const banksByName = new Map<string, Bank>(current.banks.map((b) => [b.name, b]));
      const banksByNameEn = new Map<string, Bank>(current.banks.map((b) => [b.nameEn, b]));

      const randomId = () => Math.random().toString(36).slice(2) + '-' + Date.now();
      let totalAdded = 0;

      for (const bank of current.banks) {
        for (const branch of bank.branches) {
          branch.employees = branch.employees || [];
        }
      }

      for (const c of bankish) {
        const targetBank = banksByName.get(c.org || '') || banksByNameEn.get(c.org || '');
        const phoneNumbers = extractPhoneNumbers(c);
        const nameTokens = (c.name || '').split(/\s+/).filter(Boolean);
        const inferredBank =
          targetBank ||
          current.banks.find((b) => nameTokens.some((t) => b.name.includes(t) || b.nameEn.toLowerCase().includes(t.toLowerCase())));

        if (!inferredBank) continue;

        let targetBranch: Branch | undefined;
        if (selectedBankId !== 'all' && inferredBank.id === selectedBankId && selectedBranchId !== 'all') {
          targetBranch = inferredBank.branches.find((br) => br.id === selectedBranchId);
        }
        if (!targetBranch) targetBranch = inferredBank.branches[0];
        if (!targetBranch) continue;

        const existingByPhone = new Set(
          targetBranch.employees.filter((e) => e.phone).map((e) => (e.phone as string).replace(/[\s-]/g, ''))
        );

        const name = c.name || 'موظف غير معروف';
        const position = 'غير محدد';
        const department = '';

        let addedForThisContact = false;
        if (phoneNumbers.length === 0) {
          const emp: Employee = {
            id: 'emp-' + randomId(),
            branchId: targetBranch.id,
            name,
            position,
            department,
            hasConsent: false,
            addedDate: new Date().toISOString()
          };
          targetBranch.employees.push(emp);
          totalAdded += 1;
          addedForThisContact = true;
        } else {
          for (const phone of phoneNumbers) {
            if (existingByPhone.has(phone)) continue;
            const emp: Employee = {
              id: 'emp-' + randomId(),
              branchId: targetBranch.id,
              name,
              position,
              department,
              phone,
              hasConsent: false,
              addedDate: new Date().toISOString()
            };
            targetBranch.employees.push(emp);
            existingByPhone.add(phone);
            totalAdded += 1;
            addedForThisContact = true;
          }
        }
      }

      const updated: BankData = { ...loadBankData(), lastUpdated: new Date().toISOString() };
      saveBankData(updated);
      setBankData(updated);
      toast({ title: 'تم الاستيراد', description: `تمت إضافة ${totalAdded} موظف من الملف` });
    } catch (err: any) {
      toast({ title: 'خطأ في الملف', description: err?.message || 'تعذر معالجة الملف', variant: 'destructive' });
    } finally {
      setIsFileLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-col sm:flex-row text-center sm:text-right">
          <h1 className="text-2xl font-bold">موظفو الفروع</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/')}>الرجوع للرئيسية</Button>
            <Button className="w-full sm:w-auto gap-2" onClick={handleImportContacts} disabled={isImporting}>
              <Upload className="w-4 h-4" />
              {isImporting ? 'جاري الاستيراد...' : 'استيراد من جهات الاتصال'}
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".csv,.vcf,.vcard,text/csv,text/vcard"
                onChange={handleFileInput}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="استيراد ملف CSV/VCF"
              />
              <Button variant="outline" className="w-full sm:w-auto">
                {isFileLoading ? 'جاري قراءة الملف...' : 'استيراد ملف CSV/VCF'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
          <div>
            <label className="text-sm mb-1 block">البنك</label>
            <Select value={selectedBankId} onValueChange={(v) => { setSelectedBankId(v); setSelectedBranchId('all'); }}>
              <SelectTrigger>
                <SelectValue placeholder="اختر البنك" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع البنوك</SelectItem>
                {banks.map((b: Bank) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm mb-1 block">الفرع</label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الفرع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفروع</SelectItem>
                {branchesForSelectedBank.map((br: any) => (
                  <SelectItem key={br.id} value={br.id}>{br.name} - {br.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm mb-1 block">بحث</label>
            <Input placeholder="ابحث بالاسم أو رقم الهاتف أو اسم الفرع" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <Building2 className="w-6 h-6 mx-auto mb-1" />
              <div className="text-2xl font-bold">{filteredBranches.length}</div>
              <div className="text-sm text-muted-foreground">عدد الفروع</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-accent text-white">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-1" />
              <div className="text-2xl font-bold">{employeesCount}</div>
              <div className="text-sm opacity-90">عدد الموظفين</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">آخر تحديث</div>
              <div className="text-lg font-semibold">{bankData.lastUpdated ? new Date(bankData.lastUpdated).toLocaleString('ar-SA') : '-'}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          {filteredBranches.map((br: any) => (
            <Card key={br.id} className="hover:shadow-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="w-full">
                    <CardTitle className="text-lg">{br.name}</CardTitle>
                    <div className="text-sm text-muted-foreground">{br.bankName || ''} • {br.city} • {br.area}</div>
                  </div>
                  <Badge variant="outline" className="w-max">{br.employees.length} موظف</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {br.employees.length > 0 ? (
                  <div className="grid gap-3">
                    {br.employees.map((e: any) => (
                      <div key={e.id} className="p-3 border rounded-lg flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center sm:justify-between">
                        <div className="w-full">
                          <div className="font-medium">{e.name}</div>
                          <div className="text-xs text-muted-foreground">{e.position || 'بدون منصب'}</div>
                        </div>
                        <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                          {e.phone && (<><Phone className="w-4 h-4" /><span>{e.phone}</span></>)}
                          {e.linkedinUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={e.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                <Linkedin className="w-4 h-4" />
                                <span>لينكدإن</span>
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">لا يوجد موظفون لهذا الفرع</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BranchEmployees;

