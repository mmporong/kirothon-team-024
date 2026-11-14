// 가족 동의: 제안 버전·응답·철회·버전 무효화. [R07][R08]
import { canonicalJson, fnv1a } from './money';

export type VoteValue = 'agree' | 'object' | 'abstain';
export type Choice = 'keep' | 'pause' | 'cancel' | 'annual' | 'ad' | 'downgrade';

export const CHOICE_LABEL: Record<Choice, string> = {
  keep: '계속 유지',
  pause: '잠시 해지 후 복귀',
  cancel: '해지',
  annual: '연간권으로 전환',
  ad: '광고형으로 변경',
  downgrade: '낮은 등급으로 변경',
};

export interface Terms {
  resultId: string;
  horizon: number;
  pauseMonths: number;
  choice: Choice;
  needs: string[];
  sentence: string;
}

export interface Vote {
  memberId: string;
  version: number;
  value: VoteValue;
  at: string;
  revoked: boolean;
  comment?: string;
}

export interface Proposal {
  id: string;
  version: number;
  terms: Terms;
  termsHash: string;
  requiredMembers: string[];
  votes: Vote[];
  history: { version: number; termsHash: string; at: string }[];
}

export function termsHash(t: Terms): string {
  return fnv1a(canonicalJson({ r: t.resultId, h: t.horizon, k: t.pauseMonths, c: t.choice, n: [...t.needs].sort(), s: t.sentence }));
}

export function createProposal(id: string, terms: Terms, requiredMembers: string[], now: string): Proposal {
  const h = termsHash(terms);
  return { id, version: 1, terms, termsHash: h, requiredMembers: [...new Set(requiredMembers)], votes: [], history: [{ version: 1, termsHash: h, at: now }] };
}

/** 조건이 바뀌면 version을 올린다. 이전 버전 응답은 남겨 두지만 집계에서 무효다. 같은 조건이면 그대로 둔다. */
export function reviseProposal(p: Proposal, terms: Terms, now: string): Proposal {
  const h = termsHash(terms);
  if (h === p.termsHash) return p;
  const version = p.version + 1;
  return { ...p, version, terms, termsHash: h, history: [...p.history, { version, termsHash: h, at: now }] };
}

export type VoteError = 'stale_version' | 'not_member' | 'future_version';

export function castVote(p: Proposal, memberId: string, version: number, value: VoteValue, now: string, comment?: string): { ok: true; proposal: Proposal } | { ok: false; error: VoteError } {
  if (!p.requiredMembers.includes(memberId)) return { ok: false, error: 'not_member' };
  if (version < p.version) return { ok: false, error: 'stale_version' };
  if (version > p.version) return { ok: false, error: 'future_version' };
  const votes = p.votes.filter((v) => !(v.memberId === memberId && v.version === version));
  votes.push({ memberId, version, value, at: now, revoked: false, ...(comment ? { comment: comment.slice(0, 280) } : {}) });
  return { ok: true, proposal: { ...p, votes } };
}

export function revokeVote(p: Proposal, memberId: string): Proposal {
  return { ...p, votes: p.votes.map((v) => (v.memberId === memberId && v.version === p.version ? { ...v, revoked: true } : v)) };
}

export interface Tally {
  agree: string[];
  object: string[];
  abstain: string[];
  pending: string[];
  staleIgnored: number;
  allAgreed: boolean;
}

export function currentVote(p: Proposal, memberId: string): Vote | null {
  return p.votes.find((v) => v.memberId === memberId && v.version === p.version && !v.revoked) ?? null;
}

export function tally(p: Proposal): Tally {
  const t: Tally = { agree: [], object: [], abstain: [], pending: [], staleIgnored: 0, allAgreed: false };
  t.staleIgnored = p.votes.filter((v) => v.version !== p.version).length;
  for (const m of p.requiredMembers) {
    const v = currentVote(p, m);
    if (!v) t.pending.push(m);
    else t[v.value].push(m);
  }
  t.allAgreed = p.requiredMembers.length > 0 && t.agree.length === p.requiredMembers.length;
  return t;
}
