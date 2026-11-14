import base from '../vitest-hook.config.mjs';

// 이 설정은 오류 전파 시험 전용이며 일반 npm test의 수집 대상이 아니다.
export default {
  ...base,
  test: { ...base.test, include: ['tests/hooks/fixtures/failure.case.mjs'] },
};
