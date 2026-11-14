import { useEffect, useMemo, useState } from 'react';
import { CHANNEL_PRICES } from '../domain/channelPrice';
import { routeFor } from '../domain/guides';
import { formatWon } from '../domain/money';
import {
  createDeskItem,
  exampleDeskItems,
  filterDeskItems,
  loadDeskItems,
  recordDeskStatus,
  removeDeskItem,
  saveDeskItems,
  summarizeDesk,
  upsertDeskItem,
  validateDeskInput,
  type DeskFilter,
  type DeskInput,
  type DeskItem,
  type DeskStatus,
} from '../domain/serviceDesk';
import { CHANNEL_SHORT, type Channel } from '../domain/types';

const CHANNELS: Channel[] = ['web', 'app_store', 'google_play', 'carrier', 'partner'];
const FILTERS: Array<{ id: DeskFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'due_soon', label: '곧 결제' },
  { id: 'cancellation', label: '해지 관리' },
];
const STATUS_LABEL: Record<DeskStatus, string> = {
  active: '이용 중',
  cancel_planned: '해지 계획',
  cancel_requested: '해지 요청 기록',
  charge_reappeared: '재청구 확인 필요',
};

interface FormState {
  key: string;
  monthlyWon: string;
  nextChargeDate: string;
  channel: Channel;
}

const plans = CHANNEL_PRICES.services;
const initialKey = plans[0] ? `${plans[0].id}|${plans[0].plan}` : '';

function todayKst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function blankForm(): FormState {
  return { key: initialKey, monthlyWon: '', nextChargeDate: '', channel: 'web' };
}

function itemForm(item: DeskItem): FormState {
  return {
    key: `${item.serviceId}|${item.planId}`,
    monthlyWon: String(item.monthlyWon),
    nextChargeDate: item.nextChargeDate,
    channel: item.channel,
  };
}

function toInput(form: FormState): DeskInput | null {
  const [serviceId, planId] = form.key.split('|');
  const selected = plans.find((plan) => plan.id === serviceId && plan.plan === planId);
  if (!selected) return null;
  return {
    serviceId: selected.id,
    planId: selected.plan,
    name: selected.name,
    monthlyWon: Number(form.monthlyWon.replaceAll(',', '')),
    nextChargeDate: form.nextChargeDate,
    channel: form.channel,
  };
}

