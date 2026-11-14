// 실제 v3 runFinished 필드 표본: docs/evidence/bot-runs/20261114151505-P1-smoke.events.jsonl.
// fixture 프로세스이며 Kiro CLI를 실행하지 않는다.
const fs = require('node:fs');
const mode = process.argv[2] || 'success';
const emit = (data, newline = true) => process.stdout.write(JSON.stringify(data) + (newline ? '\n' : ''));
emit({ type: 'runStarted', data: { engine: 'v3', payloadSchema: 'fixture', acpProtocolVersion: 1 } });
if (mode === 'timeout' || mode === 'timeout-ignore-term' || mode === 'timeout-descendant') {
  if (mode !== 'timeout') process.on('SIGTERM', () => {});
  if (mode === 'timeout-descendant') {
    const descendant = require('node:child_process').spawn(process.execPath, ['-e', "process.on('SIGTERM',()=>{});setInterval(()=>{},1000);"], { stdio: 'ignore' });
    fs.writeFileSync('descendant.pid', String(descendant.pid));
  }
  setInterval(() => {}, 1000);
} else {
  if (mode === 'signal') process.kill(process.pid, 'SIGTERM');
  const statePath = process.env.SUBS_STATE_PATH;
  let p;
  if (statePath && fs.existsSync(statePath)) {
    let s = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (mode.startsWith('business-')) {
      process.env.TSX_DISABLE_CACHE = '1';
      require('tsx/cjs');
      const { runTool } = require('../../../src/bot/tools.ts');
      const call = (name, args = {}) => {
        const run = runTool(s, name, args); s = run.state;
        emit({ type: 'sessionUpdate', data: { sessionId: 'fixture-session', update: { sessionUpdate: 'tool_call', title: '@household/' + name, toolCallId: 'fixture-' + name } } });
        if (!run.outcome.ok) throw new Error('business fixture tool denied: ' + name + '/' + run.outcome.reasons.join(','));
      };
      const caseId = (id) => s.cases.find((c) => c.subscription.id === id)?.caseId;
      switch (s.activePatrolId) {
        case 'P1':
          call('ingest_sms'); call('compare_channels', { subscriptionId: 'sub-youtube' });
          for (const subscriptionId of ['sub-youtube', 'sub-disney']) call('ask_member', { to: 'me', subscriptionId, text: '합성 시연: 다음 결제 전에 계속 쓸지 알려 주세요.' });
          break;
        case 'P2':
          call('request_handoff', { caseId: caseId('sub-youtube'), switchTo: 'web' });
          if (mode !== 'business-no-family') call('propose_family_plan', { subscriptionId: 'sub-disney', choice: 'cancel', pauseMonths: 0 });
          break;
        case 'P3':
          if (mode !== 'business-no-revision') call('propose_family_plan', { subscriptionId: 'sub-disney', choice: 'pause', pauseMonths: 2 });
          if (mode === 'business-wrong-stale-reason') s.cases.find((c) => c.subscription.id === 'sub-disney').stage = 'kept';
          break;
        case 'P4': call('request_handoff', { caseId: caseId('sub-disney') }); break;
        case 'P5':
          call('ingest_sms'); call('send_cancel_route', { subscriptionId: 'sub-youtube' });
          if (mode === 'business-no-reopen') s.cases.find((c) => c.subscription.id === 'sub-youtube').stage = 'cancel_requested';
          if (mode === 'business-no-old-charge') s.cases.find((c) => c.subscription.id === 'sub-youtube').closure.observedCharges = s.cases.find((c) => c.subscription.id === 'sub-youtube').closure.observedCharges.filter((c) => c.channel !== 'app_store');
          if (mode === 'business-no-new-charge') s.transactions = s.transactions.filter((t) => t.effect !== 'expected_new_channel');
          if (mode === 'business-no-consent') s.cases.find((c) => c.subscription.id === 'sub-disney').proposal.votes = [];
          if (mode === 'business-no-route') s.messages = s.messages.filter((m) => m.kind !== 'route');
          if (mode === 'business-no-disney-cancel') s.cases.find((c) => c.subscription.id === 'sub-disney').stage = 'handoff_ready';
          if (mode === 'business-missing-case') s.cases = s.cases.filter((c) => c.subscription.id !== 'sub-disney');
          if (mode === 'business-no-owner-question') s.questions = [];
          if (mode === 'business-no-switch-route') { const c = s.cases.find((c) => c.subscription.id === 'sub-youtube'); s.messages = s.messages.filter((m) => !(m.kind === 'route' && m.caseId === c.caseId && m.at < c.closure.requestedAt)); }
          if (mode === 'business-wrong-refund') s.messages = s.messages.map((m) => m.kind === 'route' ? { ...m, text: m.text.replace(/https:\/\/reportaproblem\.apple\.com[^\s]*/g, 'https://example.invalid/wrong-refund') } : m);
          if (mode === 'business-wrong-switch') s.cases.find((c) => c.subscription.id === 'sub-youtube').closure.switchTo = 'google_play';
          break;
      }
    }
    p = s.patrols.find((item) => item.id === s.activePatrolId);
    if (p && mode !== 'no-finish-patrol') {
      p.report = { summary: 'fixture report', waitingFor: [] };
      if (mode !== 'report-only') s.toolLog.push({ seq: s.toolLog.length + 1, at: s.clock, patrolId: p.id, tool: 'finish_patrol', args: {}, ok: true, reasons: [], summary: 'fixture report' });
      fs.writeFileSync(statePath, JSON.stringify(s));
    }
  }
  if (mode === 'mutate-source') fs.writeFileSync('src/input.ts', 'export const changed = true;\n');
  emit({ type: 'sessionUpdate', data: { sessionId: 'fixture-session', update: { sessionUpdate: 'tool_call', title: '@household/finish_patrol', toolCallId: 'fixture-tool' } } });
  if (mode === 'stderr') process.stderr.write('error Bearer TOP_SECRET_TOKEN user@example.com password=secret\n' + 'x'.repeat(65536));
  if (mode === 'success-key-only') emit({ type: 'runFinished', data: { success: true, result: 'success' } });
  else if (mode !== 'no-run-finished') emit({ type: 'runFinished', data: { sessionId: 'fixture-session', status: mode === 'run-failed' ? 'error' : 'success', stopReason: mode === 'no-stop' ? undefined : mode === 'run-failed' ? 'error' : 'end_turn', finalText: mode === 'empty-final' ? '  ' : 'fixture review / report', finalTextTruncated: mode === 'truncated-final' } }, mode !== 'no-newline');
  if (mode === 'exit-nonzero' || (mode === 'fail-second' && p?.id === 'P2')) process.exitCode = 23;
}
