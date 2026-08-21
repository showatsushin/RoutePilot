interface Props {
  loading: boolean;
  onImport: () => void;
  onLoadSample: () => void;
}

export function EmptyState({ loading, onImport, onLoadSample }: Props) {
  return (
    <main className="empty-state" data-app-state="EMPTY">
      <div className="empty-visual" aria-hidden="true"><span>01</span><i /><span>02</span><i /><span>03</span></div>
      <span className="eyebrow">START TODAY'S OPERATION</span>
      <h1>本日の配送計画は<br />まだありません</h1>
      <p>ExcelまたはCSVの配送計画を読み込むと、<br />配車・ルート計画を作成できます。</p>
      <div className="empty-actions"><button className="empty-primary" onClick={onImport}>⇧ 配送計画を読み込む</button><button className="empty-secondary" onClick={onLoadSample} disabled={loading}>{loading ? '計画を作成中…' : 'サンプルデータで試す'}</button></div>
      <div className="empty-template"><span>指定テンプレート</span><a href="./samples/delivery-plan-template.xlsx" download>Excel</a><a href="./samples/delivery-plan-template.csv" download>CSV</a></div>
      <div className="empty-capabilities">配送計画を作成すると、AI配車アシスタントと乗務前点呼を利用できます。</div>
      <small>地図・所要時間はMockRoutingProviderによるデモ推定値です</small>
    </main>
  );
}

export function EmptyDriverState({ onShowManagement }: { onShowManagement: () => void }) {
  return <main className="driver-empty" data-app-state="EMPTY"><div><span className="eyebrow">PRE-TRIP SAFETY CHECK</span><div className="empty-lock">✓</div><h1>配送計画を作成してください</h1><p>本日の配送計画を作成すると、担当ドライバーの乗務前点呼を開始できます。</p><button onClick={onShowManagement}>配送管理へ戻る</button><small>デモ仕様。実運用時は対象法令・社内規程に合わせて設定が必要です。</small></div></main>;
}
