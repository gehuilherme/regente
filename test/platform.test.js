const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const fs = require('fs');
const path = require('path');
const platform = require('../src/main/platform');

test('withPath junta diretórios com o separador do sistema e deixa uma só chave PATH', () => {
  // No Windows o process.env costuma trazer `Path`.
  const key = platform.isWin ? 'Path' : 'PATH';
  const env = platform.withPath({ [key]: 'a', OUTRA: '1' }, { prepend: ['bin'], append: [null, 'extra'] });
  assert.strictEqual(env.PATH, ['bin', 'a', 'extra'].join(path.delimiter));
  assert.deepStrictEqual(Object.keys(env).filter((k) => k.toUpperCase() === 'PATH'), ['PATH']);
  assert.strictEqual(env.OUTRA, '1');
});

test('which acha executáveis no PATH', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'regente-which-'));
  const name = platform.isWin ? 'ferramenta.cmd' : 'ferramenta';
  fs.writeFileSync(path.join(dir, name), '', { mode: 0o755 });
  const env = { PATH: dir, PATHEXT: '.EXE;.CMD' };
  // O Windows ignora maiúsculas: o achado pode vir como ferramenta.CMD.
  const norm = (p) => platform.isWin ? p.toLowerCase() : p;
  assert.strictEqual(norm(platform.which('ferramenta', env)), norm(path.join(dir, name)));
  assert.strictEqual(platform.which('nao-existe', env), null);
});

test('sessionArgs: POSIX roda o agente e volta ao shell; PowerShell troca $VAR por $env:VAR', () => {
  const posix = platform.sessionArgs({ path: '/bin/bash', kind: 'posix' }, 'claude "$REGENTE_SYSTEM_PROMPT"');
  assert.deepStrictEqual(posix.slice(0, 2), ['-i', '-c']);
  assert.match(posix[2], /claude "\$REGENTE_SYSTEM_PROMPT"; exec \S+ -i$/);
  assert.deepStrictEqual(platform.sessionArgs({ path: '/bin/bash', kind: 'posix' }, ''), ['-i']);
  const ps = platform.sessionArgs({ path: 'pwsh.exe', kind: 'powershell' }, 'claude "$REGENTE_SYSTEM_PROMPT"');
  assert.deepStrictEqual(ps, ['-NoLogo', '-NoExit', '-Command', 'claude "$env:REGENTE_SYSTEM_PROMPT"']);
});

test('showText exibe sem executar', () => {
  assert.strictEqual(platform.showText('posix', 'oi'), "cat <<'REGENTE_MSG'\noi\nREGENTE_MSG");
  assert.strictEqual(platform.showText('powershell', 'oi'), "@'\noi\n'@");
});

test('isInside', () => {
  const root = path.resolve('proj');
  assert(platform.isInside(root, root));
  assert(platform.isInside(path.join(root, 'src'), root));
  assert(!platform.isInside(path.resolve('proj-2'), root));
  assert(!platform.isInside(path.resolve('outro'), root));
});

test('socketPath: named pipe no Windows, arquivo .sock nos demais', () => {
  const p = platform.socketPath('/dados');
  if (platform.isWin) assert.match(p, /^\\\\\.\\pipe\\regente-[0-9a-f]{10}$/);
  else assert.match(p, /regente-[0-9a-f]{10}\.sock$/);
});
