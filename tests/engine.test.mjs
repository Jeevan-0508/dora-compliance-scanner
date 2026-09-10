// Pure-logic tests for docs/engine.js. No browser: this recomputes the exact
// coverage arithmetic the page shows and fails loudly if it drifts.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const Engine = (await import(path.join(ROOT, 'docs', 'engine.js'))).default
  ?? (await import(path.join(ROOT, 'docs', 'engine.js')));
const MODEL = JSON.parse(readFileSync(path.join(ROOT, 'data', 'requirements.json'), 'utf8'));

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('ok -', name);
}

test('model has 19 requirements across 5 chapters', () => {
  assert.equal(MODEL.requirements.length, 19);
  assert.equal(MODEL.meta.chapters.length, 5);
});

test('every requirement cites a distinct real article', () => {
  const articles = MODEL.requirements.map(r => r.article);
  assert.equal(new Set(articles).size, articles.length, 'article numbers must be unique');
  articles.forEach(a => assert.match(a, /^Art\. \d+$/));
});

test('an empty status map scores zero coverage everywhere', () => {
  const s = Engine.scoreOf(MODEL.requirements, new Map());
  assert.equal(s.coverage, 0);
  assert.equal(s.completeness, 0);
  assert.equal(s.band.key, 'none');
});

test('all-present scores 100% coverage and completeness', () => {
  const statuses = new Map(MODEL.requirements.map(r => [r.id, 'present']));
  const s = Engine.scoreOf(MODEL.requirements, statuses);
  assert.equal(s.coverage, 1);
  assert.equal(s.completeness, 1);
  assert.equal(s.band.key, 'strong');
});

test('partial counts as half weight, unknown and absent count as zero but both count as gaps', () => {
  const reqs = MODEL.requirements.slice(0, 4); // 4 requirements
  const statuses = new Map([
    [reqs[0].id, 'present'],
    [reqs[1].id, 'partial'],
    [reqs[2].id, 'absent'],
    [reqs[3].id, 'unknown']
  ]);
  const s = Engine.scoreOf(reqs, statuses);
  assert.equal(s.scored, 1.5); // 1 + 0.5 + 0 + 0
  assert.equal(s.coverage, 1.5 / 4);
  assert.equal(s.completeness, 3 / 4); // present, partial, absent are "assessed"; unknown is not
});

test('bandFor thresholds match the documented bands', () => {
  assert.equal(Engine.bandFor(0.90).key, 'strong');
  assert.equal(Engine.bandFor(0.85).key, 'strong');
  assert.equal(Engine.bandFor(0.60).key, 'substantial');
  assert.equal(Engine.bandFor(0.20).key, 'weak');
  assert.equal(Engine.bandFor(0.10).key, 'none');
});

test('chapterList partitions every requirement into exactly one chapter, none dropped', () => {
  const chapters = Engine.chapterList(MODEL);
  const total = chapters.reduce((n, c) => n + c.reqs.length, 0);
  assert.equal(total, MODEL.requirements.length);
  const ids = new Set(chapters.flatMap(c => c.reqs.map(r => r.id)));
  assert.equal(ids.size, MODEL.requirements.length);
});

console.log(`\n${passed} tests passed`);
