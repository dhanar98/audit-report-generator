import { AuditReport, Finding } from '../types/audit';

// Calculate compliance score based on findings:
// Start with 100.
// Open HIGH risk: -15 pts each
// Open MEDIUM risk: -8 pts each
// Open LOW risk: -3 pts each
// Resolved findings: 0 pts deducted
export function calculateComplianceScore(findings: Finding[]): number {
  let score = 100;
  
  findings.forEach((finding) => {
    if (finding.status === 'Open') {
      if (finding.riskLevel === 'HIGH') {
        score -= 15;
      } else if (finding.riskLevel === 'MEDIUM') {
        score -= 8;
      } else if (finding.riskLevel === 'LOW') {
        score -= 3;
      }
    }
  });

  return Math.max(0, Math.min(100, score));
}

export const INITIAL_AUDITS: AuditReport[] = [
  {
    id: 'audit-1',
    title: 'Q1 2026 Cybersecurity & Access Control Audit',
    company: 'Apex Global Technologies',
    auditorName: 'Sarah Jenkins, CISA',
    auditDate: '2026-05-15',
    scope: 'Production cloud infrastructure (AWS environment), Identity Access Management (IAM) configurations, and legacy data retrieval APIs.',
    objectives: 'Evaluate adherence to ISO 27001 controls, verify multi-factor authentication enforcement, inspect container security logs, and review incident response runbooks.',
    executiveSummary: 'This audit evaluated the cyber security posture of the Apex Global Technologies production cloud infrastructure. The core infrastructure displays strong compliance, utilizing secure VPC peering and encrypted database layers. However, critical gaps were identified in identity access controls. Most notably, a legacy customer archiving API remains active without MFA enforcement. Additionally, developer container dependencies contain multiple unpatched vulnerabilities. Remediation of high-risk items should begin immediately.',
    status: 'Completed',
    findings: [
      {
        id: 'finding-1-1',
        title: 'MFA Bypass Available on Legacy Customer Archive API',
        category: 'Identity & Access Management',
        riskLevel: 'HIGH',
        description: 'The API endpoint `/api/v1/archive-retrieval` is still actively querying database backups but does not enforce multi-factor authentication or modern token rotations, relying solely on static legacy API keys.',
        recommendation: 'Decommission this endpoint immediately. Transition all archive requests to the modern `/api/v2/secure-archive` route, which enforces OAuth 2.0 with conditional access and MFA.',
        status: 'Open',
      },
      {
        id: 'finding-1-2',
        title: 'Outdated Express.js and Lodash Containers in Kubernetes Node',
        category: 'Vulnerability Management',
        riskLevel: 'MEDIUM',
        description: 'Production web pods run container images utilizing Express 4.16 and Lodash 4.17.11. These package versions are vulnerable to prototype pollution and remote code execution exploits (CVE-2019-10744).',
        recommendation: 'Update node package manifests to resolve to Express >4.21.0 and Lodash >4.17.21. Integrate automated vulnerability checkers (like Snyk or npm audit) into the CI/CD pipeline.',
        status: 'Open',
      },
      {
        id: 'finding-1-3',
        title: 'Disaster Recovery Warm-Standby Dry Run Overdue',
        category: 'Business Continuity',
        riskLevel: 'LOW',
        description: 'While database replication scripts run successfully, the annual dry-run disaster recovery failover test for the primary region has not been conducted since March 2025.',
        recommendation: 'Schedule and execute a cross-region failover dry-run in a staging environment. Document completion metrics and upload the log to the compliance portal.',
        status: 'Resolved',
      },
    ],
    complianceScore: 77, // 100 - 15 (High Open) - 8 (Medium Open) = 77 (Low is Resolved)
  },
  {
    id: 'audit-2',
    title: '2026 SOX Internal Financial Controls Audit',
    company: 'Initech Software Systems',
    auditorName: 'David Webb, CPA',
    auditDate: '2026-05-20',
    scope: 'Accounts receivable processes, payroll authorization system, billing databases, and segregation of duties in the finance department.',
    objectives: 'Verify compliance with Sarbanes-Oxley (SOX) Section 404 requirements. Test key control points for payment approvals, system logs auditing, and access segregation.',
    executiveSummary: 'This preliminary audit focuses on the financial controls and bookkeeping procedures for the 2026 fiscal year at Initech. Baseline testing shows robust transaction ledger tracking, but reveals significant concerns regarding segregation of duties. We observed instances where a single administrator can both approve new vendor accounts and initiate bank disbursements. This control vulnerability must be addressed prior to external audit filings.',
    status: 'Draft',
    findings: [
      {
        id: 'finding-2-1',
        title: 'Lack of Segregation of Duties in Vendor Approval & Payment Release',
        category: 'Financial Operations',
        riskLevel: 'HIGH',
        description: 'In the billing portal, users with the "Senior Accountant" role are authorized to create new vendor profiles and also approve wire transfers to those same accounts, violating standard internal control rules.',
        recommendation: 'Implement a strict split control system where all vendor additions must be authorized by the Finance Director, and payment releases require a separate approval step by the Controller.',
        status: 'Open',
      },
      {
        id: 'finding-2-2',
        title: 'Absence of Automated Audit Logs on Financial DB Modifications',
        category: 'Database Administration',
        riskLevel: 'MEDIUM',
        description: 'Manual changes made directly to the SQL billing database by DBAs do not feed into the centralized log server (SIEM), meaning ad-hoc transaction corrections are not independently auditable.',
        recommendation: 'Enable read-only SQL Server Audit logs for the transaction database, routing the output stream directly to write-once storage in AWS S3 with access limited to the IT Compliance officer.',
        status: 'Open',
      },
    ],
    complianceScore: 77, // 100 - 15 (High) - 8 (Medium) = 77
  },
];
