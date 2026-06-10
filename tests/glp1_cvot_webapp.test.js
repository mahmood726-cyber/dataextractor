// tests/glp1_cvot_webapp.test.js
// ---------------------------------------------------------------------------
// Regression tests for the GLP-1 RA CVOT extraction-bug fixes as applied to
// the STANDALONE browser surface (RCTExtractor_WebApp.html). The HTML embeds
// its own extraction logic (it is an offline single-file page and cannot
// require() LocalAI.js), so the same corrections were mirrored inline. These
// tests load that inline extractor through tests/html_webapp_loader.js and
// assert the corrected values, with omitted values staying null.
//
// Every number is cross-checked against the published primary paper, using
// the SAME verified fixtures as tests/glp1_cvot_extraction.test.js:
//   - SUSTAIN-6 (NEJM 2016, NEJMoa1607141): MACE 108/1648 vs 146/1649,
//     HR 0.74 (95% CI 0.58-0.95); mean age ~64.6y.
//   - HARMONY OUTCOMES (Lancet 2018, S0140-6736(18)32261-X): MACE 338/4731
//     vs 428/4732, HR 0.78 (0.68-0.90); White 69.7% / Hispanic 21.2% /
//     Asian 4.8% / Black 2.4% (race recorded as "Non-Hispanic White ...").
//   - SELECT (NEJM 2023, NEJMoa2307563): MACE HR 0.80 (0.72-0.90); CV death
//     223/8803 (2.5%); mean age 61.6 +/- 8.9y; White 84% / Asian 8% / Black 4%.
//   - SOUL (NEJM 2025, NEJMoa2501006): MACE HR 0.86 (0.77-0.96); mean age
//     66.1y; White 69%; 1:1 randomisation; oral semaglutide 14 mg.
//
// Run standalone: node tests/glp1_cvot_webapp.test.js
'use strict';

const { loadWebAppExtractor } = require('./html_webapp_loader.js');

let pass = 0, fail = 0;
function ok(name, cond) {
    if (cond) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name); }
}
function approx(a, b) { return typeof a === 'number' && Math.abs(a - b) < 1e-9; }

