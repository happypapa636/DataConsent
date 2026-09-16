import { spawnSync } from 'node:child_process';
import path from 'node:path';

const args = ['-f', 'compose.yml', ...process.argv.slice(2)];

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { cwd: process.cwd(), stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

if (process.platform !== 'win32') {
  run('docker', ['compose', ...args]);
}

const windowsPath = path.resolve(process.cwd()).replaceAll('\\', '/');
const drive = windowsPath.slice(0, 1).toLowerCase();
const wslPath = `/mnt/${drive}${windowsPath.slice(2)}`;
run('wsl.exe', ['-d', 'Ubuntu', '--', 'docker-compose', '-f', `${wslPath}/compose.yml`, ...process.argv.slice(2)]);
