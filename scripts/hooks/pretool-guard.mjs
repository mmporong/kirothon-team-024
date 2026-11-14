// PreToolUse: 위험 명령·개인 원문 경로 접근을 exit 2 로 막는다. [R13][R14]
import { ROOT, readStdinJson, appendEvidence, kstNow } from './_lib.mjs';

const input = readStdinJson();
const toolInput = input.tool_input ?? {};
const text = JSON.stringify(toolInput);
const RULES = [
  { id: 'G1-raw-messages', re: /Library\/Messages|chat\.db/i, msg: '실제 문자 DB 경로 접근은 금지 (privacy.md)' },
  { id: 'G2-force-push', re: /git\s+push\b[^"]*(--force|\s-f\b)/, msg: 'force push 금지' },
  { id: 'G3-rm-rf', re: /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/, msg: 'rm -rf 금지' },
  { id: 'G4-real-export', re: /(카드|은행|결제내역)[^"]*\.(csv|xlsx)/, msg: '실제 결제 내보내기 파일 접근 금지' },
  { id: 'G5-secrets', re: /(\.env\b|id_rsa|\.aws\/credentials)/, msg: '비밀 파일 접근 금지' },
];
const hit = RULES.find((r) => r.re.test(text));
if (hit) {
  appendEvidence('policy-denials.jsonl', { at: kstNow(), hook: 'pretool-guard', rule: hit.id, tool: input.tool_name ?? null, session: input.session_id ?? null, blocked: true });
  console.error(`BLOCKED-BY-TTOKPAY-GUARD [${hit.id}]: ${hit.msg}`);
  process.exit(2);
}
process.exit(0);
