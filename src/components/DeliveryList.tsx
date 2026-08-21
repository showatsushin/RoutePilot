import type { ChangeProposal, Delivery, RoutePlan, Vehicle } from '../domain/models';
import { formatTime } from '../domain/models';

interface Props {
  deliveries: Delivery[];
  plan: RoutePlan;
  vehicles: Vehicle[];
  selectedId?: string;
  proposal?: ChangeProposal;
  onSelect: (id: string) => void;
}

export function DeliveryList({ deliveries, plan, vehicles, selectedId, proposal, onSelect }: Props) {
  const planned = plan.routes.flatMap((route) => route.stops.map((stop) => ({ ...stop, vehicleId: route.vehicleId })));
  const rows = [...deliveries].sort((a, b) => {
    const aStop = planned.find((stop) => stop.deliveryId === a.id);
    const bStop = planned.find((stop) => stop.deliveryId === b.id);
    return (aStop?.arrivalTime ?? 9999) - (bStop?.arrivalTime ?? 9999);
  });

  return (
    <aside className="panel deliveries-panel" aria-label="今日の配送一覧">
      <div className="panel-heading">
        <div><span className="eyebrow">TODAY</span><h2>今日の配送</h2></div>
        <span className="count-pill">{deliveries.length}件</span>
      </div>
      <div className="delivery-list">
        {rows.map((delivery) => {
          const stop = planned.find((item) => item.deliveryId === delivery.id);
          const vehicle = vehicles.find((item) => item.id === stop?.vehicleId);
          const isChanged = proposal?.change.type === 'change-time-window' && proposal.change.deliveryId === delivery.id;
          return (
            <button key={delivery.id} className={`delivery-card ${selectedId === delivery.id ? 'selected' : ''}`} onClick={() => onSelect(delivery.id)}>
              <div className="delivery-card-top">
                <span className="sequence" style={{ background: vehicle?.color }}>{stop?.sequence ?? '–'}</span>
                <div className="delivery-title"><strong>{delivery.customerName}</strong><span>{delivery.address}</span></div>
                {isChanged && <span className="change-badge">変更案</span>}
              </div>
              <div className="delivery-meta">
                <span className="meta-item"><span className="meta-icon">◷</span>{formatTime(delivery.timeWindow.start)}–{formatTime(delivery.timeWindow.end)}</span>
                <span className="meta-item"><span className="vehicle-dot" style={{ background: vehicle?.color }} />{vehicle?.name ?? '未割当'}</span>
                <span className="arrival">到着 {stop ? formatTime(stop.arrivalTime) : '–'}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
