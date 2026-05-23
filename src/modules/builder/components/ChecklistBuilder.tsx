import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  Settings, 
  FileText, 
  CheckSquare, 
  Grid, 
  AlertTriangle, 
  FileCode,
  Sparkles,
  Save,
  Check,
  AlignLeft,
  UserCheck,
  HelpCircle,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TableEditor } from './TableEditor';
import { 
  ChecklistSchema, 
  TemplateSectionSchema, 
  TemplateFieldSchema, 
  TemplateTableSchema,
  FieldType,
  SectionType,
  RiskLevel
} from '@/types/schema';
import { 
  DynamicChecklistSchema, 
  DynamicComponent, 
  ChecklistItem, 
  TableColumn 
} from '@/types/dynamicSchema';

const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

interface ChecklistBuilderProps {
  initialSchema: ChecklistSchema | DynamicChecklistSchema;
  onPublish: (schema: any) => void;
  onSaveDraft: (schema: any) => void;
}

export function ChecklistBuilder({ initialSchema, onPublish, onSaveDraft }: ChecklistBuilderProps) {
  const isV2 = (initialSchema as any).version === 2;

  // States
  const [schemaV1, setSchemaV1] = useState<ChecklistSchema>(!isV2 ? (initialSchema as ChecklistSchema) : {} as any);
  const [schemaV2, setSchemaV2] = useState<DynamicChecklistSchema>(isV2 ? (initialSchema as DynamicChecklistSchema) : {} as any);

  const [activeSecId, setActiveSecId] = useState<string>(
    isV2 
      ? (initialSchema as DynamicChecklistSchema).components?.[0]?.id || ''
      : (initialSchema as ChecklistSchema).sections?.[0]?.id || ''
  );
  
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  // -------------------------------------------------------------
  // V2 Dynamic Component Engine Operations
  // -------------------------------------------------------------
  const activeComponentIndex = isV2 ? schemaV2.components.findIndex(c => c.id === activeSecId) : -1;
  const activeComponent = isV2 && activeComponentIndex > -1 ? (schemaV2.components[activeComponentIndex] as any) : null;

  const updateSchemaV2 = (updater: (prev: DynamicChecklistSchema) => DynamicChecklistSchema) => {
    setSchemaV2(prev => updater(prev));
  };

  const updateActiveComponent = (updater: (comp: any) => void) => {
    updateSchemaV2(prev => {
      const comps = [...prev.components];
      if (activeComponentIndex > -1) {
        updater(comps[activeComponentIndex] as any);
      }
      return { ...prev, components: comps };
    });
  };

  const addComponent = (type: DynamicComponent['type']) => {
    const newComp: any = {
      id: generateId('comp'),
      type,
      title: `New ${type.replace('_', ' ').toUpperCase()}`,
      required: false
    };

    // Initialize defaults based on type
    if (type === 'header') {
      newComp.subtitle = 'Sub-heading details';
      newComp.description = 'Section description content.';
      newComp.category = 'General';
      newComp.riskLevel = 'LOW';
    } else if (type === 'rich_content') {
      newComp.content = '<p>Enter HTML or markdown guidelines text here.</p>';
    } else if (type === 'dynamic_dropdown') {
      newComp.sourceType = 'client';
    } else if (type === 'checklist') {
      newComp.items = [
        {
          id: generateId('item'),
          question: 'Sample compliance checkpoint question?',
          riskLevel: 'LOW',
          targetResolveDays: 7,
          required: false
        }
      ];
    } else if (type === 'yes_no_na') {
      newComp.labels = { yes: 'Yes', no: 'No', na: 'N/A' };
      newComp.scores = { yes: 10, no: 0, na: 5 };
      newComp.colors = { yes: '#10b981', no: '#ef4444', na: '#64748b' };
      newComp.recoMapping = { no: 'Remediation is required for this negative check.' };
    } else if (type === 'table_grid') {
      newComp.columns = [
        { id: generateId('col'), header: 'Location / Item', type: 'text' },
        { id: generateId('col'), header: 'Reading / PSI', type: 'number', calculation: 'AVG' },
        { id: generateId('col'), header: 'Satisfactory', type: 'yes_no' }
      ];
      newComp.defaultRowCount = 3;
      newComp.stickyHeader = true;
    } else if (type === 'observation') {
      newComp.question = 'Enter detailed description of observations.';
      newComp.placeholder = 'Provide findings text...';
      newComp.allowImage = true;
    } else if (type === 'signature') {
      newComp.placeholder = 'Auditor Lead Signature';
    } else if (type === 'image_upload') {
      newComp.maxImages = 3;
    }

    updateSchemaV2(prev => ({
      ...prev,
      components: [...prev.components, newComp]
    }));
    setActiveSecId(newComp.id);
  };

  const deleteComponent = (id: string) => {
    if (schemaV2.components.length <= 1) return;
    const nextComps = schemaV2.components.filter(c => c.id !== id);
    updateSchemaV2(prev => ({ ...prev, components: nextComps }));
    if (activeSecId === id) {
      setActiveSecId(nextComps[0].id);
    }
  };

  const duplicateComponent = (id: string) => {
    const original = schemaV2.components.find(c => c.id === id) as any;
    if (!original) return;
    const duplicated: any = {
      ...original,
      id: generateId('comp'),
      title: `${original.title} (Copy)`,
      items: original.items ? original.items.map((item: any) => ({ ...item, id: generateId('item') })) : undefined,
      columns: original.columns ? original.columns.map((col: any) => ({ ...col, id: generateId('col') })) : undefined
    };
    updateSchemaV2(prev => ({
      ...prev,
      components: [...prev.components, duplicated]
    }));
    setActiveSecId(duplicated.id);
  };

  const moveComponent = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === schemaV2.components.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const nextComps = [...schemaV2.components];
    const temp = nextComps[idx];
    nextComps[idx] = nextComps[targetIdx];
    nextComps[targetIdx] = temp;

    updateSchemaV2(prev => ({ ...prev, components: nextComps }));
  };

  // -------------------------------------------------------------
  // V1 Legacy Schema Operations
  // -------------------------------------------------------------
  const activeSectionIndex = !isV2 ? schemaV1.sections.findIndex(s => s.id === activeSecId) : -1;
  const activeSection = !isV2 && activeSectionIndex > -1 ? schemaV1.sections[activeSectionIndex] : null;

  let activeField: TemplateFieldSchema | null = null;
  if (!isV2 && activeSection && activeSection.fields && activeFieldId) {
    activeField = activeSection.fields.find(f => f.id === activeFieldId) || null;
  }

  const updateSchemaV1 = (updater: (prev: ChecklistSchema) => ChecklistSchema) => {
    const nextSchema = updater(schemaV1);
    setSchemaV1(nextSchema);
  };

  const addSection = (type: SectionType) => {
    const newSection: TemplateSectionSchema = {
      id: generateId('sec'),
      title: `New ${type.toUpperCase()} Section`,
      type,
      orderIndex: schemaV1.sections.length,
      fields: type !== 'table' ? [] : undefined,
      tables: type === 'table' ? [
        {
          id: generateId('table'),
          title: 'New Table Block',
          columns: ['Column 1', 'Column 2', 'Column 3'],
          rows: [['', '', '']]
        }
      ] : undefined
    };
    
    updateSchemaV1(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setActiveSecId(newSection.id);
    setActiveFieldId(null);
  };

  const duplicateSection = (secId: string) => {
    const secToCopy = schemaV1.sections.find(s => s.id === secId);
    if (!secToCopy) return;

    const newSection: TemplateSectionSchema = {
      ...secToCopy,
      id: generateId('sec'),
      title: `${secToCopy.title} (Copy)`,
      orderIndex: schemaV1.sections.length,
      fields: secToCopy.fields ? secToCopy.fields.map(f => ({ ...f, id: generateId('field') })) : undefined,
      tables: secToCopy.tables ? secToCopy.tables.map(t => ({ ...t, id: generateId('table') })) : undefined
    };

    updateSchemaV1(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setActiveSecId(newSection.id);
    setActiveFieldId(null);
  };

  const deleteSection = (secId: string) => {
    if (schemaV1.sections.length <= 1) return;
    const nextSections = schemaV1.sections.filter(s => s.id !== secId);
    nextSections.forEach((s, idx) => { s.orderIndex = idx; });
    updateSchemaV1(prev => ({ ...prev, sections: nextSections }));
    if (activeSecId === secId) {
      setActiveSecId(nextSections[0].id);
      setActiveFieldId(null);
    }
  };

  const moveSection = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === schemaV1.sections.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const nextSections = [...schemaV1.sections];
    const temp = nextSections[idx];
    nextSections[idx] = nextSections[targetIdx];
    nextSections[targetIdx] = temp;
    nextSections.forEach((s, i) => { s.orderIndex = i; });

    updateSchemaV1(prev => ({ ...prev, sections: nextSections }));
  };

  const addField = (fieldType: FieldType) => {
    if (!activeSection || activeSection.type === 'table') return;

    const newField: TemplateFieldSchema = {
      id: generateId('field'),
      title: `New checkpoint question or field`,
      type: fieldType,
      required: false,
      riskLevel: 'LOW',
      recoMapping: 'Corrective action mapped to checklist failure.'
    };

    const updatedSections = [...schemaV1.sections];
    const sec = updatedSections[activeSectionIndex];
    sec.fields = [...(sec.fields || []), newField];

    updateSchemaV1(prev => ({ ...prev, sections: updatedSections }));
    setActiveFieldId(newField.id);
  };

  const deleteField = (fieldId: string) => {
    if (!activeSection || !activeSection.fields) return;

    const updatedSections = [...schemaV1.sections];
    const sec = updatedSections[activeSectionIndex];
    sec.fields = (sec.fields || []).filter(f => f.id !== fieldId);

    updateSchemaV1(prev => ({ ...prev, sections: updatedSections }));
    if (activeFieldId === fieldId) {
      setActiveFieldId(null);
    }
  };

  const duplicateField = (fieldId: string) => {
    if (!activeSection || !activeSection.fields) return;

    const fieldToCopy = activeSection.fields.find(f => f.id === fieldId);
    if (!fieldToCopy) return;

    const newField: TemplateFieldSchema = {
      ...fieldToCopy,
      id: generateId('field'),
      title: `${fieldToCopy.title} (Copy)`
    };

    const updatedSections = [...schemaV1.sections];
    const sec = updatedSections[activeSectionIndex];
    sec.fields = [...(sec.fields || []), newField];

    updateSchemaV1(prev => ({ ...prev, sections: updatedSections }));
    setActiveFieldId(newField.id);
  };

  const updateFieldSettings = (updatedField: TemplateFieldSchema) => {
    if (!activeSection || !activeSection.fields) return;

    const updatedSections = [...schemaV1.sections];
    const sec = updatedSections[activeSectionIndex];
    sec.fields = (sec.fields || []).map(f => f.id === updatedField.id ? updatedField : f);

    updateSchemaV1(prev => ({ ...prev, sections: updatedSections }));
  };

  const handleTableChange = (updatedTable: TemplateTableSchema) => {
    if (!activeSection || !activeSection.tables) return;

    const updatedSections = [...schemaV1.sections];
    const sec = updatedSections[activeSectionIndex];
    sec.tables = (sec.tables || []).map(t => t.id === updatedTable.id ? updatedTable : t);

    updateSchemaV1(prev => ({ ...prev, sections: updatedSections }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full overflow-hidden text-foreground bg-background">
      
      {/* Top action bar */}
      <div className="flex items-center justify-between p-4 bg-muted/20 border-b border-border/80 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex flex-col text-left">
          <input
            value={isV2 ? schemaV2.title : schemaV1.title}
            onChange={(e) => {
              if (isV2) {
                updateSchemaV2(prev => ({ ...prev, title: e.target.value }));
              } else {
                updateSchemaV1(prev => ({ ...prev, title: e.target.value }));
              }
            }}
            className="text-lg font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-[350px] transition-all text-primary"
          />
          <input
            value={isV2 ? (schemaV2.description || '') : (schemaV1.description || '')}
            onChange={(e) => {
              if (isV2) {
                updateSchemaV2(prev => ({ ...prev, description: e.target.value }));
              } else {
                updateSchemaV1(prev => ({ ...prev, description: e.target.value }));
              }
            }}
            placeholder="Add description..."
            className="text-xs text-muted-foreground bg-transparent border-none focus:outline-none w-[450px]"
          />
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[10px] bg-amber-500/20 text-amber-500 font-bold px-2 py-0.5 rounded-full uppercase">
            {isV2 ? 'V2 Dynamic Engine' : 'V1 Standard'}
          </span>
          <Button variant="outline" size="sm" onClick={() => onSaveDraft(isV2 ? schemaV2 : schemaV1)} className="border-primary/30 text-foreground hover:bg-primary/10">
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
          <Button size="sm" onClick={() => onPublish(isV2 ? schemaV2 : schemaV1)} className="bg-primary hover:bg-primary/95">
            <Check className="w-4 h-4 mr-2" /> Publish Template
          </Button>
        </div>
      </div>

      {/* Main 3-panel workspace layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR */}
        <div className="w-72 bg-muted/30 border-r border-border/85 flex flex-col justify-between overflow-y-auto p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Template components</span>
              <span className="text-xs bg-muted text-foreground px-2 py-0.5 rounded-full font-mono">
                {isV2 ? schemaV2.components.length : schemaV1.sections.length}
              </span>
            </div>
            
            <div className="space-y-2">
              {isV2 ? (
                // V2 component items
                schemaV2.components.map((comp, idx) => (
                  <div 
                    key={comp.id}
                    onClick={() => {
                      setActiveSecId(comp.id);
                      setActiveFieldId(null);
                    }}
                    className={`p-3 rounded-lg flex items-center justify-between border cursor-pointer transition-all ${
                      activeSecId === comp.id 
                        ? 'bg-primary/10 border-primary shadow-sm' 
                        : 'bg-card border-border/70 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      {comp.type === 'header' && <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                      {comp.type === 'rich_content' && <AlignLeft className="w-4 h-4 text-teal-400 flex-shrink-0" />}
                      {comp.type === 'dynamic_dropdown' && <UserCheck className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                      {comp.type === 'checklist' && <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      {comp.type === 'yes_no_na' && <HelpCircle className="w-4 h-4 text-pink-400 flex-shrink-0" />}
                      {comp.type === 'table_grid' && <Grid className="w-4 h-4 text-green-400 flex-shrink-0" />}
                      {comp.type === 'observation' && <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                      {comp.type === 'signature' && <FileCode className="w-4 h-4 text-orange-400 flex-shrink-0" />}
                      {comp.type === 'image_upload' && <Camera className="w-4 h-4 text-violet-400 flex-shrink-0" />}
                      {comp.type === 'image_carousel' && <ImageIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                      <span className="text-xs font-medium truncate">{comp.title}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); moveComponent(idx, 'up'); }} disabled={idx === 0} className="p-0.5 hover:bg-muted text-muted-foreground rounded disabled:opacity-40">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveComponent(idx, 'down'); }} disabled={idx === schemaV2.components.length - 1} className="p-0.5 hover:bg-muted text-muted-foreground rounded disabled:opacity-40">
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateComponent(comp.id); }} className="p-0.5 hover:bg-muted text-muted-foreground rounded">
                        <Copy className="w-3 h-3" />
                      </button>
                      {schemaV2.components.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); deleteComponent(comp.id); }} className="p-0.5 hover:bg-muted text-destructive rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                // V1 legacy section items
                schemaV1.sections.map((sec, idx) => (
                  <div 
                    key={sec.id}
                    onClick={() => {
                      setActiveSecId(sec.id);
                      setActiveFieldId(null);
                    }}
                    className={`p-3 rounded-lg flex items-center justify-between border cursor-pointer transition-all ${
                      activeSecId === sec.id 
                        ? 'bg-primary/10 border-primary shadow-sm' 
                        : 'bg-card border-border/70 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      {sec.type === 'header' && <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                      {sec.type === 'checklist' && <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      {sec.type === 'table' && <Grid className="w-4 h-4 text-green-400 flex-shrink-0" />}
                      {sec.type === 'observation' && <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                      {sec.type === 'signature' && <FileCode className="w-4 h-4 text-orange-400 flex-shrink-0" />}
                      <span className="text-xs font-medium truncate">{sec.title}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} disabled={idx === 0} className="p-0.5 hover:bg-muted text-muted-foreground rounded disabled:opacity-40">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} disabled={idx === schemaV1.sections.length - 1} className="p-0.5 hover:bg-muted text-muted-foreground rounded disabled:opacity-40">
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateSection(sec.id); }} className="p-0.5 hover:bg-muted text-muted-foreground rounded">
                        <Copy className="w-3 h-3" />
                      </button>
                      {schemaV1.sections.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); deleteSection(sec.id); }} className="p-0.5 hover:bg-muted text-destructive rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick add component footer */}
          <div className="pt-4 border-t border-border/80 space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Add Component</span>
            {isV2 ? (
              // V2 options
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Button size="xs" variant="outline" onClick={() => addComponent('header')} className="text-[10px] justify-start px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Header Info
                </Button>
                <Button size="xs" variant="outline" onClick={() => addComponent('rich_content')} className="text-[10px] justify-start px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Guidelines HTML
                </Button>
                <Button size="xs" variant="outline" onClick={() => addComponent('dynamic_dropdown')} className="text-[10px] justify-start px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Client Dropdowns
                </Button>
                <Button size="xs" variant="outline" onClick={() => addComponent('checklist')} className="text-[10px] justify-start px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Checklist Check
                </Button>
                <Button size="xs" variant="outline" onClick={() => addComponent('yes_no_na')} className="text-[10px] justify-start px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Yes/No/NA Question
                </Button>
                <Button size="xs" variant="outline" onClick={() => addComponent('table_grid')} className="text-[10px] justify-start px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Table Grid Log
                </Button>
                <Button size="xs" variant="outline" onClick={() => addComponent('observation')} className="text-[10px] justify-start px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Observations
                </Button>
                <Button size="xs" variant="outline" onClick={() => addComponent('signature')} className="text-[10px] justify-start px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Signature Pad
                </Button>
                <Button size="xs" variant="outline" onClick={() => addComponent('image_upload')} className="text-[10px] justify-start px-2 py-1 col-span-2">
                  <Plus className="w-3 h-3 mr-1" /> File & Camera Uploads
                </Button>
              </div>
            ) : (
              // V1 options
              <div className="grid grid-cols-2 gap-2">
                <Button size="xs" variant="outline" onClick={() => addSection('header')} className="text-[11px] justify-start px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Header Info
                </Button>
                <Button size="xs" variant="outline" onClick={() => addSection('checklist')} className="text-[11px] justify-start px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Checklist
                </Button>
                <Button size="xs" variant="outline" onClick={() => addSection('table')} className="text-[11px] justify-start px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Data Grid Table
                </Button>
                <Button size="xs" variant="outline" onClick={() => addSection('observation')} className="text-[11px] justify-start px-2 py-1">
                  <Plus className="w-3 h-3 mr-1" /> Observations
                </Button>
                <Button size="xs" variant="outline" onClick={() => addSection('signature')} className="text-[11px] justify-start px-2 py-1" style={{ gridColumn: 'span 2' }}>
                  <Plus className="w-3 h-3 mr-1" /> Signature Pad
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* CENTER CANVAS */}
        <div className="flex-1 bg-background overflow-y-auto p-6 flex flex-col space-y-6">
          {isV2 ? (
            activeComponent ? (
              <div className="space-y-6 max-w-4xl mx-auto w-full">
                
                {/* Component header card */}
                <div className="p-4 rounded-xl border border-border/80 bg-card/40 space-y-2 text-left">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-primary/20 text-primary-foreground rounded-full">
                      Component: {activeComponent.type}
                    </span>
                  </div>
                  <input
                    value={activeComponent.title}
                    onChange={(e) => updateActiveComponent(c => { c.title = e.target.value; })}
                    placeholder="Component title label..."
                    className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-border/80 focus:border-primary focus:outline-none w-full text-foreground"
                  />
                  {activeComponent.type === 'header' && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground block font-bold">Subtitle</span>
                        <Input 
                          value={activeComponent.subtitle || ''} 
                          onChange={(e) => updateActiveComponent(c => { c.subtitle = e.target.value; })}
                          className="h-8 text-xs bg-transparent"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground block font-bold">Category</span>
                        <Input 
                          value={activeComponent.category || ''} 
                          onChange={(e) => updateActiveComponent(c => { c.category = e.target.value; })}
                          className="h-8 text-xs bg-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-item/fields listing specific to v2 types */}
                {activeComponent.type === 'checklist' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold text-muted-foreground">CHECKLIST ITEMS</span>
                      <Button size="xs" onClick={() => updateActiveComponent(c => {
                        c.items = [...(c.items || []), {
                          id: generateId('item'),
                          question: 'New checklist item question?',
                          riskLevel: 'LOW',
                          targetResolveDays: 7,
                          required: false
                        }];
                      })}>
                        + Add Checkpoint
                      </Button>
                    </div>

                    {(activeComponent.items || []).map((item: any, idx: number) => (
                      <div key={item.id} className="p-4 rounded-xl border border-border bg-card/20 space-y-3 text-left">
                        <div className="flex items-start justify-between gap-3">
                          <Input 
                            value={item.question} 
                            onChange={(e) => updateActiveComponent(c => { c.items[idx].question = e.target.value; })}
                            className="text-xs font-semibold h-8"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => updateActiveComponent(c => {
                              c.items = c.items.filter((x: any) => x.id !== item.id);
                            })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground block mb-1">Risk Severity</span>
                            <select
                              value={item.riskLevel}
                              onChange={(e) => updateActiveComponent(c => { c.items[idx].riskLevel = e.target.value; })}
                              className="w-full bg-card border rounded p-1.5 text-xs"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground block mb-1">Resolve Window (Days)</span>
                            <Input 
                              type="number" 
                              value={item.targetResolveDays} 
                              onChange={(e) => updateActiveComponent(c => { c.items[idx].targetResolveDays = parseInt(e.target.value) || 7; })}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-5 pl-2">
                            <input 
                              type="checkbox" 
                              checked={item.required}
                              onChange={(e) => updateActiveComponent(c => { c.items[idx].required = e.target.checked; })}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <span className="font-bold text-muted-foreground text-[10px]">Required</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeComponent.type === 'table_grid' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold text-muted-foreground">GRID COLUMNS</span>
                      <Button size="xs" onClick={() => updateActiveComponent(c => {
                        c.columns = [...(c.columns || []), {
                          id: generateId('col'),
                          header: 'New Column',
                          type: 'text'
                        }];
                      })}>
                        + Add Column
                      </Button>
                    </div>

                    {(activeComponent.columns || []).map((col: any, idx: number) => (
                      <div key={col.id} className="p-3 rounded-lg border border-border bg-card/10 space-y-2 text-left">
                        <div className="flex items-center justify-between gap-3">
                          <Input 
                            value={col.header} 
                            onChange={(e) => updateActiveComponent(c => { c.columns[idx].header = e.target.value; })}
                            className="h-7 text-xs font-semibold"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-destructive"
                            onClick={() => updateActiveComponent(c => {
                              c.columns = c.columns.filter((x: any) => x.id !== col.id);
                            })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-bold mb-1">Column Cell Type</span>
                            <select
                              value={col.type}
                              onChange={(e) => updateActiveComponent(c => { c.columns[idx].type = e.target.value; })}
                              className="w-full bg-card border rounded p-1.5 text-[11px]"
                            >
                              <option value="text">Text Input</option>
                              <option value="number">Number</option>
                              <option value="dropdown">Dropdown Options</option>
                              <option value="yes_no">Yes/No Selector</option>
                              <option value="date">Date picker</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-bold mb-1">Calculation Footer</span>
                            <select
                              value={col.calculation || 'NONE'}
                              onChange={(e) => updateActiveComponent(c => {
                                c.columns[idx].calculation = e.target.value === 'NONE' ? undefined : e.target.value;
                              })}
                              className="w-full bg-card border rounded p-1.5 text-[11px]"
                            >
                              <option value="NONE">None</option>
                              <option value="SUM">Sum (SUM)</option>
                              <option value="AVG">Average (AVG)</option>
                              <option value="PRODUCT">Product (MULTIPLY)</option>
                            </select>
                          </div>
                        </div>

                        {col.type === 'dropdown' && (
                          <div className="pt-2">
                            <span className="text-[10px] font-bold text-muted-foreground block mb-1">Dropdown options (comma separated)</span>
                            <Input 
                              placeholder="e.g., Option A, Option B, Option C" 
                              value={col.options?.join(', ') || ''}
                              onChange={(e) => updateActiveComponent(c => {
                                c.columns[idx].options = e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean);
                              })}
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeComponent.type === 'rich_content' && (
                  <div className="space-y-2 text-left">
                    <span className="text-xs font-bold text-muted-foreground block">HTML / Guideline Content</span>
                    <Textarea 
                      value={activeComponent.content || ''} 
                      onChange={(e) => updateActiveComponent(c => { c.content = e.target.value; })}
                      className="min-h-[140px] text-xs bg-card"
                    />
                  </div>
                )}

                {activeComponent.type === 'dynamic_dropdown' && (
                  <div className="space-y-2 text-left">
                    <span className="text-xs font-bold text-muted-foreground block">Data Source Target</span>
                    <select
                      value={activeComponent.sourceType}
                      onChange={(e) => updateActiveComponent(c => { c.sourceType = e.target.value; })}
                      className="w-full bg-card border rounded p-2 text-xs"
                    >
                      <option value="client">VeriAudit Client & Auditor database relations</option>
                    </select>
                  </div>
                )}

                {activeComponent.type === 'yes_no_na' && (
                  <div className="space-y-4 text-left">
                    <span className="text-xs font-bold text-muted-foreground block border-b pb-1">Yes / No / NA Custom Settings</span>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-bold mb-1">Yes option Label</span>
                        <Input 
                          value={activeComponent.labels?.yes || 'Yes'} 
                          onChange={(e) => updateActiveComponent(c => {
                            c.labels = { ...c.labels, yes: e.target.value };
                          })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-bold mb-1">No option Label</span>
                        <Input 
                          value={activeComponent.labels?.no || 'No'} 
                          onChange={(e) => updateActiveComponent(c => {
                            c.labels = { ...c.labels, no: e.target.value };
                          })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-bold mb-1">NA option Label</span>
                        <Input 
                          value={activeComponent.labels?.na || 'N/A'} 
                          onChange={(e) => updateActiveComponent(c => {
                            c.labels = { ...c.labels, na: e.target.value };
                          })}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeComponent.type === 'observation' && (
                  <div className="space-y-3 text-left">
                    <div>
                      <span className="text-xs font-bold text-muted-foreground block mb-1">Auditor Checklist Question Prompt</span>
                      <Input 
                        value={activeComponent.question || ''} 
                        onChange={(e) => updateActiveComponent(c => { c.question = e.target.value; })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-muted-foreground block mb-1">Text Field Placeholder</span>
                      <Input 
                        value={activeComponent.placeholder || ''} 
                        onChange={(e) => updateActiveComponent(c => { c.placeholder = e.target.value; })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}

                {activeComponent.type === 'signature' && (
                  <div className="space-y-2 text-left">
                    <span className="text-xs font-bold text-muted-foreground block">Pad Placeholder Title</span>
                    <Input 
                      value={activeComponent.placeholder || ''} 
                      onChange={(e) => updateActiveComponent(c => { c.placeholder = e.target.value; })}
                      className="h-8 text-xs"
                    />
                  </div>
                )}

                {activeComponent.type === 'image_upload' && (
                  <div className="space-y-2 text-left">
                    <span className="text-xs font-bold text-muted-foreground block">Max images upload limit</span>
                    <Input 
                      type="number"
                      value={activeComponent.maxImages || 3} 
                      onChange={(e) => updateActiveComponent(c => { c.maxImages = parseInt(e.target.value) || 3; })}
                      className="h-8 text-xs w-32"
                    />
                  </div>
                )}

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-12 h-12 text-primary/40 mb-3 animate-pulse" />
                <h3 className="text-md font-semibold">Select or Create a Component</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">Use the left sidebar to add dynamic layout items, signature grids, checklists, or camera features.</p>
              </div>
            )
          ) : (
            // V1 legacy canvas
            activeSection ? (
              <div className="space-y-6 max-w-4xl mx-auto w-full">
                <div className="p-4 rounded-xl border border-border/80 bg-card/40 backdrop-blur-md space-y-2 text-left">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-primary/20 text-primary-foreground rounded-full">
                      {activeSection.type}
                    </span>
                  </div>
                  <input
                    value={activeSection.title}
                    onChange={(e) => {
                      const nextSecs = [...schemaV1.sections];
                      nextSecs[activeSectionIndex].title = e.target.value;
                      updateSchemaV1(prev => ({ ...prev, sections: nextSecs }));
                    }}
                    className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-border/80 focus:border-primary focus:outline-none w-full text-foreground"
                  />
                  <input
                    value={activeSection.description || ''}
                    onChange={(e) => {
                      const nextSecs = [...schemaV1.sections];
                      nextSecs[activeSectionIndex].description = e.target.value;
                      updateSchemaV1(prev => ({ ...prev, sections: nextSecs }));
                    }}
                    placeholder="Optional section description..."
                    className="text-xs text-muted-foreground bg-transparent border-none w-full focus:outline-none"
                  />
                </div>

                {activeSection.type === 'table' && activeSection.tables ? (
                  <div className="space-y-6">
                    {activeSection.tables.map((table) => (
                      <TableEditor
                        key={table.id}
                        table={table}
                        onChange={handleTableChange}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeSection.fields && activeSection.fields.length > 0 ? (
                      activeSection.fields.map((field) => (
                        <div
                          key={field.id}
                          onClick={() => setActiveFieldId(field.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            activeFieldId === field.id
                              ? 'bg-primary/5 border-primary shadow-sm'
                              : 'bg-card/30 border-border/60 hover:border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between text-left">
                            <div className="space-y-2.5 flex-1 pr-4">
                              <input
                                value={field.title}
                                onChange={(e) => {
                                  updateFieldSettings({
                                    ...field,
                                    title: e.target.value
                                  });
                                }}
                                className="text-sm font-medium bg-transparent border-b border-transparent hover:border-border/80 focus:border-primary focus:outline-none w-full text-foreground/90"
                              />
                              
                              {field.type === 'text' && (
                                <Input disabled placeholder="Text input answer field" className="bg-muted/10 border-border/50 h-8 text-xs max-w-md" />
                              )}
                              {field.type === 'textarea' && (
                                <Textarea disabled placeholder="Detailed textarea answer block" className="bg-muted/10 border-border/50 text-xs min-h-[50px]" />
                              )}
                              {field.type === 'yes_no' && (
                                <div className="flex space-x-2">
                                  <Button size="sm" variant="outline" disabled className="h-7 text-xs px-3">YES</Button>
                                  <Button size="sm" variant="outline" disabled className="h-7 text-xs px-3">NO</Button>
                                  <Button size="sm" variant="outline" disabled className="h-7 text-xs px-3">N/A</Button>
                                </div>
                              )}
                              {field.type === 'signature' && (
                                <div className="h-16 w-60 border border-dashed border-border/70 rounded-lg flex items-center justify-center bg-muted/10 text-[10px] text-muted-foreground">
                                  Signature Box
                                </div>
                              )}
                              {field.type === 'image' && (
                                <div className="h-14 w-28 border border-dashed border-border/70 rounded-lg flex items-center justify-center bg-muted/10 text-[10px] text-muted-foreground">
                                  Photo Upload (Max 3)
                                </div>
                              )}

                              <div className="flex items-center space-x-2.5 pt-1">
                                <span className="text-[10px] bg-muted/65 text-muted-foreground px-2 py-0.5 rounded-full uppercase">
                                  Type: {field.type}
                                </span>
                                {field.riskLevel !== 'NONE' && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                                    field.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                                    field.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-green-500/20 text-green-400'
                                  }`}>
                                    Risk: {field.riskLevel}
                                  </span>
                                )}
                                {field.required && (
                                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase font-medium">
                                    Required
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); duplicateField(field.id); }}
                                className="h-7 w-7 text-muted-foreground hover:bg-muted"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 border border-dashed border-border/80 rounded-xl bg-card/10">
                        <span className="text-sm text-muted-foreground block">No questions inside this section yet.</span>
                        <span className="text-xs text-muted-foreground/60 block mt-1">Select field blocks from the toolbar below to populate this section.</span>
                      </div>
                    )}

                    <div className="pt-4 border-t border-border/70 text-left">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Insert Form Block Type</span>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => addField('text')} className="h-8 text-xs">Text Input</Button>
                        <Button size="sm" variant="outline" onClick={() => addField('textarea')} className="h-8 text-xs">Textarea</Button>
                        <Button size="sm" variant="outline" onClick={() => addField('yes_no')} className="h-8 text-xs">Yes / No Switch</Button>
                        <Button size="sm" variant="outline" onClick={() => addField('image')} className="h-8 text-xs">Camera / Photo Block</Button>
                        <Button size="sm" variant="outline" onClick={() => addField('signature')} className="h-8 text-xs">Signature Pad</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-12 h-12 text-primary/40 mb-3 animate-pulse" />
                <h3 className="text-md font-semibold">Select or Create a Section</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">Use the left sidebar to add sections.</p>
              </div>
            )
          )}
        </div>

        {/* RIGHT SETTINGS PANEL */}
        <div className="w-80 bg-muted/30 border-l border-border/85 p-5 flex flex-col overflow-y-auto space-y-4">
          <div className="flex items-center space-x-2 border-b border-border/80 pb-3 mb-1">
            <Settings className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Block Configurator</h4>
          </div>

          {isV2 ? (
            activeComponent ? (
              <div className="space-y-4 text-xs text-left">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card/25">
                  <span className="font-semibold text-muted-foreground">Required Component</span>
                  <input
                    type="checkbox"
                    checked={activeComponent.required || false}
                    onChange={(e) => updateActiveComponent(c => { c.required = e.target.checked; })}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                </div>
                
                {activeComponent.type === 'header' && (
                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground block">Header Category Scope</span>
                    <Input 
                      value={activeComponent.category || ''} 
                      onChange={(e) => updateActiveComponent(c => { c.category = e.target.value; })}
                      className="h-8 text-xs bg-card"
                    />
                  </div>
                )}

                {activeComponent.type === 'yes_no_na' && (
                  <div className="space-y-2">
                    <span className="font-semibold text-muted-foreground block">Failure Recommendation Text</span>
                    <Textarea
                      value={activeComponent.recoMapping?.no || ''}
                      onChange={(e) => updateActiveComponent(c => { c.recoMapping = { no: e.target.value }; })}
                      placeholder="Mapped failure recommendations..."
                      className="text-xs bg-card"
                    />
                  </div>
                )}
                
                <div className="p-3 border rounded bg-card/5 space-y-1">
                  <span className="font-bold text-[10px] text-muted-foreground uppercase block">System ID:</span>
                  <span className="font-mono text-[9px] text-foreground select-all">{activeComponent.id}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-4">
                <span className="text-[11px] text-muted-foreground">Select a component to adjust metadata and formatting behaviors.</span>
              </div>
            )
          ) : (
            // V1 configurations
            activeField ? (
              <div className="space-y-4 text-xs text-left">
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground block">Field Label</span>
                  <Textarea
                    value={activeField.title}
                    onChange={(e) => updateFieldSettings({ ...activeField!, title: e.target.value })}
                    className="text-xs min-h-[60px] bg-card border-border focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground block">Field Type</span>
                  <select
                    value={activeField.type}
                    onChange={(e) => updateFieldSettings({ ...activeField!, type: e.target.value as FieldType })}
                    className="w-full bg-card border border-border rounded-md p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="text">Text Input</option>
                    <option value="textarea">Textarea Block</option>
                    <option value="yes_no">Yes / No / NA Options</option>
                    <option value="image">Camera / Photo Upload</option>
                    <option value="signature">Signature Pad</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card/20">
                  <span className="font-semibold text-muted-foreground">Required Validation</span>
                  <input
                    type="checkbox"
                    checked={activeField.required}
                    onChange={(e) => updateFieldSettings({ ...activeField!, required: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary bg-card cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground block">Risk severity level</span>
                  <select
                    value={activeField.riskLevel}
                    onChange={(e) => updateFieldSettings({ ...activeField!, riskLevel: e.target.value as RiskLevel })}
                    className="w-full bg-card border border-border rounded-md p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="NONE">None (Info only)</option>
                    <option value="LOW">Low Risk</option>
                    <option value="MEDIUM">Medium Risk</option>
                    <option value="HIGH">High Risk</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground block">Remediation Action mapping</span>
                  <Textarea
                    value={activeField.recoMapping || ''}
                    onChange={(e) => updateFieldSettings({ ...activeField!, recoMapping: e.target.value })}
                    placeholder="e.g., Relocate UPS batteries to fireproof cabinet."
                    className="text-xs min-h-[80px] bg-card border-border focus:border-primary"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-4">
                <span className="text-[11px] text-muted-foreground">Click on any checklist field to configure constraints and risk recommendations.</span>
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
}
