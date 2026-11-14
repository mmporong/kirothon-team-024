import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import base from '../../vite.config.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const evidenceDir = process.env.TTOKPAY_HOOK_EVIDENCE_DIR;
if (!evidenceDir) throw new Error('This config requires the hook harness evidence directory');

export default {
  ...base,
  root,
  cacheDir: join(evidenceDir, 'vite-cache'),
  test: {
    ...base.test,
    cache: false,
    fsModuleCache: false,
    attachmentsDir: join(evidenceDir, 'attachments'),
  },
};
