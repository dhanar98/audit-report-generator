import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Hash, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { TemplateTableSchema } from '@/types/schema';

interface TableEditorProps {
  table: TemplateTableSchema;
  onChange: (updatedTable: TemplateTableSchema) => void;
  readOnly?: boolean;
}

export function TableEditor({ table, onChange, readOnly = false }: TableEditorProps) {
  const [columns, setColumns] = useState<string[]>(table.columns || []);
  const [rows, setRows] = useState<string[][]>(table.rows || []);

  useEffect(() => {
    setColumns(table.columns || []);
    setRows(table.rows || []);
  }, [table]);

  const updateTableData = (newCols: string[], newRows: string[][]) => {
    setColumns(newCols);
    setRows(newRows);
    onChange({
      ...table,
      columns: newCols,
      rows: newRows
    });
  };

  // Add Column
  const addColumn = () => {
    if (readOnly) return;
    const newColName = `Column ${columns.length + 1}`;
    const newCols = [...columns, newColName];
    const newRows = rows.map(row => [...row, '']);
    updateTableData(newCols, newRows);
  };

  // Delete Column
  const deleteColumn = (colIndex: number) => {
    if (readOnly || columns.length <= 1) return;
    const newCols = columns.filter((_, idx) => idx !== colIndex);
    const newRows = rows.map(row => row.filter((_, idx) => idx !== colIndex));
    updateTableData(newCols, newRows);
  };

  // Rename Column
  const renameColumn = (colIndex: number, newName: string) => {
    if (readOnly) return;
    const newCols = [...columns];
    newCols[colIndex] = newName;
    updateTableData(newCols, rows);
  };

  // Add Row
  const addRow = () => {
    if (readOnly) return;
    const newRow = Array(columns.length).fill('');
    const newRows = [...rows, newRow];
    updateTableData(columns, newRows);
  };

  // Delete Row
  const deleteRow = (rowIndex: number) => {
    if (readOnly || rows.length <= 1) return;
    const newRows = rows.filter((_, idx) => idx !== rowIndex);
    updateTableData(columns, newRows);
  };

  // Update Cell
  const updateCell = (rowIndex: number, colIndex: number, val: string) => {
    if (readOnly) return;
    const newRows = rows.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        const newRow = [...row];
        newRow[colIndex] = val;
        return newRow;
      }
      return row;
    });
    updateTableData(columns, newRows);
  };

  // Calculate sum for a column if it is numeric
  const getColumnSum = (colIndex: number): number | null => {
    let sum = 0;
    let hasNumeric = false;
    for (let r = 0; r < rows.length; r++) {
      // Avoid counting the last row if it's named "Total Load" or "Total"
      const isTotalRow = rows[r][0]?.toLowerCase().includes('total');
      if (isTotalRow) continue;

      const val = parseFloat(rows[r][colIndex]);
      if (!isNaN(val)) {
        sum += val;
        hasNumeric = true;
      }
    }
    return hasNumeric ? parseFloat(sum.toFixed(2)) : null;
  };

  return (
    <div className="w-full space-y-4 overflow-x-auto">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-primary">{table.title || 'Dynamic Data Grid'}</h4>
        {!readOnly && (
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={addColumn}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Column
            </Button>
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </Button>
          </div>
        )}
      </div>

      <div className="border border-border/80 rounded-lg overflow-hidden glass-panel">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              {columns.map((col, colIndex) => (
                <TableHead key={colIndex} className="p-3 text-center min-w-[120px] relative group">
                  {readOnly ? (
                    <span className="font-semibold text-foreground/80">{col}</span>
                  ) : (
                    <div className="flex items-center justify-center space-x-1">
                      <Input
                        value={col}
                        onChange={(e) => renameColumn(colIndex, e.target.value)}
                        className="h-8 text-center text-xs bg-transparent border-none focus:ring-1 focus:ring-primary w-full p-1"
                      />
                      {columns.length > 1 && (
                        <button
                          onClick={() => deleteColumn(colIndex)}
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-red-400 p-1 rounded transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </TableHead>
              ))}
              {!readOnly && <TableHead className="w-12 text-center p-3">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => {
              const isTotalRow = row[0]?.toLowerCase().includes('total');
              return (
                <TableRow key={rowIndex} className={isTotalRow ? "bg-primary/5 font-bold" : ""}>
                  {row.map((cell, colIndex) => {
                    // Auto-calculate if it's the Total Row and not the first column
                    const colSum = colIndex > 0 ? getColumnSum(colIndex) : null;
                    const displayValue = (isTotalRow && colSum !== null) ? colSum.toString() : cell;
                    
                    return (
                      <TableCell key={colIndex} className="p-2 text-center">
                        <Input
                          value={displayValue}
                          onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                          disabled={readOnly || (isTotalRow && colIndex > 0)}
                          placeholder="-"
                          className={`h-8 text-center text-xs bg-transparent ${
                            isTotalRow ? 'font-bold border-none text-primary' : 'border-border/60 focus:border-primary'
                          }`}
                        />
                      </TableCell>
                    );
                  })}
                  {!readOnly && (
                    <TableCell className="p-2 text-center">
                      {rows.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteRow(rowIndex)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
