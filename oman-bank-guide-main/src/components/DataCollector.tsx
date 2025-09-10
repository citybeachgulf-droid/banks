import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Globe, Search, Download, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DataCollectorProps {
  onDataCollected: (data: any) => void;
}

export const DataCollector = ({ onDataCollected }: DataCollectorProps) => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [collectionResults, setCollectionResults] = useState<any[]>([]);
  const [searchUrl, setSearchUrl] = useState('');
  const [customKeywords, setCustomKeywords] = useState('');
  const { toast } = useToast();

  const simulateDataCollection = async (source: string) => {
    setIsCollecting(true);
    setProgress(0);
    
    // Simulate progress
    const intervals = [20, 40, 60, 80, 100];
    for (const target of intervals) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(target);
    }
    
    // Simulate results
    const mockResults = [
      {
        source: source,
        banksFound: Math.floor(Math.random() * 10) + 5,
        branchesFound: Math.floor(Math.random() * 50) + 20,
        employeesFound: Math.floor(Math.random() * 200) + 50,
        status: 'success',
        timestamp: new Date().toISOString()
      }
    ];
    
    setCollectionResults(prev => [...prev, ...mockResults]);
    setIsCollecting(false);
    setProgress(0);
    
    toast({
      title: "تم جمع البيانات",
      description: `تم العثور على ${mockResults[0].banksFound} بنك و ${mockResults[0].branchesFound} فرع`
    });
    
    onDataCollected(mockResults);
  };

  const collectFromOfficialSources = () => {
    simulateDataCollection('مواقع البنوك الرسمية');
  };

  const collectFromBusinessDirectories = () => {
    simulateDataCollection('أدلة الأعمال العمانية');
  };

  const collectFromCustomUrl = () => {
    if (!searchUrl) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رابط صحيح",
        variant: "destructive"
      });
      return;
    }
    simulateDataCollection(`رابط مخصص: ${searchUrl}`);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            جمع البيانات التلقائي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="official" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="official">المواقع الرسمية</TabsTrigger>
              <TabsTrigger value="directories">أدلة الأعمال</TabsTrigger>
              <TabsTrigger value="custom">مصادر مخصصة</TabsTrigger>
            </TabsList>
            
            <TabsContent value="official" className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  جمع البيانات من المواقع الرسمية للبنوك في سلطنة عمان
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">البنك المركزي العماني</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      قائمة البنوك المرخصة والمعتمدة
                    </p>
                    <Button size="sm" className="w-full" onClick={collectFromOfficialSources}>
                      جمع البيانات
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">مواقع البنوك</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      معلومات الفروع من مواقع البنوك مباشرة
                    </p>
                    <Button size="sm" variant="outline" className="w-full" onClick={collectFromOfficialSources}>
                      جمع البيانات
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="directories" className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  البحث في أدلة الأعمال والمواقع التجارية العمانية
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">الدليل التجاري العماني</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      معلومات شاملة عن البنوك والمؤسسات المالية
                    </p>
                    <Button size="sm" className="w-full" onClick={collectFromBusinessDirectories}>
                      جمع البيانات
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">LinkedIn & مواقع التوظيف</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      معلومات الموظفين (بعد الحصول على الموافقة)
                    </p>
                    <Button size="sm" variant="outline" className="w-full" onClick={collectFromBusinessDirectories}>
                      جمع البيانات
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-url">رابط مخصص</Label>
                  <Input
                    id="custom-url"
                    placeholder="https://example.com"
                    value={searchUrl}
                    onChange={(e) => setSearchUrl(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="keywords">كلمات مفتاحية للبحث</Label>
                  <Textarea
                    id="keywords"
                    placeholder="بنك، فرع، موظف، مدير..."
                    value={customKeywords}
                    onChange={(e) => setCustomKeywords(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <Button onClick={collectFromCustomUrl} className="w-full gap-2">
                  <Search className="w-4 h-4" />
                  بحث مخصص
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          {isCollecting && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">جاري جمع البيانات...</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>
      
      {collectionResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              نتائج جمع البيانات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {collectionResults.map((result, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{result.source}</h4>
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                      {result.status === 'success' ? 'نجح' : 'فشل'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-lg">{result.banksFound}</div>
                      <div className="text-muted-foreground">بنك</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-lg">{result.branchesFound}</div>
                      <div className="text-muted-foreground">فرع</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-lg">{result.employeesFound}</div>
                      <div className="text-muted-foreground">موظف</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(result.timestamp).toLocaleString('ar-SA')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                إشعار مهم حول الخصوصية
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                يتم جمع المعلومات الشخصية للموظفين فقط بعد الحصول على موافقتهم الصريحة.
                جميع البيانات محفوظة محلياً ولا يتم مشاركتها مع أطراف خارجية.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};