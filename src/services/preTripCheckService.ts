import type { PreTripCheck, PreTripResult } from '../domain/models';

export interface PreTripEvaluation {
  result: PreTripResult;
  reasons: string[];
}

export const evaluatePreTripCheck = (check: PreTripCheck): PreTripEvaluation => {
  if (check.alcoholCheck.outcome === 'concern' || check.alcoholCheck.measuredValue > 0) {
    return { result: 'blocked', reasons: ['アルコール確認で運行不可条件が検出されました'] };
  }

  const reasons: string[] = [];
  if (check.healthCheck.condition === 'concern' || check.healthCheck.concerns.length > 0) reasons.push('体調に確認が必要な項目があります');
  if (check.vehicleInspection.some((item) => item.result === 'concern')) reasons.push('車両点検に要確認項目があります');
  if (!check.evidencePhotos.some((photo) => photo.type === 'alcohol')) reasons.push('アルコール確認の写真証跡がありません');
  if (!check.evidencePhotos.some((photo) => photo.type === 'vehicle')) reasons.push('車両点検の写真証跡がありません');

  return reasons.length ? { result: 'needs_review', reasons } : { result: 'allowed', reasons: ['すべてのデモ確認項目が完了しています'] };
};

export const completePreTripCheck = (draft: PreTripCheck, checkedAt = new Date().toISOString()): PreTripCheck => {
  const evaluation = evaluatePreTripCheck(draft);
  return { ...draft, status: 'completed', result: evaluation.result, checkedAt };
};
