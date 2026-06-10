// tests/glp1_cvot_v48.test.js
// ---------------------------------------------------------------------------
// Regression tests for the GLP-1 RA CVOT extraction-bug fixes as applied to
// the MAIN engine (RCTExtractor_v4_8_AI.js, AIStrategies.extractPopulation).
// Added 2026-06-10.
//
// The v4_8 engine already imports the audited MedicalNER from LocalAI.js and
// its HR/RR/OR ratio patterns already reject a leading minus (so the negative-
// HR class was NOT present there). The two bug classes that DID reach this
// surface and are fixed/covered here:
//   (3) AGE: the "general" fallback matched the eligibility floor in
//       "patients aged 50 years or older" (the 'd' of 'aged' was consumed by
//       [^\d]) and reported 50 as the mean age. Now requires a true
//       mean/median/average qualifier and rejects an eligibility floor.
//   (4) ETHNICITY: the engine had no race/ethnicity capture; it now reuses
//       MedicalNER.extractEthnicity and returns categories or null.
//
// Published fixtures are the same verified values used across the CVOT suite.
// Run standalone: node tests/glp1_cvot_v48.test.js
'use strict';

const { AIStrategies } = require('../RCTExtractor_v4_8_AI.js');

let pass = 0, fail = 0;
function ok(name, cond) {
    if (cond) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name); }
}

function run() {
    console.log('\n=== GLP-1 CVOT extraction regression tests (v4_8 main engine) ===');

    const pop = (t) => AIStrategies.extractPopulation(t);

    // ---- AGE: true mean, never an eligibility floor ----------------------
    ok('SUSTAIN-6 mean age 64.6 (not min 50)',
        pop('Inclusion: patients aged 50 years or older. The mean age was 64.6 years.').ageMean === 64.6);
    ok('SOUL mean age 66.1 (not min 50)',
        pop('Patients aged 50 years or older were eligible. Mean age was 66.1 years.').ageMean === 66.1);
    ok('SELECT mean age 61.6',
        pop('Eligible adults were 45 years of age or older. The mean age was 61.6 years.').ageMean === 61.6);
    ok('min-age-only text -> ageMean null',
        pop('Patients aged 50 years or older were enrolled.').ageMean === null);
    ok('mean age European comma 61,6 -> 61.6',
        pop('The mean age was 61,6 years.').ageMean === 61.6);

    // ---- ETHNICITY: categories or null (reuses MedicalNER.extractEthnicity)
    const selEth = pop('Race was White 84%, Asian 8%, Black 4%, and other race 3%.').ethnicity;
    ok('SELECT ethnicity White 84', selEth && selEth.white === 84);
    ok('SELECT ethnicity Asian 8', selEth && selEth.asian === 8);
    ok('SELECT ethnicity Black 4', selEth && selEth.black === 4);
    const harEth = pop('Non-Hispanic White 69.7%, Hispanic 21.2%, Asian 4.8%, Black 2.4%.').ethnicity;
    ok('HARMONY ethnicity White 69.7 (not Hispanic)', harEth && harEth.white === 69.7);
    ok('HARMONY ethnicity Hispanic 21.2', harEth && harEth.hispanic === 21.2);
    ok('ethnicity not reported -> null',
        pop('Baseline demographics were balanced. Mean age was 60 years.').ethnicity === null);

    // ---- HR sign was already correct in this engine (guard against regression)
    const hr = AIStrategies.extractEffectMeasures('hazard ratio, 0.78; 95% CI, 0.68 to 0.90').hazardRatios;
    ok('v4_8 HR 0.78 accepted', hr.length > 0 && hr[0].value === 0.78);
    ok('v4_8 negative HR not captured',
        AIStrategies.extractEffectMeasures('hazard ratio -0.74').hazardRatios.length === 0);

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    return { pass, fail };
}

if (require.main === module) {
    const r = run();
    process.exit(r.fail === 0 ? 0 : 1);
}

module.exports = { run };
