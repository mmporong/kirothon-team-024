// 원 단위 정수 금액 도우미. [R19]

/** 0 이상 안전한 정수인지 검사한다. */
export function isWon(n: unknown): n is number {
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
}

function group(n: number): string {
  return String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 9900 → "9,900원" */
export function formatWon(n: number): string {
  return `${n < 0 ? '-' : ''}${group(n)}원`;
}

/** 3800 → "+3,800원", -7700 → "−7,700원", 0 → "0원" */
export function formatSignedWon(n: number): string {
  if (n === 0) return '0원';
  return `${n > 0 ? '+' : '−'}${group(n)}원`;
}

/** 32비트 FNV-1a 해시(16진수 8자리). 결과·조건 식별용이며 보안 용도가 아니다. */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** 키 순서를 고정한 JSON. 해시 입력으로 쓴다. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(',')}}`;
}
