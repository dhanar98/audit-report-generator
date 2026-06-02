import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { TemplateTableSchema, TableColumn, TableCellType } from '@/types/schema';

interface TableEditorProps {
  table: TemplateTableSchema;
  onChange?: (updatedTable: TemplateTableSchema) => void;
  readOnly?: boolean;
  isBuilderMode?: boolean;
  sessionCells?: any[];
  onCellsChange?: (cells: any[]) => void;
}

export function TableEditor({ 
  table, 
  onChange, 
  readOnly = false,
  isBuilderMode = false,
  sessionCells,
  onCellsChange
}: TableEditorProps) {
  // Normalize columns: convert list of strings to TableColumn objects if needed
  const normalizeColumns = (cols: any[]): TableColumn[] => {
    return (cols || []).map((col, idx) => {
      if (typeof col === 'string') {
        return {
          id: `col_${idx}`,
          header: col,
          type: 'text',
          calculation: 'NONE',
          options: []
        };
      }
      return {
        id: col.id || `col_${idx}`,
        header: col.header || '',
        type: col.type || 'text',
        calculation: col.calculation || 'NONE',
        options: col.options || []
      };
    });
  };

  const columns = normalizeColumns(table.columns);

  // Determine row data: if in runner mode, we read from sessionCells or generate default rows.
  // In builder mode, we read/write table.rows directly.
  const getUniqueRowIds = () => {
    if (!isBuilderMode && sessionCells && sessionCells.length > 0) {
      const rowIds = new Set<string>();
      sessionCells.forEach(c => rowIds.add(c.rowId));
      return Array.from(rowIds);
    }
    // Builder mode or no session cells, use table.rows length
    const defaultCount = table.rows ? table.rows.length : 1;
    const ids = [];
    for (let i = 0; i < defaultCount; i++) {
      ids.push(`row_${i}`);
    }
    return ids;
  };

  const rowIds = getUniqueRowIds();

  // Active configuration column index for builder modal/popup
  const [configColIdx, setConfigColIdx] = useState<number | null>(null);

  // Helper to fetch cell values
  const getCellValue = (rowId: string, colId: string, rowIndex: number, colIndex: number): string => {
    if (!isBuilderMode && sessionCells) {
      return sessionCells.find(c => c.rowId === rowId && c.colId === colId)?.value || '';
    }
    // Fallback to template default rows
    if (table.rows && table.rows[rowIndex]) {
      return table.rows[rowIndex][colIndex] || '';
    }
    return '';
  };

  // Helper to update cell values
  const updateCellValue = (rowId: string, colId: string, rowIndex: number, colIndex: number, val: string) => {
    if (readOnly) return;

    if (!isBuilderMode && onCellsChange && sessionCells) {
      const updated = [...sessionCells];
      const existingIdx = updated.findIndex(c => c.rowId === rowId && c.colId === colId);
      if (existingIdx > -1) {
        updated[existingIdx] = { ...updated[existingIdx], value: val };
      } else {
        updated.push({ rowId, colId, value: val });
      }
      onCellsChange(updated);
      return;
    }

    // Builder mode (update template default rows)
    if (onChange && table.rows) {
      const newRows = [...table.rows];
      if (!newRows[rowIndex]) {
        newRows[rowIndex] = Array(columns.length).fill('');
      }
      newRows[rowIndex][colIndex] = val;
      onChange({ ...table, rows: newRows });
    }
  };

  // Add Column
  const addColumn = () => {
    if (readOnly || !onChange) return;
    const nextColId = `col_${columns.length}_${Math.random().toString(36).substr(2, 4)}`;
    const newCol: TableColumn = {
      id: nextColId,
      header: `Column ${columns.length + 1}`,
      type: 'text',
      calculation: 'NONE',
      options: []
    };

    const newCols = [...table.columns, newCol];
    const newRows = (table.rows || [['']]).map(row => [...row, '']);
    onChange({
      ...table,
      columns: newCols,
      rows: newRows
    });
  };

  // Delete Column
  const deleteColumn = (colIndex: number) => {
    if (readOnly || !onChange || columns.length <= 1) return;
    const newCols = table.columns.filter((_, idx) => idx !== colIndex);
    const newRows = (table.rows || []).map(row => row.filter((_, idx) => idx !== colIndex));
    onChange({
      ...table,
      columns: newCols,
      rows: newRows
    });
    if (configColIdx === colIndex) setConfigColIdx(null);
  };

  // Update Column Property (Type, Header, Calculation, Dropdown Options)
  const updateColumnConfig = (colIndex: number, updates: Partial<TableColumn>) => {
    if (!onChange) return;
    const nextCols = [...table.columns];
    const current = columns[colIndex];
    nextCols[colIndex] = {
      ...current,
      ...updates
    } as any;
    onChange({
      ...table,
      columns: nextCols
    });
  };

  // Add Row
  const addRow = () => {
    if (readOnly) return;
    if (!isBuilderMode && onCellsChange && sessionCells) {
      const newRowId = `row_${Math.random().toString(36).substr(2, 9)}`;
      const newCells = [...sessionCells];
      columns.forEach(col => {
        newCells.push({ rowId: newRowId, colId: col.id, value: '' });
      });
      onCellsChange(newCells);
      return;
    }

    if (onChange && table.rows) {
      const newRow = Array(columns.length).fill('');
      onChange({
        ...table,
        rows: [...table.rows, newRow]
      });
    }
  };

  // Delete Row
  const deleteRow = (rowIndex: number, rowId: string) => {
    if (readOnly) return;
    if (!isBuilderMode && onCellsChange && sessionCells) {
      onCellsChange(sessionCells.filter(c => c.rowId !== rowId));
      return;
    }

    if (onChange && table.rows && table.rows.length > 1) {
      const newRows = table.rows.filter((_, idx) => idx !== rowIndex);
      onChange({
        ...table,
        rows: newRows
      });
    }
  };

  // Footer Calculation Formulas (SUM, AVG, PRODUCT)
  const calculateFooter = (col: TableColumn) => {
    if (!col.calculation || col.calculation === 'NONE') return null;

    const values = rowIds
      .map((rowId, idx) => parseFloat(getCellValue(rowId, col.id, idx, columns.findIndex(c => c.id === col.id))))
      .filter(val => !isNaN(val));

    if (values.length === 0) return '-';

    switch (col.calculation) {
      case 'SUM': {
        const sum = values.reduce((sumVal, val) => sumVal + val, 0);
        return `Sum: ${sum.toFixed(1)}`;
      }
      case 'AVG': {
        const sum = values.reduce((sumVal, val) => sumVal + val, 0);
        const avg = sum / values.length;
        return `Avg: ${avg.toFixed(1)}`;
      }
      case 'PRODUCT': {
        const product = values.reduce((prodVal, val) => prodVal * val, 1);
        return `Prod: ${product.toFixed(1)}`;
      }
      default:
        return null;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Table Title and Actions */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-primary">{table.title || 'Data Grid Table'}</h4>
        {!readOnly && (
          <div className="flex items-center space-x-2">
            {isBuilderMode && (
              <Button type="button" size="xs" variant="outline" onClick={addColumn} className="text-xs h-8">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Column
              </Button>
            )}
            <Button type="button" size="xs" variant="outline" onClick={addRow} className="text-xs h-8">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </Button>
          </div>
        )}
      </div>

      {/* Grid Container */}
      <div className="border border-border/85 rounded-xl overflow-hidden glass-panel">
        <div className="overflow-x-auto w-full max-w-full">
          <Table className="w-full border-collapse">
            <TableHeader className="bg-muted/40 sticky top-0 z-10">
              <TableRow>
                {columns.map((col, colIndex) => (
                  <TableHead key={col.id} className="p-3 text-center min-w-[150px] relative group text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="flex flex-col items-center space-y-1">
                      {isBuilderMode ? (
                        <div className="flex items-center justify-center space-x-1 w-full">
                          <Input
                            value={col.header}
                            onChange={(e) => updateColumnConfig(colIndex, { header: e.target.value })}
                            className="h-8 text-center text-xs bg-transparent border-none focus:ring-1 focus:ring-primary w-full p-1"
                          />
                          <button
                            type="button"
                            onClick={() => setConfigColIdx(configColIdx === colIndex ? null : colIndex)}
                            className="text-muted-foreground hover:text-foreground p-1 rounded"
                            title="Configure Column Properties"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          {columns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => deleteColumn(colIndex)}
                              className="text-destructive hover:text-red-400 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="font-semibold text-foreground/80">{col.header}</span>
                      )}

                      {/* Sub-label for column type in builder mode */}
                      {isBuilderMode && (
                        <span className="text-[9px] text-muted-foreground/70 uppercase">
                          {col.type} {col.calculation !== 'NONE' && `• ${col.calculation}`}
                        </span>
                      )}
                    </div>

                    {/* Column Configuration Dropdown panel in Builder Mode */}
                    {isBuilderMode && configColIdx === colIndex && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-card border border-border/90 rounded-xl shadow-xl p-3 z-50 text-left space-y-3 font-normal normal-case">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Cell Type</label>
                          <select
                            value={col.type}
                            onChange={(e) => updateColumnConfig(colIndex, { type: e.target.value as TableCellType })}
                            className="w-full h-8 text-xs rounded-md border border-border/80 bg-background px-2 focus:outline-none"
                          >
                            <option value="text">Text Input</option>
                            <option value="number">Number Input</option>
                            <option value="textarea">Textarea Block</option>
                            <option value="yes_no">Yes / No Select</option>
                            <option value="dropdown">Dropdown Options</option>
                            <option value="date">Date Picker</option>
                          </select>
                        </div>

                        {col.type === 'dropdown' && (
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Options (Comma separated)</label>
                            <Input
                              value={col.options?.join(', ') || ''}
                              onChange={(e) => updateColumnConfig(colIndex, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })}
                              placeholder="Option A, Option B, Option C"
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Formula Summary</label>
                          <select
                            value={col.calculation || 'NONE'}
                            onChange={(e) => updateColumnConfig(colIndex, { calculation: e.target.value as any })}
                            className="w-full h-8 text-xs rounded-md border border-border/80 bg-background px-2 focus:outline-none"
                          >
                            <option value="NONE">None</option>
                            <option value="SUM">SUM (Summation)</option>
                            <option value="AVG">AVG (Average)</option>
                            <option value="PRODUCT">PRODUCT (Multiply)</option>
                          </select>
                        </div>

                        <Button
                          type="button"
                          size="xs"
                          className="w-full h-7 text-[10px]"
                          onClick={() => setConfigColIdx(null)}
                        >
                          Close Config
                        </Button>
                      </div>
                    )}
                  </TableHead>
                ))}
                {!readOnly && <TableHead className="w-16 text-center p-3 text-xs font-bold text-muted-foreground uppercase">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowIds.map((rowId, rowIndex) => (
                <TableRow key={rowId} className="hover:bg-muted/5 transition-colors">
                  {columns.map((col, colIndex) => {
                    const cellVal = getCellValue(rowId, col.id, rowIndex, colIndex);

                    return (
                      <TableCell key={col.id} className="p-2 text-center align-middle">
                        {col.type === 'text' && (
                          <Input
                            value={cellVal}
                            onChange={(e) => updateCellValue(rowId, col.id, rowIndex, colIndex, e.target.value)}
                            disabled={readOnly}
                            className="h-8 text-center text-xs bg-transparent border-border/60 focus:border-primary w-full"
                            placeholder="-"
                          />
                        )}

                        {col.type === 'number' && (
                          <Input
                            type="number"
                            value={cellVal}
                            onChange={(e) => updateCellValue(rowId, col.id, rowIndex, colIndex, e.target.value)}
                            disabled={readOnly}
                            className="h-8 text-center text-xs bg-transparent border-border/60 focus:border-primary w-full"
                            placeholder="-"
                          />
                        )}

                        {col.type === 'textarea' && (
                          <Textarea
                            value={cellVal}
                            onChange={(e) => updateCellValue(rowId, col.id, rowIndex, colIndex, e.target.value)}
                            disabled={readOnly}
                            className="text-xs min-h-[45px] bg-transparent border-border/60 focus:border-primary w-full py-1 text-center"
                            placeholder="-"
                          />
                        )}

                        {col.type === 'yes_no' && (
                          <select
                            value={cellVal}
                            disabled={readOnly}
                            onChange={(e) => updateCellValue(rowId, col.id, rowIndex, colIndex, e.target.value)}
                            className="w-full h-8 text-xs rounded-md border border-border/60 bg-transparent px-2 text-foreground focus:border-primary focus:outline-none"
                          >
                            <option value="">Select Status</option>
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                            <option value="N/A">N/A</option>
                          </select>
                        )}

                        {col.type === 'dropdown' && (
                          <select
                            value={cellVal}
                            disabled={readOnly}
                            onChange={(e) => updateCellValue(rowId, col.id, rowIndex, colIndex, e.target.value)}
                            className="w-full h-8 text-xs rounded-md border border-border/60 bg-transparent px-2 text-foreground focus:border-primary focus:outline-none"
                          >
                            <option value="">Choose Option</option>
                            {col.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {col.type === 'date' && (
                          <Input
                            type="date"
                            value={cellVal}
                            onChange={(e) => updateCellValue(rowId, col.id, rowIndex, colIndex, e.target.value)}
                            disabled={readOnly}
                            className="h-8 text-center text-xs bg-transparent border-border/60 focus:border-primary w-full"
                          />
                        )}
                      </TableCell>
                    );
                  })}
                  {!readOnly && (
                    <TableCell className="p-2 text-center align-middle">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteRow(rowIndex, rowId)}
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>

            {/* Calculations Footer */}
            {columns.some(col => col.calculation && col.calculation !== 'NONE') && (
              <tfoot className="bg-muted/10 border-t border-border/80 font-semibold text-xs">
                <TableRow>
                  {columns.map((col) => (
                    <TableCell key={col.id} className="p-3 text-center text-muted-foreground font-mono font-bold">
                      {calculateFooter(col)}
                    </TableCell>
                  ))}
                  {!readOnly && <TableCell />}
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
}
