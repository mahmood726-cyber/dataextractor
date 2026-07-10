// tests/ci_separator_extraction.test.js
// ---------------------------------------------------------------------------
// Regression tests for two confidence-interval extraction defects on the main
// extract() -> contrast surface (V47Extractor, exposed via index.js). Added
// 2026-07-10.
//
//   F1  Comma-delimited CI bounds ("95% CI 0.65, 0.85" — the standard
//       NEJM/JAMA/Cochrane format) were silently dropped: the point estimate
//       was captured but ciLo/ciHi were null because the inter-bound separator
//       only accepted a dash/en-dash/"to". Fixed by adding a comma alternative
//       to the ratio-measure (HR/RR/risk-ratio/OR/rate-ratio) CI separators.
//       Only the dot-decimal engines (v4_7 / v4_8, parseFloat) get the comma
//       separator; LocalAI.js / the WebApp DELIBERATELY exclude it because they
//       support European decimal commas ("0,78" -> 0.78) where a comma is a
//       decimal point, not a separator.
//
//   F4  Reversed CI bounds (ciLo>ciHi, e.g. a "0.95-0.58" source typo) were
//       emitted verbatim, producing an invalid interval and a negative SE
//       half-width downstream. Fixed by normalizing to an ordered [lower,upper]
//       interval at the CI-assignment site, mirroring the WebApp surface.
//
// Each assertion below fails on the pre-fix code and passes after.
// Run standalone: node tests/ci_separator_extraction.test.js
'use strict';

const pkg = require('../index.js');

let pass = 0, fail = 0;
function ok(name, cond) {
    if (cond) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name); }
}
const approx = (a, b) => a !== undefined && a !== null && Math.abs(a - b) < 1e-9;
const ci = (t) => (pkg.extract(t).contrast || {});

function run() {
    console.log('\n=== CI separator / ordering regression tests (extract -> contrast) ===');

    // ---- F1: comma-delimited CI is captured for every ratio measure --------
    const hr = ci('hazard ratio 0.74 (95% CI 0.65, 0.85)');
    ok('HR comma-CI captures point + both bounds',
        approx(hr.effect, 0.74) && approx(hr.ciLo, 0.65) && approx(hr.ciHi, 0.85));
    const or = ci('odds ratio 2.5 (95% CI 1.2, 5.0)');
    ok('OR comma-CI captures point + both bounds',
        approx(or.effect, 2.5) && approx(or.ciLo, 1.2) && approx(or.ciHi, 5.0));
    const rr = ci('relative risk 0.80 (95% CI 0.70, 0.92)');
    ok('RR comma-CI captures point + both bounds',
        approx(rr.effect, 0.80) && approx(rr.ciLo, 0.70) && approx(rr.ciHi, 0.92));
    const rrisk = ci('risk ratio 0.72 (95% CI 0.58, 0.89)');
    ok('risk-ratio comma-CI captures point + both bounds',
        approx(rrisk.effect, 0.72) && approx(rrisk.ciLo, 0.58) && approx(rrisk.ciHi, 0.89));
    const br = ci('HR 0.79 [0.65, 0.95]');
    ok('HR bracket comma-CI captures both bounds',
        approx(br.effect, 0.79) && approx(br.ciLo, 0.65) && approx(br.ciHi, 0.95));

    // ---- F1 regression guard: dash / en-dash / "to" forms unchanged --------
    const dash = ci('hazard ratio 0.74 (95% CI 0.65-0.85)');
    ok('HR dash-CI still [0.65,0.85]',
        approx(dash.ciLo, 0.65) && approx(dash.ciHi, 0.85));
    const toForm = ci('hazard ratio 0.74 (95% CI 0.65 to 0.85)');
    ok('HR "to"-CI still [0.65,0.85]',
        approx(toForm.ciLo, 0.65) && approx(toForm.ciHi, 0.85));

    // ---- F4: reversed bounds are reordered ascending -----------------------
    const rev = ci('hazard ratio 0.74; 95% CI 0.95-0.58');
    ok('reversed CI bounds reordered to [0.58,0.95]',
        approx(rev.effect, 0.74) && approx(rev.ciLo, 0.58) && approx(rev.ciHi, 0.95));
    ok('reordered CI yields a non-negative half-width (valid SE)',
        rev.ciHi > rev.ciLo);

    return { pass, fail };
}

if (require.main === module) {
    const r = run();
    console.log('\n' + r.pass + ' passed, ' + r.fail + ' failed');
    process.exit(r.fail === 0 ? 0 : 1);
}

module.exports = { run };
