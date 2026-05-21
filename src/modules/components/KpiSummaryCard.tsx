import React from 'react';
import { ShieldCheck, AlertTriangle, Clock, Percent } from 'lucide-react';

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
      {/* Compliance Rate Card */}
      <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 rounded-2xl p-4 flex items-center space-x-4">
        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
          <Percent className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Compliance Rate</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-indigo-400">{complianceRate}%</span>
          </div>
        </div>
      </div>

      {/* Compliant Count Card */}
      <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-4 flex items-center space-x-4">
        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Passed Checklist</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-emerald-400">{yesCount}</span>
            <span className="text-xs text-muted-foreground">/ {totalChecked + naCount}</span>
          </div>
        </div>
      </div>

      {/* Non-Compliant Count Card */}
      <div className="bg-gradient-to-br from-rose-500/10 via-red-500/5 to-transparent border border-rose-500/20 rounded-2xl p-4 flex items-center space-x-4">
        <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Non-Compliant Findings</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-rose-400">{noCount}</span>
          </div>
        </div>
      </div>

      {/* Risk Metrics Card */}
      <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 rounded-2xl p-4 flex flex-col justify-center space-y-1">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Risk Level Breakdown</span>
        <div className="flex items-center space-x-3 text-xs font-bold pt-1">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-400">{riskLevels.high}H</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-yellow-400">{riskLevels.med}M</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-400">{riskLevels.low}L</span>
          </div>
        </div>
      </div>
    </div>
  );
}
