import { describe, expect, it } from 'vitest';
import { initialDeliveries, vehicles } from '../data/mockScenario';
import { MockAiAssistantProvider } from '../providers/ai/MockAiAssistantProvider';
import { MockRoutingProvider } from '../providers/routing/MockRoutingProvider';
import { approveProposal, createProposal } from './proposalService';
import { optimizeRoutes } from './routeOptimizer';

const routing = new MockRoutingProvider();
const assistant = new MockAiAssistantProvider();

describe('最重要vertical slice', () => {
  it('青葉商事の時間変更を提案し、承認後だけrevisionと計画を更新する', async () => {
    const currentPlan = await optimizeRoutes(initialDeliveries, vehicles, routing, 1);
    const originalSnapshot = structuredClone(currentPlan);
    const interpretation = await assistant.interpret('青葉商事を15時以降に変更して', initialDeliveries);

    expect(interpretation.change).toMatchObject({
      type: 'change-time-window',
      deliveryId: 'd-02',
      newWindow: { start: 900 },
    });

    const proposal = await createProposal(
      interpretation.rawText,
      interpretation.change!,
      initialDeliveries,
      vehicles,
      currentPlan,
      routing,
    );

    expect(currentPlan).toEqual(originalSnapshot);
    expect(currentPlan.revision).toBe(1);
    expect(proposal.baseRevision).toBe(1);
    expect(proposal.proposedPlan.revision).toBe(2);
    expect(proposal.proposedDeliveries.find((item) => item.id === 'd-02')?.timeWindow.start).toBe(900);
    expect(proposal.impact.details.length).toBeGreaterThan(0);

    const approved = approveProposal(currentPlan, proposal);
    expect(approved.plan.revision).toBe(2);
    expect(approved.deliveries.find((item) => item.id === 'd-02')?.timeWindow.start).toBe(900);
  });

  it('却下相当ではcurrentPlanとrevisionを変更しない', async () => {
    const currentPlan = await optimizeRoutes(initialDeliveries, vehicles, routing, 1);
    const snapshot = structuredClone(currentPlan);
    const interpretation = await assistant.interpret('青葉商事を15時以降に変更して', initialDeliveries);
    await createProposal(interpretation.rawText, interpretation.change!, initialDeliveries, vehicles, currentPlan, routing);

    expect(currentPlan).toEqual(snapshot);
    expect(currentPlan.revision).toBe(1);
  });

  it('古いrevisionに対する提案の承認を拒否する', async () => {
    const currentPlan = await optimizeRoutes(initialDeliveries, vehicles, routing, 1);
    const interpretation = await assistant.interpret('青葉商事を15時以降に変更して', initialDeliveries);
    const proposal = await createProposal(interpretation.rawText, interpretation.change!, initialDeliveries, vehicles, currentPlan, routing);
    const newerPlan = { ...currentPlan, revision: 2 };

    expect(() => approveProposal(newerPlan, proposal)).toThrow('現在の計画が更新されています');
  });
});
