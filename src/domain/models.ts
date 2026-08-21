export type Minutes = number;

export interface Location {
  lat: number;
  lng: number;
  x: number;
  y: number;
}

export interface TimeWindow {
  start: Minutes;
  end: Minutes;
}

export interface Delivery {
  id: string;
  customerName: string;
  address: string;
  location: Location;
  timeWindow: TimeWindow;
  serviceMinutes: number;
  packageCount: number;
  priority: 'normal' | 'high';
  preferredVehicleId?: string;
  notes?: string;
}

export interface ImportRow {
  rowNumber: number;
  delivery_id: string;
  customer_name: string;
  address: string;
  time_window_start: string;
  time_window_end: string;
  service_minutes: string;
  package_count: string;
  priority: string;
  preferred_vehicle: string;
  notes: string;
}

export interface ImportValidationError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ImportPreview {
  fileName: string;
  rows: ImportRow[];
  deliveries: Delivery[];
  errors: ImportValidationError[];
  isValid: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  color: string;
  capacity: number;
  startLocation: Location;
  availableFrom: Minutes;
  availableUntil: Minutes;
}

export interface Driver {
  id: string;
  name: string;
  assignedVehicleId: string;
}

export type PreTripResult = 'allowed' | 'needs_review' | 'blocked';
export type PreTripStatus = 'draft' | 'completed';

export interface AlcoholCheck {
  measuredValue: number;
  unit: 'mg/L';
  outcome: 'clear' | 'concern';
}

export interface HealthCheck {
  condition: 'ok' | 'concern';
  concerns: Array<'symptoms' | 'fatigue' | 'sleep_deprivation'>;
}

export interface VehicleInspectionItem {
  key: 'tires' | 'lights' | 'brakes' | 'mirrors' | 'exterior' | 'other';
  label: string;
  result: 'ok' | 'concern';
}

export interface EvidencePhoto {
  id: string;
  type: 'alcohol' | 'vehicle';
  fileName: string;
  selectedAt: string;
}

export interface PreTripCheck {
  id: string;
  driverId: string;
  vehicleId: string;
  routePlanRevision: number;
  checkedAt?: string;
  alcoholCheck: AlcoholCheck;
  healthCheck: HealthCheck;
  vehicleInspection: VehicleInspectionItem[];
  evidencePhotos: EvidencePhoto[];
  notes?: string;
  result?: PreTripResult;
  status: PreTripStatus;
}

export interface RouteStop {
  deliveryId: string;
  sequence: number;
  arrivalTime: Minutes;
  departureTime: Minutes;
  travelMinutes: number;
  distanceKm: number;
  latenessMinutes: number;
}

export interface VehicleRoute {
  vehicleId: string;
  stops: RouteStop[];
  totalDistanceKm: number;
  totalTravelMinutes: number;
  finishTime: Minutes;
  load: number;
}

export interface BusinessViolation {
  type: 'TIME_WINDOW';
  deliveryId: string;
  minutes: number;
  message: string;
}

export interface RoutePlan {
  id: string;
  revision: number;
  routes: VehicleRoute[];
  unassignedDeliveryIds: string[];
  businessViolations: BusinessViolation[];
  status: 'feasible' | 'requires-review' | 'no-feasible-plan';
  createdAt: string;
}

export interface TimeWindowChange {
  type: 'change-time-window';
  deliveryId: string;
  newWindow: TimeWindow;
}

export interface VehicleUnavailableChange {
  type: 'vehicle-unavailable';
  vehicleId: string;
}

export type PlanChange = TimeWindowChange | VehicleUnavailableChange;

export interface AssistantInterpretation {
  rawText: string;
  change?: TimeWindowChange;
  summary: string;
  confidence: 'high' | 'low';
  needsClarification: boolean;
}

export interface PlanImpact {
  summary: string;
  details: string[];
  movedDeliveries: number;
  distanceDeltaKm: number;
  finishTimeDeltaMinutes: number;
}

export interface ChangeProposal {
  id: string;
  baseRevision: number;
  rawInstruction: string;
  change: PlanChange;
  proposedDeliveries: Delivery[];
  proposedPlan: RoutePlan;
  impact: PlanImpact;
  status: 'pending' | 'approved' | 'rejected';
}

export const formatTime = (minutes: Minutes) => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};
