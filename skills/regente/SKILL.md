---
name: regente
description: Coordinate with other AI agents, notes and browser portals on the Regente canvas. Use when running inside a Regente terminal (REGENTE_TOKEN is set) and you need to delegate work, ask another agent, report progress to a note, or drive a connected browser.
---

# Regente: connected agents on a canvas

You are in a Regente terminal if `REGENTE_TOKEN` is set. You only see nodes **connected to you by a line
on the canvas**; run `regente peers` to list them.

Regente messages follow the user's language (pt/en/es). Write to the user, to notes and to other agents
in that language.

## Talking to other agents

- `regente ask <name> "<task>"` delegates and **blocks until the reply**. `--timeout <s>` for long tasks (default 1800). Run independent asks in parallel, in the background, when it makes sense.
- `regente send <name> "<message>"` notifies without waiting; queued if the target is busy.
- `regente broadcast "<message>"` sends to every connected terminal.
- `regente read <name> --lines 80` reads another agent's screen.
- `regente wait <name>` waits until the agent is idle.
- `regente keys <name> 1 enter` sends raw keys, e.g. to approve a helper's permission prompt.

**When you receive** `[Regente] Task from "X" (id m-...)` (`Tarefa de` in Portuguese, `Tarea de` in Spanish):
do the task and ALWAYS finish with `regente reply <id> "<result>"`. For long results: `echo "..." | regente reply <id> -`.

## Spawning helpers

`regente spawn claude --name Tests --role "Tester" --task "write tests for src/auth"` creates a new agent next
to you, already connected. Agents: `claude`, `codex`, `gemini`, `opencode`, `shell`.

## Notes

`regente note <note> read|write|append "<text>"` reads/writes connected Markdown notes. Use them for progress,
decisions and checklists (`- [ ] item`).

## Portals (browser)

1. `regente portal <portal> goto http://localhost:3000`
2. `regente portal <portal> snapshot` lists elements with refs: `[3] button "Sign in"`.
3. `regente portal <portal> click 3`, `regente portal <portal> type 5 "text" --submit`
4. `regente portal <portal> text | screenshot [file.png] | eval "<js>" | key Enter | scroll 600`

Run `snapshot` again after navigating: refs change.

## Other

- `regente status "<short text>"` shows what you're doing on your node.
- `regente routine add "<prompt>" --every 30m` schedules recurring prompts; also `list` and `rm <id>`.
