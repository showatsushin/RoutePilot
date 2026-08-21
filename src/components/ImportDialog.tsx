import { useRef, useState } from 'react';
import type { Delivery, ImportPreview, Vehicle } from '../domain/models';
import { formatTime } from '../domain/models';
import { parseDeliveryPlanFile } from '../features/import/fileParser';
import type { LocationResolver } from '../providers/location/LocationResolver';

interface Props {
  vehicles: Vehicle[];
  resolver: LocationResolver;
  onClose: () => void;
  onConfirm: (deliveries: Delivery[], fileName: string) => Promise<void>;
}

export function ImportDialog({ vehicles, resolver, onClose, onConfirm }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview>();
  const [reading, setReading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [dragging, setDragging] = useState(false);

  const readFile = async (file?: File) => {
    if (!file) return;
    setReading(true);
    try { setPreview(await parseDeliveryPlanFile(file, vehicles, resolver)); }
    catch { setPreview({ fileName: file.name, rows: [], deliveries: [], errors: [{ rowNumber: 1, field: 'file', message: 'ファイルを読み取れませんでした。テンプレート形式を確認してください' }], isValid: false }); }
    finally { setReading(false); }
  };

  const confirm = async () => {
    if (!preview?.isValid) return;
    setConfirming(true);
    await onConfirm(preview.deliveries, preview.fileName);
    setConfirming(false);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="import-header">
          <div><span className="eyebrow">IMPORT PLAN</span><h2 id="import-title">配送計画を読み込む</h2><p>指定テンプレートの.xlsx / .csvに対応</p></div>
          <button className="close-button" onClick={onClose} aria-label="閉じる">×</button>
        </div>

        {!preview && (
          <>
            <button
              className={`drop-zone ${dragging ? 'dragging' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); void readFile(event.dataTransfer.files[0]); }}
            >
              <span className="upload-icon">⇧</span>
              <strong>{reading ? 'ファイルを検証しています…' : 'ファイルを選択またはドロップ'}</strong>
              <small>Excel（.xlsx）またはCSV · 指定テンプレートのみ</small>
            </button>
            <input ref={inputRef} type="file" accept=".xlsx,.csv" hidden onChange={(event) => void readFile(event.target.files?.[0])} />
            <div className="template-row">
              <div><strong>配送計画テンプレート</strong><span>架空の配送先10件が入力済みです</span></div>
              <a href="./samples/delivery-plan-template.xlsx" download>Excel</a>
              <a href="./samples/delivery-plan-template.csv" download>CSV</a>
            </div>
            <div className="import-footnote">未知の住所は外部検索せず、取込エラーとして表示します。</div>
          </>
        )}

        {preview && (
          <div className="import-preview">
            <div className="file-summary">
              <div className="file-mark">{preview.fileName.toLowerCase().endsWith('.csv') ? 'CSV' : 'XLS'}</div>
              <div><strong>{preview.fileName}</strong><span>{preview.rows.length}件を検出</span></div>
              <span className={preview.isValid ? 'validation-ok' : 'validation-error'}>{preview.isValid ? '✓ 検証完了' : `⚠ ${preview.errors.length}件のエラー`}</span>
            </div>

            {preview.isValid ? (
              <div className="preview-table-wrap">
                <table className="preview-table"><thead><tr><th>配送ID</th><th>配送先</th><th>時間指定</th><th>荷物</th><th>優先度</th></tr></thead>
                  <tbody>{preview.deliveries.map((delivery) => <tr key={delivery.id}><td>{delivery.id}</td><td><strong>{delivery.customerName}</strong><span>{delivery.address}</span></td><td>{formatTime(delivery.timeWindow.start)}–{formatTime(delivery.timeWindow.end)}</td><td>{delivery.packageCount}</td><td>{delivery.priority}</td></tr>)}</tbody>
                </table>
              </div>
            ) : (
              <div className="error-list" aria-label="取込エラー">
                {preview.errors.map((error, index) => <div key={`${error.rowNumber}-${error.field}-${index}`}><span>{error.rowNumber}行目</span><strong>{error.field}</strong><p>{error.message}</p></div>)}
              </div>
            )}

            <div className="import-actions">
              <button className="secondary-button" onClick={() => setPreview(undefined)}>別のファイルを選ぶ</button>
              <button className="primary-button" disabled={!preview.isValid || confirming} onClick={() => void confirm()}>{confirming ? '計画を生成中…' : 'この配送計画を使用'}</button>
            </div>
            <small className="confirm-note">確定するまで現在の配送計画は変更されません</small>
          </div>
        )}
      </section>
    </div>
  );
}
