import type { Location, Minutes } from '../../domain/models';

export interface TravelCost {
  distanceKm: number;
  durationMinutes: number;
}

export interface RouteLeg extends TravelCost {
  from: Location;
  to: Location;
  path: Location[];
}

export interface BuiltRoute {
  legs: RouteLeg[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
}

export interface RoutingProvider {
  getTravelMatrix(locations: Location[], departureTime: Minutes): Promise<TravelCost[][]>;
  buildRoute(orderedLocations: Location[], departureTime: Minutes): Promise<BuiltRoute>;
}
