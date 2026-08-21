import type { Location } from '../../domain/models';
import type { BuiltRoute, RoutingProvider, TravelCost } from './RoutingProvider';

const costBetween = (from: Location, to: Location): TravelCost => {
  const gridDistance = Math.hypot(to.x - from.x, to.y - from.y);
  const distanceKm = Math.max(0, gridDistance * 0.16);
  return {
    distanceKm: Number(distanceKm.toFixed(1)),
    durationMinutes: Math.max(0, Math.round(gridDistance * 0.48)),
  };
};

export class MockRoutingProvider implements RoutingProvider {
  async getTravelMatrix(locations: Location[]): Promise<TravelCost[][]> {
    return locations.map((from) => locations.map((to) => costBetween(from, to)));
  }

  async buildRoute(orderedLocations: Location[]): Promise<BuiltRoute> {
    const legs = orderedLocations.slice(0, -1).map((from, index) => {
      const to = orderedLocations[index + 1];
      return { from, to, path: [from, to], ...costBetween(from, to) };
    });
    return {
      legs,
      totalDistanceKm: Number(legs.reduce((sum, leg) => sum + leg.distanceKm, 0).toFixed(1)),
      totalDurationMinutes: legs.reduce((sum, leg) => sum + leg.durationMinutes, 0),
    };
  }
}
