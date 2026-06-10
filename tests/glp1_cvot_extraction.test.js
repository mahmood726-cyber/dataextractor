// tests/glp1_cvot_extraction.test.js
// ---------------------------------------------------------------------------
// Regression tests for the GLP-1 receptor-agonist CVOT extraction-bug fixes
// (HARMONY OUTCOMES, SELECT, SUSTAIN-6, SOUL). Added 2026-06-10.
//
// Each fixture is a short excerpt of the trial's reported text and asserts the
// CORRECTLY extracted value. Every number is cross-checked against the
// published primary paper (sources in comments). Where a paper does NOT report
// a value, the test asserts the extractor returns null ("not reported") rather
// than substituting a nearby number.
//
// Run standalone: node tests/glp1_cvot_extraction.test.js
// Also invoked by run_tests.js so `npm test` exercises it.
'use strict';

const { MedicalNER } = require('../LocalAI.js');

let pass = 0, fail = 0;
function ok(name, cond) {
    if (cond) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name); }
}
function eqArr(a, b) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
        a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
}

function run() {
    console.log('\n=== GLP-1 CVOT extraction regression tests ===');

    // ---------------------------------------------------------------------
    // CONFIDENCE INTERVAL: "A-B" must parse as [A, B], not "A" and "-B".
    // (SELECT documented bug.) Robust to en-dash and European decimal comma.
    // ---------------------------------------------------------------------
    ok('CI 0.58-0.95 -> [0.58, 0.95]', eqArr(MedicalNER.parseCI('95% CI 0.58-0.95'), [0.58, 0.95]));
    ok('CI 0.72 to 0.90 -> [0.72, 0.90]', eqArr(MedicalNER.parseCI('95% CI 0.72 to 0.90'), [0.72, 0.90]));
    ok('CI en-dash 0.71–1.01 -> [0.71, 1.01]', eqArr(MedicalNER.parseCI('95% CI 0.71–1.01'), [0.71, 1.01]));
    ok('CI European comma 0,77 to 0,96 -> [0.77, 0.96]', eqArr(MedicalNER.parseCI('95% CI 0,77 to 0,96'), [0.77, 0.96]));
    ok('CI absent -> null', MedicalNER.parseCI('no interval reported') === null);

    // ---------------------------------------------------------------------
    // HAZARD RATIO must be a positive ratio; a mis-signed/negative value is
    // rejected. (HARMONY "Unclear what the HR means here (negative?)".)
    // ---------------------------------------------------------------------
    ok('HR 0.74 accepted', MedicalNER.parseHazardRatio('hazard ratio 0.74') === 0.74);
    ok('HR -0.74 rejected (null)', MedicalNER.parseHazardRatio('hazard ratio -0.74') === null);
    ok('HR European comma 0,78', MedicalNER.parseHazardRatio('HR 0,78') === 0.78);

    // ---------------------------------------------------------------------
    // AGE: report a genuine MEAN age or RANGE, never an eligibility minimum.
    // ---------------------------------------------------------------------
    // SUSTAIN-6: mean age ~64.6y (NEJM 2016; NEJMoa1607141). Min age was the
    // trap ("aged 50 years or older" in inclusion criteria).
    ok('SUSTAIN-6 mean age 64.6 (not min 50)',
        (MedicalNER.extractAge('Inclusion: patients aged 50 years or older. The mean age was 64.6 years.') || {}).mean === 64.6);
    // SOUL: mean age 66.1y (NEJM 2025; NEJMoa2501006). Eligibility >= 50y.
    ok('SOUL mean age 66.1 (not min 50)',
        (MedicalNER.extractAge('Patients aged 50 years or older were eligible. Mean age was 66.1 years.') || {}).mean === 66.1);
    // SELECT: mean age 61.6 +/- 8.9y (NEJM 2023; NEJMoa2307563). Eligibility >= 45y.
    ok('SELECT mean age 61.6 with SD present',
        (MedicalNER.extractAge('Eligible adults were 45 years of age or older. The mean age was 61.6 ± 8.9 years.') || {}).mean === 61.6);
    // Eligibility floor ALONE must not be reported as the age.
    ok('min-age-only text -> null age', MedicalNER.extractAge('Patients aged 50 years or older were enrolled.') === null);
    // True range is captured when reported.
    ok('age range 45 to 80 -> [45, 80]', eqArr((MedicalNER.extractAge('Ages ranged from 45 to 80 years.') || {}).range, [45, 80]));

    // ---------------------------------------------------------------------
    // ETHNICITY: capture the category breakdown, or null when not reported.
    // ---------------------------------------------------------------------
    // SELECT baseline race (NEJM 2023): White 84%, Asian 8%, Black 4%, Other 3%.
    const selEth = MedicalNER.extractEthnicity('Race was White 84%, Asian 8%, Black 4%, and other race 3%.');
    ok('SELECT ethnicity White 84', selEth && selEth.white === 84);
    ok('SELECT ethnicity Asian 8', selEth && selEth.asian === 8);
    ok('SELECT ethnicity Black 4', selEth && selEth.black === 4);
    // HARMONY (Lancet 2018): Non-Hispanic White 69.7% must NOT be read as Hispanic.
    const harEth = MedicalNER.extractEthnicity('Non-Hispanic White 69.7%, Hispanic 21.2%, Asian 4.8%, Black 2.4%.');
    ok('HARMONY ethnicity White 69.7 (not Hispanic)', harEth && harEth.white === 69.7);
    ok('HARMONY ethnicity Hispanic 21.2', harEth && harEth.hispanic === 21.2);
    // Not reported -> null (no categories invented).
    ok('ethnicity not reported -> null', MedicalNER.extractEthnicity('Baseline demographics were balanced.') === null);

    // ---------------------------------------------------------------------
    // EVENT COUNTS: pick the value only when its label is unambiguously
    // matched; preserve null for "not reported"; respect negation; never map
    // one measure's number onto another.
    // ---------------------------------------------------------------------
    // SUSTAIN-6 primary MACE: semaglutide 108/1648, placebo 146/1649
    // (NEJM 2016; NEJMoa1607141, HR 0.74, 95% CI 0.58-0.95). The parser must
    // pick the correctly-labelled MACE instance.
    const s6Text = 'In a 1:1 design, the primary composite outcome (MACE) occurred in 108 of 1648 patients (6.6%) ' +
        'in the semaglutide group and in 146 of 1649 (8.9%) in the placebo group (hazard ratio 0.74; 95% CI 0.58-0.95).';
    const s6Mace = MedicalNER.extractEventCount(s6Text, 'MACE');
    ok('SUSTAIN-6 MACE events 108', s6Mace && s6Mace.events === 108);
    ok('SUSTAIN-6 MACE total 1648', s6Mace && s6Mace.total === 1648);
    ok('SUSTAIN-6 MACE HR 0.74', MedicalNER.parseHazardRatio(s6Text) === 0.74);

    // SELECT: 223 is the number of CARDIOVASCULAR DEATHS in the semaglutide
    // group (NEJM 2023; 223/8803, 2.5%). It must NOT be mis-mapped to nonfatal
    // MI, which was not reported as a standalone count in the primary paper.
    const selText = 'Death from cardiovascular causes occurred in 223 of 8803 patients (2.5%) in the semaglutide group. ' +
        'Nonfatal myocardial infarction was not reported as a separate endpoint.';
    const selCvDeath = MedicalNER.extractEventCount(selText, 'cardiovascular');
    ok('SELECT CV death events 223', selCvDeath && selCvDeath.events === 223);
    ok('SELECT nonfatal MI not reported -> null',
        MedicalNER.extractEventCount(selText, 'nonfatal myocardial infarction') === null);
    // The 223 must NOT bleed into a nonfatal-MI query.
    ok('SELECT 223 not mis-mapped to MI', MedicalNER.extractEventCount(selText, 'nonfatal MI') === null);

    // HARMONY OUTCOMES (Lancet 2018; PIIS0140-6736(18)32261-X):
    //   MACE: albiglutide 338/4731 (7%), placebo 428/4732 (9%), HR 0.78.
    //   All-cause death: 196/4731 (4.1%) vs 205/4732 (4.3%), HR 0.95.
    const harText = 'The primary outcome occurred in 338 of 4731 patients in the albiglutide group and ' +
        '428 of 4732 in the placebo group (hazard ratio 0.78; 95% CI 0.68-0.90).';
    ok('HARMONY MACE HR 0.78', MedicalNER.parseHazardRatio(harText) === 0.78);
    ok('HARMONY MACE CI [0.68,0.90]', eqArr(MedicalNER.parseCI(harText), [0.68, 0.90]));

    // ---------------------------------------------------------------------
    // RANDOM-TOKEN REJECTION: "1:1" allocation ratio and a drug dose must not
    // be treated as clinical data. (SOUL documented bug.)
    // ---------------------------------------------------------------------
    ok('1:1 recognised as randomization ratio', MedicalNER.isRandomizationRatio('randomized in a 1:1 ratio') === true);
    ok('HR 0.74 not a randomization ratio', MedicalNER.isRandomizationRatio('hazard ratio 0.74') === false);
    ok('1:1 not extracted as an age', MedicalNER.extractAge('Patients were randomized in a 1:1 ratio.') === null);
    ok('drug dose not extracted as an age', MedicalNER.extractAge('Oral semaglutide 14 mg once daily.') === null);

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    return { pass, fail };
}

if (require.main === module) {
    const r = run();
    process.exit(r.fail === 0 ? 0 : 1);
}

module.exports = { run };
