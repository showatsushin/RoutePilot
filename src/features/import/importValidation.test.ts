import { describe, expect, it } from 'vitest';
import { vehicles } from '../../data/mockScenario';
import { MockLocationResolver } from '../../providers/location/MockLocationResolver';
import { parseCsv } from './fileParser';
import { REQUIRED_IMPORT_COLUMNS, validateImportRows } from './importValidation';

const resolver = new MockLocationResolver();
const validRow = ['D001', '青葉商事', '中央区新川 1-12-3', '10:00', '12:00', '15', '4', 'normal', '', '午前希望'];

describe('配送計画import validation', () => {
  it('CSVを解析してDeliveryへ正常化する', () => {
    const csv = `${REQUIRED_IMPORT_COLUMNS.join(',')}\r\n${validRow.join(',')}\r\n`;
    const [headers, ...values] = parseCsv(csv);
    const preview = validateImportRows('plan.csv', headers, values, vehicles, resolver);

    expect(preview.isValid).toBe(true);
    expect(preview.deliveries[0]).toMatchObject({ id: 'D001', customerName: '青葉商事', timeWindow: { start: 600, end: 720 }, packageCount: 4 });
  });

  it('必須列不足を1行目のエラーにする', () => {
    const headers = REQUIRED_IMPORT_COLUMNS.filter((column) => column !== 'address');
    const preview = validateImportRows('missing.csv', [...headers], [], vehicles, resolver);
    expect(preview.errors).toContainEqual({ rowNumber: 1, field: 'address', message: '必須列「address」がありません' });
  });

  it('delivery_id重複を行単位で報告する', () => {
    const preview = validateImportRows('duplicate.csv', [...REQUIRED_IMPORT_COLUMNS], [validRow, validRow], vehicles, resolver);
    expect(preview.errors.some((error) => error.rowNumber === 3 && error.field === 'delivery_id' && error.message.includes('重複'))).toBe(true);
  });

  it('不正時刻を行単位で報告する', () => {
    const row = [...validRow]; row[3] = '25:80';
    const preview = validateImportRows('time.csv', [...REQUIRED_IMPORT_COLUMNS], [row], vehicles, resolver);
    expect(preview.errors.some((error) => error.rowNumber === 2 && error.field === 'time_window_start')).toBe(true);
  });

  it('未知住所を捏造せずエラーにする', () => {
    const row = [...validRow]; row[1] = '未知株式会社'; row[2] = '架空県未知市 1-1-1';
    const preview = validateImportRows('unknown.csv', [...REQUIRED_IMPORT_COLUMNS], [row], vehicles, resolver);
    expect(preview.errors).toContainEqual({ rowNumber: 2, field: 'address', message: 'この無料デモでは未対応の住所です' });
    expect(preview.deliveries).toHaveLength(0);
  });
});
