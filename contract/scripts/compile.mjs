import { spawnSync } from 'node:child_process';
import path from 'node:path';

const args = ['compile', 'dataconsent.compact', 'managed/dataconsent'];

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { cwd: process.cwd(), stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

if (process.platform !== 'win32') {
  run('compact', args);
}

// Windows ships a system utility named compact.exe. Midnight development on
// Windows is supported through WSL, where the actual Compact compiler lives.
const windowsPath = path.resolve(process.cwd()).replaceAll('\\', '/');
const drive = windowsPath.slice(0, 1).toLowerCase();
const wslPath = `/mnt/${drive}${windowsPath.slice(2)}`;
const shellCommand = `cd '${wslPath.replaceAll("'", "'\\''")}' && compact compile dataconsent.compact managed/dataconsent`;
run('wsl.exe', ['-d', 'Ubuntu', '--', 'bash', '-lc', shellCommand]);
