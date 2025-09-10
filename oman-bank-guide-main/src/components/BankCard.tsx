import { Bank } from '@/types/bank';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Users, Clock, ExternalLink } from 'lucide-react';

interface BankCardProps {
  bank: Bank;
  onViewDetails: (bank: Bank) => void;
}

const getBankTypeLabel = (type: string) => {
  switch (type) {
    case 'commercial': return 'تجاري';
    case 'islamic': return 'إسلامي';
    case 'investment': return 'استثماري';
    case 'specialized': return 'متخصص';
    default: return type;
  }
};

const getBankTypeColor = (type: string) => {
  switch (type) {
    case 'commercial': return 'bg-gradient-card border-oman-red/20';
    case 'islamic': return 'bg-gradient-accent border-oman-green/20';
    case 'investment': return 'bg-gradient-hero border-oman-gold/20';
    case 'specialized': return 'bg-gradient-card border-primary/20';
    default: return 'bg-gradient-card';
  }
};

export const BankCard = ({ bank, onViewDetails }: BankCardProps) => {
  const totalEmployees = bank.branches.reduce((total, branch) => total + branch.employees.length, 0);

  return (
    <Card className={`group hover:shadow-elegant transition-all duration-300 animate-fade-in-up ${getBankTypeColor(bank.type)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl arabic-text group-hover:text-primary transition-colors">
              {bank.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{bank.nameEn}</p>
          </div>
          <Badge 
            variant="secondary" 
            className="text-xs font-medium"
          >
            {getBankTypeLabel(bank.type)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>تأسس {bank.establishedYear}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span>{bank.branches.length} فرع</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{bank.headquarters}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{totalEmployees} موظف</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(bank.website, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            الموقع الإلكتروني
          </Button>
          
          <Button 
            onClick={() => onViewDetails(bank)}
            className="bg-gradient-hero hover:shadow-glow transition-all duration-300"
            size="sm"
          >
            عرض التفاصيل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};