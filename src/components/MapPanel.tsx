import type { ChangeProposal, Delivery, Driver, Location, PreTripCheck, RoutePlan, Vehicle } from '../domain/models';
import { formatTime } from '../domain/models';

interface Props {
  deliveries: Delivery[];
  plan: RoutePlan;
  vehicles: Vehicle[];
  depot: Location;
  selectedId?: string;
  proposal?: ChangeProposal;
  drivers?: Driver[];
  preTripChecks?: PreTripCheck[];
  onSelect: (id: string) => void;
}

const routePoints = (plan: RoutePlan, vehicleId: string, deliveries: Delivery[], depot: Location) => {
  const route = plan.routes.find((item) => item.vehicleId === vehicleId);
  const points = [depot, ...(route?.stops.map((stop) => deliveries.find((delivery) => delivery.id === stop.deliveryId)!.location) ?? []), depot];
  return points.map((point) => `${point.x},${point.y}`).join(' ');
};

const checkLabel = (check?: PreTripCheck) => {
  if (!check) return { text: '点呼未実施', className: 'not-started' };
  if (check.result === 'allowed') return { text: '点呼済 / 運行可', className: 'allowed' };
  if (check.result === 'needs_review') return { text: '要確認', className: 'needs_review' };
  return { text: '運行不可', className: 'blocked' };
};

export function MapPanel({ deliveries, plan, vehicles, depot, selectedId, proposal, drivers = [], preTripChecks = [], onSelect }: Props) {
  return (
    <main className="map-panel">
      <div className="map-toolbar">
        <div><span className="live-dot" /> 配送計画マップ <span className="mock-label">模式図</span></div>
        <div className="legend">{vehicles.map((vehicle) => <span key={vehicle.id}><i style={{ background: vehicle.color }} />{vehicle.name}</span>)}</div>
      </div>
      <div className="map-canvas">
        <svg viewBox="0 0 100 100" role="img" aria-label="配送ルート模式図">
          <defs>
            <pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M 12 0 L 0 0 0 12" fill="none" stroke="#dbe5e7" strokeWidth=".35" /></pattern>
            <filter id="shadow"><feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity=".2" /></filter>
          </defs>
          <rect width="100" height="100" fill="#edf3f2" />
          <rect width="100" height="100" fill="url(#grid)" />
          <path d="M-5 72 C22 64, 27 73, 48 68 S83 54,105 59" fill="none" stroke="#c9e4eb" strokeWidth="5" />
          <path d="M-5 72 C22 64, 27 73, 48 68 S83 54,105 59" fill="none" stroke="#e7f5f7" strokeWidth="3" />
          {[14, 32, 50, 68, 86].map((x) => <path key={x} d={`M${x} 0 L${x - 5} 100`} stroke="#fff" strokeWidth="1.2" />)}
          {[16, 35, 54, 78].map((y) => <path key={y} d={`M0 ${y} L100 ${y + 3}`} stroke="#fff" strokeWidth="1.2" />)}

          {proposal && vehicles.map((vehicle) => (
            <polyline key={`old-${vehicle.id}`} points={routePoints(plan, vehicle.id, deliveries, depot)} fill="none" stroke={vehicle.color} strokeWidth="1.2" strokeDasharray="2 2" opacity=".3" />
          ))}
          {vehicles.map((vehicle) => (
            <polyline key={vehicle.id} points={routePoints(proposal?.proposedPlan ?? plan, vehicle.id, proposal?.proposedDeliveries ?? deliveries, depot)} fill="none" stroke={vehicle.color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" opacity=".9" />
          ))}

          <g transform={`translate(${depot.x}, ${depot.y})`} filter="url(#shadow)"><circle r="4.2" fill="#102f33" /><path d="M-2.2 1.5v-3l2.2-1.5 2.2 1.5v3z" fill="#fff" /><text y="7.5" textAnchor="middle" fontSize="3" fontWeight="700" fill="#17383c">配送センター</text></g>
          {(proposal?.proposedDeliveries ?? deliveries).map((delivery) => {
            const activePlan = proposal?.proposedPlan ?? plan;
            const stop = activePlan.routes.flatMap((route) => route.stops).find((item) => item.deliveryId === delivery.id);
            const vehicle = vehicles.find((item) => activePlan.routes.find((route) => route.vehicleId === item.id)?.stops.some((item) => item.deliveryId === delivery.id));
            return (
              <g key={delivery.id} className="map-marker" transform={`translate(${delivery.location.x}, ${delivery.location.y})`} onClick={() => onSelect(delivery.id)} role="button" tabIndex={0}>
                {selectedId === delivery.id && <circle r="6.2" fill="none" stroke={vehicle?.color} strokeWidth="1" opacity=".4" />}
                <circle r="3.6" fill={vehicle?.color ?? '#64748b'} stroke="#fff" strokeWidth="1.1" filter="url(#shadow)" />
                <text y="1.15" textAnchor="middle" fontSize="3" fontWeight="800" fill="#fff">{stop?.sequence}</text>
              </g>
            );
          })}
        </svg>
        {selectedId && (() => {
          const delivery = (proposal?.proposedDeliveries ?? deliveries).find((item) => item.id === selectedId);
          const active = proposal?.proposedPlan ?? plan;
          const stop = active.routes.flatMap((route) => route.stops).find((item) => item.deliveryId === selectedId);
          return delivery && <div className="map-popup"><strong>{delivery.customerName}</strong><span>{delivery.address}</span><div><b>{stop ? formatTime(stop.arrivalTime) : '未割当'}</b> 到着予定</div></div>;
        })()}
        <div className="map-disclaimer">MockRoutingProvider · デモ用推定値</div>
      </div>
      <div className="route-summary">
        {vehicles.map((vehicle) => {
          const route = (proposal?.proposedPlan ?? plan).routes.find((item) => item.vehicleId === vehicle.id)!;
          const driver = drivers.find((item) => item.assignedVehicleId === vehicle.id);
          const check = [...preTripChecks].reverse().find((item) => item.vehicleId === vehicle.id && item.status === 'completed');
          const status = checkLabel(check);
          return <div key={vehicle.id} className="route-stat"><i style={{ background: vehicle.color }} /><div><strong>{vehicle.name} {driver && <small>· {driver.name}</small>}</strong><span>{route.stops.length}件 · {route.totalDistanceKm.toFixed(1)} km</span><em className={`pretrip-badge ${status.className}`}>{status.text}</em></div><div className="finish"><span>帰着予定</span><strong>{formatTime(route.finishTime)}</strong></div></div>;
        })}
      </div>
    </main>
  );
}
