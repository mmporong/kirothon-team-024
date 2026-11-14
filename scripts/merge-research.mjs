// 조사 결과(research/L1/channel-prices-*.json, store-procedures.json)를 앱 데이터로 합친다.
// 사용: node scripts/merge-research.mjs <research/L1 폴더>
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2];
if (!SRC) throw new Error('research/L1 폴더 경로가 필요합니다');
const CH = new Set(['web', 'app_store', 'google_play']);
const ST = new Set(['verified', 'reported', 'not_offered', 'unknown']);
const services = [];
const problems = [];
for (const f of ['channel-prices-A.json', 'channel-prices-B.json']) {
  const p = join(SRC, f);
  if (!existsSync(p)) { problems.push(`없음: ${f}`); continue; }
  const d = JSON.parse(readFileSync(p, 'utf8'));
  for (const s of d.services ?? []) {
    const prices = [];
    for (const x of s.prices ?? []) {
      if (!CH.has(x.channel) || !ST.has(x.status)) { problems.push(`${s.id}/${s.plan}: 형식 밖 ${x.channel}/${x.status}`); continue; }
      let status = x.status;
      const monthly = Number.isSafeInteger(x.monthly) && x.monthly > 0 ? x.monthly : null;
      if (status === 'verified' && (monthly === null || !/^https:\/\//.test(x.source_url ?? '') || !['official', 'store_listing'].includes(x.source_kind))) {
        problems.push(`${s.id}/${s.plan}/${x.channel}: verified 조건 미달 → unknown`);
        status = monthly !== null && /^https:\/\//.test(x.source_url ?? '') ? 'reported' : 'unknown';
      }
      prices.push({ channel: x.channel, status, monthly, annual: Number.isSafeInteger(x.annual) ? x.annual : null, currency: x.currency ?? 'KRW', source_url: x.source_url ?? null, source_kind: x.source_kind ?? null, checked_at: x.checked_at ?? null, evidence: x.evidence ?? null });
    }
    services.push({ id: s.id, name: s.name, plan: s.plan, plan_label: s.plan_label ?? s.plan, prices, note: s.note ?? null, researcher: d.researcher ?? f });
  }
}
const now = new Date(Date.now() + 9 * 3600e3).toISOString().replace('Z', '+09:00');
writeFileSync(join(ROOT, 'src/data/channel_prices.json'), JSON.stringify({ _note: '결제 경로별 공개 가격. status=verified(공식·스토어 목록 근거)만 차액 계산에 쓴다. 조사: research/L1/channel-prices-*.md', generated_at: now, services }, null, 2) + '\n');
const sp = join(SRC, 'store-procedures.json');
if (existsSync(sp)) {
  const d = JSON.parse(readFileSync(sp, 'utf8'));
  writeFileSync(join(ROOT, 'src/data/store_procedures.json'), JSON.stringify({ _note: 'App Store·Google Play 취소·환불·경로 이동 공식 절차. 조사: research/L1/store-procedures.md', generated_at: d.generated_at ?? now, apple: d.apple ?? null, google_play: d.google_play ?? null, switch_steps_generic: d.switch_steps_generic ?? [], service_specific: d.service_specific ?? [] }, null, 2) + '\n');
} else problems.push('없음: store-procedures.json');
const verifiedDiffs = services.filter((s) => s.prices.filter((p) => p.status === 'verified').length >= 2);
console.log(`services ${services.length}, verified 2경로 이상 ${verifiedDiffs.length}`);
for (const x of problems) console.log(`  주의: ${x}`);
