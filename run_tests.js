// run_tests.js -- lightweight smoke tests (no external framework; the repo
// ships none). Added 2026-06-07 alongside the reconstructed qc/viz/lib modules.
// Exercises the recovered modules and the core extraction through the package
// entry so `npm test` works again and guards against regressions.
'use strict';

let pass = 0, fail = 0;
function ok(name, cond) {
    if (cond) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name); }
}

(async () => {
    const pkg = require('./index.js');

    // --- core extraction ---------------------------------------------------
    const text = 'In DAPA-HF, dapagliflozin reduced events (hazard ratio 0.74; ' +
        '95% CI 0.65-0.85; p<0.001). Dapagliflozin n=2373, placebo n=2371. Mean age 66 years.';
    const r = pkg.extract(text);
    ok('extract returns contrast.effect 0.74', r.contrast && Math.abs(r.contrast.effect - 0.74) < 1e-9);
    ok('extract returns control arm n', r.control && r.control.n === 2371);
    ok('getVersion is 5.1.0-AI-NMA-i18n', pkg.getVersion() === '5.1.0-AI-NMA-i18n');

    // --- qc ----------------------------------------------------------------
    const { QualityChecker, QCReportGenerator, CIValidator } = require('./qc');
    const good = { study: { acronym: 'DAPA-HF', totalN: 4744 }, contrast: { effect: 0.74, ciLo: 0.65, ciHi: 0.85, pValue: 0.001 }, treatment: { n: 2373 }, control: { n: 2371 }, baseline: { age: { mean: 66 }, male: 77 }, followup: { median: 18 }, _meta: { domain: 'HF' } };
    const qcGood = new QualityChecker({ domain: 'HF', preset: 'cochrane' }).check(good);
    ok('qc good result is valid grade A', qcGood.valid && qcGood.grade === 'A');
    const bad = { study: { acronym: 'X', totalN: 100 }, contrast: { effect: 5, ciLo: 0.5, ciHi: 0.9 }, treatment: { n: 9000 }, control: { n: 9000 }, _meta: { domain: 'HF' } };
    const qcBad = new QualityChecker({ domain: 'HF' }).check(bad);
    ok('qc catches estimate-outside-CI + impossible arms', qcBad.issueCount >= 2 && !qcBad.valid);
    ok('CIValidator flags lo>hi', new CIValidator().validate({ 'contrast.effect': 1, 'contrast.ciLo': 2, 'contrast.ciHi': 1 }).length >= 1);
    ok('QCReportGenerator emits HTML', new QCReportGenerator().generateHTML(qcGood).indexOf('<!doctype html>') === 0);
    ok('quickCheck shape', typeof pkg.quickQC(good, { domain: 'HF' }).grade === 'string');

    // --- viz ---------------------------------------------------------------
    const viz = require('./viz');
    ok('forestPlot is SVG', viz.forestPlot([{ label: 'A', effect: 0.8, ciLo: 0.7, ciHi: 0.9 }], { pooled: { effect: 0.78, ciLo: 0.72, ciHi: 0.84 } }).indexOf('<svg') === 0);
    ok('funnelPlot is SVG', viz.funnelPlot([{ effect: 0.8, se: 0.05 }, { effect: 0.7, se: 0.1 }]).indexOf('<svg') === 0);
    ok('robMatrix is SVG', viz.robMatrix([{ study: 'A', domains: { d1: 'low' }, overall: 'some' }]).indexOf('<svg') === 0);
    ok('gradeTable is HTML table', viz.gradeTable([{ outcome: 'death', studies: 5, participants: 9999, effect: 'HR 0.8', certainty: 'high' }]).indexOf('<table') === 0);
    ok('interactive report is HTML doc', viz.generateInteractiveReport({ studies: [{ label: 'A', effect: 0.8, ciLo: 0.7, ciHi: 0.9 }] }).indexOf('<!doctype') === 0);

    // --- lib ---------------------------------------------------------------
    const lib = require('./lib');
    const batch = await new lib.BatchProcessor({ concurrency: 2 }).process([1, 2, 3], async (x) => x * 10);
    ok('BatchProcessor runs concurrently', batch.results.map((x) => x.value).join(',') === '10,20,30' && batch.summary.failed === 0);
    const cache = new lib.MemoryCache();
    await cache.set('k', { v: 1 }, 1000);
    ok('MemoryCache get/set', (await cache.get('k')).v === 1);
    let calls = 0;
    const ce = lib.createCachedExtractor(async (t) => { calls++; return t.length; }, 'memory');
    await ce.extract('hi'); await ce.extract('hi');
    ok('CachedExtractor caches (1 underlying call)', calls === 1);
    const logger = lib.createAuditLogger();
    logger.info(lib.AUDIT_EVENT_TYPES.EXTRACTION, 'ok');
    ok('AuditLogger records', logger.entries().length === 1);

    // --- GLP-1 CVOT extraction regression suite ----------------------------
    // (HARMONY / SELECT / SUSTAIN-6 / SOUL) — tests/glp1_cvot_extraction.test.js
    const cvot = require('./tests/glp1_cvot_extraction.test.js').run();
    pass += cvot.pass;
    fail += cvot.fail;

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL', e && e.stack ? e.stack : e); process.exit(1); });
