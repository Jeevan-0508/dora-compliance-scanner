import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import Engine from '../docs/engine.js';
const model = JSON.parse(readFileSync(new URL('../data/requirements.json', import.meta.url), 'utf8'));
test('export carries source and self-report meaning without claiming legal validation', () => {
  const report = Engine.assessment(model, new Map(), '2026-09-30T00:00:00Z');
  assert.equal(report.schema_version, 'dora-self-assessment.v1');
  assert.equal(report.data_class, 'operator_self_report');
  assert.equal(report.framework.source_url, model.meta.source);
  assert.equal(report.legal_status, 'not_determined');
  assert.equal(report.chapters.flatMap((c) => c.requirements).length, 19);
  assert.ok(report.chapters.flatMap((c) => c.requirements).every((r) => r.status === 'unknown'));
});
test('invalid imported state is unknown rather than assessed', () => {
  const statuses = new Map(model.requirements.map((r) => [r.id, 'validated_by_ai']));
  assert.equal(Engine.assessment(model, statuses).evidence_completeness, 0);
});
