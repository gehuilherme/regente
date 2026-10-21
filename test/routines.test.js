const test = require('node:test');
const assert = require('node:assert');
const { parseEvery, nextRun } = require('../src/main/routines');

test('parseEvery', () => {
  assert.strictEqual(parseEvery('30m'), 30 * 60000);
  assert.strictEqual(parseEvery('1h30m'), 90 * 60000);
  assert.strictEqual(parseEvery('45s'), 45000);
  assert.strictEqual(parseEvery('5s'), null); // abaixo do mínimo
  assert.strictEqual(parseEvery('abc'), null);
});

test('nextRun diário cai no próximo horário', () => {
  const from = new Date(2026, 9, 21, 10, 0).getTime();
  assert.strictEqual(nextRun({ daily: '09:00' }, from), new Date(2026, 9, 22, 9, 0).getTime());
  assert.strictEqual(nextRun({ daily: '11:30' }, from), new Date(2026, 9, 21, 11, 30).getTime());
});

test('nextRun semanal respeita os dias', () => {
  const wed = new Date(2026, 9, 21, 10, 0).getTime(); // quarta-feira
  assert.strictEqual(nextRun({ weekly: 'fri@18:00' }, wed), new Date(2026, 9, 23, 18, 0).getTime());
  assert.strictEqual(nextRun({ weekly: 'mon,wed@09:00' }, wed), new Date(2026, 9, 26, 9, 0).getTime());
});
