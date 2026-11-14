// 이 저장소가 사용하는 Node API만 선언한다. 전체 모듈을 any로 대체하지 않는다.
// @types/node를 추가하지 않는 실행기 검증 범위이며, 사용 API가 늘면 이 계약도 확장한다.
interface RuntimeBuffer extends Uint8Array {
  toString(encoding?: string): string;
  subarray(begin?: number, end?: number): RuntimeBuffer;
}
type Buffer = RuntimeBuffer;
declare const Buffer: {
  from(value: string | Uint8Array, encoding?: string): RuntimeBuffer;
  concat(values: readonly Uint8Array[]): RuntimeBuffer;
  byteLength(value: string): number;
};
interface RuntimeInput { on(event: 'data', callback: (data: Buffer) => void): RuntimeInput }
declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  execPath: string;
  pid: number;
  platform: string;
  exitCode?: number;
  stdin: RuntimeInput;
  stdout: { isTTY?: boolean; write(data: string | Uint8Array): boolean };
  stderr: { write(data: string | Uint8Array): boolean };
  exit(code?: number): never;
  kill(pid: number, signal?: string | number): boolean;
};
declare module 'node:child_process' {
  interface Child {
    pid?: number;
    stdout: RuntimeInput | null;
    stderr: RuntimeInput | null;
    kill(signal?: string): boolean;
    on(event: 'error', callback: (error: Error & { code?: string }) => void): Child;
    on(event: 'close', callback: (code: number | null, signal: string | null) => void): Child;
  }
  export function spawn(file: string, args: readonly string[], options: { cwd: string; env: Record<string, string | undefined>; stdio: ['ignore', 'pipe', 'pipe']; detached?: boolean }): Child;
}
declare module 'node:fs' {
  interface Dirent { name: string; isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean }
  export function readFileSync(path: string | number, encoding: 'utf8'): string;
  export function readFileSync(path: string | number): RuntimeBuffer;
  export function writeFileSync(path: string, data: string | Uint8Array, options?: { flag?: string }): void;
  export function appendFileSync(path: string, data: string | Uint8Array): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined;
  export function copyFileSync(source: string, destination: string): void;
  export function renameSync(source: string, destination: string): void;
  export function readdirSync(path: string): string[];
  export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  export function mkdtempSync(prefix: string): string;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
}
declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
  export function dirname(path: string): string;
}
declare module 'node:url' { export function fileURLToPath(url: string): string }
declare module 'node:crypto' {
  interface Hash { update(data: string | Uint8Array): Hash; digest(encoding: 'hex'): string }
  export function createHash(algorithm: string): Hash;
  export function randomUUID(): string;
}
declare module 'node:zlib' {
  export function inflateSync(data: Uint8Array): RuntimeBuffer;
  export function deflateSync(data: Uint8Array): RuntimeBuffer;
}
declare module 'node:readline' {
  interface Interface {
    on(event: 'line', callback: (line: string) => void): Interface;
    on(event: 'close', callback: () => void): Interface;
  }
  export function createInterface(options: { input: RuntimeInput }): Interface;
}

interface ImportMeta { readonly url: string }
interface Console { log(...values: unknown[]): void; error(...values: unknown[]): void }
declare var console: Console;
declare function structuredClone<T>(value: T): T;
declare module 'node:timers' {
  interface Timeout { readonly timerIdentity: unique symbol }
  export function setTimeout(callback: () => void, milliseconds?: number): Timeout;
  export function clearTimeout(timer: Timeout | undefined): void;
}
