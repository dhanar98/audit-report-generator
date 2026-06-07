import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  Settings, 
  FileText, 
  Grid, 
  AlertTriangle, 
  Sparkles,
  Save,
  Check,
  AlignLeft,
  UserCheck,
  Camera,
  Image as ImageIcon,
  BookOpen,
  PieChart,
  CornerDownRight,
  Eye,
  Sliders,
  Scissors,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ReportSchema, 
  ReportComponentSchema, 
  ReportComponentType, 
  ReportStyleConfig,
  ReportDataMapping,
  ReportVisibilityRule,
  ReportLayoutConfig 
} from '@/types/reportSchema';
import { ChecklistSchema } from '@/types/schema';
import { DynamicChecklistSchema } from '@/types/dynamicSchema';

const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

const REPORT_COMPONENTS_INFO = [
  { type: 'cover_page', label: 'Cover Page', icon: BookOpen, description: 'Cover sheet with client, site, date, and branding.', category: 'Layout' },
  { type: 'document_info', label: 'Document Info', icon: UserCheck, description: 'Table of client details, site data, and auditor credentials.', category: 'Metadata' },
  { type: 'table_of_contents', label: 'Table Of Contents', icon: FileText, description: 'Auto-compiled page-indexed table of contents.', category: 'Navigation' },
  { type: 'executive_summary', label: 'Executive Summary', icon: AlignLeft, description: 'High-level synthesis of findings and compliance statement.', category: 'Content' },
  { type: 'rich_content', label: 'Rich Content', icon: AlignLeft, description: 'Static custom text, HTML guidelines, or site rules.', category: 'Content' },
  { type: 'measurement_table', label: 'Measurement Table', icon: Grid, description: 'Renders numeric grid logs or electrical readings.', category: 'Data Mapping' },
  { type: 'observation_matrix', label: 'Observation Matrix', icon: AlertTriangle, description: 'Listings of non-compliance hazards and observations.', category: 'Data Mapping' },
  { type: 'recommendation_matrix', label: 'Recommendation Matrix', icon: Sliders, description: 'Corrective actions, target resolve dates, and mapping.', category: 'Data Mapping' },
  { type: 'photo_gallery', label: 'Photo Gallery', icon: Camera, description: 'Grid of uploaded audit images with custom captions.', category: 'Evidence' },
  { type: 'image_comparison', label: 'Image Comparison', icon: ImageIcon, description: 'Side-by-side display of before/after or defect comparisons.', category: 'Evidence' },
  { type: 'kpi_summary', label: 'KPI Summary', icon: PieChart, description: 'Safety scores, risk levels, and breakdown counters.', category: 'KPI & Metrics' },
  { type: 'conclusion', label: 'Conclusion', icon: AlignLeft, description: 'Summary recommendations and compliance outcomes.', category: 'Content' },
  { type: 'appendix', label: 'Appendix', icon: BookOpen, description: 'Supporting regulations, standards, or documentation details.', category: 'Layout' },
  { type: 'signature_block', label: 'Signature Block', icon: UserCheck, description: 'Sign-off panel for auditor, manager, or site contact.', category: 'Metadata' },
  { type: 'page_break', label: 'Page Break', icon: Scissors, description: 'Forces a clean print layout division (PDF page break).', category: 'Layout' }
] as const;

interface ReportBuilderProps {
  auditTemplates: (ChecklistSchema | DynamicChecklistSchema)[];
  initialSchema?: ReportSchema | null;
  onPublish: (schema: ReportSchema) => void;
  onSaveDraft: (schema: ReportSchema) => void;
  onBack: () => void;
}

