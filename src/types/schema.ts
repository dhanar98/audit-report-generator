export type FieldType =
  | 'text'
  | 'textarea'
  | 'yes_no'
  | 'yes_no_na'
  | 'multi_option'
  | 'checkbox'
  | 'select'
  | 'score'
  | 'image'
  | 'signature'
  | 'remarks'
  | 'date'
  | 'number';

export type SectionType =
  | 'header'
  | 'checklist'
  | 'observation'
  | 'table'
  | 'recommendation'
  | 'signature'
  | 'rich_content'
  | 'dynamic_dropdown'
  | 'yes_no_na'
  | 'multi_option'
  | 'image_upload'
  | 'image_carousel'
  | 'kpi_summary';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface TemplateFieldSchema {
  id: string;
  title: string;
  type: FieldType;
  required: boolean;
  riskLevel: RiskLevel;
  recoMapping?: string;
  defaultValue?: string;
  options?: string[]; // for multi_option fields
}

export type TableCellType = 'text' | 'number' | 'yes_no' | 'dropdown' | 'textarea' | 'date';

export interface TableColumn {
  id: string;
  header: string;
  type: TableCellType;
  options?: string[]; // for dropdown cells
  calculation?: 'SUM' | 'AVG' | 'PRODUCT' | 'NONE'; // column summary calculation
}

export interface TemplateTableSchema {
  id: string;
  title: string;
  columns: (string | TableColumn)[];
  rows: any[][];
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
  signatureBase64?: string; // signature support
  photos?: any[]; // section photos / component photos support
  tableRows?: any[]; // grid table support
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
