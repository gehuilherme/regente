---
name: regente
description: Coordinate with other AI agents, notes and browser portals on the Regente canvas. Use when running inside a Regente terminal (REGENTE_TOKEN is set) and you need to delegate work, ask another agent, report progress to a note, or drive a connected browser.
---

# Regente: agentes conectados no canvas

Você está num terminal do Regente se a variável `REGENTE_TOKEN` existir. Você só enxerga os nós
**conectados a você por uma linha no canvas**. Rode `regente peers` para ver quem são.

## Conversar com outros agentes

- `regente ask <nome> "<tarefa>"` delega uma tarefa e **bloqueia até a resposta**. Use `--timeout <s>` para tarefas longas (padrão 1800). Rode tarefas independentes em paralelo, em background, quando fizer sentido.
- `regente send <nome> "<mensagem>"` avisa sem esperar. Se o destino estiver ocupado, a mensagem entra na fila.
- `regente broadcast "<mensagem>"` manda para todos os terminais conectados.
- `regente read <nome> --lines 80` lê a tela de outro agente.
- `regente wait <nome>` espera o agente ficar ocioso.
- `regente keys <nome> 1 enter` envia teclas cruas, por exemplo para aprovar um prompt de permissão de um ajudante.

**Quando receber** `[Regente] Tarefa de "X" (id m-...)`: faça a tarefa e termine SEMPRE com
`regente reply <id> "<resultado>"`. Para resultados longos, use `echo "..." | regente reply <id> -`.

## Criar ajudantes

`regente spawn claude --name Testes --role "Testador" --task "escreva testes para src/auth"` cria um
agente novo ao seu lado, já conectado a você. Os agentes disponíveis são `claude`, `codex`, `gemini`, `opencode` e `shell`.

## Notas

`regente note <nota> read|write|append "<texto>"` lê e escreve notas Markdown conectadas. Use-as para
registrar progresso, decisões e checklists (`- [ ] item`).

## Portais (navegador)

1. `regente portal <portal> goto http://localhost:3000`
2. `regente portal <portal> snapshot` lista os elementos com refs: `[3] button "Entrar"`.
3. `regente portal <portal> click 3`, `regente portal <portal> type 5 "texto" --submit`
4. `regente portal <portal> text | screenshot [arquivo.png] | eval "<js>" | key Enter | scroll 600`

Rode `snapshot` de novo depois de navegar: as refs mudam.

## Outros

- `regente status "<texto curto>"` mostra o que você está fazendo no seu nó.
- `regente routine add "<prompt>" --every 30m` agenda prompts recorrentes. Use também `list` e `rm <id>`.
