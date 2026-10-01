/* DORA Compliance Scanner - scoring engine.
   Pure functions over the requirement model and a status map. No DOM, no fetch, no randomness:
   every number the page shows is derived here and can be recomputed independently (see tests/). */
(function (root) {
  'use strict';

  var STATUSES = [
    { v: 'present', label: 'Present', weight: 1 },
    { v: 'partial', label: 'Partial', weight: 0.5 },
    { v: 'absent',  label: 'Absent',  weight: 0 },
    { v: 'unknown', label: 'Unknown', weight: 0 }
  ];
  var BANDS = [
    { min: 0.85, key: 'strong',      label: 'Strong coverage' },
    { min: 0.50, key: 'substantial', label: 'Partial coverage' },
    { min: 0.15, key: 'weak',        label: 'Early-stage coverage' },
    { min: 0,    key: 'none',        label: 'Minimal coverage' }
  ];

  function bandFor(coverage) {
    for (var i = 0; i < BANDS.length; i++) if (coverage >= BANDS[i].min) return BANDS[i];
    return BANDS[BANDS.length - 1];
  }

  function statusOf(statuses, id) {
    var value = statuses && statuses.get(id);
    return STATUSES.some(function (status) { return status.v === value; }) ? value : 'unknown';
  }

  function weightOf(statuses, id) {
    var v = statusOf(statuses, id);
    for (var i = 0; i < STATUSES.length; i++) if (STATUSES[i].v === v) return STATUSES[i].weight;
    return 0;
  }

  function scoreOf(reqs, statuses) {
    var total = reqs.length;
    var scored = 0, assessed = 0;
    for (var i = 0; i < reqs.length; i++) {
      scored += weightOf(statuses, reqs[i].id);
      if (statusOf(statuses, reqs[i].id) !== 'unknown') assessed++;
    }
    var coverage = total ? scored / total : 0;
    return {
      total: total, scored: scored, coverage: coverage,
      completeness: total ? assessed / total : 0,
      band: bandFor(coverage)
    };
  }

  function chapterList(model) {
    return model.meta.chapters.map(function (c) {
      return {
        id: c.id, title: c.title,
        reqs: model.requirements.filter(function (r) { return r.chapter === c.id; })
      };
    });
  }

  function assessment(model, statuses, generated) {
    var overall = scoreOf(model.requirements, statuses);
    return {
      schema_version: 'dora-self-assessment.v1', generated: generated || new Date().toISOString(),
      tool: 'DORA Compliance Scanner', data_class: 'operator_self_report',
      review_status: 'unreviewed', legal_status: 'not_determined',
      framework: { name: model.meta.framework, citation: model.meta.citation, version: model.meta.version,
        source_url: model.meta.source, content_updated: model.meta.updated,
        text_kind: 'curated_interpretation', currency: 'not_checked_at_export' },
      method: 'Coverage is the share of requirement weight marked Present or Partial by the operator. Statuses are unverified self-reports. It is not a certification of DORA compliance and not legal advice.',
      overall_coverage: Math.round(overall.coverage * 100),
      evidence_completeness: Math.round(overall.completeness * 100),
      chapters: chapterList(model).map(function (ch) {
        return { chapter: ch.id, title: ch.title, coverage: Math.round(scoreOf(ch.reqs, statuses).coverage * 100),
          requirements: ch.reqs.map(function (r) {
            return { id: r.id, article: r.article, title: r.article_title,
              status: statusOf(statuses, r.id), assertion_kind: 'operator_self_report',
              source_url: model.meta.source, text_kind: 'curated_interpretation' };
          }) };
      })
    };
  }

  var Engine = { STATUSES: STATUSES, BANDS: BANDS, bandFor: bandFor, statusOf: statusOf, weightOf: weightOf, scoreOf: scoreOf, chapterList: chapterList, assessment: assessment };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
