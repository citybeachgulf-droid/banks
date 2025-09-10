import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X } from 'lucide-react';

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCity: string;
  onCityChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  cities: string[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const SearchAndFilter = ({
  searchTerm,
  onSearchChange,
  selectedCity,
  onCityChange,
  selectedType,
  onTypeChange,
  cities,
  onClearFilters,
  hasActiveFilters
}: SearchAndFilterProps) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="البحث عن بنك أو فرع..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="gap-2 sm:w-auto w-full"
        >
          <Filter className="w-4 h-4" />
          التصفية
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
              نشط
            </Badge>
          )}
        </Button>
      </div>

      {isFilterOpen && (
        <div className="bg-card border rounded-lg p-4 space-y-4 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">المدينة</label>
              <Select value={selectedCity} onValueChange={onCityChange}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع المدن" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المدن</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">نوع البنك</label>
              <Select value={selectedType} onValueChange={onTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الأنواع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="commercial">تجاري</SelectItem>
                  <SelectItem value="islamic">إسلامي</SelectItem>
                  <SelectItem value="investment">استثماري</SelectItem>
                  <SelectItem value="specialized">متخصص</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {hasActiveFilters && (
            <div className="flex justify-between items-center pt-2 border-t">
              <div className="flex gap-2 flex-wrap">
                {selectedCity !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    المدينة: {selectedCity}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => onCityChange('all')}
                    />
                  </Badge>
                )}
                {selectedType !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    النوع: {selectedType === 'commercial' ? 'تجاري' : 
                           selectedType === 'islamic' ? 'إسلامي' :
                           selectedType === 'investment' ? 'استثماري' : 'متخصص'}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => onTypeChange('all')}
                    />
                  </Badge>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                مسح الكل
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};