// Teste ponta a ponta: dois shells conectados + nota. Rode com `npm run e2e`.
const assert = require('assert');
const path = require('path');

module.exports = async ({ win, store, sessions, shot, wait }) => {
  const out = process.env.REGENTE_SHOTS || '/tmp';
  const exec = (js) => win.webContents.executeJavaScript(js);
  await wait(1500);

  // Assistente de configuração da primeira execução.
  assert(await exec(`!!document.querySelector('.wizard')`), 'wizard aparece na primeira execução');
  const clickText = (t) => exec(`[...document.querySelectorAll('.modal button')].find((b) => b.textContent.trim() === ${JSON.stringify(t)}).click()`);
  for (let i = 0; i < 6; i++) {
    await wait(i === 2 ? 2500 : 300); // passo dos agentes espera a detecção
    await shot(path.join(out, `regente-wizard-${i}.png`));
    if (i === 4) await exec(`[...document.querySelectorAll('.choice')].pop().click()`); // canvas vazio
    if (i === 5) {
      await exec(`document.querySelector('.check input').click()`); // não instala a skill no teste
      await clickText('Abrir o canvas');
    } else await clickText(i === 0 ? 'Começar' : 'Continuar');
  }
  await wait(500);
  assert(!(await exec(`!!document.querySelector('.wizard')`)), 'wizard fechou');
  assert.strictEqual(store.state.settings.onboarded, true);

  // Monta o canvas via UI: dois terminais shell e uma nota.
  await exec(`document.querySelector('#btn-add-note').click()`);
  await wait(300);
  const ws = store.state.workspaces[0];
  const termA = { id: 'n-a', type: 'terminal', agent: 'shell', title: 'Alfa', x: 0, y: 0, w: 640, h: 380, cwd: ws.cwd };
  const termB = { id: 'n-b', type: 'terminal', agent: 'shell', title: 'Beta', x: 720, y: 0, w: 640, h: 380, cwd: ws.cwd };
  await wait(500);
  const cur = store.workspace(ws.id);
  const note = cur.nodes.find((n) => n.type === 'note');
  assert(note, 'nota criada pela UI');
  note.x = 300; note.y = 460;
  cur.nodes.push(termA, termB);
  cur.edges.push({ id: 'e-1', from: 'n-a', to: 'n-b' }, { id: 'e-2', from: 'n-a', to: note.id });
  win.webContents.send('ws:replace', cur);
  await wait(2500);

  const A = sessions.get('n-a');
  const B = sessions.get('n-b');
  assert(A && B, 'sessões iniciadas');

  A.write('clear; regente peers\r');
  await wait(1500);
  const peers = A.screenText(20);
  console.log('--- peers ---\n' + peers);
  assert(/Beta/.test(peers) && /Nota/.test(peers), 'peers lista Beta e a nota');

  A.write('regente note Nota append "- [ ] tarefa escrita pelo Alfa"\r');
  await wait(1200);
  assert(store.readNote(note.id).includes('tarefa escrita pelo Alfa'), 'nota recebeu append');

  // ask bloqueante: Beta recebe a tarefa e responde com regente reply.
  A.write('clear; regente ask Beta "quanto é 2+2?" --timeout 30\r');
  await wait(2500);
  const bScreen = B.screenText(40);
  const id = (bScreen.match(/id (m-[0-9a-f]+)/) || [])[1];
  assert(id, 'Beta recebeu a tarefa com id:\n' + bScreen);
  await shot(path.join(out, 'regente-pending.png'));
  B.write(`clear; regente reply ${id} "4"\r`);
  await wait(1500);
  const aScreen = A.screenText(20);
  console.log('--- resposta no Alfa ---\n' + aScreen);
  assert(/Resposta de Beta:\s*\n?4/.test(aScreen), 'Alfa recebeu a resposta');

  // Não conectado => recusado.
  A.write('clear; regente read Gama\r');
  await wait(1000);
  const denied = A.screenText(10);
  assert(/não está conectado/.test(denied), 'acesso negado a nó não conectado:\n' + denied);

  // Desenho de texto e seta para o screenshot.
  cur.drawings.push({ id: 'd-1', kind: 'text', points: [[0, -60]], text: 'Arquitetura', color: '#1d1d1f', size: 40 },
    { id: 'd-2', kind: 'pen', color: '#e5383b', width: 4, points: [[0, -48], [90, -44], [200, -50]] });
  console.log('passo: desenhos');
  win.webContents.send('ws:replace', cur);
  await wait(500);
  console.log('passo: render', await exec('document.querySelectorAll(".node").length'));

  // Zoom do canvas.
  await exec(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', ctrlKey: true }))`);
  await wait(800);
  console.log('passo: zoom');
  await shot(path.join(out, 'regente-canvas.png'));
  for (const btn of ['#btn-palette', '#btn-routines', '#btn-settings', '#btn-scores', '#btn-roles']) {
    await exec(`document.querySelector('${btn}').click()`);
    await wait(400);
    const open = await exec(`document.querySelectorAll('.modal').length`);
    assert(open === 1, `${btn} abriu um modal`);
    if (btn === '#btn-routines') await shot(path.join(out, 'regente-rotinas.png'));
    await exec(`document.querySelector('.modal-back').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
    await wait(200);
  }
  console.log('E2E OK');
};
