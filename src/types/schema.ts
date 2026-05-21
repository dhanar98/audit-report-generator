export type FieldType =
  | 'text'
  | 'textarea'
  | 'yes_no'
  | 'checkbox'
  | 'select'
  | 'score'
  | 'image'
  | 'signature'
  | 'remarks';

export type SectionType =
  | 'header'
  | 'checklist'
  | 'observation'
  | 'table'
  | 'recommendation'
  | 'signature';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface TemplateFieldSchema {
  id: string;
  title: string;
  type: FieldType;
  required: boolean;
  riskLevel: RiskLevel;
  recoMapping?: string;
  defaultValue?: string;
}

export interface TemplateTableSchema {
  id: string;
  title: string;
  columns: string[];
  rows: string[][];
}

export interface TemplateSectionSchema {
  id: string;
  title: string;
  description?: string;
  type: SectionType;
  orderIndex: number;
  fields?: TemplateFieldSchema[];
  tables?: TemplateTableSchema[];
}

export interface ChecklistSchema {
  id?: string;
  title: string;
  description?: string;
  version: number;
  sections: TemplateSectionSchema[];
}

// Client Side Execution Types
export interface AuditResponse {
  fieldId: string;
  value: string;
  remarks?: string;
  recommendation?: string;
  status?: 'Open' | 'Resolved';
}

export interface AuditSessionData {
  id: string;
  checklistId: string;
  siteId: string;
  siteName: string;
  clientName: string;
  auditorId: string;
  auditorName: string;
  status: 'In_Progress' | 'Completed' | 'Synced';
  startedAt: string;
  completedAt?: string;
  responses: AuditResponse[];
  photos: {
    id: string;
    fileName: string;
    mimeType: string;
    base64Data: string;
    caption?: string;
  }[];
}