function run() {
    console.log('\n=== GLP-1 CVOT extraction regression tests (WebApp HTML surface) ===');

    const { RCTExtractor } = loadWebAppExtractor();
    const firstHR = (text) => {
        const m = RCTExtractor.extractEffectMeasures(text);
        return (m.hazardRatios && m.hazardRatios[0]) || null;
    };

    // -----------------------------------------------------------------------
    // HAZARD RATIO must be a positive ratio; a mis-signed/negative value is
    // rejected (not recorded). (HARMONY "HR negative?".)
    // -----------------------------------------------------------------------
    ok('HR 0.74 accepted', approx(firstHR('hazard ratio 0.74') && firstHR('hazard ratio 0.74').value, 0.74));
    ok('HR -0.74 rejected (no ratio recorded)',
        RCTExtractor.extractEffectMeasures('hazard ratio -0.74').hazardRatios.length === 0);
    ok('HR European comma 0,78 -> 0.78',
        approx(firstHR('HR 0,78') && firstHR('HR 0,78').value, 0.78));

    // -----------------------------------------------------------------------
    // CONFIDENCE INTERVAL: "A-B" parses as [A, B]; tolerant of European comma;
    // bounds are ordered [lower, upper].
    // -----------------------------------------------------------------------
    const h1 = firstHR('hazard ratio 0.78; 95% CI 0.68-0.90');
    ok('HARMONY MACE HR 0.78 CI [0.68,0.90]', h1 && approx(h1.value, 0.78) && approx(h1.ciLo, 0.68) && approx(h1.ciHi, 0.90));
    const h2 = firstHR('hazard ratio 0,78; 95% CI 0,68 to 0,90');
    ok('CI European comma 0,68 to 0,90 -> [0.68,0.90]', h2 && approx(h2.ciLo, 0.68) && approx(h2.ciHi, 0.90));
    const h3 = firstHR('hazard ratio 0.74; 95% CI 0.95-0.58'); // reversed in source
    ok('CI reversed bounds reordered ascending', h3 && approx(h3.ciLo, 0.58) && approx(h3.ciHi, 0.95));

    // -----------------------------------------------------------------------
    // AGE: report a genuine MEAN age, never an eligibility minimum; capture a
    // true range; floor-only text yields no age.
    // -----------------------------------------------------------------------
    ok('SUSTAIN-6 mean age 64.6 (not min 50)',
        (RCTExtractor.extract('Inclusion: patients aged 50 years or older. The mean age was 64.6 years.').baseline.age || {}).mean === 64.6);
    ok('SOUL mean age 66.1 (not min 50)',
        (RCTExtractor.extract('Patients aged 50 years or older were eligible. Mean age was 66.1 years.').baseline.age || {}).mean === 66.1);
    ok('SELECT mean age 61.6 (with SD present)',
        (RCTExtractor.extract('Eligible adults were 45 years of age or older. The mean age was 61.6 ± 8.9 years.').baseline.age || {}).mean === 61.6);
    ok('min-age-only text -> no mean age',
        !RCTExtractor.extract('Patients aged 50 years or older were enrolled.').baseline.age ||
        RCTExtractor.extract('Patients aged 50 years or older were enrolled.').baseline.age.mean === undefined);
    const ar = RCTExtractor.extract('Ages ranged from 45 to 80 years.').baseline.age;
    ok('age range 45 to 80 -> [45,80]', ar && Array.isArray(ar.range) && ar.range[0] === 45 && ar.range[1] === 80);

    // -----------------------------------------------------------------------
    // ETHNICITY: capture the category breakdown, or null when not reported;
    // "Non-Hispanic White" is White, not Hispanic.
    // -----------------------------------------------------------------------
    const selEth = RCTExtractor.extract('Race was White 84%, Asian 8%, Black 4%, and other race 3%.').baseline.ethnicity;
    ok('SELECT ethnicity White 84', selEth && selEth.white === 84);
    ok('SELECT ethnicity Asian 8', selEth && selEth.asian === 8);
    ok('SELECT ethnicity Black 4', selEth && selEth.black === 4);
    const harEth = RCTExtractor.extract('Non-Hispanic White 69.7%, Hispanic 21.2%, Asian 4.8%, Black 2.4%.').baseline.ethnicity;
    ok('HARMONY ethnicity White 69.7 (not Hispanic)', harEth && harEth.white === 69.7);
    ok('HARMONY ethnicity Hispanic 21.2', harEth && harEth.hispanic === 21.2);
    ok('ethnicity not reported -> null',
        RCTExtractor.extract('Baseline demographics were balanced.').baseline.ethnicity === null);

    // -----------------------------------------------------------------------
    // EVENT COUNTS: extract only when the label is unambiguously matched;
    // preserve null for "not reported"; never map one measure's number onto
    // another. (SELECT 223 = CV deaths, NOT nonfatal MI.)
    // -----------------------------------------------------------------------
    const s6Text = 'In a 1:1 design, the primary composite outcome (MACE) occurred in 108 of 1648 patients (6.6%) ' +
        'in the semaglutide group and in 146 of 1649 (8.9%) in the placebo group (hazard ratio 0.74; 95% CI 0.58-0.95).';
    const s6Mace = RCTExtractor.extractEventCount(s6Text, 'MACE');
    ok('SUSTAIN-6 MACE events 108', s6Mace && s6Mace.events === 108);
    ok('SUSTAIN-6 MACE total 1648', s6Mace && s6Mace.total === 1648);

    const selText = 'Death from cardiovascular causes occurred in 223 of 8803 patients (2.5%) in the semaglutide group. ' +
        'Nonfatal myocardial infarction was not reported as a separate endpoint.';
    const selCvDeath = RCTExtractor.extractEventCount(selText, 'cardiovascular');
    ok('SELECT CV death events 223', selCvDeath && selCvDeath.events === 223);
    ok('SELECT nonfatal MI not reported -> null',
        RCTExtractor.extractEventCount(selText, 'nonfatal myocardial infarction') === null);
    ok('SELECT 223 not mis-mapped to MI',
        RCTExtractor.extractEventCount(selText, 'nonfatal MI') === null);

    // -----------------------------------------------------------------------
    // RANDOM-TOKEN REJECTION: "1:1" is an allocation ratio, not data; a drug
    // dose is not an age. (SOUL documented bug.)
    // -----------------------------------------------------------------------
    ok('1:1 recognised as randomization ratio', RCTExtractor.isRandomizationRatio('randomized in a 1:1 ratio') === true);
    ok('HR 0.74 not a randomization ratio', RCTExtractor.isRandomizationRatio('hazard ratio 0.74') === false);
    ok('1:1 not extracted as an age',
        !RCTExtractor.extract('Patients were randomized in a 1:1 ratio.').baseline.age ||
        RCTExtractor.extract('Patients were randomized in a 1:1 ratio.').baseline.age.mean === undefined);
    ok('drug dose not extracted as an age',
        !RCTExtractor.extract('Oral semaglutide 14 mg once daily.').baseline.age ||
        RCTExtractor.extract('Oral semaglutide 14 mg once daily.').baseline.age.mean === undefined);

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    return { pass, fail };
}

if (require.main === module) {
    const r = run();
    process.exit(r.fail === 0 ? 0 : 1);
}

module.exports = { run };
