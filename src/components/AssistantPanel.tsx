import type { ChangeProposal, RoutePlan } from '../domain/models';

interface Message { role: 'assistant' | 'user'; text: string }

interface Props {
  input: string;
  messages: Message[];
  proposal?: ChangeProposal;
  currentPlan: RoutePlan;
  busy: boolean;
  notice?: string;
  onInput: (value: string) => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export function AssistantPanel({ input, messages, proposal, currentPlan, busy, notice, onInput, onSubmit, onApprove, onReject }: Props) {
  return (
    <aside className="panel assistant-panel" aria-label="AI配車アシスタント">
      <div className="assistant-heading">
        <div className="assistant-mark">✦</div>
        <div><h2>配車アシスタント</h2><span><i /> デモ用ルールベースアシスタント</span></div>
      </div>
      <div className="assistant-notice">外部AIは使用していません。顧客名と「○時以降」をルールで解釈します。</div>
      <div className="conversation" aria-live="polite">
        {messages.map((message, index) => <div key={index} className={`message ${message.role}`}><span>{message.role === 'assistant' ? '✦' : 'あなた'}</span><p>{message.text}</p></div>)}
        {busy && <div className="message assistant"><span>✦</span><p className="thinking">条件を検証して再計算しています…</p></div>}
        {notice && <div className="inline-notice">{notice}</div>}
        {proposal && (
          <section className="proposal-card">
            <div className="proposal-header"><div><span className="eyebrow">PROPOSAL</span><h3>変更案を確認</h3></div><span className="revision">Rev.{currentPlan.revision} → {proposal.proposedPlan.revision}</span></div>
            <div className="proposal-status"><span className={proposal.proposedPlan.status === 'feasible' ? 'ok' : 'warn'}>{proposal.proposedPlan.status === 'feasible' ? '✓ 制約を満たしています' : '⚠ 人による判断が必要'}</span></div>
            <p className="impact-summary">{proposal.impact.summary}</p>
            <ul>{proposal.impact.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
            <div className="compare-note"><span className="line old" />現在ルート <span className="line new" />提案ルート</div>
            <div className="proposal-actions">
              <button className="secondary-button" onClick={onReject}>却下</button>
              <button className="primary-button" onClick={onApprove} disabled={proposal.proposedPlan.unassignedDeliveryIds.length > 0}>承認して適用</button>
            </div>
            <small>承認するまで現在の配送計画は変更されません</small>
          </section>
        )}
      </div>
      <div className="prompt-area">
        <button className="example-chip" onClick={() => onInput('青葉商事を15時以降に変更して')}>例：青葉商事を15時以降に変更</button>
        <div className="prompt-box">
          <textarea value={input} onChange={(event) => onInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSubmit(); } }} placeholder="配送条件の変更を入力…" rows={2} />
          <button onClick={onSubmit} disabled={busy || !input.trim()} aria-label="指示を送信">↑</button>
        </div>
      </div>
    </aside>
  );
}
