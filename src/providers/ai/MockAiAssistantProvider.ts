import type { AssistantInterpretation, Delivery } from '../../domain/models';
import type { AiAssistantProvider } from './AiAssistantProvider';

const parseHour = (value: string) => {
  const hour = Number(value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour * 60 : undefined;
};

export class MockAiAssistantProvider implements AiAssistantProvider {
  async interpret(instruction: string, deliveries: Delivery[]): Promise<AssistantInterpretation> {
    const target = deliveries.find((delivery) => instruction.includes(delivery.customerName));
    const afterMatch = instruction.match(/(\d{1,2})時(?:以降|から)/);

    if (!target) {
      return { rawText: instruction, summary: '配送先を特定できませんでした。顧客名を含めてください。', confidence: 'low', needsClarification: true };
    }
    if (!afterMatch) {
      return { rawText: instruction, summary: '変更時刻を特定できませんでした。「15時以降」のように入力してください。', confidence: 'low', needsClarification: true };
    }

    const start = parseHour(afterMatch[1]);
    if (start === undefined) {
      return { rawText: instruction, summary: '有効な時刻を指定してください。', confidence: 'low', needsClarification: true };
    }

    const end = Math.max(start, target.timeWindow.end, start + 120);
    return {
      rawText: instruction,
      change: { type: 'change-time-window', deliveryId: target.id, newWindow: { start, end } },
      summary: `${target.customerName}の配送開始を${afterMatch[1]}時以降へ変更します。`,
      confidence: 'high',
      needsClarification: false,
    };
  }
}
