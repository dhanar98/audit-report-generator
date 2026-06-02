import React from 'react';
import { ChecklistItem } from '@/types/dynamicSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, AlertOctagon, Calendar, CheckCircle, XCircle } from 'lucide-react';
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
  sectionTitle?: string;
}

const getSectionColors = (sectionTitle: string = '') => {
  const title = sectionTitle.toLowerCase();
  if (title.includes('board') || title.includes('distribution') || title.includes('panel')) {
    return { bg: '#D2E6F7', accent: '#1B3D72' }; // Sky
  }
  if (title.includes('earth') || title.includes('ups') || title.includes('power')) {
    return { bg: '#E8DAFC', accent: '#7C3AED' }; // Lavender
  }
  if (title.includes('wire') || title.includes('circuit') || title.includes('conduit') || title.includes('cable')) {
    return { bg: '#D4F2E8', accent: '#2A9068' }; // Mint
  }
  if (title.includes('load') || title.includes('energy') || title.includes('demand') || title.includes('meter')) {
    return { bg: '#FEF3C7', accent: '#B8760A' }; // Lemon
  }
  if (title.includes('light') || title.includes('fan') || title.includes('lamp')) {
    return { bg: '#FAE3D0', accent: '#E06A1A' }; // Peach
  }
  if (title.includes('ac') || title.includes('cooling') || title.includes('fire') || title.includes('safety') || title.includes('hvac')) {
    return { bg: '#FCE4E4', accent: '#C03A33' }; // Rose
  }
  return { bg: '#E4EAF2', accent: '#2F3E4E' }; // Slate fallback
};

const RISK_CONFIG = {
  HIGH: { color: '#C03A33', bg: '#FCE4E4', dot: '#E8524A', label: 'High' },
  MEDIUM: { color: '#B8760A', bg: '#FEF3C7', dot: '#F5A623', label: 'Medium' },
  LOW: { color: '#2A9068', bg: '#D4F2E8', dot: '#3BB885', label: 'Low' },
  NONE: { color: '#627384', bg: '#EEF1F4', dot: '#D1D9E0', label: 'None' }
};

export function ChecklistCard({
  item,
  value = '',
  remarks = '',
  recommendation = '',
  resolvedDays = 7,
  photos = [],
  onResponseChange,
  readOnly = false,
  sectionTitle = ''
}: ChecklistCardProps) {
  
  const colors = getSectionColors(sectionTitle);
  const risk = RISK_CONFIG[item.riskLevel] || RISK_CONFIG.NONE;

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
    <div className="rounded-xl overflow-hidden border border-neutral-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 text-left">
      {/* Pastel Section Band Header */}
      <div 
        className="px-4 py-2 flex items-center justify-between"
        style={{ backgroundColor: colors.bg }}
      >
        <div className="flex items-center space-x-2">
          <span 
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-white/70"
            style={{ color: colors.accent }}
          >
            {item.id}
          </span>
          {sectionTitle && (
            <span 
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: colors.accent }}
            >
              {sectionTitle}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span 
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1"
            style={{ backgroundColor: risk.bg, color: risk.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: risk.dot }} />
            {risk.label} Risk
          </span>
        </div>
      </div>

      {/* Main content body */}
      <div className="p-4 space-y-4">
        {/* Question */}
        <h4 className="text-sm font-medium text-neutral-800 leading-relaxed">
          {item.question} {item.required && <span className="text-red-500 ml-0.5">*</span>}
        </h4>

        {/* Compliance Buttons */}
        <div className="flex space-x-2">
          {([
            { key: 'YES', label: 'Compliant', icon: <CheckCircle className="w-3.5 h-3.5 mr-1.5" />, activeColor: '#3BB885', activeBg: '#D4F2E8' },
            { key: 'NO', label: 'Not Compliant', icon: <XCircle className="w-3.5 h-3.5 mr-1.5" />, activeColor: '#E8524A', activeBg: '#FCE4E4' },
            { key: 'N/A', label: 'N/A', icon: <AlertCircle className="w-3.5 h-3.5 mr-1.5" />, activeColor: '#627384', activeBg: '#EEF1F4' }
          ] as const).map((opt) => {
            const isSelected = value === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={readOnly}
                onClick={() => handleSelectOption(opt.key)}
                style={{
                  color: isSelected ? opt.activeColor : '#8898A8',
                  backgroundColor: isSelected ? opt.activeBg : '#F8FAFB',
                  border: isSelected ? `1.5px solid ${opt.activeColor}` : '1.5px solid transparent'
                }}
                className="h-9 px-4 rounded-lg text-xs font-semibold flex items-center transition-all duration-150 active:scale-97 select-none"
              >
                {opt.icon}
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Expanded Finding Detail Panel */}
        {value === 'NO' && (
          <div className="border border-[#E8524A]/20 bg-[#FCE4E4]/10 p-4 rounded-lg space-y-3.5 transition-all duration-200">
            <div className="flex items-center space-x-2 text-[#E8524A]">
              <AlertOctagon className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Non-Compliance Findings</span>
            </div>

            {/* Observations / Remarks */}
            <div className="space-y-1">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide block">Observation Details</span>
              <Textarea
                value={remarks}
                disabled={readOnly}
                onChange={(e) => onResponseChange({ value, remarks: e.target.value, recommendation, resolvedDays, photos })}
                placeholder="Detail the failure observations..."
                style={{ borderWidth: '1.5px' }}
                className="text-xs min-h-[60px] bg-white border-neutral-200 focus:border-[#E8524A] focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-[#E8524A]/10"
              />
            </div>

            {/* Recommendations */}
            <div className="space-y-1">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide block">Corrective Recommendation</span>
              <Input
                value={recommendation}
                disabled={readOnly}
                onChange={(e) => onResponseChange({ value, remarks, recommendation: e.target.value, resolvedDays, photos })}
                placeholder="Action required to resolve compliance gap..."
                style={{ borderWidth: '1.5px' }}
                className="h-9 text-xs bg-white border-neutral-200 focus:border-[#E8524A] focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-[#E8524A]/10"
              />
            </div>

            {/* Target Resolve Days */}
            <div className="space-y-1">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide block">Target Resolution Timeline (Days)</span>
              <div className="flex items-center space-x-2 max-w-[120px]">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <Input
                  type="number"
                  value={resolvedDays}
                  disabled={readOnly}
                  onChange={(e) => onResponseChange({ value, remarks, recommendation, resolvedDays: parseInt(e.target.value) || 0, photos })}
                  style={{ borderWidth: '1.5px' }}
                  className="h-9 text-xs bg-white border-neutral-200 focus:border-[#E8524A] focus-visible:ring-0 focus-visible:ring-offset-0 text-center font-semibold"
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
    </div>
  );
}
