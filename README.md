<p align="center"><img src="build/icon.svg" width="128" alt="Regente"></p>

# Regente

Um canvas espacial para orquestrar agentes de IA: Claude Code, Codex, Gemini CLI, OpenCode ou qualquer comando.
Cada agente roda num terminal real dentro de um quadro infinito. Ligue os nós com linhas e eles passam a
conversar entre si, delegar tarefas, escrever em notas e controlar navegadores.

Tudo roda localmente: sem conta, sem telemetria e sem limites de workspaces.

## Rodar

```bash
npm install
npm start
```

Para adicionar o Regente ao menu de aplicativos (Linux), rode `./scripts/install-desktop.sh`.

### Windows

Os terminais usam o **Git Bash** quando ele está instalado ([git-scm.com](https://git-scm.com/download/win)), e os comandos
dos agentes e as mensagens entre eles funcionam como no Linux e no macOS. Sem o Git Bash, os terminais abrem no PowerShell
(`pwsh` se houver, senão o `powershell.exe`). Para escolher outro shell, defina `REGENTE_SHELL` (ex.: `REGENTE_SHELL=pwsh.exe`).

No PowerShell 5.1, argumentos com aspas chegam quebrados a programas externos. Se um agente não receber o system prompt
inteiro, instale o Git Bash ou o PowerShell 7.

## Conceitos

| | |
|---|---|
| **Agente** | Terminal com um CLI de IA. O ponto colorido mostra o estado: ocioso, trabalhando ou precisando de você. |
| **Conexão** | Arraste o ● da borda de um nó até outro nó. Um agente só enxerga e fala com quem está conectado a ele. |
| **Nota** | Markdown em `~/.config/regente/notes/*.md` (no Windows, `%APPDATA%\regente\notes`). Agentes conectados leem e escrevem nela. |
| **Portal** | Navegador embutido. Agentes conectados navegam, leem a árvore de elementos, clicam e digitam. Com ⌖ você recorta uma área e manda para um agente. |
| **Papel** | Instrução reutilizável (Revisor, Testador…). Entra no system prompt do agente. |
| **Andar** | Cópia isolada do workspace: `git worktree` numa branch `regente/<nome>`. Dá para "pousar" o andar (merge) ou descartá-lo. |
| **Partitura** | Arranjo salvo (agentes, papéis, notas, conexões, desenhos) para reaplicar em outro workspace. |
| **Rotina** | Prompt agendado (`a cada 30m`, `todo dia 09:00`…) entregue a um agente. É pulada se o agente estiver ocupado. |
| **Ponto** | Assistente opcional. Ao fim de cada turno, resume o que o agente fez e sugere próximos passos clicáveis. |
| **Batuta** | `Ctrl+P` busca agentes, notas e portais em todos os workspaces. Comece com `>` para buscar dentro das notas. |

## A CLI `regente` (usada pelos agentes)

Todo terminal do Regente tem `regente` no PATH. Os agentes recebem as instruções de uso no system prompt.
Você também pode instalar a skill em Configurações.

```bash
regente peers                                   # quem está conectado
regente ask Dev "implemente o endpoint /login"  # delega e espera a resposta
regente reply m-abc123 "feito, testes passando" # responde uma tarefa recebida
regente send Revisor "PR pronto para revisão"
regente note Plano append "- [x] login"
regente portal Site snapshot && regente portal Site click 4
regente spawn claude --name Testes --role Testador --task "cubra src/auth com testes"
regente routine add "rode os testes" --every 1h
```

Para ter as mesmas ferramentas via MCP: `claude mcp add regente -- regente mcp`.

## Atalhos

| | |
|---|---|
| `Ctrl+1..9`, `Ctrl+Tab` | trocar de workspace |
| `Ctrl+P` | Batuta (busca global) |
| `Ctrl+B` | mostrar ou esconder a barra lateral |
| `Ctrl+0` | ver tudo |
| `Ctrl+Enter` | focar o agente selecionado |
| `Alt+setas` | pular para o nó vizinho |
| `Ctrl+Shift+T` / `N` / `P` / `F` | novo agente, nota, portal ou andar |
| `Ctrl+I` (no terminal) | compositor de prompt com `@menções` e imagens coladas |
| `Ctrl+L` | log de mensagens entre agentes |
| `V P A R T E` | ferramentas: selecionar, caneta, seta, retângulo, texto, borracha |
| Ctrl+roda, arrastar o fundo | zoom, mover o canvas |

## Desenvolvimento

```bash
npm test        # testes unitários (barramento, rotinas, CLI)
npm run e2e     # teste ponta a ponta no Electron (janela oculta)
```

Estrutura:

- `src/main/`: processo principal. Inclui `sessions.js` (PTY e tela headless), `bus.js` (orquestração via socket unix ou named pipe no Windows), `platform.js` (shell, PATH e socket de cada sistema), `portal.js`, `routines.js`, `assistant.js` e `store.js`.
- `src/renderer/`: interface. Inclui `app.js` (canvas e workspaces) e `nodes.js` (terminal, nota e portal).
- `bin/regente.js`: CLI e servidor MCP.
