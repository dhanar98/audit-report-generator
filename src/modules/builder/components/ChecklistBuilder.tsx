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
  Eye,
  Save,
  Check
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

// Helper to generate IDs
const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

interface ChecklistBuilderProps {
  initialSchema: ChecklistSchema;
  onPublish: (schema: ChecklistSchema) => void;
  onSaveDraft: (schema: ChecklistSchema) => void;
}

export function ChecklistBuilder({ initialSchema, onPublish, onSaveDraft }: ChecklistBuilderProps) {
  const [schema, setSchema] = useState<ChecklistSchema>(initialSchema);
  const [activeSecId, setActiveSecId] = useState<string>(
    initialSchema.sections[0]?.id || ''
  );
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  // Active section helper
  const activeSectionIndex = schema.sections.findIndex(s => s.id === activeSecId);
  const activeSection = schema.sections[activeSectionIndex] || null;

  // Active field helper (for right panel)
  let activeField: TemplateFieldSchema | null = null;
  if (activeSection && activeSection.fields && activeFieldId) {
    activeField = activeSection.fields.find(f => f.id === activeFieldId) || null;
  }

  // Update Schema helper
  const updateSchema = (updater: (prev: ChecklistSchema) => ChecklistSchema) => {
    const nextSchema = updater(schema);
    setSchema(nextSchema);
  };

  // Section Operations
  const addSection = (type: SectionType) => {
    const newSection: TemplateSectionSchema = {
      id: generateId('sec'),
      title: `New ${type.toUpperCase()} Section`,
      type,
      orderIndex: schema.sections.length,
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
    
    updateSchema(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setActiveSecId(newSection.id);
    setActiveFieldId(null);
  };

  const duplicateSection = (secId: string) => {
    const secToCopy = schema.sections.find(s => s.id === secId);
    if (!secToCopy) return;

    const newSection: TemplateSectionSchema = {
      ...secToCopy,
      id: generateId('sec'),
      title: `${secToCopy.title} (Copy)`,
      orderIndex: schema.sections.length,
      fields: secToCopy.fields ? secToCopy.fields.map(f => ({ ...f, id: generateId('field') })) : undefined,
      tables: secToCopy.tables ? secToCopy.tables.map(t => ({ ...t, id: generateId('table') })) : undefined
    };

    updateSchema(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setActiveSecId(newSection.id);
    setActiveFieldId(null);
  };

  const deleteSection = (secId: string) => {
    if (schema.sections.length <= 1) return;
    const nextSections = schema.sections.filter(s => s.id !== secId);
    
    // Adjust order indexes
    nextSections.forEach((s, idx) => {
      s.orderIndex = idx;
    });

    updateSchema(prev => ({ ...prev, sections: nextSections }));
    
    if (activeSecId === secId) {
      setActiveSecId(nextSections[0].id);
      setActiveFieldId(null);
    }
  };

  const moveSection = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === schema.sections.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const nextSections = [...schema.sections];
    
    // Swap
    const temp = nextSections[idx];
    nextSections[idx] = nextSections[targetIdx];
    nextSections[targetIdx] = temp;

    // Re-index
    nextSections.forEach((s, i) => {
      s.orderIndex = i;
    });

    updateSchema(prev => ({ ...prev, sections: nextSections }));
  };

  // Field Operations inside active section
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

    const updatedSections = [...schema.sections];
    const sec = updatedSections[activeSectionIndex];
    sec.fields = [...(sec.fields || []), newField];

    updateSchema(prev => ({ ...prev, sections: updatedSections }));
    setActiveFieldId(newField.id);
  };

  const deleteField = (fieldId: string) => {
    if (!activeSection || !activeSection.fields) return;

    const updatedSections = [...schema.sections];
    const sec = updatedSections[activeSectionIndex];
    sec.fields = (sec.fields || []).filter(f => f.id !== fieldId);

    updateSchema(prev => ({ ...prev, sections: updatedSections }));
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

    const updatedSections = [...schema.sections];
    const sec = updatedSections[activeSectionIndex];
    sec.fields = [...(sec.fields || []), newField];

    updateSchema(prev => ({ ...prev, sections: updatedSections }));
    setActiveFieldId(newField.id);
  };

  const updateFieldSettings = (updatedField: TemplateFieldSchema) => {
    if (!activeSection || !activeSection.fields) return;

    const updatedSections = [...schema.sections];
    const sec = updatedSections[activeSectionIndex];
    sec.fields = (sec.fields || []).map(f => f.id === updatedField.id ? updatedField : f);

    updateSchema(prev => ({ ...prev, sections: updatedSections }));
  };

  // Table Updates
  const handleTableChange = (updatedTable: TemplateTableSchema) => {
    if (!activeSection || !activeSection.tables) return;

    const updatedSections = [...schema.sections];
    const sec = updatedSections[activeSectionIndex];
    sec.tables = (sec.tables || []).map(t => t.id === updatedTable.id ? updatedTable : t);

    updateSchema(prev => ({ ...prev, sections: updatedSections }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full overflow-hidden">
      {/* Top action bar */}
      <div className="flex items-center justify-between p-4 bg-muted/20 border-b border-border/80 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex flex-col">
          <input
            value={schema.title}
            onChange={(e) => updateSchema(prev => ({ ...prev, title: e.target.value }))}
            className="text-lg font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-[350px] transition-all text-primary"
          />
          <input
            value={schema.description || ''}
            onChange={(e) => updateSchema(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Add description..."
            className="text-xs text-muted-foreground bg-transparent border-none focus:outline-none w-[450px]"
          />
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => onSaveDraft(schema)} className="border-primary/30 text-primary-foreground hover:bg-primary/10">
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
          <Button size="sm" onClick={() => onPublish(schema)} className="bg-primary hover:bg-primary/95">
            <Check className="w-4 h-4 mr-2" /> Publish Template
          </Button>
        </div>
      </div>

      {/* Main 3-panel workspace layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR: Sections list */}
        <div className="w-72 bg-muted/30 border-r border-border/85 flex flex-col justify-between overflow-y-auto p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Template Sections</span>
              <span className="text-xs bg-muted text-foreground px-2 py-0.5 rounded-full font-mono">{schema.sections.length}</span>
            </div>
            
            <div className="space-y-2">
              {schema.sections.map((sec, idx) => (
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
                  
                  {/* Action options */}
                  <div className="flex items-center space-x-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} disabled={idx === 0} className="p-0.5 hover:bg-muted text-muted-foreground rounded disabled:opacity-40">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} disabled={idx === schema.sections.length - 1} className="p-0.5 hover:bg-muted text-muted-foreground rounded disabled:opacity-40">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); duplicateSection(sec.id); }} className="p-0.5 hover:bg-muted text-muted-foreground rounded">
                      <Copy className="w-3 h-3" />
                    </button>
                    {schema.sections.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); deleteSection(sec.id); }} className="p-0.5 hover:bg-muted text-destructive rounded">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick add section footer */}
          <div className="pt-4 border-t border-border/80 space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Add New Section</span>
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
          </div>
        </div>

        {/* CENTER CANVAS: Section canvas and inputs editor */}
        <div className="flex-1 bg-background overflow-y-auto p-6 flex flex-col space-y-6">
          {activeSection ? (
            <div className="space-y-6 max-w-4xl mx-auto w-full">
              
              {/* Section Header Card */}
              <div className="p-4 rounded-xl border border-border/80 bg-card/40 backdrop-blur-md space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-primary/20 text-primary-foreground rounded-full">
                    {activeSection.type}
                  </span>
                </div>
                <input
                  value={activeSection.title}
                  onChange={(e) => {
                    const nextSecs = [...schema.sections];
                    nextSecs[activeSectionIndex].title = e.target.value;
                    updateSchema(prev => ({ ...prev, sections: nextSecs }));
                  }}
                  className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-border/80 focus:border-primary focus:outline-none w-full text-foreground"
                />
                <input
                  value={activeSection.description || ''}
                  onChange={(e) => {
                    const nextSecs = [...schema.sections];
                    nextSecs[activeSectionIndex].description = e.target.value;
                    updateSchema(prev => ({ ...prev, sections: nextSecs }));
                  }}
                  placeholder="Optional section description..."
                  className="text-xs text-muted-foreground bg-transparent border-none w-full focus:outline-none"
                />
              </div>

              {/* Render Fields or Table based on Section type */}
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
                        <div className="flex items-start justify-between">
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
                            
                            {/* Visual Field Previews */}
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

                            {/* Info badges */}
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

                          {/* Quick Edit options */}
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

                  {/* Field insertion toolbar */}
                  <div className="pt-4 border-t border-border/70">
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
              <p className="text-xs text-muted-foreground max-w-sm mt-1">Use the left sidebar to add form templates, checklists, observations, or signature categories.</p>
            </div>
          )}
        </div>

        {/* RIGHT SETTINGS PANEL: Selected field validator */}
        <div className="w-80 bg-muted/30 border-l border-border/85 p-5 flex flex-col overflow-y-auto space-y-4">
          <div className="flex items-center space-x-2 border-b border-border/80 pb-3 mb-1">
            <Settings className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Block Configurator</h4>
          </div>

          {activeField ? (
            <div className="space-y-4 text-xs">
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
                <span className="text-[10px] text-muted-foreground block italic">This text serves as the recommendation mapping if this checklist question fails.</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <span className="text-[11px] text-muted-foreground">Click on any checklist field to configure validation constraints and risk recommendations.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
