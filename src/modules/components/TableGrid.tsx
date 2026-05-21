import React from 'react';
import { TableColumn, DynamicCellResponse } from '@/types/dynamicSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

interface TableGridProps {
  componentId: string;
  columns: TableColumn[];
  cells: DynamicCellResponse[];
  onChange: (updatedCells: DynamicCellResponse[]) => void;
  defaultRowCount?: number;
  readOnly?: boolean;
}

export function TableGrid({
  componentId,
  columns = [],
  cells = [],
  onChange,
  defaultRowCount = 3,
  readOnly = false
}: TableGridProps) {
  // Generate row list dynamically based on cells or initial count
  const getUniqueRowIds = () => {
    const rowIds = new Set<string>();
    cells.forEach(c => rowIds.add(c.rowId));
    
    // If no cells exist, generate default rows
    if (rowIds.size === 0) {
      const ids: string[] = [];
      for (let i = 0; i < defaultRowCount; i++) {
        ids.push(`row_${i}`);
      }
      return ids;
    }
    return Array.from(rowIds);
  };

  const rowIds = getUniqueRowIds();

  const getCellValue = (rowId: string, colId: string): string => {
    return cells.find(c => c.rowId === rowId && c.colId === colId)?.value || '';
  };

  const updateCell = (rowId: string, colId: string, value: string) => {
    const existingIdx = cells.findIndex(c => c.rowId === rowId && c.colId === colId);
    const updated = [...cells];
    if (existingIdx > -1) {
      updated[existingIdx] = { ...updated[existingIdx], value };
    } else {
      updated.push({ rowId, colId, value });
    }
    onChange(updated);
  };

  const addRow = () => {
    const newRowId = `row_${Math.random().toString(36).substr(2, 9)}`;
    const newCells = [...cells];
    columns.forEach(col => {
      newCells.push({ rowId: newRowId, colId: col.id, value: '' });
    });
    onChange(newCells);
  };

  const deleteRow = (rowId: string) => {
    onChange(cells.filter(c => c.rowId !== rowId));
  };

  // Formulas calculation
  const calculateFooter = (col: TableColumn) => {
    if (!col.calculation || col.calculation === 'NONE') return null;

    const values = rowIds
      .map(rowId => parseFloat(getCellValue(rowId, col.id)))
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
    <div className="space-y-3 w-full">
      <div className="overflow-x-auto border border-border/80 rounded-xl bg-card">
        <table className="w-full text-left border-collapse min-w-[700px]">
          {/* Header */}
          <thead className="bg-muted/40 sticky top-0 z-10 border-b border-border/80">
            <tr>
              {columns.map((col) => (
                <th key={col.id} className="p-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
              {!readOnly && (
                <th className="p-3 text-xs font-bold text-muted-foreground uppercase tracking-wider w-16 text-center">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-border/60">
            {rowIds.map((rowId, rIndex) => (
              <tr key={rowId} className="hover:bg-muted/5 transition-colors">
                {columns.map((col) => {
                  const val = getCellValue(rowId, col.id);

                  return (
                    <td key={col.id} className="p-2 align-middle">
                      {col.type === 'text' && (
                        <Input
                          type="text"
                          value={val}
                          disabled={readOnly}
                          onChange={(e) => updateCell(rowId, col.id, e.target.value)}
                          className="h-8 text-xs bg-transparent border-border/60 focus:border-primary focus:bg-card"
                        />
                      )}

                      {col.type === 'number' && (
                        <Input
                          type="number"
                          value={val}
                          disabled={readOnly}
                          onChange={(e) => updateCell(rowId, col.id, e.target.value)}
                          className="h-8 text-xs bg-transparent border-border/60 focus:border-primary focus:bg-card"
                        />
                      )}

                      {col.type === 'textarea' && (
                        <Textarea
                          value={val}
                          disabled={readOnly}
                          onChange={(e) => updateCell(rowId, col.id, e.target.value)}
                          className="text-xs min-h-[50px] bg-transparent border-border/60 focus:border-primary focus:bg-card py-1"
                        />
                      )}

                      {col.type === 'yes_no' && (
                        <select
                          value={val}
                          disabled={readOnly}
                          onChange={(e) => updateCell(rowId, col.id, e.target.value)}
                          className="w-full h-8 text-xs rounded-md border border-border/60 bg-transparent px-2 text-foreground focus:border-primary focus:bg-card focus:outline-none"
                        >
                          <option value="">Select Status</option>
                          <option value="YES">YES</option>
                          <option value="NO">NO</option>
                          <option value="N/A">N/A</option>
                        </select>
                      )}

                      {col.type === 'dropdown' && (
                        <select
                          value={val}
                          disabled={readOnly}
                          onChange={(e) => updateCell(rowId, col.id, e.target.value)}
                          className="w-full h-8 text-xs rounded-md border border-border/60 bg-transparent px-2 text-foreground focus:border-primary focus:bg-card focus:outline-none"
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
                          value={val}
                          disabled={readOnly}
                          onChange={(e) => updateCell(rowId, col.id, e.target.value)}
                          className="h-8 text-xs bg-transparent border-border/60 focus:border-primary focus:bg-card"
                        />
                      )}
                    </td>
                  );
                })}

                {!readOnly && (
                  <td className="p-2 text-center align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRow(rowId)}
                      className="text-destructive hover:bg-destructive/15 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>

          {/* Footer (For Calculations like SUM/AVG) */}
          {columns.some(col => col.calculation && col.calculation !== 'NONE') && (
            <tfoot className="bg-muted/10 border-t border-border/80 font-semibold text-xs">
              <tr>
                {columns.map((col) => (
                  <td key={col.id} className="p-3 text-muted-foreground font-mono">
                    {calculateFooter(col)}
                  </td>
                ))}
                {!readOnly && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={addRow}
            className="text-xs h-7"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
          </Button>
        </div>
      )}
    </div>
  );
}
