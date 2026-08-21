import type { ChangeProposal, Delivery, PlanImpact, RoutePlan, TimeWindowChange, Vehicle } from '../domain/models';
import type { RoutingProvider } from '../providers/routing/RoutingProvider';
import { optimizeRoutes } from './routeOptimizer';

const assignedVehicle = (plan: RoutePlan, deliveryId: string) => plan.routes.find((route) => route.stops.some((stop) => stop.deliveryId === deliveryId))?.vehicleId;
const stopPosition = (plan: RoutePlan, deliveryId: string) => plan.routes.flatMap((route) => route.stops).find((stop) => stop.deliveryId === deliveryId)?.sequence;
const totalDistance = (plan: RoutePlan) => plan.routes.reduce((sum, route) => sum + route.totalDistanceKm, 0);
const latestFinish = (plan: RoutePlan) => Math.max(...plan.routes.map((route) => route.finishTime));

export const analyzeImpact = (current: RoutePlan, proposed: RoutePlan, deliveries: Delivery[]): PlanImpact => {
  const moved = deliveries.filter((delivery) => assignedVehicle(current, delivery.id) !== assignedVehicle(proposed, delivery.id) || stopPosition(current, delivery.id) !== stopPosition(proposed, delivery.id));
  const distanceDeltaKm = Number((totalDistance(proposed) - totalDistance(current)).toFixed(1));
  const finishTimeDeltaMinutes = latestFinish(proposed) - latestFinish(current);
  const details = [
    `${moved.length}件の配送順または担当車両が変更`,
    `総走行距離 ${distanceDeltaKm >= 0 ? '+' : ''}${distanceDeltaKm.toFixed(1)} km`,
    `最終帰着予定 ${finishTimeDeltaMinutes >= 0 ? '+' : ''}${finishTimeDeltaMinutes}分`,
  ];
  if (proposed.businessViolations.length) details.push(`時間指定の超過 ${proposed.businessViolations.length}件（要確認）`);
  if (proposed.unassignedDeliveryIds.length) details.push(`未割当 ${proposed.unassignedDeliveryIds.length}件（このまま確定不可）`);
  return {
    summary: proposed.status === 'feasible' ? '全ての必須条件と配送時間指定を満たす再計算案です。' : '全条件を満たせないため、人による判断が必要な代替案です。',
    details,
    movedDeliveries: moved.length,
    distanceDeltaKm,
    finishTimeDeltaMinutes,
  };
};

export const createProposal = async (
  rawInstruction: string,
  change: TimeWindowChange,
  deliveries: Delivery[],
  vehicles: Vehicle[],
  currentPlan: RoutePlan,
  routingProvider: RoutingProvider,
): Promise<ChangeProposal> => {
  const proposedDeliveries = deliveries.map((delivery) => delivery.id === change.deliveryId ? { ...delivery, timeWindow: change.newWindow } : delivery);
  const proposedPlan = await optimizeRoutes(proposedDeliveries, vehicles, routingProvider, currentPlan.revision + 1);
  return {
    id: `proposal-${currentPlan.revision + 1}`,
    baseRevision: currentPlan.revision,
    rawInstruction,
    change,
    proposedDeliveries,
    proposedPlan,
    impact: analyzeImpact(currentPlan, proposedPlan, proposedDeliveries),
    status: 'pending',
  };
};

export const createVehicleReassignmentProposal = async (
  blockedVehicleId: string,
  deliveries: Delivery[],
  vehicles: Vehicle[],
  currentPlan: RoutePlan,
  routingProvider: RoutingProvider,
): Promise<ChangeProposal> => {
  const proposedPlan = await optimizeRoutes(deliveries, vehicles, routingProvider, currentPlan.revision + 1, { excludedVehicleIds: [blockedVehicleId] });
  const blockedVehicle = vehicles.find((vehicle) => vehicle.id === blockedVehicleId);
  const assignedCount = currentPlan.routes.find((route) => route.vehicleId === blockedVehicleId)?.stops.length ?? 0;
  const impact = analyzeImpact(currentPlan, proposedPlan, deliveries);
  impact.details.unshift(`${blockedVehicle?.name ?? blockedVehicleId}の${assignedCount}件を他車両へ再配車`);
  return {
    id: `proposal-${currentPlan.revision + 1}`,
    baseRevision: currentPlan.revision,
    rawInstruction: `${blockedVehicle?.name ?? blockedVehicleId}を運行対象から外して再配車`,
    change: { type: 'vehicle-unavailable', vehicleId: blockedVehicleId },
    proposedDeliveries: deliveries,
    proposedPlan,
    impact,
    status: 'pending',
  };
};

export const approveProposal = (currentPlan: RoutePlan, proposal: ChangeProposal) => {
  if (proposal.status !== 'pending') throw new Error('この提案は処理済みです。');
  if (proposal.baseRevision !== currentPlan.revision) throw new Error('現在の計画が更新されています。再計算してください。');
  if (proposal.proposedPlan.unassignedDeliveryIds.length > 0) throw new Error('未割当があるため、この案は確定できません。');
  return { plan: proposal.proposedPlan, deliveries: proposal.proposedDeliveries };
};
