import { useEffect, useMemo, useRef, useState } from 'react';
import type { Driver, EvidencePhoto, PreTripCheck, PreTripResult, RoutePlan, Vehicle, VehicleInspectionItem } from '../domain/models';
import { completePreTripCheck, evaluatePreTripCheck } from '../services/preTripCheckService';

const inspectionItems: VehicleInspectionItem[] = [
  { key: 'tires', label: 'タイヤ', result: 'ok' },
  { key: 'lights', label: '灯火類', result: 'ok' },
  { key: 'brakes', label: 'ブレーキ', result: 'ok' },
  { key: 'mirrors', label: 'ミラー・視界', result: 'ok' },
  { key: 'exterior', label: '車両外観', result: 'ok' },
  { key: 'other', label: 'その他異常', result: 'ok' },
];

const resultLabels: Record<PreTripResult, string> = { allowed: '運行可', needs_review: '要確認', blocked: '運行不可' };

const createDraft = (driver: Driver, revision: number): PreTripCheck => ({
  id: `pretrip-${driver.id}-r${revision}`,
  driverId: driver.id,
  vehicleId: driver.assignedVehicleId,
  routePlanRevision: revision,
  alcoholCheck: { measuredValue: 0, unit: 'mg/L', outcome: 'clear' },
  healthCheck: { condition: 'ok', concerns: [] },
  vehicleInspection: inspectionItems.map((item) => ({ ...item })),
  evidencePhotos: [],
  status: 'draft',
});

interface LocalPhoto { metadata: EvidencePhoto; url: string }

interface Props {
  drivers: Driver[];
  vehicles: Vehicle[];
  plan: RoutePlan;
  completedChecks: PreTripCheck[];
  onComplete: (check: PreTripCheck) => void;
  onShowManagement: () => void;
}

