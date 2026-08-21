import { readSheet } from 'read-excel-file/universal';
import type { ImportPreview, Vehicle } from '../../domain/models';
import type { LocationResolver } from '../../providers/location/LocationResolver';
import { validateImportRows } from './importValidation';

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted && character === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += character;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
};

const cellToString = (cell: unknown) => {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return `${String(cell.getHours()).padStart(2, '0')}:${String(cell.getMinutes()).padStart(2, '0')}`;
  return String(cell);
};

export const parseDeliveryPlanFile = async (file: File, vehicles: Vehicle[], resolver: LocationResolver): Promise<ImportPreview> => {
  const extension = file.name.toLowerCase().split('.').pop();
  let matrix: string[][];
  if (extension === 'csv') matrix = parseCsv(await file.text());
  else if (extension === 'xlsx') matrix = (await readSheet(await file.arrayBuffer())).map((row) => row.map(cellToString));
  else return { fileName: file.name, rows: [], deliveries: [], errors: [{ rowNumber: 1, field: 'file', message: '.xlsxまたは.csvファイルを選択してください' }], isValid: false };

  const [headers = [], ...values] = matrix;
  return validateImportRows(file.name, headers, values, vehicles, resolver);
};

export { parseCsv };
