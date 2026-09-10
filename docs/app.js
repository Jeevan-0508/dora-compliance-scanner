'use strict';

const CLS = { present: 'p', partial: 'p2', absent: 'a', unknown: 'u' };
const STORE_KEY = 'dora-scanner-statuses-v1';
const EXAMPLE = {
  'DORA-05': 'present', 'DORA-06': 'present', 'DORA-08': 'partial', 'DORA-09': 'present',
  'DORA-10': 'partial', 'DORA-11': 'present', 'DORA-12': 'present', 'DORA-13': 'absent',
  'DORA-14': 'unknown', 'DORA-17': 'present', 'DORA-18': 'partial', 'DORA-19': 'unknown',
  'DORA-24': 'partial', 'DORA-25': 'present', 'DORA-26': 'absent', 'DORA-28': 'present',
  'DORA-29': 'partial', 'DORA-30': 'present', 'DORA-45': 'unknown'
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = id => document.getElementById(id);

let MODEL = null;
let statuses = new Map(); // requirement id -> status value
const STATUSES = Engine.STATUSES;

function fail(msg) {
  const e = $('err');
  e.textContent = msg;
  e.style.display = 'block';
}

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...statuses])); } catch (e) { /* storage unavailable, assessment still works in-memory */ }
}

function restore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) statuses = new Map(JSON.parse(raw));
  } catch (e) { /* corrupt or missing - start clean */ }
}

/* ---------- checklist ---------- */

function renderChecklist() {
  const chapters = Engine.chapterList(MODEL);
  let markedTotal = 0, reqTotal = 0;

  $('checklist').innerHTML = chapters.map(ch => {
    const s = Engine.scoreOf(ch.reqs, statuses);
    reqTotal += ch.reqs.length;
    markedTotal += ch.reqs.filter(r => Engine.statusOf(statuses, r.id) !== 'unknown').length;
    const pct = Math.round(s.coverage * 100);

    const rows = ch.reqs.map(r => {
      const v = Engine.statusOf(statuses, r.id);
      const examples = (r.evidence_examples || []).map(e => `<li>${esc(e)}</li>`).join('');
      return `<div class="ind">` +
        `<div><div class="sig"><span class="id">${esc(r.id)}</span> <b>${esc(r.article)}</b> ${esc(r.article_title)}</div>` +
        `<div class="meta">${esc(r.requirement)}</div>` +
        (examples ? `<details><summary>Evidence you could show</summary><ul>${examples}</ul></details>` : '') +
        `</div>` +
        `<div class="tri" data-key="${esc(r.id)}">` +
        STATUSES.map(st => `<button class="${CLS[st.v]}" data-v="${st.v}" aria-pressed="${v === st.v}">${esc(st.label)}</button>`).join('') +
        `</div></div>`;
    }).join('');

    return `<section class="res open" data-chapter="${esc(ch.id)}">` +
      `<div class="rh"><span class="id">Ch. ${esc(ch.id)}</span>` +
      `<span class="rn"><b>${esc(ch.title)}</b><span>${ch.reqs.length} requirement${ch.reqs.length === 1 ? '' : 's'}</span></span>` +
      `<span class="band ${s.band.key}">${esc(s.band.label)}</span>` +
      `<span class="gauge"><span class="track"><span class="fill" style="width:${pct}%"></span></span>` +
      `<span class="lbl"><span>coverage</span><b>${pct}%</b></span></span>` +
      `</div><div class="rb">${rows}</div></section>`;
  }).join('');

  $('progress').textContent = reqTotal ? `${markedTotal} of ${reqTotal} requirements assessed` : '';
}

function onTri(e) {
  const b = e.target.closest('.tri button');
  if (!b) return;
  const key = b.closest('.tri').dataset.key;
  if (b.dataset.v === 'unknown') statuses.delete(key); else statuses.set(key, b.dataset.v);
  persist();
  renderChecklist();
  renderSummary();
}

/* ---------- summary ---------- */

