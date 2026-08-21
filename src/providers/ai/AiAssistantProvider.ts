import type { AssistantInterpretation, Delivery } from '../../domain/models';

export interface AiAssistantProvider {
  interpret(instruction: string, deliveries: Delivery[]): Promise<AssistantInterpretation>;
}
