import type { Location } from '../../domain/models';

export interface LocationResolver {
  resolve(customerName: string, address: string): Location | undefined;
}
