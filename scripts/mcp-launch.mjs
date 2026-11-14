// MCP 서버 실행기: 저장소 루트를 이 파일 위치로 찾아 tsx 로 mcp/server.ts 를 띄운다(작업 디렉터리와 무관).
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn(process.execPath, ['--import', 'tsx', join(root, 'mcp', 'server.ts')], { cwd: root, stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
