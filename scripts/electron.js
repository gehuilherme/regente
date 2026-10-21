// Abre o Electron sem ELECTRON_RUN_AS_NODE (herdado de terminais do VS Code ou do próprio Regente),
// em qualquer sistema: substitui o `env -u`, que não existe no Windows. `--e2e` roda o teste de ponta a ponta.
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const env = { ...process.env };
for (const k of Object.keys(env)) if (k.toUpperCase() === 'ELECTRON_RUN_AS_NODE') delete env[k];
if (process.argv.includes('--e2e')) {
  env.REGENTE_DATA = env.REGENTE_DATA || path.join(os.tmpdir(), 'regente-e2e');
  env.REGENTE_TEST_SCRIPT = 'test/e2e/smoke.js';
}

const p = spawn(require('electron'), ['.'], { stdio: 'inherit', env, cwd: path.join(__dirname, '..') });
p.on('exit', (code, signal) => process.exit(signal ? 1 : code));
