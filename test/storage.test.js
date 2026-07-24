import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, createMemoryKV, createLocalStorageKV } from '../src/services/storage.js';

function mem() {
  return createStorage(createMemoryKV());
}

test('leaderboard nasce vazio', () => {
  const s = mem();
  assert.deepEqual(s.getLeaderboard(), []);
});

test('addScore ordena desc e trunca em 10', () => {
  const s = mem();
  for (let i = 1; i <= 12; i++) {
    s.addScore({ name: 'AAA', score: i * 100, level: i, date: '2026-07-24' });
  }
  const lb = s.getLeaderboard();
  assert.equal(lb.length, 10);
  assert.equal(lb[0].score, 1200);
  assert.equal(lb[9].score, 300);
});

test('empate: entrada existente ganha (fica na frente)', () => {
  const s = mem();
  s.addScore({ name: 'VET', score: 500, level: 2, date: '2026-07-24' });
  s.addScore({ name: 'NOV', score: 500, level: 3, date: '2026-07-24' });
  const lb = s.getLeaderboard();
  assert.equal(lb[0].name, 'VET');
  assert.equal(lb[1].name, 'NOV');
});

test('addScore retorna a posição (1-based)', () => {
  const s = mem();
  s.addScore({ name: 'AAA', score: 300, level: 1, date: '2026-07-24' });
  const pos = s.addScore({ name: 'BBB', score: 500, level: 2, date: '2026-07-24' });
  assert.equal(pos, 1);
});

test('qualifies: vazio aceita; cheio exige mais que o 10º; zero não qualifica', () => {
  const s = mem();
  assert.equal(s.qualifies(1), true);
  assert.equal(s.qualifies(0), false);
  for (let i = 1; i <= 10; i++) {
    s.addScore({ name: 'AAA', score: i * 100, level: 1, date: '2026-07-24' });
  }
  assert.equal(s.qualifies(100), false, 'empate com o 10º: existente ganha');
  assert.equal(s.qualifies(101), true);
});

test('iniciais: valida A-Z e normaliza minúsculas', () => {
  const s = mem();
  s.addScore({ name: 'kev', score: 100, level: 1, date: '2026-07-24' });
  assert.equal(s.getLeaderboard()[0].name, 'KEV');
  assert.throws(() => s.addScore({ name: 'K3V', score: 100, level: 1 }));
  assert.throws(() => s.addScore({ name: 'KEVI', score: 100, level: 1 }));
});

test('JSON corrompido no KV não quebra: volta vazio', () => {
  const kv = createMemoryKV();
  kv.set('zz_leaderboard', '{{{nope');
  const s = createStorage(kv);
  assert.deepEqual(s.getLeaderboard(), []);
  // e continua funcional
  s.addScore({ name: 'AAA', score: 100, level: 1, date: '2026-07-24' });
  assert.equal(s.getLeaderboard().length, 1);
});

test('prefs: defaults + roundtrip + merge com o que já existe', () => {
  const s = mem();
  const p = s.getPrefs();
  assert.equal(p.theme, 'tron');
  assert.equal(p.mute, false);
  assert.deepEqual(p.hintsSeen, []);
  s.setPref('theme', 'synthwave');
  s.setPref('hintsSeen', ['vault']);
  const p2 = s.getPrefs();
  assert.equal(p2.theme, 'synthwave');
  assert.deepEqual(p2.hintsSeen, ['vault']);
  assert.equal(p2.mute, false, 'demais defaults preservados');
});

test('createLocalStorageKV não lança fora do browser (retorna null ou KV válido)', () => {
  const kv = createLocalStorageKV();
  assert.ok(kv === null || (typeof kv.get === 'function' && typeof kv.set === 'function'));
});

test('createStorage sem argumentos cai no fallback e funciona', () => {
  const s = createStorage();
  assert.deepEqual(typeof s.qualifies(10), 'boolean');
});
