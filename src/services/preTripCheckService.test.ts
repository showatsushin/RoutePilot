import { describe, expect, it } from 'vitest';
import type { PreTripCheck } from '../domain/models';
import { completePreTripCheck, evaluatePreTripCheck } from './preTripCheckService';

const validCheck = (): PreTripCheck => ({
  id: 'check-1', driverId: 'driver-01', vehicleId: 'v-01', routePlanRevision: 1, status: 'draft',
  alcoholCheck: { measuredValue: 0, unit: 'mg/L', outcome: 'clear' },
  healthCheck: { condition: 'ok', concerns: [] },
  vehicleInspection: [
    { key: 'tires', label: 'タイヤ', result: 'ok' }, { key: 'lights', label: '灯火類', result: 'ok' },
    { key: 'brakes', label: 'ブレーキ', result: 'ok' }, { key: 'mirrors', label: 'ミラー・視界', result: 'ok' },
    { key: 'exterior', label: '車両外観', result: 'ok' }, { key: 'other', label: 'その他異常', result: 'ok' },
  ],
  evidencePhotos: [
    { id: 'p1', type: 'alcohol', fileName: 'meter.png', selectedAt: '2026-08-21T08:00:00Z' },
    { id: 'p2', type: 'vehicle', fileName: 'vehicle.png', selectedAt: '2026-08-21T08:01:00Z' },
  ],
});

describe('乗務前点呼の決定論的判定', () => {
  it('全項目OKならallowed', () => expect(completePreTripCheck(validCheck(), '2026-08-21T08:05:00Z')).toMatchObject({ status: 'completed', result: 'allowed' }));

  it('アルコール問題ありならblocked', () => {
    const check = validCheck(); check.alcoholCheck = { measuredValue: 0.1, unit: 'mg/L', outcome: 'concern' };
    expect(evaluatePreTripCheck(check).result).toBe('blocked');
  });

  it('体調懸念ならneeds_review', () => {
    const check = validCheck(); check.healthCheck = { condition: 'concern', concerns: ['fatigue'] };
    expect(evaluatePreTripCheck(check).result).toBe('needs_review');
  });

  it('車両点検の要確認ならneeds_review', () => {
    const check = validCheck(); check.vehicleInspection[0].result = 'concern';
    expect(evaluatePreTripCheck(check).result).toBe('needs_review');
  });
});
