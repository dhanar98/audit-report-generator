export type ReportComponentType =
  | 'cover_page'
  | 'document_info'
  | 'table_of_contents'
  | 'executive_summary'
  | 'rich_content'
  | 'measurement_table'
  | 'observation_matrix'
  | 'recommendation_matrix'
  | 'photo_gallery'
  | 'image_comparison'
  | 'kpi_summary'
  | 'conclusion'
  | 'appendix'
  | 'signature_block'
  | 'page_break';

export interface ReportStyleConfig {
  themeColor?: string; // hex color code
  accentColor?: string; // hex color code
  fontSizeTitle?: 'small' | 'medium' | 'large';
  alignment?: 'left' | 'center' | 'right';
  paddingTop?: number;
  paddingBottom?: number;
}

export interface ReportDataMapping {
  sourceComponentId?: string; // Links to checklist component ID (e.g., table_grid, checklist, image_upload)
  observationFilter?: 'ALL' | 'NON_COMPLIANT' | 'COMPLIANT'; // For observation and recommendation matrices
  includeRemarks?: boolean;
  includeRecommendations?: boolean;
  customMappingKey?: string; // for custom static mappings
}

export interface ReportVisibilityRule {
  condition: 'always' | 'on_compliance_score' | 'on_component_value';
  scoreComparison?: 'lt' | 'gt' | 'eq' | 'lte' | 'gte';
  targetScore?: number;
  targetComponentId?: string;
  targetValue?: string; // e.g. "NO" or "YES"
}

export interface ReportLayoutConfig {
  colSpan?: 1 | 2; // grid column spans: 1 is half width, 2 is full width
  pageBreakAfter?: boolean;
  marginTop?: number;
  marginBottom?: number;
}

export interface ReportComponentSchema {
  id: string;
  type: ReportComponentType;
  title: string;
  subtitle?: string;
  content?: string; // For rich_text / executive_summary static text or markdown
  style?: ReportStyleConfig;
  dataMapping?: ReportDataMapping;
  visibilityRules?: ReportVisibilityRule;
  layout?: ReportLayoutConfig;
}

export interface ReportSchema {
  id: string;
  title: string;
  description?: string;
  auditTemplateId: string; // Links to ChecklistSchema.id (v1 or v2)
  version: number;
  components: ReportComponentSchema[];
}
