'use client';

import React from 'react';
import {
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileText,
  Zap
} from 'lucide-react';
import { ChecklistSchema, AuditSessionData } from '@/types/schema';

interface KPIDashboardProps {
  sessions: AuditSessionData[];
  templates: ChecklistSchema[];
  onResumeSession?: (session: AuditSessionData) => void;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color: string;
}

function MetricCard({ label, value, icon, trend, color }: MetricCardProps) {
  return (
    <div className="glass-panel p-5 flex flex-col justify-between space-y-3 group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={`p-2 rounded-lg ${color} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <div>
        <span className="text-2xl font-black text-foreground">{value}</span>
        {trend && (
          <span className="text-[10px] text-green-400 font-semibold ml-2">{trend}</span>
        )}
      </div>
    </div>
  );
}

function ComplianceGauge({ score }: { score: number }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
        <circle cx="80" cy="80" r={radius} stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
        <circle
          cx="80" cy="80" r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black" style={{ color }}>{score}%</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Compliance</span>
      </div>
    </div>
  );
}

export function KPIDashboard({ sessions, templates, onResumeSession }: KPIDashboardProps) {
  // Calculate aggregate metrics
  const totalAudits = sessions.length;
  const completedAudits = sessions.filter(s => s.status === 'Completed').length;
  const inProgressAudits = sessions.filter(s => s.status === 'In_Progress').length;
  const publishedTemplates = templates.length;

  // Calculate compliance score across all completed sessions
  let totalScore = 0;
  let nonCompliantCount = 0;
  let highRiskCount = 0;
  const categoryScores: Record<string, { pass: number; total: number }> = {};

  sessions.forEach(session => {
    if (session.status !== 'Completed') return;

    // Find matching template
    const template = templates.find(t => t.id === session.checklistId);
    if (!template?.sections) return;

    let sessionScore = 100;

    template.sections.forEach(sec => {
      if (sec.type === 'checklist' && sec.fields) {
        sec.fields.forEach(field => {
          const resp = session.responses.find(r => r.fieldId === field.id);

          // Category scoring
          const catKey = sec.title || 'General';
          if (!categoryScores[catKey]) categoryScores[catKey] = { pass: 0, total: 0 };
          categoryScores[catKey].total++;

          if (resp?.value === 'NO') {
            nonCompliantCount++;
            if (field.riskLevel === 'HIGH') {
              sessionScore -= 15;
              highRiskCount++;
            } else if (field.riskLevel === 'MEDIUM') {
              sessionScore -= 8;
            } else {
              sessionScore -= 3;
            }
          } else if (resp?.value === 'YES') {
            categoryScores[catKey].pass++;
          }
        });
      }
    });

    totalScore += Math.max(0, sessionScore);
  });

  const avgCompliance = completedAudits > 0 ? Math.round(totalScore / completedAudits) : 100;

  // Risk severity distribution
  const riskDistribution = [
    { label: 'High Risk', count: highRiskCount, color: 'bg-red-500', barColor: 'bg-red-500' },
    { label: 'Medium Risk', count: Math.max(0, nonCompliantCount - highRiskCount), color: 'bg-yellow-500', barColor: 'bg-yellow-500' },
    { label: 'Compliant', count: Math.max(0, totalAudits * 5 - nonCompliantCount), color: 'bg-green-500', barColor: 'bg-green-500' },
  ];
  const maxRiskCount = Math.max(...riskDistribution.map(r => r.count), 1);

  return (
    <div className="space-y-6">
      {/* Top metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Templates Published"
          value={publishedTemplates}
          icon={<FileText className="w-4 h-4 text-purple-300" />}
          color="bg-purple-500/15"
        />
        <MetricCard
          label="Total Audit Sessions"
          value={totalAudits}
          icon={<BarChart3 className="w-4 h-4 text-blue-300" />}
          trend={totalAudits > 0 ? `+${totalAudits} this period` : undefined}
          color="bg-blue-500/15"
        />
        <MetricCard
          label="Non-Compliant Items"
          value={nonCompliantCount}
          icon={<ShieldAlert className="w-4 h-4 text-red-300" />}
          color="bg-red-500/15"
        />
        <MetricCard
          label="High-Risk Flags"
          value={highRiskCount}
          icon={<AlertTriangle className="w-4 h-4 text-yellow-300" />}
          color="bg-yellow-500/15"
        />
      </div>

      {/* Middle row: Compliance gauge + Risk distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compliance Gauge */}
        <div className="glass-panel p-6 flex flex-col items-center justify-center space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground w-full text-left">
            Average Compliance Health
          </h4>
          <div className="relative">
            <ComplianceGauge score={avgCompliance} />
          </div>
          <div className="flex items-center space-x-4 text-[10px] text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>≥ 85% Safe</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>60-84% Review</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>&lt; 60% Critical</span>
            </div>
          </div>
        </div>

        {/* Risk Distribution Bars */}
        <div className="glass-panel p-6 space-y-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Risk Severity Distribution
          </h4>
          <div className="space-y-4">
            {riskDistribution.map(item => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/80">{item.label}</span>
                  <span className="text-xs font-bold text-foreground">{item.count}</span>
                </div>
                <div className="w-full h-2.5 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.barColor} transition-all duration-700 ease-out`}
                    style={{ width: `${Math.max(4, (item.count / maxRiskCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category scoring table */}
      {Object.keys(categoryScores).length > 0 && (
        <div className="glass-panel p-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Score by Audit Category
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(categoryScores).map(([cat, data]) => {
              const pct = data.total > 0 ? Math.round((data.pass / data.total) * 100) : 0;
              return (
                <div key={cat} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card/20">
                  <span className="text-xs font-medium text-foreground/80 truncate pr-3">{cat}</span>
                  <span className={`text-sm font-black ${pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent sessions list */}
      <div className="glass-panel p-6 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Recent Audit Sessions
        </h4>
        {sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No sessions started yet. Begin an audit from a published template.</p>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 5).map(session => (
              <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/10 hover:bg-card/30 transition-colors">
                <div className="flex flex-col space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">{session.siteName}</span>
                  <span className="text-[10px] text-muted-foreground">{session.clientName} • {session.auditorName}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    session.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                    session.status === 'Synced' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {session.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(session.startedAt).toLocaleDateString()}
                  </span>
                  {session.status === 'In_Progress' && onResumeSession && (
                    <button
                      onClick={() => onResumeSession(session)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
