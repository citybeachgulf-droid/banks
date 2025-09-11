import { useEffect, useMemo, useState } from 'react';
import { BankData, Bank, Branch } from '@/types/bank';
import { loadBankData } from '@/utils/bankData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Phone, Building2, Users, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const BranchEmployees = () => {
  const [bankData, setBankData] = useState<BankData>({ banks: [], lastUpdated: '' });
  const [selectedBankId, setSelectedBankId] = useState<string>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-col sm:flex-row text-center sm:text-right">
          <h1 className="text-2xl font-bold">موظفو الفروع</h1>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/')}>الرجوع للرئيسية</Button>
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

