import React from 'react';
import { ShieldCheck, AlertTriangle, Percent } from 'lucide-react';

interface KpiSummaryProps {
  totalChecked: number;
  yesCount: number;
  noCount: number;
  naCount: number;
  riskLevels: { high: number; med: number; low: number };
  overdueCount?: number;
}

export function KpiSummaryCard({
  totalChecked,
  yesCount,
  noCount,
  naCount,
  riskLevels,
  overdueCount = 0
}: KpiSummaryProps) {
  const complianceRate = totalChecked > 0 ? Math.round((yesCount / totalChecked) * 100) : 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full text-left">
      {/* Compliance Rate Card - Sky Pastel */}
      <div className="bg-[#D2E6F7]/40 border border-[#D2E6F7] rounded-xl p-4 flex items-center space-x-4">
        <div className="p-2.5 bg-white/80 rounded-lg text-[#1B3D72] shadow-xs">
          <Percent className="w-5 h-5 stroke-[2.5px]" />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Compliance Rate</span>
          <span className="text-2xl font-extrabold text-[#1B3D72]">{complianceRate}%</span>
        </div>
      </div>

      {/* Passed Checklist Card - Mint Pastel */}
      <div className="bg-[#D4F2E8]/40 border border-[#D4F2E8] rounded-xl p-4 flex items-center space-x-4">
        <div className="p-2.5 bg-white/80 rounded-lg text-[#2A9068] shadow-xs">
          <ShieldCheck className="w-5 h-5 stroke-[2.5px]" />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Passed Checklist</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-extrabold text-[#2A9068]">{yesCount}</span>
            <span className="text-xs text-neutral-500">/ {totalChecked + naCount}</span>
          </div>
        </div>
      </div>

      {/* Non-Compliant Count Card - Rose Pastel */}
      <div className="bg-[#FCE4E4]/40 border border-[#FCE4E4] rounded-xl p-4 flex items-center space-x-4">
        <div className="p-2.5 bg-white/80 rounded-lg text-[#C03A33] shadow-xs">
          <AlertTriangle className="w-5 h-5 stroke-[2.5px]" />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Failed Findings</span>
          <span className="text-2xl font-extrabold text-[#C03A33]">{noCount}</span>
        </div>
      </div>

      {/* Risk Metrics Card - Peach Pastel */}
      <div className="bg-[#FAE3D0]/40 border border-[#FAE3D0] rounded-xl p-4 flex flex-col justify-center space-y-1.5">
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Risk Breakdown</span>
        <div className="flex items-center space-x-4 text-xs font-bold pt-0.5">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8524A]" />
            <span className="text-[#C03A33] font-mono">{riskLevels.high}H</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" />
            <span className="text-[#B8760A] font-mono">{riskLevels.med}M</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3BB885]" />
            <span className="text-[#2A9068] font-mono">{riskLevels.low}L</span>
          </div>
        </div>
      </div>
    </div>
  );
}