export function SubscriptionDesk({ onCompare }: { onCompare: (item: DeskItem) => void }) {
  const today = todayKst();
  const initial = useMemo(() => {
    try { return loadDeskItems(window.localStorage); }
    catch { return { items: [] as DeskItem[], warning: '이 브라우저의 저장소를 사용할 수 없어요. 창을 닫기 전에 기록을 확인해 주세요.' }; }
  }, []);
  const [items, setItems] = useState(initial.items);
  const [notice, setNotice] = useState<string | null>(initial.warning);
  const [filter, setFilter] = useState<DeskFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(initial.items[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (!changed) return;
    try {
      saveDeskItems(window.localStorage, items);
    } catch {
      setNotice('이 기기에 저장하지 못했어요. 브라우저 저장 설정을 확인해 주세요.');
    }
  }, [items, changed]);

  const summary = summarizeDesk(items, today);
  const visible = filterDeskItems(items, filter, today);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const guide = selected ? routeFor(selected.serviceId, selected.channel) : null;

  const beginAdd = () => {
    setEditingId(null);
    setForm(blankForm());
    setFormErrors([]);
    setFormOpen(true);
  };

  const beginEdit = (item: DeskItem) => {
    setEditingId(item.id);
    setForm(itemForm(item));
    setFormErrors([]);
    setFormOpen(true);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = toInput(form);
    const errors = input ? validateDeskInput(input) : ['서비스와 요금제를 다시 선택해 주세요.'];
    if (!/^\d+$/.test(form.monthlyWon.replaceAll(',', ''))) errors.unshift('월 결제액은 숫자로 입력해 주세요.');
    if (!input || errors.length) {
      setFormErrors([...new Set(errors)]);
      return;
    }
    const old = editingId ? items.find((item) => item.id === editingId) : null;
    const id = old?.id ?? globalThis.crypto.randomUUID();
    const next = old ? { ...old, ...input } : createDeskItem(input, id);
    setChanged(true);
    setItems((current) => upsertDeskItem(current, next));
    setSelectedId(id);
    setFormOpen(false);
    setEditingId(null);
    setNotice(old ? '구독 정보를 수정했어요.' : '구독을 이 기기에 저장했어요.');
  };

  const loadExamples = () => {
    const examples = exampleDeskItems(today);
    setChanged(true);
    setItems((current) => [...current, ...examples.filter((item) => !current.some((saved) => saved.id === item.id))]);
    setSelectedId(examples[0]?.id ?? null);
    setNotice('예시 구독 3개를 불러왔어요. 언제든 수정하거나 삭제할 수 있어요.');
  };

  const updateStatus = (item: DeskItem, status: DeskStatus) => {
    setChanged(true);
    const updated = recordDeskStatus(item, status, new Date().toISOString());
    setItems((current) => upsertDeskItem(current, updated));
    setNotice(`‘${STATUS_LABEL[status]}’ 상태를 이 기기에 기록했어요.`);
  };

  const remove = (item: DeskItem) => {
    if (!window.confirm(`${item.name} 구독을 이 기기 목록에서 삭제할까요?`)) return;
    setChanged(true);
    setItems((current) => removeDeskItem(current, item.id));
    setSelectedId((current) => current === item.id ? null : current);
    setNotice('구독을 이 기기 목록에서 삭제했어요.');
  };

  return (
    <section className="desk-shell" aria-labelledby="desk-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">내 구독</p>
          <h2 id="desk-title">다가오는 결제를 한곳에서 관리해요</h2>
          <p className="muted small">입력한 내용과 처리 상태는 이 기기의 브라우저에만 저장돼요. 결제·해지는 연결된 공식 화면에서 확인해 주세요.</p>
        </div>
        <div className="action-row row wrap">
          <button type="button" className="btn primary" onClick={beginAdd}>구독 등록</button>
          <button type="button" className="btn" onClick={loadExamples}>예시 구독 불러오기</button>
        </div>
      </div>

      {notice && <p className="verdict" role="status" aria-live="polite">{notice}</p>}

      <div className="desk-stats" aria-label="구독 요약">
        <article className="card desk-stat"><span className="small muted">월 결제 합계</span><strong>{formatWon(summary.monthlyTotal)}</strong></article>
        <article className="card desk-stat"><span className="small muted">7일 안에 결제</span><strong>{summary.dueSoonCount}건</strong></article>
        <article className="card desk-stat"><span className="small muted">해지 관리</span><strong>{summary.cancellationCount}건</strong></article>
      </div>

      {formOpen && (
        <form className="card desk-form" onSubmit={submit} aria-label={editingId ? '구독 수정' : '구독 등록'} noValidate>
          <div className="section-head"><h3>{editingId ? '구독 수정' : '구독 등록'}</h3><button type="button" className="btn" onClick={() => setFormOpen(false)}>닫기</button></div>
          <div className="grid2">
            <label className="field">서비스·요금제
              <select value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} required>
                {plans.map((plan) => <option key={`${plan.id}|${plan.plan}`} value={`${plan.id}|${plan.plan}`}>{plan.name} · {plan.plan_label}</option>)}
              </select>
            </label>
            <label className="field">결제 경로
              <select value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value as Channel }))} required>
                {CHANNELS.map((channel) => <option key={channel} value={channel}>{CHANNEL_SHORT[channel]}</option>)}
              </select>
            </label>
            <label className="field">내 월 결제액 (원)
              <input inputMode="numeric" value={form.monthlyWon} onChange={(event) => setForm((current) => ({ ...current, monthlyWon: event.target.value }))} aria-invalid={formErrors.length > 0} aria-describedby={formErrors.length ? 'desk-form-errors' : undefined} placeholder="예: 14900" required />
            </label>
            <label className="field">다음 결제일
              <input type="date" value={form.nextChargeDate} onChange={(event) => setForm((current) => ({ ...current, nextChargeDate: event.target.value }))} aria-invalid={formErrors.length > 0} aria-describedby={formErrors.length ? 'desk-form-errors' : undefined} required />
            </label>
          </div>
          {formErrors.length > 0 && <ul id="desk-form-errors" className="warn small" role="alert">{formErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
          <div className="action-row row wrap"><button type="submit" className="btn primary">{editingId ? '수정 저장' : '내 구독에 추가'}</button></div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="card desk-empty">
          <h3>아직 등록한 구독이 없어요</h3>
          <p className="muted">첫 구독을 등록하면 월 합계와 다가오는 결제일을 바로 확인할 수 있어요.</p>
          <div className="action-row row wrap"><button type="button" className="btn primary" onClick={beginAdd}>첫 구독 등록</button><button type="button" className="btn" onClick={loadExamples}>예시 3개로 체험</button></div>
        </div>
      ) : (
        <div className="grid2 desk-workspace">
          <div className="card desk-list">
            <div className="desk-toolbar" role="group" aria-label="구독 목록 필터">
              {FILTERS.map((option) => <button key={option.id} type="button" className={filter === option.id ? 'btn primary' : 'btn'} aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>{option.label}</button>)}
            </div>
            {visible.length === 0 && <p className="muted">이 조건에 맞는 구독이 없어요.</p>}
            {visible.map((item) => (
              <button key={item.id} type="button" className={`desk-row${selectedId === item.id ? ' desk-row-selected' : ''}`} aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}>
                <span><strong>{item.name}</strong><small>{CHANNEL_SHORT[item.channel]} · {STATUS_LABEL[item.deskStatus]}{item.sourceKind === 'demo' ? ' · 예시' : ''}</small></span>
                <span><strong>{formatWon(item.monthlyWon)}</strong><small>{item.nextChargeDate} 결제</small></span>
              </button>
            ))}
          </div>

          <div className="card desk-detail" aria-live="polite">
            {!selected ? <p className="muted">구독을 선택하면 관리 기능이 열려요.</p> : <>
              <div className="section-head"><div><p className="eyebrow">선택한 구독</p><h3>{selected.name}</h3></div><span className="badge">{STATUS_LABEL[selected.deskStatus]}</span></div>
              <dl className="desk-facts"><div><dt>월 결제액</dt><dd>{formatWon(selected.monthlyWon)}</dd></div><div><dt>다음 결제일</dt><dd>{selected.nextChargeDate}</dd></div><div><dt>결제 경로</dt><dd>{CHANNEL_SHORT[selected.channel]}</dd></div></dl>
              <div className="desk-actions row wrap">
                <button type="button" className="btn primary" onClick={() => onCompare(selected)}>가격 비교</button>
                <button type="button" className="btn" onClick={() => beginEdit(selected)}>수정</button>
                <button type="button" className="btn" onClick={() => remove(selected)}>삭제</button>
              </div>

              <h4>해지 처리 기록</h4>
              <p className="muted small">아래 버튼은 진행 상황을 이 기기에 기록할 뿐, 서비스에 해지를 요청하지 않아요.</p>
              <div className="desk-statuses row wrap" role="group" aria-label="해지 처리 상태 기록">
                {(Object.keys(STATUS_LABEL) as DeskStatus[]).map((status) => <button key={status} type="button" className={selected.deskStatus === status ? 'btn primary' : 'btn'} aria-pressed={selected.deskStatus === status} onClick={() => updateStatus(selected, status)}>{STATUS_LABEL[status]}</button>)}
              </div>
              {selected.statusRecordedAt && <p className="small muted">마지막 기록: {new Date(selected.statusRecordedAt).toLocaleString('ko-KR')}</p>}

              <h4>공식 해지 안내</h4>
              {guide?.status === 'ok' ? <>
                <a className="btn" href={guide.route.official_url!} target="_blank" rel="noreferrer">{guide.serviceName} 공식 해지 화면 열기</a>
                {guide.route.steps?.length ? <details className="disclosure"><summary>단계별 해지 방법</summary><div className="disclosure-body"><ol className="compact-list small">{guide.route.steps.map((step) => <li key={step}>{step}</li>)}</ol></div></details> : <p className="muted small">공식 화면에서 현재 구독 상태와 해지 조건을 확인해 주세요.</p>}
              </> : <p className="muted small">이 결제 경로의 공식 해지 주소는 아직 확인되지 않았어요. 서비스의 구독 관리 화면에서 확인해 주세요.</p>}
            </>}
          </div>
        </div>
      )}
    </section>
  );
}
