import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..');
const source = resolve(webRoot, '..', 'contract', 'managed', 'dataconsent');
const publicRoot = join(webRoot, 'public');

mkdirSync(publicRoot, { recursive: true });
cpSync(join(source, 'keys'), join(publicRoot, 'keys'), { recursive: true });
cpSync(join(source, 'zkir'), join(publicRoot, 'zkir'), { recursive: true });