function renderSummary() {
  const all = MODEL.requirements;
  const overall = Engine.scoreOf(all, statuses);
  const pct = Math.round(overall.coverage * 100);

  const gaps = all.filter(r => {
    const v = Engine.statusOf(statuses, r.id);
    return v === 'absent' || v === 'unknown';
  }).sort((a, b) => a.chapter.localeCompare(b.chapter) || a.id.localeCompare(b.id));

  $('overall').innerHTML =
    `<span class="band ${overall.band.key}">${esc(overall.band.label)}</span>` +
    `<span class="gauge" style="width:220px"><span class="track"><span class="fill" style="width:${pct}%"></span></span>` +
    `<span class="lbl"><span>overall coverage</span><b>${pct}%</b></span>` +
    `<span class="lbl"><span>evidence complete</span><b>${Math.round(overall.completeness * 100)}%</b></span></span>`;

  $('gaps').innerHTML = gaps.length
    ? `<table><thead><tr><th>Requirement</th><th>Chapter</th><th>Status</th></tr></thead><tbody>` +
      gaps.map(r => `<tr><td class="sig">${esc(r.article)} ${esc(r.article_title)}<div class="ph">${esc(r.id)}</div></td>` +
        `<td>${esc(r.chapter)}</td><td>${esc(Engine.statusOf(statuses, r.id) === 'absent' ? 'Absent' : 'Unknown')}</td></tr>`).join('') +
      `</tbody></table>`
    : `<p class="empty">No open gaps &mdash; every requirement is marked Present or Partial.</p>`;
}

/* ---------- export ---------- */

function payload() {
  const chapters = Engine.chapterList(MODEL).map(ch => {
    const s = Engine.scoreOf(ch.reqs, statuses);
    return {
      chapter: ch.id, title: ch.title,
      coverage: Math.round(s.coverage * 100),
      requirements: ch.reqs.map(r => ({ id: r.id, article: r.article, title: r.article_title, status: Engine.statusOf(statuses, r.id) }))
    };
  });
  const overall = Engine.scoreOf(MODEL.requirements, statuses);
  return {
    generated: new Date().toISOString(),
    tool: 'DORA Compliance Scanner',
    framework: { name: MODEL.meta.framework, citation: MODEL.meta.citation, version: MODEL.meta.version },
    method: 'Coverage is the share of requirement weight marked Present or Partial. It is not a certification of DORA compliance and not legal advice.',
    overall_coverage: Math.round(overall.coverage * 100),
    evidence_completeness: Math.round(overall.completeness * 100),
    chapters
  };
}

function markdown() {
  const d = payload();
  const L = [];
  L.push('# DORA self-assessment', '');
  L.push(`Generated: ${d.generated}`);
  L.push(`Framework: ${d.framework.name} (${d.framework.citation})`, '');
  L.push(`> ${d.method}`, '');
  L.push(`**Overall coverage: ${d.overall_coverage}%** · evidence complete: ${d.evidence_completeness}%`, '');
  d.chapters.forEach(ch => {
    L.push(`## Chapter ${ch.chapter} — ${ch.title} (${ch.coverage}%)`, '');
    L.push('| Requirement | Article | Status |', '| --- | --- | --- |');
    ch.requirements.forEach(r => L.push(`| ${r.id} | ${r.article} ${r.title} | ${r.status} |`));
    L.push('');
  });
  L.push('---', '', 'Produced with the DORA Compliance Scanner (github.com/Jeevan-0508/dora-compliance-scanner).',
    'Requirement summaries are a plain-language reading of Regulation (EU) 2022/2554, Chapters II-VI. Not legal advice.');
  return L.join('\n');
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ---------- example / reset ---------- */

function loadExample() {
  statuses = new Map(Object.entries(EXAMPLE));
  persist();
  renderAll();
  $('step2').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function reset() {
  statuses = new Map();
  try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  renderAll();
}

function renderAll() { renderChecklist(); renderSummary(); }

/* ---------- boot ---------- */

fetch('requirements.json', { cache: 'no-cache' })
  .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(d => {
    if (!d || !Array.isArray(d.requirements) || !d.requirements.length) throw new Error('requirement model is empty');
    MODEL = d;
    restore();
    $('src').innerHTML = `Framework: <b>${esc(d.meta.framework)}</b> (${esc(d.meta.citation)}) · ` +
      `${d.meta.requirement_count} requirements across ${d.meta.chapters.length} chapters`;
    $('checklist').addEventListener('click', onTri);
    $('btn-example').addEventListener('click', loadExample);
    $('btn-reset').addEventListener('click', reset);
    $('btn-report').addEventListener('click', () => download('dora-self-assessment.md', markdown(), 'text/markdown;charset=utf-8'));
    $('btn-json').addEventListener('click', () => download('dora-self-assessment.json', JSON.stringify(payload(), null, 2), 'application/json'));
    renderAll();
  })
  .catch(e => fail('Could not load the requirement model (requirements.json): ' + e.message +
    '. If you are opening this file directly from disk, serve the folder over HTTP instead.'));
