import { useMemo, useState } from 'react';
import { AssistantPanel } from '../components/AssistantPanel';
import { DeliveryList } from '../components/DeliveryList';
import { DriverCheckView } from '../components/DriverCheckView';
import { EmptyDriverState, EmptyState } from '../components/EmptyState';
import { ImportDialog } from '../components/ImportDialog';
import { MapPanel } from '../components/MapPanel';
import { depot, drivers, initialDeliveries, vehicles } from '../data/mockScenario';
import type { ChangeProposal, Delivery, PreTripCheck, RoutePlan } from '../domain/models';
import { MockAiAssistantProvider } from '../providers/ai/MockAiAssistantProvider';
import { MockLocationResolver } from '../providers/location/MockLocationResolver';
import { MockRoutingProvider } from '../providers/routing/MockRoutingProvider';
import { approveProposal, createProposal, createVehicleReassignmentProposal } from '../services/proposalService';
import { optimizeRoutes } from '../services/routeOptimizer';

const routingProvider = new MockRoutingProvider();
const assistantProvider = new MockAiAssistantProvider();
const locationResolver = new MockLocationResolver();
type Message = { role: 'assistant' | 'user'; text: string };
type MobilePanel = 'deliveries' | 'map' | 'assistant';

export function App() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [currentPlan, setCurrentPlan] = useState<RoutePlan | null>(null);
  const [proposal, setProposal] = useState<ChangeProposal>();
  const [selectedId, setSelectedId] = useState<string>();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useState<'management' | 'driver'>('management');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('deliveries');
  const [preTripChecks, setPreTripChecks] = useState<PreTripCheck[]>([]);
  const [loadingSample, setLoadingSample] = useState(false);

  const safetyAlertCount = preTripChecks.filter((check) => check.status === 'completed' && check.result !== 'allowed').length;
  const metrics = useMemo(() => currentPlan ? {
    distance: currentPlan.routes.reduce((sum, route) => sum + route.totalDistanceKm, 0),
    alerts: currentPlan.businessViolations.length + currentPlan.unassignedDeliveryIds.length + safetyAlertCount,
  } : undefined, [currentPlan, safetyAlertCount]);

  const operationState = useMemo(() => {
    if (!currentPlan) return 'EMPTY';
    if (proposal || metrics!.alerts > 0) return 'NEEDS ACTION';
    const assigned = currentPlan.routes.filter((route) => route.stops.length > 0).map((route) => route.vehicleId);
    const ready = assigned.length > 0 && assigned.every((vehicleId) => preTripChecks.some((check) => check.vehicleId === vehicleId && check.status === 'completed' && check.result === 'allowed'));
    return ready ? 'READY / OPERATING' : 'PLANNED';
  }, [currentPlan, metrics, preTripChecks, proposal]);

  const activatePlan = (nextDeliveries: Delivery[], plan: RoutePlan, message: string) => {
    setDeliveries(nextDeliveries); setCurrentPlan(plan); setProposal(undefined); setSelectedId(nextDeliveries[0]?.id);
    setInput(nextDeliveries.some((delivery) => delivery.customerName === '青葉商事') ? '青葉商事を15時以降に変更して' : '');
    setNotice(undefined); setMessages([{ role: 'assistant', text: message }]); setPreTripChecks([]); setMobilePanel('deliveries');
  };

  const loadSample = async () => {
    setLoadingSample(true);
    const plan = await optimizeRoutes(initialDeliveries, vehicles, routingProvider, 1);
    activatePlan(initialDeliveries, plan, 'サンプルデータ10件から本日の配送計画を作成しました。時間指定や配送順の変更を指示できます。');
    setLoadingSample(false);
  };

  const handleSubmit = async () => {
    if (!currentPlan || !input.trim() || busy) return;
    const instruction = input.trim();
    setInput(''); setNotice(undefined); setProposal(undefined); setMessages((items) => [...items, { role: 'user', text: instruction }]); setBusy(true);
    const interpretation = await assistantProvider.interpret(instruction, deliveries);
    if (!interpretation.change) { setMessages((items) => [...items, { role: 'assistant', text: interpretation.summary }]); setBusy(false); return; }
    const nextProposal = await createProposal(instruction, interpretation.change, deliveries, vehicles, currentPlan, routingProvider);
    setProposal(nextProposal); setSelectedId(interpretation.change.deliveryId);
    setMessages((items) => [...items, { role: 'assistant', text: `${interpretation.summary} 現在の計画は変更せず、再計算案を作成しました。` }]); setBusy(false);
  };

  const handleApprove = () => {
    if (!currentPlan || !proposal) return;
    try {
      const approved = approveProposal(currentPlan, proposal);
      setCurrentPlan(approved.plan); setDeliveries(approved.deliveries); setProposal(undefined);
      setNotice(`変更を適用しました。配送計画をRev.${approved.plan.revision}へ更新しました。`);
      setMessages((items) => [...items, { role: 'assistant', text: `承認された変更を適用しました。配送一覧と地図はRev.${approved.plan.revision}の計画です。` }]);
    } catch (error) { setNotice(error instanceof Error ? error.message : '変更を適用できませんでした。'); }
  };

  const handleReject = () => {
    setProposal(undefined); setNotice(`提案を却下しました。現在の計画はRev.${currentPlan?.revision}のままです。`);
    setMessages((items) => [...items, { role: 'assistant', text: '変更案を破棄しました。現在の配送計画には一切変更を加えていません。' }]);
  };

  const resetSession = () => {
    if (!window.confirm('現在の配送計画、点呼結果、変更案をすべてリセットします。よろしいですか？')) return;
    setView('management'); setDeliveries([]); setCurrentPlan(null); setProposal(undefined); setSelectedId(undefined); setInput(''); setBusy(false);
    setNotice(undefined); setMessages([]); setImportOpen(false); setPreTripChecks([]); setMobilePanel('deliveries');
  };

  const useImportedPlan = async (importedDeliveries: Delivery[], fileName: string) => {
    const plan = await optimizeRoutes(importedDeliveries, vehicles, routingProvider, 1);
    activatePlan(importedDeliveries, plan, `${fileName}の${importedDeliveries.length}件を読み込み、配送計画 Rev.1を作成しました。条件変更も続けて指示できます。`);
    setNotice(`${fileName}から配送計画を作成しました。`); setImportOpen(false);
  };

  const createReassignment = async (vehicleId: string) => {
    if (!currentPlan) return;
    const nextProposal = await createVehicleReassignmentProposal(vehicleId, deliveries, vehicles, currentPlan, routingProvider);
    const vehicle = vehicles.find((item) => item.id === vehicleId)!;
    setProposal(nextProposal); setNotice(undefined); setMobilePanel('assistant');
    setMessages((items) => [...items, { role: 'assistant', text: `${vehicle.name}を運行対象から外した再配車案を作成しました。承認するまで確定計画は変更されません。` }]);
  };

  const blockedChecks = preTripChecks.filter((check) => check.status === 'completed' && check.result === 'blocked');

  return <div className={`app-shell ${view === 'driver' ? 'driver-mode' : ''}`} data-current-plan={currentPlan ? `revision-${currentPlan.revision}` : 'null'} data-proposed-plan={proposal ? 'present' : 'null'}>
    <header className="topbar">
      <div className="brand"><div className="brand-mark">R</div><div><strong>RoutePilot</strong><span>配送オペレーション</span></div></div>
      <nav className="view-tabs" aria-label="画面切替"><button className={view === 'management' ? 'active' : ''} onClick={() => setView('management')}>配送管理</button><button className={view === 'driver' ? 'active' : ''} onClick={() => setView('driver')}>ドライバー点呼</button></nav>
      {currentPlan && <><div className="date-block"><span>本日の配送計画</span><strong>2026年8月21日（金）</strong></div><div className="header-metrics"><div><span>配送件数</span><strong>{deliveries.length}<small>件</small></strong></div><div><span>稼働車両</span><strong>{vehicles.length}<small>台</small></strong></div><div><span>推定距離</span><strong>{metrics?.distance.toFixed(1)}<small>km</small></strong></div><div><span>要確認</span><strong className={metrics?.alerts ? 'danger' : ''}>{metrics?.alerts}<small>件</small></strong></div></div><div className="revision-box"><span>確定計画</span><strong>Rev.{currentPlan.revision}</strong></div></>}
      <span className={`operation-state state-${operationState.toLowerCase().replaceAll(' ', '-').replace('/', '')}`}>{operationState}</span>
      {view === 'management' && currentPlan && <button className="import-button header-import" onClick={() => setImportOpen(true)}>⇧ 配送計画を読み込む</button>}
      {currentPlan && <button className="reset-button" onClick={resetSession}>↻ リセット</button>}
    </header>

    {view === 'management' ? <>
      {!currentPlan ? <EmptyState loading={loadingSample} onImport={() => setImportOpen(true)} onLoadSample={() => void loadSample()} /> : <>
        {proposal && <div className="proposal-banner"><span>変更案をプレビュー中</span> 現在の確定計画 Rev.{currentPlan.revision} はまだ変更されていません</div>}
        {blockedChecks.map((check) => { const vehicle = vehicles.find((item) => item.id === check.vehicleId)!; const count = currentPlan.routes.find((route) => route.vehicleId === check.vehicleId)?.stops.length ?? 0; return <div className="safety-alert" key={check.id}><div><strong>! {vehicle.name}は乗務前点呼で運行不可です</strong><span>この車両に{count}件の配送が割り当てられています。確定計画は変更されていません。</span></div>{count > 0 && <button onClick={() => void createReassignment(check.vehicleId)}>再配車案を作成</button>}</div>; })}
        <nav className="responsive-tabs" aria-label="配送管理パネル"><button className={mobilePanel === 'deliveries' ? 'active' : ''} onClick={() => setMobilePanel('deliveries')}>配送</button><button className={mobilePanel === 'map' ? 'active' : ''} onClick={() => setMobilePanel('map')}>地図</button><button className={mobilePanel === 'assistant' ? 'active' : ''} onClick={() => setMobilePanel('assistant')}>AI</button></nav>
        <div className="workspace" data-mobile-panel={mobilePanel} data-app-state={operationState}>
          <DeliveryList deliveries={proposal?.proposedDeliveries ?? deliveries} plan={proposal?.proposedPlan ?? currentPlan} vehicles={vehicles} selectedId={selectedId} proposal={proposal} onSelect={setSelectedId} />
          <MapPanel deliveries={deliveries} plan={currentPlan} vehicles={vehicles} depot={depot} selectedId={selectedId} proposal={proposal} drivers={drivers} preTripChecks={preTripChecks} onSelect={setSelectedId} />
          <AssistantPanel input={input} messages={messages} proposal={proposal} currentPlan={currentPlan} busy={busy} notice={notice} onInput={setInput} onSubmit={handleSubmit} onApprove={handleApprove} onReject={handleReject} />
        </div>
      </>}
      {importOpen && <ImportDialog vehicles={vehicles} resolver={locationResolver} onClose={() => setImportOpen(false)} onConfirm={useImportedPlan} />}
    </> : currentPlan ? <DriverCheckView key={`driver-r${currentPlan.revision}`} drivers={drivers} vehicles={vehicles} plan={currentPlan} completedChecks={preTripChecks} onComplete={(check) => setPreTripChecks((items) => [...items.filter((item) => item.driverId !== check.driverId), check])} onShowManagement={() => setView('management')} /> : <EmptyDriverState onShowManagement={() => setView('management')} />}
  </div>;
}
