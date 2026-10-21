// Diferenças entre sistemas: qual shell abre nos terminais, onde fica o socket do barramento e
// como achar executáveis. No Windows o shell preferido é o Git Bash (os comandos de agente e as
// mensagens usam sintaxe POSIX); sem ele, cai no PowerShell.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const isWin = process.platform === 'win32';

// No Windows o nome da variável pode vir como `Path`; devolve a chave que o objeto realmente usa.
function pathKey(env) {
  return isWin ? Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH' : 'PATH';
}

// Copia `env` com diretórios no começo/fim do PATH, sem deixar duas chaves PATH/Path concorrendo.
function withPath(env, { prepend = [], append = [] } = {}) {
  const out = { ...env };
  const key = pathKey(out);
  const cur = out[key] || (isWin ? '' : '/usr/bin:/bin');
  if (key !== 'PATH') delete out[key];
  out.PATH = [...prepend, cur, ...append].filter(Boolean).join(path.delimiter);
  return out;
}

// Procura um executável no PATH, como o `which`; no Windows testa as extensões do PATHEXT.
function which(cmd, env = process.env) {
  const exts = isWin ? (env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean) : [''];
  if (isWin && path.extname(cmd)) exts.unshift('');
  for (const dir of (env[pathKey(env)] || '').split(path.delimiter).filter(Boolean)) {
    for (const ext of exts) {
      const file = path.join(dir, cmd + ext);
      try { if (fs.statSync(file).isFile()) return file; } catch {}
    }
  }
  return null;
}

// Git Bash: bin\bash.exe ao lado do git.exe do PATH ou nos lugares de instalação comuns.
// (C:\Windows\System32\bash.exe é o WSL, que não enxerga o ambiente do Windows: fica de fora.)
function gitBash() {
  const git = which('git.exe');
  const roots = [
    git && path.resolve(path.dirname(git), '..'), // <Git>\cmd\git.exe
    git && path.resolve(path.dirname(git), '..', '..'), // <Git>\mingw64\bin\git.exe
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Git'),
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Git'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Git'),
  ];
  for (const root of roots.filter(Boolean)) {
    const bash = path.join(root, 'bin', 'bash.exe');
    if (fs.existsSync(bash)) return bash;
  }
  return null;
}

const kindOf = (file) => /^(pwsh|powershell)(\.exe)?$/i.test(path.basename(file)) ? 'powershell' : 'posix';

let cached;
// Shell dos terminais. REGENTE_SHELL força um (bash/zsh/sh ou pwsh/powershell).
function shell() {
  if (cached) return cached;
  let file = process.env.REGENTE_SHELL;
  if (!file && !isWin) file = process.env.SHELL || '/bin/bash';
  if (!file) file = gitBash() || which('pwsh.exe') || 'powershell.exe';
  cached = { path: file, kind: kindOf(file) };
  return cached;
}

// Argumentos do shell interativo; com `launch`, roda o agente e continua no shell quando ele sair.
function sessionArgs(sh, launch) {
  if (sh.kind === 'powershell') {
    // O PATH já chega certo pelo env; `$VAR` dos comandos de agente vira `$env:VAR`.
    return launch ? ['-NoLogo', '-NoExit', '-Command', launch.replace(/\$([A-Za-z_]\w*)/g, '$env:$1')] : ['-NoLogo'];
  }
  if (!launch) return ['-i'];
  // Shell não-login (como os emuladores de terminal comuns): /etc/profile não reseta o PATH.
  // No Git Bash o PATH é convertido para a forma POSIX ao abrir, então o bin do Regente entra via cygpath.
  const pathFix = isWin
    ? 'export PATH="$(cygpath -u "$REGENTE_BIN"):$PATH"'
    : 'export PATH="$REGENTE_BIN:$PATH${REGENTE_EXTRA_PATH}"';
  const again = isWin ? 'bash' : sh.path;
  return ['-i', '-c', `${pathFix}; ${launch}; exec ${again} -i`];
}

// Mensagem para um shell puro: só exibe o texto, sem executá-lo como comando.
function showText(kind, text) {
  if (kind === 'powershell') return `@'\n${text}\n'@`;
  return `cat <<'REGENTE_MSG'\n${text}\nREGENTE_MSG`;
}

// Socket do barramento. Unix: arquivo (limite de ~108 bytes no caminho, por isso o hash curto);
// Windows: named pipe.
function socketPath(dataDir) {
  const name = `regente-${crypto.createHash('sha1').update(dataDir).digest('hex').slice(0, 10)}`;
  if (isWin) return `\\\\.\\pipe\\${name}`;
  return path.join(process.env.XDG_RUNTIME_DIR || os.tmpdir(), `${name}.sock`);
}

// `child` está dentro de `parent` (ou é ele)? Tolera barras e maiúsculas diferentes no Windows.
function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}

module.exports = { isWin, pathKey, withPath, which, shell, sessionArgs, showText, socketPath, isInside };
