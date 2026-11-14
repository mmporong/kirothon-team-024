import {
  DESK_STORAGE_KEY,
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
  type DeskInput,
  type DeskStorage,
} from '../../src/domain/serviceDesk';

const valid: DeskInput = {
  serviceId: 'youtube_premium_kr',
  planId: 'individual',
  name: '유튜브 프리미엄',
  monthlyWon: 14900,
  nextChargeDate: '2026-11-17',
  channel: 'web',
};

function memoryStorage(initial?: string): DeskStorage & { value: string | null } {
  return {
    value: initial ?? null,
    getItem(key) { return key === DESK_STORAGE_KEY ? this.value : null; },
    setItem(key, value) { if (key === DESK_STORAGE_KEY) this.value = value; },
  };
}

describe('내 구독 CRUD와 입력 검증', () => {
  it('유효한 구독을 추가·수정·삭제한다', () => {
    const created = createDeskItem(valid, 'sub-1');
    const added = upsertDeskItem([], created);
    const edited = upsertDeskItem(added, { ...created, monthlyWon: 15400 });
    expect(edited).toHaveLength(1);
    expect(edited[0]?.monthlyWon).toBe(15400);
    expect(removeDeskItem(edited, 'sub-1')).toEqual([]);
  });

  it('0원·존재하지 않는 날짜·가격표에 없는 요금제를 거부한다', () => {
    expect(validateDeskInput({ ...valid, monthlyWon: 0 })).not.toEqual([]);
    expect(validateDeskInput({ ...valid, nextChargeDate: '2026-02-30' })).not.toEqual([]);
    expect(validateDeskInput({ ...valid, planId: 'missing' })).not.toEqual([]);
  });
});

describe('기기 저장과 새로고침 복원', () => {
  it('저장한 구독과 수동 상태를 같은 값으로 복원한다', () => {
    const storage = memoryStorage();
    const item = recordDeskStatus(createDeskItem(valid, 'sub-1'), 'cancel_requested', '2026-11-14T08:40:00.000Z');
    saveDeskItems(storage, [item]);
    expect(loadDeskItems(storage)).toEqual({ items: [item], warning: null });
  });

  it('손상된 JSON이나 검증되지 않은 레코드는 빈 목록과 경고로 격리한다', () => {
    expect(loadDeskItems(memoryStorage('{broken')).items).toEqual([]);
    const invalid = memoryStorage(JSON.stringify({ version: 1, items: [{ ...createDeskItem(valid, 'sub-1'), monthlyWon: -1 }] }));
    expect(loadDeskItems(invalid)).toMatchObject({ items: [], warning: expect.any(String) });
  });
});

describe('지표·필터와 예시 데이터', () => {
  it('7일 이내 결제와 해지 관리 상태를 구분하고 총액을 계산한다', () => {
    const items = exampleDeskItems('2026-11-14');
    const managed = recordDeskStatus(items[1]!, 'cancel_planned', '2026-11-14T08:40:00.000Z');
    const updated = [items[0]!, managed, items[2]!];
    expect(summarizeDesk(updated, '2026-11-14')).toEqual({ monthlyTotal: 41800, dueSoonCount: 1, cancellationCount: 1 });
    expect(filterDeskItems(updated, 'due_soon', '2026-11-14').map((item) => item.id)).toEqual(['sample-youtube']);
    expect(filterDeskItems(updated, 'cancellation', '2026-11-14').map((item) => item.id)).toEqual(['sample-tving']);
  });
});
