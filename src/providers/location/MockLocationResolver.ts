import { initialDeliveries } from '../../data/mockScenario';
import type { Location } from '../../domain/models';
import type { LocationResolver } from './LocationResolver';

const normalize = (value: string) => value.trim().replace(/\s+/g, '').toLocaleLowerCase('ja');

export class MockLocationResolver implements LocationResolver {
  resolve(customerName: string, address: string): Location | undefined {
    const normalizedName = normalize(customerName);
    const normalizedAddress = normalize(address);
    const match = initialDeliveries.find((delivery) =>
      normalize(delivery.customerName) === normalizedName || normalize(delivery.address) === normalizedAddress,
    );
    return match ? { ...match.location } : undefined;
  }
}
