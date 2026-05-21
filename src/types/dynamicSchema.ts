import { RiskLevel } from './schema';

export type DynamicComponentType =
  | 'header'
  | 'rich_content'
  | 'checklist'
  | 'observation'
  | 'yes_no_na'
  | 'multi_option'
  | 'table_grid'
  | 'signature'
  | 'image_upload'
  | 'image_carousel'
  | 'dynamic_dropdown'
  | 'kpi_summary'
  | 'recommendation';

export type TableCellType = 'text' | 'number' | 'yes_no' | 'dropdown' | 'textarea' | 'date';

export interface BaseComponentSchema {
  id: string;
  type: DynamicComponentType;
  title: string;
  required?: boolean;
}

export interface HeaderComponentSchema extends BaseComponentSchema {
  type: 'header';
  subtitle?: string;
  description?: string;
  category?: string;
  riskLevel?: RiskLevel;
}

export interface RichContentComponentSchema extends BaseComponentSchema {
  type: 'rich_content';
  content: string; // Markdown or HTML content
}

export interface ChecklistItem {
  id: string;
  question: string;
  riskLevel: RiskLevel;
  targetResolveDays?: number;
  required?: boolean;
}

export interface ChecklistComponentSchema extends BaseComponentSchema {
  type: 'checklist';
  items: ChecklistItem[];
}

export interface ObservationComponentSchema extends BaseComponentSchema {
  type: 'observation';
  question: string;
  placeholder?: string;
  allowImage?: boolean;
}

export interface YesNoNaComponentSchema extends BaseComponentSchema {
  type: 'yes_no_na';
  labels?: { yes: string; no: string; na: string };
  scores?: { yes: number; no: number; na: number };
  colors?: { yes: string; no: string; na: string };
  recoMapping?: { yes?: string; no?: string; na?: string };
}

export interface MultiOptionComponentSchema extends BaseComponentSchema {
  type: 'multi_option';
  options: string[];
  scores?: Record<string, number>;
  colors?: Record<string, string>;
}

export interface TableColumn {
  id: string;
  header: string;
  type: TableCellType;
  options?: string[]; // for dropdown cells
  calculation?: 'SUM' | 'AVG' | 'PRODUCT' | 'NONE'; // column summary calculation
}

export interface TableGridComponentSchema extends BaseComponentSchema {
  type: 'table_grid';
  columns: TableColumn[];
  defaultRowCount?: number;
  stickyHeader?: boolean;
}

export interface SignatureComponentSchema extends BaseComponentSchema {
  type: 'signature';
  placeholder?: string;
}

export interface ImageUploadComponentSchema extends BaseComponentSchema {
  type: 'image_upload';
  maxImages?: number; // default 3
  allowCamera?: boolean;
  allowGallery?: boolean;
}

export interface ImageCarouselComponentSchema extends BaseComponentSchema {
  type: 'image_carousel';
  targetComponentId?: string; // Links to an image_upload component's value
}

export interface DynamicDropdownComponentSchema extends BaseComponentSchema {
  type: 'dynamic_dropdown';
  sourceType: 'client' | 'site' | 'auditor' | 'organization' | 'template';
  dependsOn?: string; // id of parent dropdown component (e.g. client -> site)
}

export interface KpiSummaryComponentSchema extends BaseComponentSchema {
  type: 'kpi_summary';
  showCompliance?: boolean;
  showRiskScore?: boolean;
  showOverdue?: boolean;
}

export interface RecommendationComponentSchema extends BaseComponentSchema {
  type: 'recommendation';
  defaultRecommendation?: string;
}

export type DynamicComponent =
  | HeaderComponentSchema
  | RichContentComponentSchema
  | ChecklistComponentSchema
  | ObservationComponentSchema
  | YesNoNaComponentSchema
  | MultiOptionComponentSchema
  | TableGridComponentSchema
  | SignatureComponentSchema
  | ImageUploadComponentSchema
  | ImageCarouselComponentSchema
  | DynamicDropdownComponentSchema
  | KpiSummaryComponentSchema
  | RecommendationComponentSchema;

export interface DynamicChecklistSchema {
  id: string;
  title: string;
  description?: string;
  version: number;
  components: DynamicComponent[];
}

// Client Dynamic Responses State
export interface DynamicCellResponse {
  rowId: string;
  colId: string;
  value: string;
}

export interface DynamicComponentResponse {
  componentId: string;
  // Based on component type, answers are stored dynamically
  value?: string; // standard inputs, single select, dropdowns
  yesNoNa?: 'YES' | 'NO' | 'N/A';
  checklistAnswers?: {
    itemId: string;
    value: 'YES' | 'NO' | 'N/A' | '';
    remarks?: string;
    recommendation?: string;
    resolvedDays?: number;
    photos?: string[]; // photo ids/base64 strings
  }[];
  observationAnswer?: {
    answer: string;
    remarks?: string;
    recommendation?: string;
    photos?: string[];
  };
  tableRows?: DynamicCellResponse[]; // Grid values
  signatureBase64?: string;
  photos?: {
    id: string;
    base64Data: string;
    fileName: string;
    caption?: string;
  }[];
}

export interface DynamicAuditSession {
  id: string;
  schemaId: string;
  clientName: string;
  siteName: string;
  siteAddress?: string;
  auditorName: string;
  status: 'In_Progress' | 'Completed' | 'Synced';
  startedAt: string;
  completedAt?: string;
  responses: DynamicComponentResponse[];
}
