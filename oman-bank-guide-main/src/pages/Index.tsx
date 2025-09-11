import { useState, useEffect, useMemo } from 'react';
import { Bank, BankData } from '@/types/bank';
import { loadBankData, saveBankData } from '@/utils/bankData';
import { BankCard } from '@/components/BankCard';
import { BankDetails } from '@/components/BankDetails';
import { SearchAndFilter } from '@/components/SearchAndFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, Database, Globe, BarChart3, Download, RefreshCw, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [bankData, setBankData] = useState<BankData>({ banks: [], lastUpdated: '' });
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankNameEn, setNewBankNameEn] = useState('');
  const [newBankType, setNewBankType] = useState<'commercial' | 'islamic' | 'investment' | 'specialized'>('commercial');
  const [newBankYear, setNewBankYear] = useState<string>('');
  const [newBankHQ, setNewBankHQ] = useState('');
  const [newBankWebsite, setNewBankWebsite] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    const data = loadBankData();
    setBankData(data);
    setIsLoading(false);
  }, []);

  // Listen for bank data updates triggered anywhere (e.g., after import/save)
  useEffect(() => {
    const handleBankDataUpdated = (event: Event) => {
      // Reload from storage to keep a single source of truth
      const updated = loadBankData();
      setBankData(updated);
    };
    window.addEventListener('bank-data-updated', handleBankDataUpdated as EventListener);
    return () => window.removeEventListener('bank-data-updated', handleBankDataUpdated as EventListener);
  }, []);

  const cities = useMemo(() => {
    const allCities = bankData.banks.flatMap(bank => 
      bank.branches.map(branch => branch.city)
    );
    return [...new Set(allCities)].sort();
  }, [bankData.banks]);

  const filteredBanks = useMemo(() => {
    return bankData.banks.filter(bank => {
      const matchesSearch = bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           bank.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           bank.branches.some(branch => 
                             branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             branch.city.toLowerCase().includes(searchTerm.toLowerCase())
                           );
      
      const matchesCity = selectedCity === 'all' || 
                         bank.branches.some(branch => branch.city === selectedCity);
      
      const matchesType = selectedType === 'all' || bank.type === selectedType;
      
      return matchesSearch && matchesCity && matchesType;
    });
  }, [bankData.banks, searchTerm, selectedCity, selectedType]);

  const hasActiveFilters = searchTerm !== '' || selectedCity !== 'all' || selectedType !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCity('all');
    setSelectedType('all');
  };

  const updateBank = (updatedBank: Bank) => {
    const newBankData = {
      ...bankData,
      banks: bankData.banks.map(bank => 
        bank.id === updatedBank.id ? updatedBank : bank
      ),
      lastUpdated: new Date().toISOString()
    };
    setBankData(newBankData);
    saveBankData(newBankData);
    setSelectedBank(updatedBank);
  };

  const deleteBank = (bankId: string) => {
    const newBankData: BankData = {
      banks: bankData.banks.filter(b => b.id !== bankId),
      lastUpdated: new Date().toISOString()
    };
    setBankData(newBankData);
    saveBankData(newBankData);
    setSelectedBank(null);
    toast({ title: 'تم الحذف', description: 'تم مسح البنك وجميع فروعه' });
  };

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/(^-|-$)+/g, '');

  const addBank = () => {
    if (!newBankName || !newBankHQ) {
      toast({ title: 'خطأ', description: 'الرجاء إدخال اسم البنك وموقع المكتب الرئيسي', variant: 'destructive' });
      return;
    }

    const defaultYear = new Date().getFullYear();

    const baseId = slugify(newBankName);
    let candidateId = baseId || `bank-${Date.now()}`;
    const existingIds = new Set(bankData.banks.map(b => b.id));
    let suffix = 1;
    while (existingIds.has(candidateId)) {
      candidateId = `${baseId}-${suffix++}`;
    }

    const newBank: Bank = {
      id: candidateId,
      name: newBankName,
      nameEn: newBankName,
      establishedYear: defaultYear,
      headquarters: newBankHQ,
      website: '',
      type: 'commercial',
      branches: []
    };

    const newData: BankData = {
      banks: [...bankData.banks, newBank],
      lastUpdated: new Date().toISOString()
    };
    setBankData(newData);
    saveBankData(newData);
    setIsAddingBank(false);
    setNewBankName('');
    setNewBankNameEn('');
    setNewBankType('commercial');
    setNewBankYear('');
    setNewBankHQ('');
    setNewBankWebsite('');
    toast({ title: 'تم بنجاح', description: 'تم إضافة البنك إلى النظام' });
  };

  const handleDataCollected = (collectedData: any) => {
    const current = loadBankData();

    // Normalize incoming banks from different result shapes
    let incomingBanks: Bank[] = [];
    if (Array.isArray(collectedData)) {
      for (const item of collectedData) {
        if (Array.isArray(item?.banks)) incomingBanks.push(...item.banks);
      }
    } else if (Array.isArray(collectedData?.banks)) {
      incomingBanks = collectedData.banks;
    }

    if (incomingBanks.length === 0) {
      const newBankData: BankData = {
        ...current,
        lastUpdated: new Date().toISOString()
      };
      setBankData(newBankData);
      saveBankData(newBankData);
      toast({
        title: "تم تحديث البيانات",
        description: "لم يتم العثور على عناصر جديدة؛ تم تحديث التاريخ فقط"
      });
      return;
    }

    // Merge banks and branches (deduplicate by id, fallback to name+city for branches)
    const mergedBanks: Bank[] = [...current.banks];
    const bankIdIndex = new Map<string, Bank>(mergedBanks.map(b => [b.id, b]));
    const bankNameIndex = new Map<string, Bank>(mergedBanks.map(b => [b.name, b]));

    for (const incoming of incomingBanks) {
      const existing = bankIdIndex.get(incoming.id) || bankNameIndex.get(incoming.name);
      if (!existing) {
        mergedBanks.push(incoming);
        bankIdIndex.set(incoming.id, incoming);
        bankNameIndex.set(incoming.name, incoming);
        continue;
      }

      const existingBranchIds = new Set(existing.branches.map(br => br.id));
      const existingBranchKeys = new Set(existing.branches.map(br => `${br.name}-${br.city}`));

      for (const br of incoming.branches || []) {
        const key = `${br.name}-${br.city}`;
        if (!existingBranchIds.has(br.id) && !existingBranchKeys.has(key)) {
          existing.branches.push({ ...br, bankId: existing.id });
          existingBranchIds.add(br.id);
          existingBranchKeys.add(key);
        }
      }
    }

    const newBankData: BankData = {
      banks: mergedBanks,
      lastUpdated: new Date().toISOString()
    };
    setBankData(newBankData);
    saveBankData(newBankData);
    toast({
      title: "تم دمج البيانات الجديدة",
      description: `تمت إضافة/تحديث ${incomingBanks.length} بنك`
    });
  };

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      const data = loadBankData();
      setBankData(data);
      setIsLoading(false);
      toast({
        title: "تم التحديث",
        description: "تم تحديث البيانات بنجاح"
      });
    }, 1000);
  };

  const totalStats = useMemo(() => {
    const totalBranches = bankData.banks.reduce((sum, bank) => sum + bank.branches.length, 0);
    const totalEmployees = bankData.banks.reduce((sum, bank) => 
      sum + bank.branches.reduce((branchSum, branch) => branchSum + branch.employees.length, 0), 0
    );
    return { totalBranches, totalEmployees };
  }, [bankData.banks]);

  if (selectedBank) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <BankDetails
            bank={selectedBank}
            onBack={() => setSelectedBank(null)}
            onUpdateBank={updateBank}
            onDeleteBank={deleteBank}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-hero text-white py-12 md:py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-6xl font-bold mb-3 md:mb-4 arabic-text">
            دليل البنوك العمانية
          </h1>
          <p className="text-lg md:text-2xl mb-6 md:mb-8 opacity-90">
            نظام شامل لإدارة معلومات البنوك والفروع والموظفين في سلطنة عمان
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-3xl font-bold">{bankData.banks.length}</div>
              <div className="text-sm opacity-90">بنك مسجل</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-3xl font-bold">{totalStats.totalBranches}</div>
              <div className="text-sm opacity-90">فرع</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-3xl font-bold">{totalStats.totalEmployees}</div>
              <div className="text-sm opacity-90">موظف</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
        <Tabs defaultValue="banks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="banks" className="gap-2">
              <Building2 className="w-4 h-4" />
              البنوك والفروع
            </TabsTrigger>
            <TabsTrigger value="statistics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              الإحصائيات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="banks" className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-start">
              <div className="flex-1 w-full">
                <SearchAndFilter
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  selectedCity={selectedCity}
                  onCityChange={setSelectedCity}
                  selectedType={selectedType}
                  onTypeChange={setSelectedType}
                  cities={cities}
                  onClearFilters={clearFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Dialog open={isAddingBank} onOpenChange={setIsAddingBank}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 w-full sm:w-auto">
                      إضافة بنك
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>إضافة بنك جديد</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="bank-name">اسم البنك (عربي) *</Label>
                        <Input id="bank-name" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="مثال: بنك مسقط" />
                      </div>
                      <div>
                        <Label htmlFor="bank-hq">موقع المكتب الرئيسي *</Label>
                        <Input id="bank-hq" value={newBankHQ} onChange={(e) => setNewBankHQ(e.target.value)} placeholder="مثال: مسقط، سلطنة عمان" />
                      </div>
                      <Button onClick={addBank} className="w-full">إضافة البنك</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={refreshData} size="sm" className="gap-2 w-full sm:w-auto">
                  <RefreshCw className="w-4 h-4" />
                  تحديث
                </Button>
                <Button variant="outline" onClick={() => navigate('/employees')} size="sm" className="gap-2 w-full sm:w-auto">
                  <Users className="w-4 h-4" />
                  موظفو الفروع
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded" />
                        <div className="h-4 bg-muted rounded w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredBanks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredBanks.map((bank) => (
                  <BankCard
                    key={bank.id}
                    bank={bank}
                    onViewDetails={setSelectedBank}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <h3 className="text-lg font-semibold mb-2">لم يتم العثور على نتائج</h3>
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters 
                    ? 'جرب تعديل معايير البحث والتصفية' 
                    : 'لا توجد بنوك مسجلة في النظام'}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    مسح جميع المرشحات
                  </Button>
                )}
              </Card>
            )}

            {bankData.lastUpdated && (
              <div className="text-center text-sm text-muted-foreground">
                آخر تحديث: {new Date(bankData.lastUpdated).toLocaleString('ar-SA')}
              </div>
            )}
          </TabsContent>



          <TabsContent value="statistics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-hero text-white">
                <CardContent className="p-6 text-center">
                  <Building2 className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{bankData.banks.length}</div>
                  <div className="text-sm opacity-90">إجمالي البنوك</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-accent text-white">
                <CardContent className="p-6 text-center">
                  <Database className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{totalStats.totalBranches}</div>
                  <div className="text-sm opacity-90">إجمالي الفروع</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card border-primary/20">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold text-primary">{totalStats.totalEmployees}</div>
                  <div className="text-sm text-muted-foreground">إجمالي الموظفين</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card border-oman-gold/20">
                <CardContent className="p-6 text-center">
                  <Globe className="w-8 h-8 mx-auto mb-2 text-oman-gold" />
                  <div className="text-2xl font-bold text-oman-gold">{cities.length}</div>
                  <div className="text-sm text-muted-foreground">مدينة مغطاة</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>البنوك حسب النوع</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['commercial', 'islamic', 'investment', 'specialized'].map(type => {
                      const count = bankData.banks.filter(bank => bank.type === type).length;
                      const percentage = bankData.banks.length > 0 ? (count / bankData.banks.length) * 100 : 0;
                      const typeLabel = type === 'commercial' ? 'تجاري' : 
                                       type === 'islamic' ? 'إسلامي' :
                                       type === 'investment' ? 'استثماري' : 'متخصص';
                      
                      return (
                        <div key={type} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{typeLabel}</Badge>
                            <span className="text-sm">{count} بنك</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>التوزيع الجغرافي</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cities.slice(0, 5).map(city => {
                      const branchCount = bankData.banks.reduce((sum, bank) => 
                        sum + bank.branches.filter(branch => branch.city === city).length, 0
                      );
                      
                      return (
                        <div key={city} className="flex justify-between items-center">
                          <span className="text-sm">{city}</span>
                          <Badge variant="secondary">{branchCount} فرع</Badge>
                        </div>
                      );
                    })}
                    {cities.length > 5 && (
                      <div className="text-sm text-muted-foreground text-center pt-2">
                        +{cities.length - 5} مدينة أخرى
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
