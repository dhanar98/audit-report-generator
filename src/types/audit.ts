export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type AuditStatus = 'Draft' | 'Completed';
export type FindingStatus = 'Open' | 'Resolved';

export interface Finding {
  id: string;
  title: string;
  category: string;
  riskLevel: RiskLevel;
  description: string;
  recommendation: string;
  status: FindingStatus;
}

export interface AuditReport {
  id: string;
  title: string;
  company: string;
  auditorName: string;
  auditDate: string;
  scope: string;
  objectives: string;
  executiveSummary: string;
  findings: Finding[];
  status: AuditStatus;
  complianceScore: number;
}
