// Lectura de archivos .xlsx con exceljs — compartido entre el API route (server)
// y el importador (browser, vía dynamic import).
// Sustituye a la librería `xlsx` (CVEs sin parche en npm: prototype pollution, ReDoS).

import ExcelJS from 'exceljs';

function cellToValue(v: ExcelJS.CellValue): unknown {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return v;
    if ('richText' in v) return v.richText.map((r) => r.text).join('');
    if ('result' in v) return v.result ?? '';
    if ('text' in v) return v.text;
    if ('error' in v) return '';
  }
  return v;
}

/**
 * Convierte un .xlsx a matriz de filas (equivalente a sheet_to_json con header:1).
 * Celdas vacías → '' · fechas → Date · filas en blanco omitidas.
 * Solo soporta .xlsx — el formato legacy .xls (BIFF) no está soportado.
 */
export async function readExcelRows(buffer: ArrayBuffer): Promise<unknown[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const ws = workbook.worksheets[0];
  if (!ws) return [];

  const rows: unknown[][] = [];
  ws.eachRow((row) => {
    const values = row.values as ExcelJS.CellValue[]; // 1-indexed: values[0] siempre vacío
    const arr: unknown[] = [];
    for (let i = 1; i < values.length; i++) arr.push(cellToValue(values[i]));
    rows.push(arr);
  });
  return rows;
}
