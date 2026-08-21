import { describe, expect, it } from 'vitest';
import { initialDeliveries } from '../../data/mockScenario';
import { MockAiAssistantProvider } from './MockAiAssistantProvider';

describe('MockAiAssistantProvider', () => {
  const provider = new MockAiAssistantProvider();

  it('配送先または時刻が曖昧なら勝手に変更しない', async () => {
    const result = await provider.interpret('午後に変更して', initialDeliveries);
    expect(result.needsClarification).toBe(true);
    expect(result.change).toBeUndefined();
  });
});