export function ReportBuilder({ auditTemplates, initialSchema, onPublish, onSaveDraft, onBack }: ReportBuilderProps) {
  // State for report schema
  const [schema, setSchema] = useState<ReportSchema>(() => {
    if (initialSchema) return initialSchema;

    const defaultAuditTemplate = auditTemplates[0]?.id || 'tpl_default';
    return {
      id: `rep_${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Custom Report Design',
      description: 'Drag, configure, and compile your custom audit layout',
      auditTemplateId: defaultAuditTemplate,
      version: 1,
      components: [
        {
          id: generateId('rcomp'),
          type: 'cover_page',
          title: 'Custom Audit Report Cover',
          subtitle: 'Aura Veritas Executive Report',
          layout: { colSpan: 2, pageBreakAfter: true }
        },
        {
          id: generateId('rcomp'),
          type: 'document_info',
          title: 'Audit Metadata & Stakeholders',
          layout: { colSpan: 2 }
        },
        {
          id: generateId('rcomp'),
          type: 'kpi_summary',
          title: 'Compliance Dashboard Metrics',
          layout: { colSpan: 2 }
        }
      ]
    };
  });

  const [activeCompId, setActiveCompId] = useState<string>(
    schema.components?.[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'properties' | 'mapping' | 'visibility' | 'layout'>('properties');
  const [builderView, setBuilderView] = useState<'canvas' | 'components' | 'config'>('canvas');

  // Find linked audit template
  const linkedAuditTemplate = auditTemplates.find(t => t.id === schema.auditTemplateId);

  // Extract fields/components of linked template for mapping
  const auditTemplateFields = React.useMemo(() => {
    if (!linkedAuditTemplate) return [];
    
    // Check if V2 schema
    if ('components' in linkedAuditTemplate) {
      return (linkedAuditTemplate as DynamicChecklistSchema).components.map(c => ({
        id: c.id,
        title: c.title,
        type: c.type
      }));
    } else {
      // V1 schema
      const fields: { id: string; title: string; type: string }[] = [];
      linkedAuditTemplate.sections.forEach(sec => {
        fields.push({ id: sec.id, title: `Section: ${sec.title}`, type: sec.type });
        if (sec.fields) {
          sec.fields.forEach(f => {
            fields.push({ id: f.id, title: `Field: ${f.title}`, type: f.type });
          });
        }
        if (sec.tables) {
          sec.tables.forEach(t => {
            fields.push({ id: t.id, title: `Table Grid: ${t.title}`, type: 'table' });
          });
        }
      });
      return fields;
    }
  }, [linkedAuditTemplate]);

  // Sync initial schema updates
  useEffect(() => {
    if (initialSchema) {
      setSchema(initialSchema);
      if (initialSchema.components?.length > 0) {
        setActiveCompId(initialSchema.components[0].id);
      }
    }
  }, [initialSchema]);

  const activeCompIndex = schema.components.findIndex(c => c.id === activeCompId);
  const activeComp = activeCompIndex > -1 ? schema.components[activeCompIndex] : null;

  const updateActiveComponent = (updater: (comp: ReportComponentSchema) => void) => {
    if (activeCompIndex === -1) return;
    setSchema(prev => {
      const comps = [...prev.components];
      const updated = { ...comps[activeCompIndex] };
      updater(updated);
      comps[activeCompIndex] = updated;
      return { ...prev, components: comps };
    });
  };

  const addComponent = (type: ReportComponentType) => {
    const info = REPORT_COMPONENTS_INFO.find(i => i.type === type);
    const newComp: ReportComponentSchema = {
      id: generateId('rcomp'),
      type,
      title: info ? info.label : `New ${type.toUpperCase()}`,
      subtitle: type === 'cover_page' ? 'Inspection Report' : undefined,
      content: type === 'executive_summary' || type === 'conclusion' || type === 'rich_content'
        ? '<p>Enter text block description...</p>'
        : undefined,
      layout: {
        colSpan: 2,
        pageBreakAfter: type === 'cover_page' || type === 'page_break',
        marginTop: 10,
        marginBottom: 10
      },
      style: {
        alignment: type === 'cover_page' ? 'center' : 'left',
        fontSizeTitle: 'medium'
      }
    };

    // Initialize mapping defaults
    if (type === 'measurement_table' || type === 'photo_gallery' || type === 'image_comparison') {
      const defaultField = auditTemplateFields.find(f => 
        (type === 'measurement_table' && (f.type === 'table' || f.type === 'table_grid')) ||
        (type === 'photo_gallery' && (f.type === 'image' || f.type === 'image_upload'))
      );
      newComp.dataMapping = {
        sourceComponentId: defaultField?.id || ''
      };
    } else if (type === 'observation_matrix' || type === 'recommendation_matrix') {
      newComp.dataMapping = {
        observationFilter: 'NON_COMPLIANT',
        includeRemarks: true,
        includeRecommendations: true
      };
    }

    setSchema(prev => ({
      ...prev,
      components: [...prev.components, newComp]
    }));
    setActiveCompId(newComp.id);
  };

  const deleteComponent = (id: string) => {
    if (schema.components.length <= 1) return;
    const nextComps = schema.components.filter(c => c.id !== id);
    setSchema(prev => ({ ...prev, components: nextComps }));
    if (activeCompId === id) {
      setActiveCompId(nextComps[0].id);
    }
  };

  const duplicateComponent = (id: string) => {
    const original = schema.components.find(c => c.id === id);
    if (!original) return;
    const duplicated: ReportComponentSchema = {
      ...original,
      id: generateId('rcomp'),
      title: `${original.title} (Copy)`
    };
    setSchema(prev => ({
      ...prev,
      components: [...prev.components, duplicated]
    }));
    setActiveCompId(duplicated.id);
  };

  const moveComponent = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === schema.components.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const nextComps = [...schema.components];
    const temp = nextComps[idx];
    nextComps[idx] = nextComps[targetIdx];
    nextComps[targetIdx] = temp;

    setSchema(prev => ({ ...prev, components: nextComps }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full overflow-hidden text-foreground bg-background">
      
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 sm:p-4 bg-muted/20 border-b border-border/80 sticky top-0 z-10 backdrop-blur-sm gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-8 text-xs shrink-0 mt-0.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          <div className="flex flex-col text-left min-w-0">
          <input
            value={schema.title}
            onChange={(e) => setSchema(prev => ({ ...prev, title: e.target.value }))}
            className="text-sm sm:text-lg font-bold bg-transparent border-b border-transparent hover:border-border/80 focus:border-primary focus:outline-none w-full sm:w-[350px] transition-all text-primary"
            placeholder="Report layout title..."
          />
          <div className="flex items-center space-x-2 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            <span>Linked Audit Checklist:</span>
            <select
              value={schema.auditTemplateId}
              onChange={(e) => setSchema(prev => ({ ...prev, auditTemplateId: e.target.value, components: [] }))}
              className="bg-transparent border-b border-border/40 focus:outline-none text-foreground font-semibold py-0.5"
            >
              {auditTemplates.map(t => (
                <option key={t.id} value={t.id} className="bg-card text-foreground">{t.title}</option>
              ))}
            </select>
          </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 justify-end shrink-0">
          <span className="text-[9px] sm:text-[10px] bg-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
            Report Builder
          </span>
          <Button variant="outline" size="sm" onClick={() => onSaveDraft(schema)} className="h-8 text-xs border-primary/30 text-foreground hover:bg-primary/10 px-2 sm:px-3">
            <Save className="w-3.5 h-3.5 mr-1 sm:mr-2" /> Save Layout
          </Button>
          <Button size="sm" onClick={() => onPublish(schema)} className="h-8 text-xs bg-primary hover:bg-primary/95 px-2 sm:px-3">
            <Check className="w-3.5 h-3.5 mr-1 sm:mr-2" /> Publish Design
          </Button>
        </div>
      </div>

      {/* Mobile panel selector tabs */}
      <div className="flex lg:hidden bg-muted/40 border-b border-border/60 p-1 text-xs justify-around shrink-0">
        <button
          type="button"
          onClick={() => setBuilderView('components')}
          className={`flex-1 text-center py-2 rounded-md font-semibold transition-all ${builderView === 'components' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          Report Modules
        </button>
        <button
          type="button"
          onClick={() => setBuilderView('canvas')}
          className={`flex-1 text-center py-2 rounded-md font-semibold transition-all ${builderView === 'canvas' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          Layout Canvas
        </button>
        <button
          type="button"
          onClick={() => setBuilderView('config')}
          className={`flex-1 text-center py-2 rounded-md font-semibold transition-all ${builderView === 'config' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          Module Settings
        </button>
      </div>

      {/* Main 3-panel workspace layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR: Report Modules Library */}
        <div className={`${builderView === 'components' ? 'flex' : 'hidden lg:flex'} w-full lg:w-72 bg-muted/30 lg:border-r border-border/85 flex-col justify-between overflow-y-auto p-4 space-y-4 shrink-0`}>
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Report Layout Flow</span>
              <span className="text-xs bg-muted text-foreground px-2 py-0.5 rounded-full font-mono">
                {schema.components.length}
              </span>
            </div>
            
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {schema.components.map((comp, idx) => (
                <div 
                  key={comp.id}
                  onClick={() => {
                    setActiveCompId(comp.id);
                  }}
                  className={`p-2.5 rounded-lg flex items-center justify-between border cursor-pointer transition-all ${
                    activeCompId === comp.id 
                      ? 'bg-primary/10 border-primary shadow-sm' 
                      : 'bg-card border-border/70 hover:border-border'
                  }`}
                >
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                    <span className="text-xs font-medium truncate">{comp.title}</span>
                  </div>
                  
                  <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); moveComponent(idx, 'up'); }} disabled={idx === 0} className="p-0.5 hover:bg-muted text-muted-foreground rounded disabled:opacity-40">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveComponent(idx, 'down'); }} disabled={idx === schema.components.length - 1} className="p-0.5 hover:bg-muted text-muted-foreground rounded disabled:opacity-40">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); duplicateComponent(comp.id); }} className="p-0.5 hover:bg-muted text-muted-foreground rounded">
                      <Copy className="w-3 h-3" />
                    </button>
                    {schema.components.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); deleteComponent(comp.id); }} className="p-0.5 hover:bg-muted text-destructive rounded">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border/80">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">Add Report Module</span>
              
              <div className="space-y-3">
                {['Layout', 'Metadata', 'Content', 'Data Mapping', 'Evidence', 'KPI & Metrics'].map(category => (
                  <div key={category} className="space-y-1">
                    <span className="text-[9px] font-bold text-primary/75 uppercase tracking-wider block">{category}</span>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      {REPORT_COMPONENTS_INFO.filter(item => item.category === category).map(item => (
                        <button
                          key={item.type}
                          onClick={() => addComponent(item.type)}
                          className="flex items-center text-left py-1.5 px-2.5 rounded border border-border/60 hover:bg-primary/5 hover:border-primary/50 text-[11px] font-medium transition-colors"
                        >
                          <item.icon className="w-3.5 h-3.5 mr-2 text-indigo-400 shrink-0" />
                          <div className="truncate">
                            <div className="font-semibold text-foreground leading-none">{item.label}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button variant="ghost" size="xs" onClick={onBack} className="w-full justify-start text-xs text-muted-foreground mt-4 hover:text-foreground">
            ← Back to Report Designs
          </Button>
        </div>

        {/* CENTER CANVAS: A4 Printed Preview Canvas style */}
        <div className={`${builderView === 'canvas' ? 'flex' : 'hidden lg:flex'} flex-1 bg-muted/20 overflow-y-auto p-4 sm:p-6 flex-col space-y-6 items-center`}>
          <div className="w-full max-w-2xl bg-white text-black min-h-[842px] shadow-2xl rounded-sm p-8 sm:p-12 border border-neutral-300 relative text-left flex flex-col justify-between">
            <div>
              {/* Header block (Simulated PDF layout) */}
              <div className="flex items-center justify-between border-b-2 border-indigo-900 pb-4 mb-8">
                <div>
                  <h1 className="text-xl font-extrabold text-indigo-900 uppercase">AURA VERITAS REPORT CANVAS</h1>
                  <span className="text-xs text-neutral-500 font-mono">PWA COMPLIANCE AUTO-RENDER LAYOUT</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-indigo-900">{schema.title || 'Untitled Report'}</span>
                  <p className="text-[10px] text-neutral-400">VeriAudit Custom Report v1.0</p>
                </div>
              </div>

              {/* Dynamic canvas components */}
              <div className="space-y-6">
                {schema.components.map((comp, idx) => {
                  const isActive = comp.id === activeCompId;
                  return (
                    <div 
                      key={comp.id}
                      onClick={() => {
                        setActiveCompId(comp.id);
                        setBuilderView('config');
                      }}
                      className={`relative p-5 rounded-lg border transition-all cursor-pointer ${
                        isActive
                          ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/20'
                          : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/40'
                      }`}
                    >
                      {/* Component operations overlay */}
                      <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 hover:opacity-100 focus-within:opacity-100 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); moveComponent(idx, 'up'); }} className="p-1 hover:bg-neutral-200 text-neutral-600 rounded">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); moveComponent(idx, 'down'); }} className="p-1 hover:bg-neutral-200 text-neutral-600 rounded">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); duplicateComponent(comp.id); }} className="p-1 hover:bg-neutral-200 text-neutral-600 rounded">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteComponent(comp.id); }} className="p-1 hover:bg-neutral-200 text-red-600 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Visual rendering according to component type */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono font-bold bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded">
                            {comp.type.replace('_', ' ').toUpperCase()}
                          </span>
                          {comp.layout?.pageBreakAfter && (
                            <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              Page Break After
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-black text-indigo-900">{comp.title}</h4>
                        {comp.subtitle && <p className="text-xs text-neutral-600 font-medium">{comp.subtitle}</p>}

                        {/* Custom descriptions inside blocks */}
                        {comp.type === 'cover_page' && (
                          <div className="py-8 border border-dashed border-neutral-300 bg-neutral-50 rounded text-center text-xs text-neutral-400">
                            [ Cover page branding, organization logos, and client info maps here ]
                          </div>
                        )}

                        {comp.type === 'document_info' && (
                          <div className="grid grid-cols-2 gap-4 text-[11px] text-neutral-700 border p-3 bg-white rounded">
                            <div><strong>Client:</strong> [Dynamic Client Selection]</div>
                            <div><strong>Auditor:</strong> [Dynamic Auditor Name]</div>
                            <div><strong>Site Branch:</strong> [Dynamic Site Name]</div>
                            <div><strong>Inspection Date:</strong> [Session Completed Date]</div>
                          </div>
                        )}

                        {comp.type === 'executive_summary' && (
                          <div className="text-[11px] text-neutral-600 italic border-l-4 border-indigo-700 pl-3">
                            "Summary mapping outputs of compliance metrics, high severity hazards, and summary recommendations designed for C-Suite reading."
                          </div>
                        )}

                        {comp.type === 'measurement_table' && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-neutral-400 font-mono">Maps to Checkpoint Data Grid: {comp.dataMapping?.sourceComponentId || 'None Selected'}</span>
                            <table className="w-full text-[10px] border border-collapse border-neutral-300">
                              <thead>
                                <tr className="bg-neutral-100 border-b border-neutral-300 text-left">
                                  <th className="p-1.5 border-r border-neutral-300">Reading Variable</th>
                                  <th className="p-1.5 border-r border-neutral-300">Measured Value</th>
                                  <th className="p-1.5">Compliance status</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-neutral-200">
                                  <td className="p-1.5 border-r border-neutral-300 font-mono text-neutral-400">Sample Cell A1</td>
                                  <td className="p-1.5 border-r border-neutral-300 font-mono text-neutral-400">Sample Cell A2</td>
                                  <td className="p-1.5 font-mono text-neutral-400">Sample Cell A3</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {comp.type === 'observation_matrix' && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-neutral-400 font-mono">Filters: {comp.dataMapping?.observationFilter || 'NON_COMPLIANT'} Checkpoint Failures</span>
                            <div className="border border-red-200 bg-red-50/20 p-3 rounded text-[11px] text-red-900">
                              <strong>Checklist Hazard #01:</strong> Main Distribution Board is not dustproof. [HIGH RISK]
                              <p className="text-[10px] text-neutral-500 mt-1">Observation: Water leaks found nearby. Recommendations: Relocate UPS batteries to fireproof cabinet.</p>
                            </div>
                          </div>
                        )}

                        {comp.type === 'kpi_summary' && (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-neutral-100 rounded text-center">
                              <span className="text-[9px] text-neutral-500 uppercase block font-bold">Safety Score</span>
                              <span className="text-sm font-extrabold text-green-600">[Dynamic Score]%</span>
                            </div>
                            <div className="p-3 bg-neutral-100 rounded text-center">
                              <span className="text-[9px] text-neutral-500 uppercase block font-bold">Total Non-Compliances</span>
                              <span className="text-sm font-extrabold text-red-600">[Deduction Counter]</span>
                            </div>
                            <div className="p-3 bg-neutral-100 rounded text-center">
                              <span className="text-[9px] text-neutral-500 uppercase block font-bold">Risk Assessment</span>
                              <span className="text-sm font-extrabold text-yellow-600">[Summary Level]</span>
                            </div>
                          </div>
                        )}

                        {comp.type === 'photo_gallery' && (
                          <div className="grid grid-cols-3 gap-2">
                            <div className="aspect-[4/3] bg-neutral-200 rounded flex items-center justify-center text-[10px] text-neutral-400">Photo A</div>
                            <div className="aspect-[4/3] bg-neutral-200 rounded flex items-center justify-center text-[10px] text-neutral-400">Photo B</div>
                            <div className="aspect-[4/3] bg-neutral-200 rounded flex items-center justify-center text-[10px] text-neutral-400">Photo C</div>
                          </div>
                        )}

                        {comp.type === 'signature_block' && (
                          <div className="grid grid-cols-2 gap-8 pt-8">
                            <div className="border-t border-neutral-400 pt-2 text-[10px]">
                              <span className="font-bold block">Lead Auditor Signature</span>
                              <p className="text-neutral-400 mt-4">[Digital Audit Signature Typeout]</p>
                            </div>
                            <div className="border-t border-neutral-400 pt-2 text-[10px]">
                              <span className="font-bold block">Branch Manager Sign-off</span>
                              <p className="text-neutral-400 mt-4">[Verification Acknowledged]</p>
                            </div>
                          </div>
                        )}

                        {comp.type === 'page_break' && (
                          <div className="border-t-2 border-dashed border-red-300 py-1 text-center text-[9px] font-bold text-red-400 uppercase tracking-widest">
                            --- PDF PRINT LAYOUT PAGE DIVISION ---
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulated PDF Footer */}
            <div className="border-t border-neutral-200 pt-3 mt-12 flex items-center justify-between text-[10px] text-neutral-400">
              <span>Aura Veritas Compliance Platform</span>
              <span className="font-mono">Page 1 of [Dynamic count]</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Configurator Panel */}
        <div className={`${builderView === 'config' ? 'flex' : 'hidden lg:flex'} w-full lg:w-80 bg-muted/30 lg:border-l border-border/85 p-5 flex-col overflow-y-auto space-y-4 shrink-0`}>
          <div className="flex items-center space-x-2 border-b border-border/80 pb-3 mb-1 text-left">
            <Settings className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Module Configurator</h4>
          </div>

          {activeComp ? (
            <div className="space-y-5 text-xs text-left">
              {/* Properties Tab Selection */}
              <div className="flex bg-muted/40 border rounded p-0.5 text-[10px] justify-between">
                <button onClick={() => setActiveTab('properties')} className={`flex-1 text-center py-1.5 rounded font-semibold transition-all ${activeTab === 'properties' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'}`}>Props</button>
                <button onClick={() => setActiveTab('mapping')} className={`flex-1 text-center py-1.5 rounded font-semibold transition-all ${activeTab === 'mapping' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'}`}>Mapping</button>
                <button onClick={() => setActiveTab('visibility')} className={`flex-1 text-center py-1.5 rounded font-semibold transition-all ${activeTab === 'visibility' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'}`}>Visible</button>
                <button onClick={() => setActiveTab('layout')} className={`flex-1 text-center py-1.5 rounded font-semibold transition-all ${activeTab === 'layout' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'}`}>Layout</button>
              </div>

              {/* PROPERTIES TAB */}
              {activeTab === 'properties' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground block">Component Label Title</span>
                    <Input 
                      value={activeComp.title}
                      onChange={(e) => updateActiveComponent(c => { c.title = e.target.value; })}
                      className="h-8 text-xs bg-card"
                    />
                  </div>

                  {activeComp.type === 'cover_page' && (
                    <div className="space-y-1">
                      <span className="font-semibold text-muted-foreground block">Cover Page Subtitle</span>
                      <Input 
                        value={activeComp.subtitle || ''}
                        onChange={(e) => updateActiveComponent(c => { c.subtitle = e.target.value; })}
                        className="h-8 text-xs bg-card"
                      />
                    </div>
                  )}

                  {(activeComp.type === 'executive_summary' || activeComp.type === 'rich_content' || activeComp.type === 'conclusion') && (
                    <div className="space-y-1">
                      <span className="font-semibold text-muted-foreground block">Static Content (HTML allowed)</span>
                      <Textarea 
                        value={activeComp.content || ''}
                        onChange={(e) => updateActiveComponent(c => { c.content = e.target.value; })}
                        className="min-h-[140px] text-xs bg-card font-mono"
                        placeholder="<p>Enter default narrative...</p>"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground block">Title alignment</span>
                    <select
                      value={activeComp.style?.alignment || 'left'}
                      onChange={(e) => updateActiveComponent(c => {
                        c.style = { ...c.style, alignment: e.target.value as any };
                      })}
                      className="w-full bg-card border rounded-md p-1.5 text-xs focus:ring-1 focus:ring-primary"
                    >
                      <option value="left">Left aligned</option>
                      <option value="center">Center aligned</option>
                      <option value="right">Right aligned</option>
                    </select>
                  </div>
                </div>
              )}

              {/* MAPPING TAB */}
              {activeTab === 'mapping' && (
                <div className="space-y-4">
                  {/* Observation matrix options */}
                  {['observation_matrix', 'recommendation_matrix'].includes(activeComp.type) ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="font-semibold text-muted-foreground block">Compliance filter type</span>
                        <select
                          value={activeComp.dataMapping?.observationFilter || 'NON_COMPLIANT'}
                          onChange={(e) => updateActiveComponent(c => {
                            c.dataMapping = { ...c.dataMapping, observationFilter: e.target.value as any };
                          })}
                          className="w-full bg-card border rounded-md p-1.5 text-xs focus:ring-1 focus:ring-primary"
                        >
                          <option value="ALL">Show All questions</option>
                          <option value="NON_COMPLIANT">Only Show Non-Compliance (Failures)</option>
                          <option value="COMPLIANT">Only Show Compliant (Passes)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/25">
                        <span className="font-semibold text-muted-foreground">Include remarks observations</span>
                        <input
                          type="checkbox"
                          checked={activeComp.dataMapping?.includeRemarks ?? true}
                          onChange={(e) => updateActiveComponent(c => {
                            c.dataMapping = { ...c.dataMapping, includeRemarks: e.target.checked };
                          })}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/25">
                        <span className="font-semibold text-muted-foreground">Include recommendations map</span>
                        <input
                          type="checkbox"
                          checked={activeComp.dataMapping?.includeRecommendations ?? true}
                          onChange={(e) => updateActiveComponent(c => {
                            c.dataMapping = { ...c.dataMapping, includeRecommendations: e.target.checked };
                          })}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : ['measurement_table', 'photo_gallery', 'image_comparison'].includes(activeComp.type) ? (
                    <div className="space-y-1">
                      <span className="font-semibold text-muted-foreground block">Select linked checklist element</span>
                      <select
                        value={activeComp.dataMapping?.sourceComponentId || ''}
                        onChange={(e) => updateActiveComponent(c => {
                          c.dataMapping = { ...c.dataMapping, sourceComponentId: e.target.value };
                        })}
                        className="w-full bg-card border rounded-md p-1.5 text-xs focus:ring-1 focus:ring-primary"
                      >
                        <option value="">-- No Source Mapping --</option>
                        {auditTemplateFields.map(f => (
                          <option key={f.id} value={f.id}>{f.title} ({f.type})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground text-[11px] italic">
                      This component does not require a dynamic checklist mapping.
                    </div>
                  )}
                </div>
              )}

              {/* VISIBILITY TAB */}
              {activeTab === 'visibility' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground block">Visibility condition</span>
                    <select
                      value={activeComp.visibilityRules?.condition || 'always'}
                      onChange={(e) => updateActiveComponent(c => {
                        c.visibilityRules = { 
                          condition: e.target.value as any,
                          scoreComparison: 'lt',
                          targetScore: 90
                        };
                      })}
                      className="w-full bg-card border rounded-md p-1.5 text-xs focus:ring-1 focus:ring-primary"
                    >
                      <option value="always">Always show in report</option>
                      <option value="on_compliance_score">Conditional on compliance score</option>
                      <option value="on_component_value">Conditional on audit question answer</option>
                    </select>
                  </div>

                  {activeComp.visibilityRules?.condition === 'on_compliance_score' && (
                    <div className="space-y-3 p-3 rounded bg-card/20 border border-border">
                      <div className="space-y-1">
                        <span className="font-semibold text-muted-foreground block">Comparison</span>
                        <select
                          value={activeComp.visibilityRules.scoreComparison || 'lt'}
                          onChange={(e) => updateActiveComponent(c => {
                            if (c.visibilityRules) {
                              c.visibilityRules.scoreComparison = e.target.value as any;
                            }
                          })}
                          className="w-full bg-card border rounded p-1 text-[11px]"
                        >
                          <option value="lt">Is Less Than (&lt;)</option>
                          <option value="lte">Is Less Than Or Equal (&le;)</option>
                          <option value="gt">Is Greater Than (&gt;)</option>
                          <option value="gte">Is Greater Than Or Equal (&ge;)</option>
                          <option value="eq">Is Equal (=)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold text-muted-foreground block">Target Safety Score (%)</span>
                        <Input 
                          type="number"
                          value={activeComp.visibilityRules.targetScore ?? 90}
                          onChange={(e) => updateActiveComponent(c => {
                            if (c.visibilityRules) {
                              c.visibilityRules.targetScore = parseInt(e.target.value) || 0;
                            }
                          })}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {activeComp.visibilityRules?.condition === 'on_component_value' && (
                    <div className="space-y-3 p-3 rounded bg-card/20 border border-border">
                      <div className="space-y-1">
                        <span className="font-semibold text-muted-foreground block">Linked Question Component</span>
                        <select
                          value={activeComp.visibilityRules.targetComponentId || ''}
                          onChange={(e) => updateActiveComponent(c => {
                            if (c.visibilityRules) {
                              c.visibilityRules.targetComponentId = e.target.value;
                            }
                          })}
                          className="w-full bg-card border rounded p-1 text-[11px]"
                        >
                          <option value="">-- Select Question --</option>
                          {auditTemplateFields.map(f => (
                            <option key={f.id} value={f.id}>{f.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold text-muted-foreground block">Triggers display when value equals:</span>
                        <Input 
                          value={activeComp.visibilityRules.targetValue || ''}
                          onChange={(e) => updateActiveComponent(c => {
                            if (c.visibilityRules) {
                              c.visibilityRules.targetValue = e.target.value;
                            }
                          })}
                          placeholder="e.g. NO"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LAYOUT TAB */}
              {activeTab === 'layout' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/25">
                    <span className="font-semibold text-muted-foreground">Force page break after</span>
                    <input
                      type="checkbox"
                      checked={activeComp.layout?.pageBreakAfter || false}
                      onChange={(e) => updateActiveComponent(c => {
                        c.layout = { ...c.layout, pageBreakAfter: e.target.checked };
                      })}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground block">Grid display width</span>
                    <select
                      value={activeComp.layout?.colSpan || 2}
                      onChange={(e) => updateActiveComponent(c => {
                        c.layout = { ...c.layout, colSpan: parseInt(e.target.value) as any };
                      })}
                      className="w-full bg-card border rounded-md p-1.5 text-xs focus:ring-1 focus:ring-primary"
                    >
                      <option value="2">Full page width (100%)</option>
                      <option value="1">Half page width (50%)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground block">Spacing Top (px)</span>
                    <Input 
                      type="number"
                      value={activeComp.layout?.marginTop ?? 10}
                      onChange={(e) => updateActiveComponent(c => {
                        c.layout = { ...c.layout, marginTop: parseInt(e.target.value) || 0 };
                      })}
                      className="h-8 text-xs bg-card"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground block">Spacing Bottom (px)</span>
                    <Input 
                      type="number"
                      value={activeComp.layout?.marginBottom ?? 10}
                      onChange={(e) => updateActiveComponent(c => {
                        c.layout = { ...c.layout, marginBottom: parseInt(e.target.value) || 0 };
                      })}
                      className="h-8 text-xs bg-card"
                    />
                  </div>
                </div>
              )}
              
              <div className="p-3 border rounded bg-card/5 space-y-1">
                <span className="font-bold text-[10px] text-muted-foreground uppercase block font-mono">Module system ID:</span>
                <span className="font-mono text-[9px] text-foreground select-all">{activeComp.id}</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <span className="text-[11px] text-muted-foreground">Select a report module from the canvas to edit styles, visibility rules, or dynamic mappings.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
