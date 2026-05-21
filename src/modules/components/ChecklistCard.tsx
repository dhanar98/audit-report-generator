import React from 'react';
import { ChecklistItem } from '@/types/dynamicSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, AlertOctagon, Calendar } from 'lucide-react';
import { ImageUpload } from './ImageUpload';

interface ChecklistCardProps {
  item: ChecklistItem;
  value?: 'YES' | 'NO' | 'N/A' | '';
  remarks?: string;
  recommendation?: string;
  resolvedDays?: number;
  photos?: { id: string; base64Data: string; fileName: string; caption?: string }[];
  onResponseChange: (updates: { value: 'YES' | 'NO' | 'N/A' | ''; remarks?: string; recommendation?: string; resolvedDays?: number; photos?: { id: string; base64Data: string; fileName: string; caption?: string }[] }) => void;
  readOnly?: boolean;
}

export function ChecklistCard({
  item,
  value = '',
  remarks = '',
  recommendation = '',
  resolvedDays = 7,
  photos = [],
  onResponseChange,
  readOnly = false
}: ChecklistCardProps) {
  
  const getRiskBadgeStyles = () => {
    switch (item.riskLevel) {
      case 'HIGH':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'LOW':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const handleSelectOption = (opt: 'YES' | 'NO' | 'N/A') => {
    if (readOnly) return;
    const isNo = opt === 'NO';
    onResponseChange({
      value: opt,
      recommendation: isNo ? (recommendation || 'Remediation measures must be scheduled immediately.') : '',
      remarks: isNo ? remarks : '',
      resolvedDays: isNo ? resolvedDays : undefined,
      photos: isNo ? photos : []
    });
  };

  return (
    <div className="p-4 rounded-xl border border-border bg-card/40 hover:bg-card/60 transition-all space-y-4 text-left">
      {/* Top Header */}
      <div className="flex items-start justify-between space-x-4">
        <h4 className="text-xs font-semibold text-foreground leading-relaxed flex-1">
          {item.question} {item.required && <span className="text-red-400 ml-0.5">*</span>}
        </h4>
        <div className="flex items-center space-x-2 shrink-0">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getRiskBadgeStyles()}`}>
            {item.riskLevel} RISK
          </span>
        </div>
      </div>

      {/* Choice Buttons */}
      <div className="flex space-x-2">
        {(['YES', 'NO', 'N/A'] as const).map((opt) => {
          const isSelected = value === opt;
          return (
            <Button
              key={opt}
              type="button"
              disabled={readOnly}
              size="xs"
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => handleSelectOption(opt)}
              className={`h-8 px-4 text-xs font-semibold select-none ${
                isSelected && opt === 'YES' ? 'bg-green-600 hover:bg-green-700 text-white' :
                isSelected && opt === 'NO' ? 'bg-red-600 hover:bg-red-700 text-white' :
                isSelected && opt === 'N/A' ? 'bg-zinc-500 hover:bg-zinc-600 text-white' : ''
              }`}
            >
              {opt}
            </Button>
          );
        })}
      </div>

      {/* NO Choice Remediation Block */}
      {value === 'NO' && (
        <div className="border border-red-500/20 bg-red-500/5 p-4 rounded-lg space-y-3.5 transition-all duration-200">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertOctagon className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Non-Compliance Findings</span>
          </div>

          {/* Observations / Remarks */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Observation Details</span>
            <Textarea
              value={remarks}
              disabled={readOnly}
              onChange={(e) => onResponseChange({ value, remarks: e.target.value, recommendation, resolvedDays, photos })}
              placeholder="Detail the failure observations..."
              className="text-xs min-h-[60px] bg-card border-red-500/20 focus:border-red-500"
            />
          </div>

          {/* Recommendations */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Corrective Recommendation</span>
            <Input
              value={recommendation}
              disabled={readOnly}
              onChange={(e) => onResponseChange({ value, remarks, recommendation: e.target.value, resolvedDays, photos })}
              placeholder="Action required to resolve compliance gap..."
              className="h-8 text-xs bg-card border-red-500/20 focus:border-red-500"
            />
          </div>

          {/* Target Resolve Days */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Target Resolution Timeline (Days)</span>
            <div className="flex items-center space-x-2 max-w-[120px]">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={resolvedDays}
                disabled={readOnly}
                onChange={(e) => onResponseChange({ value, remarks, recommendation, resolvedDays: parseInt(e.target.value) || 0, photos })}
                className="h-8 text-xs bg-card border-red-500/20 focus:border-red-500 text-center font-semibold"
              />
            </div>
          </div>

          {/* Image Upload evidence */}
          <ImageUpload
            componentId={item.id}
            images={photos}
            disabled={readOnly}
            onChange={(updatedPhotos) => onResponseChange({ value, remarks, recommendation, resolvedDays, photos: updatedPhotos })}
            maxImages={3}
            label="Capture Non-Compliance Photos (Max 3)"
          />
        </div>
      )}
    </div>
  );
}
