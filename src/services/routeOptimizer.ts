import type { BusinessViolation, Delivery, RoutePlan, RouteStop, Vehicle, VehicleRoute } from '../domain/models';
import type { RoutingProvider, TravelCost } from '../providers/routing/RoutingProvider';

interface SimulatedRoute {
  route: VehicleRoute;
  violations: BusinessViolation[];
}

const simulateRoute = (
  vehicle: Vehicle,
  deliveryIds: string[],
  deliveriesById: Map<string, Delivery>,
  locationIndex: Map<string, number>,
  matrix: TravelCost[][],
): SimulatedRoute => {
  let time = vehicle.availableFrom;
  let currentLocationIndex = 0;
  let totalDistanceKm = 0;
  let totalTravelMinutes = 0;
  const stops: RouteStop[] = [];
  const violations: BusinessViolation[] = [];

  deliveryIds.forEach((deliveryId, index) => {
    const delivery = deliveriesById.get(deliveryId)!;
    const nextLocationIndex = locationIndex.get(deliveryId)!;
    const travel = matrix[currentLocationIndex][nextLocationIndex];
    const rawArrival = time + travel.durationMinutes;
    const arrivalTime = Math.max(rawArrival, delivery.timeWindow.start);
    const latenessMinutes = Math.max(0, arrivalTime - delivery.timeWindow.end);
    const departureTime = arrivalTime + delivery.serviceMinutes;

    if (latenessMinutes > 0) {
      violations.push({
        type: 'TIME_WINDOW',
        deliveryId,
        minutes: latenessMinutes,
        message: `${delivery.customerName}が指定時間を${latenessMinutes}分超過`,
      });
    }

    stops.push({ deliveryId, sequence: index + 1, arrivalTime, departureTime, travelMinutes: travel.durationMinutes, distanceKm: travel.distanceKm, latenessMinutes });
    time = departureTime;
    currentLocationIndex = nextLocationIndex;
    totalDistanceKm += travel.distanceKm;
    totalTravelMinutes += travel.durationMinutes;
  });

  const returnCost = matrix[currentLocationIndex][0];
  return {
    route: {
      vehicleId: vehicle.id,
      stops,
      totalDistanceKm: Number((totalDistanceKm + returnCost.distanceKm).toFixed(1)),
      totalTravelMinutes: totalTravelMinutes + returnCost.durationMinutes,
      finishTime: time + returnCost.durationMinutes,
      load: deliveryIds.reduce((sum, id) => sum + deliveriesById.get(id)!.packageCount, 0),
    },
    violations,
  };
};

export const optimizeRoutes = async (
  deliveries: Delivery[],
  vehicles: Vehicle[],
  routingProvider: RoutingProvider,
  revision: number,
  options: { excludedVehicleIds?: string[] } = {},
): Promise<RoutePlan> => {
  const locations = [vehicles[0].startLocation, ...deliveries.map((delivery) => delivery.location)];
  const matrix = await routingProvider.getTravelMatrix(locations, Math.min(...vehicles.map((vehicle) => vehicle.availableFrom)));
  const deliveryById = new Map(deliveries.map((delivery) => [delivery.id, delivery]));
  const locationIndex = new Map(deliveries.map((delivery, index) => [delivery.id, index + 1]));
  const assignments = new Map(vehicles.map((vehicle) => [vehicle.id, [] as string[]]));
  const excludedVehicleIds = new Set(options.excludedVehicleIds ?? []);
  const activeVehicles = vehicles.filter((vehicle) => !excludedVehicleIds.has(vehicle.id));
  const unassignedDeliveryIds: string[] = [];

  const ordered = [...deliveries].sort((a, b) => a.timeWindow.end - b.timeWindow.end || (a.priority === 'high' ? -1 : 1));

  for (const delivery of ordered) {
    let best: { vehicleId: string; ids: string[]; score: number } | undefined;
    for (const vehicle of activeVehicles) {
      const current = assignments.get(vehicle.id)!;
      const currentLoad = current.reduce((sum, id) => sum + deliveryById.get(id)!.packageCount, 0);
      if (currentLoad + delivery.packageCount > vehicle.capacity) continue;

      for (let position = 0; position <= current.length; position += 1) {
        const ids = [...current.slice(0, position), delivery.id, ...current.slice(position)];
        const simulated = simulateRoute(vehicle, ids, deliveryById, locationIndex, matrix);
        if (simulated.route.finishTime > vehicle.availableUntil) continue;
        const lateMinutes = simulated.violations.reduce((sum, violation) => sum + violation.minutes, 0);
        const preferencePenalty = delivery.preferredVehicleId && delivery.preferredVehicleId !== vehicle.id ? 1_000 : 0;
        const score = lateMinutes * 10_000 + preferencePenalty + simulated.route.totalTravelMinutes * 10 + simulated.route.finishTime;
        if (!best || score < best.score) best = { vehicleId: vehicle.id, ids, score };
      }
    }

    if (best) assignments.set(best.vehicleId, best.ids);
    else unassignedDeliveryIds.push(delivery.id);
  }

  const simulations = vehicles.map((vehicle) => simulateRoute(vehicle, assignments.get(vehicle.id)!, deliveryById, locationIndex, matrix));
  const businessViolations = simulations.flatMap(({ violations }) => violations);
  const status = unassignedDeliveryIds.length > 0
    ? 'no-feasible-plan'
    : businessViolations.length > 0
      ? 'requires-review'
      : 'feasible';

  return {
    id: `plan-r${revision}`,
    revision,
    routes: simulations.map(({ route }) => route),
    unassignedDeliveryIds,
    businessViolations,
    status,
    createdAt: new Date().toISOString(),
  };
};
