import { describe, expect, it } from 'vitest';
import { initialDeliveries, vehicles } from '../data/mockScenario';
import { MockRoutingProvider } from '../providers/routing/MockRoutingProvider';
import { optimizeRoutes } from './routeOptimizer';

describe('routeOptimizer', () => {
  it('重複・容量超過・稼働時間超過のない初期計画を作る', async () => {
    const plan = await optimizeRoutes(initialDeliveries, vehicles, new MockRoutingProvider(), 1);
    const assigned = plan.routes.flatMap((route) => route.stops.map((stop) => stop.deliveryId));

    expect(new Set(assigned).size).toBe(assigned.length);
    expect(assigned.length + plan.unassignedDeliveryIds.length).toBe(initialDeliveries.length);
    plan.routes.forEach((route) => {
      const vehicle = vehicles.find((item) => item.id === route.vehicleId)!;
      expect(route.load).toBeLessThanOrEqual(vehicle.capacity);
      expect(route.finishTime).toBeLessThanOrEqual(vehicle.availableUntil);
    });
  });

  it('容量上配置できない配送を正常結果として未割当にする', async () => {
    const oversized = [{ ...initialDeliveries[0], id: 'oversized', packageCount: 100 }];
    const plan = await optimizeRoutes(oversized, vehicles, new MockRoutingProvider(), 1);

    expect(plan.status).toBe('no-feasible-plan');
    expect(plan.unassignedDeliveryIds).toEqual(['oversized']);
  });
});
