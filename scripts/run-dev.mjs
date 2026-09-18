#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';

const nodeModulesBin = path.resolve(process.cwd(), 'node_modules/.bin');
const env = {
  ...process.env,
  PATH: `${nodeModulesBin}:${process.env.PATH || ''}`,
};

const rawArgs = process.argv.slice(2);
const cleanArgs = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--host') {
    cleanArgs.push('-H', rawArgs[++i] || '0.0.0.0');
  } else if (arg.startsWith('--host=')) {
    cleanArgs.push('-H', arg.slice(7));
  } else if (arg === '--port') {
    cleanArgs.push('-p', rawArgs[++i] || '3000');
  } else if (arg.startsWith('--port=')) {
    cleanArgs.push('-p', arg.slice(7));
  } else {
    cleanArgs.push(arg);
  }
}

if (!cleanArgs.includes('-p') && !cleanArgs.includes('--port')) {
  cleanArgs.push('-p', '3000');
}
if (!cleanArgs.includes('-H') && !cleanArgs.includes('--hostname')) {
  cleanArgs.push('-H', '0.0.0.0');
}

const child = spawn('next', ['dev', ...cleanArgs], {
  stdio: 'inherit',
  env,
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
