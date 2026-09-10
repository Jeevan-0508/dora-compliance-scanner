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
    return (statuses && statuses.get(id)) || 'unknown';
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

  var Engine = { STATUSES: STATUSES, BANDS: BANDS, bandFor: bandFor, statusOf: statusOf, weightOf: weightOf, scoreOf: scoreOf, chapterList: chapterList };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
