import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bank, BankData, Branch, Employee } from '@/types/bank';
import { loadBankData, saveBankData } from '@/utils/bankData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, ArrowLeft, Save, UserSquare2, Building2, Landmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EmployeeDetails = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [bankData, setBankData] = useState<BankData>({ banks: [], lastUpdated: '' });
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [bankId, setBankId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const data = loadBankData();
    setBankData(data);
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    const data = loadBankData();
    let foundBank: Bank | undefined;
    let foundBranch: Branch | undefined;
    let foundEmployee: Employee | undefined;
    for (const b of data.banks) {
      for (const br of b.branches) {
        const emp = br.employees.find((e) => e.id === employeeId);
        if (emp) {
          foundBank = b;
          foundBranch = br;
          foundEmployee = emp;
          break;
        }
      }
      if (foundEmployee) break;
    }
    if (!foundEmployee || !foundBank || !foundBranch) {
      toast({ title: 'غير موجود', description: 'تعذر العثور على الموظف', variant: 'destructive' });
      navigate('/employees');
      return;
    }
    setEmployee(foundEmployee);
    setBankId(foundBank.id);
    setBranchId(foundBranch.id);
    setName(foundEmployee.name);
    setPosition(foundEmployee.position);
    setDepartment(foundEmployee.department);
    setPhone(foundEmployee.phone || '');
    setEmail(foundEmployee.email || '');
    setNotes(foundEmployee.notes || '');
  }, [employeeId, navigate, toast]);

  const banks = bankData.banks;
  const branchesForSelectedBank = useMemo(() => {
    const b = banks.find((x) => x.id === bankId);
    return b ? b.branches : [];
  }, [banks, bankId]);

  const handleSave = () => {
    if (!employee) return;
    const data = loadBankData();
    let sourceBank: Bank | undefined;
    let sourceBranch: Branch | undefined;
    for (const b of data.banks) {
      for (const br of b.branches) {
        if (br.employees.some((e) => e.id === employee.id)) {
          sourceBank = b;
          sourceBranch = br;
          break;
        }
      }
      if (sourceBranch) break;
    }
    if (!sourceBank || !sourceBranch) return;

    // Remove from source if moving
    if (sourceBranch.id !== branchId) {
      sourceBranch.employees = sourceBranch.employees.filter((e) => e.id !== employee.id);
    }

    // Target bank/branch
    const targetBank = data.banks.find((b) => b.id === bankId) || sourceBank;
    let targetBranch = targetBank.branches.find((br) => br.id === branchId);
    if (!targetBranch) {
      toast({ title: 'الفرع غير موجود', description: 'يرجى اختيار فرع صحيح', variant: 'destructive' });
      return;
    }

    const updatedEmployee: Employee = {
      ...employee,
      branchId: targetBranch.id,
      name,
      position,
      department,
      phone: phone || undefined,
      email: email || undefined,
      notes: notes || undefined
    };

    // If same branch, update in place; else push to target
    const idx = targetBranch.employees.findIndex((e) => e.id === employee.id);
    if (idx >= 0) {
      targetBranch.employees[idx] = updatedEmployee;
    } else {
      targetBranch.employees.push(updatedEmployee);
    }

    const updatedData: BankData = { ...data, lastUpdated: new Date().toISOString() };
    saveBankData(updatedData);
    setBankData(updatedData);
    setEmployee(updatedEmployee);
    toast({ title: 'تم الحفظ', description: 'تم تحديث بيانات الموظف بنجاح' });
  };

  const handleCall = () => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  if (!employee) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-6">جاري التحميل...</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            رجوع
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            حفظ
          </Button>
        </div>

        <Card className="hover:shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserSquare2 className="w-5 h-5" />
              تفاصيل الموظف
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-1 block">الاسم</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm mb-1 block">المنصب</label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} />
              </div>
              <div>
                <label className="text-sm mb-1 block">القسم</label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <div>
                <label className="text-sm mb-1 block">الهاتف</label>
                <div className="flex gap-2">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="مثال: +9682xxxxxxx" />
                  <Button type="button" variant="outline" onClick={handleCall} disabled={!phone} className="gap-2">
                    <Phone className="w-4 h-4" /> اتصل
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm mb-1 block">البريد الإلكتروني</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-sm mb-1 block">ملاحظات</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="اكتب أي ملاحظات هنا" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              نقل الموظف
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-1 block">البنك</label>
              <Select value={bankId} onValueChange={(v) => { setBankId(v); setBranchId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر البنك" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex items-center gap-2"><Landmark className="w-4 h-4" />{b.name}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm mb-1 block">الفرع</label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفرع" />
                </SelectTrigger>
                <SelectContent>
                  {branchesForSelectedBank.map((br) => (
                    <SelectItem key={br.id} value={br.id}>
                      {br.name} - {br.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDetails;

