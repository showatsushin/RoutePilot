import { describe, expect, it } from 'vitest';
import { initialDeliveries, vehicles } from '../data/mockScenario';
import { MockRoutingProvider } from '../providers/routing/MockRoutingProvider';
import { approveProposal, createVehicleReassignmentProposal } from './proposalService';
import { optimizeRoutes } from './routeOptimizer';

describe('blocked車両の再配車proposal', () => {
  it('承認までcurrentPlanを変えず、承認後だけRev.2にする', async () => {
    const routing = new MockRoutingProvider();
    const currentPlan = await optimizeRoutes(initialDeliveries, vehicles, routing, 1);
    const snapshot = structuredClone(currentPlan);
    const proposal = await createVehicleReassignmentProposal('v-02', initialDeliveries, vehicles, currentPlan, routing);

    expect(currentPlan).toEqual(snapshot);
    expect(currentPlan.revision).toBe(1);
    expect(proposal.proposedPlan.revision).toBe(2);
    expect(proposal.proposedPlan.routes.find((route) => route.vehicleId === 'v-02')?.stops).toHaveLength(0);
    expect(proposal.proposedPlan.unassignedDeliveryIds).toHaveLength(0);

    const approved = approveProposal(currentPlan, proposal);
    expect(approved.plan.revision).toBe(2);
  });
});