export function DriverCheckView({ drivers, vehicles, plan, completedChecks, onComplete, onShowManagement }: Props) {
  const [driverId, setDriverId] = useState(drivers[0].id);
  const [phase, setPhase] = useState<'select' | 'check' | 'review' | 'completed'>('select');
  const selectedDriver = drivers.find((driver) => driver.id === driverId)!;
  const vehicle = vehicles.find((item) => item.id === selectedDriver.assignedVehicleId)!;
  const [draft, setDraft] = useState(() => createDraft(selectedDriver, plan.revision));
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const assignedCount = plan.routes.find((route) => route.vehicleId === vehicle.id)?.stops.length ?? 0;
  const latestCheck = [...completedChecks].reverse().find((check) => check.driverId === selectedDriver.id);
  const evaluation = useMemo(() => evaluatePreTripCheck(draft), [draft]);

  const chooseDriver = (nextId: string) => {
    const nextDriver = drivers.find((driver) => driver.id === nextId)!;
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current = [];
    setPhotos([]);
    setDriverId(nextId);
    setDraft(createDraft(nextDriver, plan.revision));
    setPhase('select');
  };

  const addPhoto = (type: EvidencePhoto['type'], file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    const metadata: EvidencePhoto = { id: `${type}-${Date.now()}-${file.name}`, type, fileName: file.name, selectedAt: new Date().toISOString() };
    setPhotos((items) => [...items.filter((item) => item.metadata.type !== type), { metadata, url }]);
    setDraft((value) => ({ ...value, evidencePhotos: [...value.evidencePhotos.filter((photo) => photo.type !== type), metadata] }));
  };

  const setConcern = (concern: 'symptoms' | 'fatigue' | 'sleep_deprivation', checked: boolean) => {
    setDraft((value) => {
      const concerns = checked ? [...value.healthCheck.concerns, concern] : value.healthCheck.concerns.filter((item) => item !== concern);
      return { ...value, healthCheck: { condition: concerns.length ? 'concern' : 'ok', concerns } };
    });
  };

  const finalize = () => {
    const completed = completePreTripCheck(draft);
    onComplete(completed);
    setDraft(completed);
    setPhase('completed');
  };

  return (
    <main className="driver-page">
      <div className="driver-phone">
        <div className="driver-intro"><span className="eyebrow">PRE-TRIP SAFETY CHECK</span><h1>本日の乗務前点呼</h1><p>乗務前点呼・安全確認デモ</p></div>
        <label className="driver-select">ドライバー<select value={driverId} onChange={(event) => chooseDriver(event.target.value)}>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label>
        <div className="duty-card"><div className="driver-avatar">{selectedDriver.name.slice(0, 1)}</div><div><strong>{selectedDriver.name}</strong><span>{vehicle.name} · 配送 {assignedCount}件 · 計画 Rev.{plan.revision}</span></div>{latestCheck && <span className={`check-status ${latestCheck.result}`}>{resultLabels[latestCheck.result!]}</span>}</div>

        {phase === 'select' && <section className="start-card"><div className="safety-symbol">✓</div><h2>出発前の状態を確認します</h2><p>アルコール、体調、車両状態、写真証跡を順に入力してください。</p><button className="driver-primary" onClick={() => { setDraft(createDraft(selectedDriver, plan.revision)); setPhase('check'); }}>乗務前点呼を開始</button></section>}

        {phase === 'check' && <div className="check-form">
          <section className="check-section"><div className="step-title"><span>1</span><div><h2>アルコール確認</h2><p>実機器とは連携していません</p></div></div><label className="measurement">測定値<div><input aria-label="アルコール測定値" type="number" min="0" step="0.01" value={draft.alcoholCheck.measuredValue} onChange={(event) => setDraft((value) => ({ ...value, alcoholCheck: { ...value.alcoholCheck, measuredValue: Number(event.target.value) } }))} /><span>mg/L</span></div></label><div className="choice-row"><button className={draft.alcoholCheck.outcome === 'clear' ? 'active ok' : ''} onClick={() => setDraft((value) => ({ ...value, alcoholCheck: { ...value.alcoholCheck, outcome: 'clear' } }))}>酒気帯びなし</button><button className={draft.alcoholCheck.outcome === 'concern' ? 'active danger' : ''} onClick={() => setDraft((value) => ({ ...value, alcoholCheck: { ...value.alcoholCheck, outcome: 'concern' } }))}>要確認</button></div></section>
          <section className="check-section"><div className="step-title"><span>2</span><div><h2>体調確認</h2><p>当てはまる項目を選択</p></div></div><label className="check-line"><input type="checkbox" checked={draft.healthCheck.concerns.includes('symptoms')} onChange={(event) => setConcern('symptoms', event.target.checked)} />疾病・症状の懸念</label><label className="check-line"><input type="checkbox" checked={draft.healthCheck.concerns.includes('fatigue')} onChange={(event) => setConcern('fatigue', event.target.checked)} />疲労</label><label className="check-line"><input type="checkbox" checked={draft.healthCheck.concerns.includes('sleep_deprivation')} onChange={(event) => setConcern('sleep_deprivation', event.target.checked)} />睡眠不足</label>{!draft.healthCheck.concerns.length && <div className="all-clear">✓ 体調に問題なし</div>}</section>
          <section className="check-section"><div className="step-title"><span>3</span><div><h2>車両の日常点検</h2><p>デモ用の代表項目です</p></div></div><div className="inspection-grid">{draft.vehicleInspection.map((item) => <div key={item.key}><span>{item.label}</span><button className={item.result === 'ok' ? 'ok' : 'danger'} onClick={() => setDraft((value) => ({ ...value, vehicleInspection: value.vehicleInspection.map((current) => current.key === item.key ? { ...current, result: current.result === 'ok' ? 'concern' : 'ok' } : current) }))}>{item.result === 'ok' ? 'OK' : '要確認'}</button></div>)}</div></section>
          <section className="check-section"><div className="step-title"><span>4</span><div><h2>写真証跡</h2><p>画像は端末内で一時表示するだけです</p></div></div><div className="photo-inputs">{(['alcohol', 'vehicle'] as const).map((type) => { const photo = photos.find((item) => item.metadata.type === type); return <label key={type} className="photo-input">{photo ? <><img src={photo.url} alt={`${type === 'alcohol' ? 'アルコール検知器' : '車両点検'}写真プレビュー`} /><span>{photo.metadata.fileName}</span></> : <><b>＋</b><span>{type === 'alcohol' ? 'アルコール検知器写真' : '車両点検写真'}</span></>}<input type="file" accept="image/*" onChange={(event) => addPhoto(type, event.target.files?.[0])} /></label>; })}</div><label className="notes-field">備考<textarea rows={2} value={draft.notes ?? ''} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} placeholder="確認事項があれば入力" /></label></section>
          <button className="driver-primary" onClick={() => setPhase('review')}>内容を確認</button>
        </div>}

        {phase === 'review' && <section className="review-card"><span className="eyebrow">REVIEW</span><h2>点呼内容の確認</h2><div className={`result-preview ${evaluation.result}`}><span>判定見込み</span><strong>{resultLabels[evaluation.result]}</strong></div><ul>{evaluation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><dl><div><dt>アルコール</dt><dd>{draft.alcoholCheck.measuredValue.toFixed(2)} mg/L · {draft.alcoholCheck.outcome === 'clear' ? '酒気帯びなし' : '要確認'}</dd></div><div><dt>体調</dt><dd>{draft.healthCheck.concerns.length ? `${draft.healthCheck.concerns.length}項目を確認` : '問題なし'}</dd></div><div><dt>車両点検</dt><dd>{draft.vehicleInspection.filter((item) => item.result === 'concern').length ? '要確認あり' : '全項目OK'}</dd></div><div><dt>写真</dt><dd>{draft.evidencePhotos.length}枚</dd></div></dl><div className="review-actions"><button className="driver-secondary" onClick={() => setPhase('check')}>戻って修正</button><button className="driver-primary" onClick={finalize}>点呼を確定</button></div></section>}

        {phase === 'completed' && <section className="completed-card"><div className={`result-icon ${draft.result}`}>{draft.result === 'allowed' ? '✓' : '!'}</div><span>点呼結果を確定しました</span><h2>{resultLabels[draft.result!]}</h2><p>{selectedDriver.name} · {vehicle.name}<br />配送計画 Rev.{draft.routePlanRevision}へ紐付け済み</p><button className="driver-primary" onClick={onShowManagement}>配送管理画面で確認</button></section>}
        <p className="legal-note">デモ仕様。実運用時は対象法令・社内規程に合わせて設定が必要です。</p>
      </div>
    </main>
  );
}
