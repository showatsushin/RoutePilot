import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { vehicles } from '../../data/mockScenario';
import { MockLocationResolver } from '../../providers/location/MockLocationResolver';
import { parseDeliveryPlanFile } from './fileParser';

describe('XLSX import', () => {
  it('repo内のXLSXテンプレートを正常に読み込む', async () => {
    const bytes = readFileSync(join(process.cwd(), 'public', 'samples', 'delivery-plan-template.xlsx'));
    const arrayBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(arrayBuffer).set(bytes);
    const file = { name: 'delivery-plan-template.xlsx', arrayBuffer: async () => arrayBuffer } as File;
    const preview = await parseDeliveryPlanFile(file, vehicles, new MockLocationResolver());

    expect(preview.errors).toEqual([]);
    expect(preview.deliveries).toHaveLength(10);
    expect(preview.deliveries.find((delivery) => delivery.customerName === '青葉商事')?.timeWindow.start).toBe(600);
  });
});
