import { useState } from 'react';
import { Bank, Branch, Employee } from '@/types/bank';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, MapPin, Phone, Users, Plus, Download, Edit, Trash2, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportToCSV } from '@/utils/bankData';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface BankDetailsProps {
  bank: Bank;
  onBack: () => void;
  onUpdateBank: (bank: Bank) => void;
  onDeleteBank: (bankId: string) => void;
}

export const BankDetails = ({ bank, onBack, onUpdateBank, onDeleteBank }: BankDetailsProps) => {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [activeTab, setActiveTab] = useState<'branches' | 'employees'>('branches');
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    name: '',
    position: '',
    department: '',
    phone: '',
    email: '',
    hasConsent: false
  });
  const [newBranch, setNewBranch] = useState<Partial<Branch>>({
    name: '',
    city: '',
    area: '',
    address: '',
    phone: '',
    mapUrl: '',
    services: []
  });
  
  const { toast } = useToast();

  const addEmployee = (branchId: string) => {
    if (!newEmployee.name || !newEmployee.phone) {
      toast({
        title: "خطأ",
        description: "الاسم ورقم الهاتف مطلوبان",
        variant: "destructive"
      });
      return;
    }

    const employee: Employee = {
      id: `emp-${Date.now()}`,
      branchId,
      name: newEmployee.name!,
      position: newEmployee.position || '',
      department: newEmployee.department || '',
      phone: newEmployee.phone,
      email: newEmployee.email,
      hasConsent: newEmployee.hasConsent || false,
      addedDate: new Date().toISOString()
    };

    const updatedBank = {
      ...bank,
      branches: bank.branches.map(branch =>
        branch.id === branchId
          ? { ...branch, employees: [...branch.employees, employee] }
          : branch
      )
    };

    onUpdateBank(updatedBank);
    setNewEmployee({ name: '', position: '', department: '', phone: '', email: '', hasConsent: false });
    setIsAddingEmployee(false);
    setIsQuickAddOpen(null);
    setActiveTab('employees');
    setSelectedBranch(bank.branches.find(b => b.id === branchId) || null);
    
    toast({
      title: "تم بنجاح",
      description: "تم إضافة الموظف بنجاح"
    });
  };

  const addBranch = () => {
    if (!newBranch.name || !newBranch.mapUrl) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم الفرع ورابط Google Maps",
        variant: "destructive"
      });
      return;
    }

    const branch: Branch = {
      id: `branch-${Date.now()}`,
      bankId: bank.id,
      name: newBranch.name!,
      city: newBranch.city || '',
      area: newBranch.area || '',
      address: newBranch.address || '',
      phone: newBranch.phone || '',
      mapUrl: newBranch.mapUrl!,
      employees: [],
      services: newBranch.services || [],
      workingHours: {
        sunday: { open: '08:00', close: '14:00', isOpen: true },
        monday: { open: '08:00', close: '14:00', isOpen: true },
        tuesday: { open: '08:00', close: '14:00', isOpen: true },
        wednesday: { open: '08:00', close: '14:00', isOpen: true },
        thursday: { open: '08:00', close: '14:00', isOpen: true },
        friday: { open: '00:00', close: '00:00', isOpen: false },
        saturday: { open: '00:00', close: '00:00', isOpen: false }
      }
    };

    const updatedBank = {
      ...bank,
      branches: [...bank.branches, branch]
    };

    onUpdateBank(updatedBank);
    setNewBranch({ name: '', city: '', area: '', address: '', phone: '', mapUrl: '', services: [] });
    setIsAddingBranch(false);
    
    toast({
      title: "تم بنجاح",
      description: "تم إضافة الفرع بنجاح"
    });
  };

  const exportBranchData = (branch: Branch) => {
    const data = branch.employees.map(emp => ({
      'اسم الموظف': emp.name,
      'المنصب': emp.position,
      'القسم': emp.department,
      'رقم الهاتف': emp.phone || 'غير متوفر',
      'البريد الإلكتروني': emp.email || 'غير متوفر',
      'لينكدإن': emp.linkedinUrl || 'غير متوفر',
      'الموافقة': emp.hasConsent ? 'نعم' : 'لا',
      'تاريخ الإضافة': new Date(emp.addedDate).toLocaleDateString('ar-SA')
    }));
    
    exportToCSV(data, `${bank.name}-${branch.name}-employees`);
    
    toast({
      title: "تم التصدير",
      description: "تم تصدير بيانات الموظفين بنجاح"
    });
  };

  const exportAllData = () => {
    const allEmployees = bank.branches.flatMap(branch => 
      branch.employees.map(emp => ({
        'البنك': bank.name,
        'الفرع': branch.name,
        'المدينة': branch.city,
        'المنطقة': branch.area,
        'اسم الموظف': emp.name,
        'المنصب': emp.position,
        'القسم': emp.department,
        'رقم الهاتف': emp.phone || 'غير متوفر',
        'البريد الإلكتروني': emp.email || 'غير متوفر',
        'لينكدإن': emp.linkedinUrl || 'غير متوفر',
        'الموافقة': emp.hasConsent ? 'نعم' : 'لا',
        'تاريخ الإضافة': new Date(emp.addedDate).toLocaleDateString('ar-SA')
      }))
    );
    
    exportToCSV(allEmployees, `${bank.name}-all-employees`);
    
    toast({
      title: "تم التصدير",
      description: "تم تصدير جميع البيانات بنجاح"
    });
  };

  const removeBranch = (branchId: string) => {
    const updatedBank = {
      ...bank,
      branches: bank.branches.filter(b => b.id !== branchId)
    };
    onUpdateBank(updatedBank);
    if (selectedBranch?.id === branchId) {
      setSelectedBranch(null);
      setActiveTab('branches');
    }
    toast({ title: 'تم الحذف', description: 'تم مسح الفرع بنجاح' });
  };

  const handleImportEmployees = async (branchId: string, file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const headerMap: Record<string, string> = {
        // Arabic headers
        'الاسم': 'name',
        'اسم الموظف': 'name',
        'المنصب': 'position',
        'القسم': 'department',
        'الهاتف': 'phone',
        'رقم الهاتف': 'phone',
        'البريد الإلكتروني': 'email',
        'لينكدإن': 'linkedinUrl',
        'رابط لينكدإن': 'linkedinUrl',
        'linkedin': 'linkedinUrl',
        'linkedin url': 'linkedinUrl',
        // English fallbacks
        'name': 'name',
        'position': 'position',
        'department': 'department',
        'phone': 'phone',
        'email': 'email',
        'linkedinurl': 'linkedinUrl',
        'linkedin profile': 'linkedinUrl',
      } as any;

      const normalizeKey = (k: string) => (k || '').toString().trim().toLowerCase();

      const employeesToAdd: Employee[] = rows.map((row) => {
        const normalized: any = {};
        for (const key of Object.keys(row)) {
          const mapped = headerMap[normalizeKey(key)] || headerMap[key as any] || key;
          normalized[mapped] = row[key];
        }
        const emp: Employee = {
          id: `emp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          branchId,
          name: (normalized.name || '').toString().trim(),
          position: (normalized.position || '').toString().trim(),
          department: (normalized.department || '').toString().trim(),
          phone: (normalized.phone || '').toString().trim() || undefined,
          email: (normalized.email || '').toString().trim() || undefined,
          linkedinUrl: (normalized.linkedinUrl || normalized.linkedin || '').toString().trim() || undefined,
          hasConsent: false,
          addedDate: new Date().toISOString(),
        };
        return emp;
      }).filter(e => e.name);

      if (employeesToAdd.length === 0) {
        toast({ title: 'لا توجد بيانات', description: 'لم يتم العثور على سجلات صالحة في الملف', variant: 'destructive' });
        return;
      }

      const updatedBank: Bank = {
        ...bank,
        branches: bank.branches.map(br => br.id === branchId ? {
          ...br,
          employees: [...br.employees, ...employeesToAdd]
        } : br)
      };

      onUpdateBank(updatedBank);
      toast({ title: 'تم الاستيراد', description: `تمت إضافة ${employeesToAdd.length} موظفاً` });
    } catch (e) {
      toast({ title: 'فشل الاستيراد', description: 'تأكد من صيغة ملف إكسل والمحاولة مرة أخرى', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowRight className="w-4 h-4" />
          العودة للقائمة
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={exportAllData} className="gap-2 bg-gradient-accent">
            <Download className="w-4 h-4" />
            تصدير جميع البيانات
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="w-4 h-4" />
                مسح البنك
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد مسح البنك</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف هذا البنك وجميع فروعه وبيانات موظفيه المرتبطة. لا يمكن التراجع عن هذه الخطوة.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={() => { onDeleteBank(bank.id); toast({ title: 'تم الحذف', description: 'تم مسح البنك بنجاح' }); }}>مسح</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="bg-gradient-card shadow-elegant">
        <CardHeader>
          <CardTitle className="text-2xl arabic-text">{bank.name}</CardTitle>
          <p className="text-muted-foreground">{bank.nameEn}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-hero rounded-lg text-white">
              <div className="text-2xl font-bold">{bank.branches.length}</div>
              <div className="text-sm opacity-90">إجمالي الفروع</div>
            </div>
            <div className="text-center p-4 bg-gradient-accent rounded-lg text-white">
              <div className="text-2xl font-bold">
                {bank.branches.reduce((total, branch) => total + branch.employees.length, 0)}
              </div>
              <div className="text-sm opacity-90">إجمالي الموظفين</div>
            </div>
            <div className="text-center p-4 bg-card border rounded-lg">
              <div className="text-2xl font-bold text-primary">{bank.establishedYear}</div>
              <div className="text-sm text-muted-foreground">سنة التأسيس</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="branches">الفروع</TabsTrigger>
          <TabsTrigger value="employees">الموظفين</TabsTrigger>
        </TabsList>
        
        <TabsContent value="branches" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">فروع {bank.name}</h3>
            <Dialog open={isAddingBranch} onOpenChange={setIsAddingBranch}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  إضافة فرع جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>إضافة فرع جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="branch-name">اسم الفرع *</Label>
                    <Input
                      id="branch-name"
                      value={newBranch.name || ''}
                      onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                      placeholder="مثال: فرع صحار"
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch-map-url">رابط Google Maps *</Label>
                    <Input
                      id="branch-map-url"
                      value={newBranch.mapUrl || ''}
                      onChange={(e) => setNewBranch({ ...newBranch, mapUrl: e.target.value })}
                      placeholder="الصق رابط الموقع من خرائط Google"
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch-city">المدينة</Label>
                    <Input
                      id="branch-city"
                      value={newBranch.city || ''}
                      onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                      placeholder="مثال: صحار"
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch-area">المنطقة</Label>
                    <Input
                      id="branch-area"
                      value={newBranch.area || ''}
                      onChange={(e) => setNewBranch({ ...newBranch, area: e.target.value })}
                      placeholder="مثال: مركز المدينة"
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch-address">العنوان</Label>
                    <Textarea
                      id="branch-address"
                      value={newBranch.address || ''}
                      onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                      placeholder="العنوان التفصيلي للفرع"
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch-phone">رقم الهاتف</Label>
                    <Input
                      id="branch-phone"
                      value={newBranch.phone || ''}
                      onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                      placeholder="+968 xxxxxxxx"
                    />
                  </div>
                  <Button onClick={addBranch} className="w-full">
                    إضافة الفرع
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid gap-4">
            {bank.branches.map((branch) => (
              <Card key={branch.id} className="hover:shadow-card transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{branch.name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>{branch.city} - {branch.area}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{branch.employees.length} موظف</Badge>
                      <input
                        id={`import-${branch.id}`}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImportEmployees(branch.id, file);
                          (e.currentTarget as HTMLInputElement).value = '';
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => {
                          const input = document.getElementById(`import-${branch.id}`) as HTMLInputElement | null;
                          input?.click();
                        }}
                      >
                        استيراد إكسل
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="h-8 px-2">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>تأكيد مسح الفرع</AlertDialogTitle>
                            <AlertDialogDescription>
                              سيتم حذف الفرع وجميع بيانات موظفيه المرتبطة. لا يمكن التراجع عن هذه الخطوة.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeBranch(branch.id)}>مسح</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">{branch.address}</p>
                    {branch.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        let url = (branch.mapUrl || '').trim();
                        if (!url) {
                          if (branch.coordinates) {
                            url = `https://www.google.com/maps?q=${branch.coordinates.lat},${branch.coordinates.lng}`;
                          } else {
                            const query = encodeURIComponent([branch.address, branch.city, branch.area].filter(Boolean).join(' '));
                            url = `https://www.google.com/maps/search/?api=1&query=${query}`;
                          }
                        }
                        if (!/^https?:\/\//i.test(url)) {
                          url = `https://${url}`;
                        }
                        window.open(url, '_blank');
                      }}
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      الموقع
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => { setSelectedBranch(branch); setActiveTab('employees'); }}
                      className="gap-2"
                    >
                      <Users className="w-4 h-4" />
                      عرض الموظفين
                    </Button>
                    <Dialog open={isQuickAddOpen === branch.id} onOpenChange={(open) => setIsQuickAddOpen(open ? branch.id : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                          <Plus className="w-4 h-4" />
                          إضافة موظف سريع
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>إضافة موظف جديد إلى {branch.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`quick-name-${branch.id}`}>اسم الموظف *</Label>
                            <Input
                              id={`quick-name-${branch.id}`}
                              value={newEmployee.name || ''}
                              onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                              placeholder="الاسم الكامل"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`quick-phone-${branch.id}`}>رقم الهاتف *</Label>
                            <Input
                              id={`quick-phone-${branch.id}`}
                              value={newEmployee.phone || ''}
                              onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                              placeholder="+968 xxxxxxxx"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`quick-position-${branch.id}`}>المنصب (اختياري)</Label>
                            <Input
                              id={`quick-position-${branch.id}`}
                              value={newEmployee.position || ''}
                              onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                              placeholder="مثال: موظف خدمة عملاء"
                            />
                          </div>
                          <Button onClick={() => addEmployee(branch.id)} className="w-full">
                            إضافة الموظف
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportBranchData(branch)}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      تصدير البيانات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="employees" className="space-y-4">
          {selectedBranch ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">موظفو {selectedBranch.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedBranch.city} - {selectedBranch.area}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedBranch(null)}>
                    عرض جميع الفروع
                  </Button>
                  <Dialog open={isAddingEmployee} onOpenChange={setIsAddingEmployee}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        إضافة موظف
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>إضافة موظف جديد</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="emp-name">اسم الموظف *</Label>
                          <Input
                            id="emp-name"
                            value={newEmployee.name || ''}
                            onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                            placeholder="الاسم الكامل"
                          />
                        </div>
                        <div>
                          <Label htmlFor="emp-position">المنصب *</Label>
                          <Input
                            id="emp-position"
                            value={newEmployee.position || ''}
                            onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                            placeholder="مثال: موظف خدمة عملاء"
                          />
                        </div>
                        <div>
                          <Label htmlFor="emp-department">القسم</Label>
                          <Select
                            value={newEmployee.department || ''}
                            onValueChange={(value) => setNewEmployee({ ...newEmployee, department: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر القسم" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="خدمة العملاء">خدمة العملاء</SelectItem>
                              <SelectItem value="الصندوق">الصندوق</SelectItem>
                              <SelectItem value="الائتمان">الائتمان</SelectItem>
                              <SelectItem value="الإدارة">الإدارة</SelectItem>
                              <SelectItem value="التسويق">التسويق</SelectItem>
                              <SelectItem value="تقنية المعلومات">تقنية المعلومات</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="emp-phone">رقم الهاتف</Label>
                          <Input
                            id="emp-phone"
                            value={newEmployee.phone || ''}
                            onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                            placeholder="+968 xxxxxxxx"
                          />
                        </div>
                        <div>
                          <Label htmlFor="emp-email">البريد الإلكتروني</Label>
                          <Input
                            id="emp-email"
                            type="email"
                            value={newEmployee.email || ''}
                            onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                            placeholder="example@email.com"
                          />
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Switch
                            id="consent"
                            checked={newEmployee.hasConsent}
                            onCheckedChange={(checked) => setNewEmployee({ ...newEmployee, hasConsent: checked })}
                          />
                          <Label htmlFor="consent" className="text-sm">
                            تم الحصول على موافقة الموظف لحفظ معلوماته
                          </Label>
                        </div>
                        <Button onClick={() => addEmployee(selectedBranch.id)} className="w-full">
                          إضافة الموظف
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="grid gap-3">
                {selectedBranch.employees.length > 0 ? (
                  selectedBranch.employees.map((employee) => (
                    <Card key={employee.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{employee.name}</h4>
                          <p className="text-sm text-muted-foreground">{employee.position}</p>
                          {employee.department && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {employee.department}
                            </Badge>
                          )}
                        </div>
                        <div className="text-left text-sm text-muted-foreground">
                          {employee.phone && <p>{employee.phone}</p>}
                          {employee.email && <p>{employee.email}</p>}
                          <Badge variant={employee.hasConsent ? "default" : "destructive"} className="mt-1 text-xs">
                            {employee.hasConsent ? "موافقة" : "بدون موافقة"}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">لا توجد بيانات موظفين لهذا الفرع</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      يمكنك إضافة موظفين جدد باستخدام زر "إضافة موظف" أعلاه
                    </p>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">اختر فرعاً لعرض موظفيه</p>
              <p className="text-sm text-muted-foreground mt-2">
                انتقل إلى تبويب "الفروع" واختر "عرض الموظفين" للفرع المطلوب
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};