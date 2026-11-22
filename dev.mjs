import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const python =
  process.platform === 'win32'
    ? path.join(root, 'backend', '.venv', 'Scripts', 'python.exe')
    : path.join(root, 'backend', '.venv', 'bin', 'python');

console.log('EcoRota USP rodando localmente:');
console.log('  Site (React)  : http://localhost:5173');
console.log('  API (Django)  : http://127.0.0.1:8000/api/health');
console.log('  Django Admin  : http://127.0.0.1:8000/admin/\n');

const back = spawn(python, ['manage.py', 'runserver', '127.0.0.1:8000'], {
  cwd: path.join(root, 'backend'),
  stdio: 'inherit',
});
const front = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(root, 'frontend'),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const stop = () => {
  back.kill();
  front.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
