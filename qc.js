// qc.js -- Quality-Control module for RCTExtractor.
//
// RECONSTRUCTED 2026-06-07. The original ./qc was never committed and no source
// existed anywhere (repo, git history, portfolio, or the browser bundle). This
// is a NEW clean-room implementation written to the contract index.js consumes
// (new QualityChecker({domain,preset}).check(result)/.quickCheck(result);
// new QCReportGenerator(opts).generateHTML(qcResult); plus the validator classes
// and RuleManager). It mirrors the field/range and validity conventions used by
// RCTExtractor_v4_8_AI.js (its fieldRanges) and standard meta-analysis sanity
// checks (CI brackets the estimate, lo<hi, p-value vs CI direction, arm-size
// plausibility, completeness by domain). It is NOT the original lost module.
'use strict';

// Deep dot-path flatten (matches RCTExtractor_v4_7.flatten so we can look up
// nested fields by 'contrast.effect', 'treatment.n', 'baseline.age.mean', ...).
function flatten(obj, prefix, out) {
    out = out || {};
    prefix = prefix || '';
    if (obj === null || typeof obj !== 'object') return out;
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        const path = prefix ? prefix + '.' + key : key;
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            flatten(val, path, out);
        } else {
            out[path] = val;
        }
    }
    return out;
}

// Plausibility ranges, aligned with RCTExtractor_v4_8_AI.js::fieldRanges.
const FIELD_RANGES = {
    'contrast.effect': { min: 0.1, max: 10, type: 'ratio', label: 'effect estimate' },
    'contrast.ciLo': { min: 0.01, max: 5, type: 'ratio', label: 'CI lower' },
    'contrast.ciHi': { min: 0.1, max: 20, type: 'ratio', label: 'CI upper' },
    'treatment.n': { min: 1, max: 100000, type: 'integer', label: 'treatment arm N' },
    'control.n': { min: 1, max: 100000, type: 'integer', label: 'control arm N' },
    'baseline.age.mean': { min: 18, max: 100, type: 'continuous', label: 'mean age' },
    'baseline.male': { min: 0, max: 100, type: 'percentage', label: '% male' },
    'followup.median': { min: 0.1, max: 120, type: 'months', label: 'median follow-up' },
    'contrast.pValue': { min: 0, max: 1, type: 'pvalue', label: 'p-value' },
};

// Required / important fields per domain (completeness). Conservative defaults.
const DOMAIN_FIELDS = {
    DEFAULT: {
        required: ['study.acronym', 'contrast.effect', 'treatment.n', 'control.n'],
        important: ['contrast.ciLo', 'contrast.ciHi', 'baseline.age.mean', 'followup.median'],
    },
};
['HF', 'AF', 'DM', 'ONCOLOGY', 'CKD', 'STROKE'].forEach(function (d) {
    DOMAIN_FIELDS[d] = DOMAIN_FIELDS.DEFAULT;
});

// Presets tune how strict scoring is.
const PRESETS = {
    lenient: { requiredWeight: 8, importantWeight: 3, failOnRange: false, passScore: 50 },
    strict: { requiredWeight: 12, importantWeight: 5, failOnRange: true, passScore: 80 },
    cochrane: { requiredWeight: 12, importantWeight: 5, failOnRange: true, passScore: 75 },
    regulatory: { requiredWeight: 15, importantWeight: 6, failOnRange: true, passScore: 85 },
    default: { requiredWeight: 10, importantWeight: 4, failOnRange: false, passScore: 70 },
};

class RuleManager {
    constructor(preset) {
        this.presetName = (preset && PRESETS[preset]) ? preset : 'default';
        this.rules = Object.assign({}, PRESETS[this.presetName]);
    }
    get(name) { return this.rules[name]; }
    static listPresets() { return Object.keys(PRESETS); }
}

class NumericValidator {
    // Returns array of {field, level, message, value}.
    validate(flat) {
        const issues = [];
        for (const field of Object.keys(FIELD_RANGES)) {
            const r = FIELD_RANGES[field];
            const v = flat[field];
            if (v === undefined || v === null || v === '') continue;
            const num = Number(v);
            if (!isFinite(num)) {
                issues.push({ field, level: 'warning', message: r.label + ' is not numeric: ' + v, value: v });
                continue;
            }
            if (r.type === 'integer' && !Number.isInteger(num)) {
                issues.push({ field, level: 'warning', message: r.label + ' should be an integer: ' + num, value: num });
            }
            if (num < r.min || num > r.max) {
                issues.push({ field, level: 'error', message: r.label + ' out of plausible range [' + r.min + ', ' + r.max + ']: ' + num, value: num });
            }
        }
        return issues;
    }
}

class CIValidator {
    validate(flat) {
        const issues = [];
        const est = Number(flat['contrast.effect']);
        const lo = Number(flat['contrast.ciLo']);
        const hi = Number(flat['contrast.ciHi']);
        const p = flat['contrast.pValue'] != null ? Number(flat['contrast.pValue']) : null;
        const haveCI = isFinite(lo) && isFinite(hi);
        if (haveCI && lo > hi) {
            issues.push({ field: 'contrast.ci', level: 'error', message: 'CI lower (' + lo + ') exceeds CI upper (' + hi + ')' });
        }
        if (isFinite(est) && haveCI && (est < Math.min(lo, hi) || est > Math.max(lo, hi))) {
            issues.push({ field: 'contrast.effect', level: 'error', message: 'point estimate (' + est + ') lies outside its CI [' + lo + ', ' + hi + ']' });
        }
        // For a ratio measure, CI excluding 1 should agree with p<0.05 (and vice versa).
        if (isFinite(est) && haveCI && p != null && isFinite(p)) {
            const ciExcludesNull = Math.min(lo, hi) > 1 || Math.max(lo, hi) < 1;
            const sig = p < 0.05;
            if (ciExcludesNull !== sig) {
                issues.push({ field: 'contrast', level: 'warning', message: 'CI/p-value disagree: CI ' + (ciExcludesNull ? 'excludes' : 'includes') + ' 1 but p=' + p });
            }
        }
        return issues;
    }
}

class ConsistencyValidator {
    validate(flat, result) {
        const issues = [];
        const tn = Number(flat['treatment.n']);
        const cn = Number(flat['control.n']);
        const total = Number(flat['study.totalN'] != null ? flat['study.totalN'] : flat['population.total']);
        if (isFinite(tn) && isFinite(cn) && isFinite(total) && total > 0) {
            const sum = tn + cn;
            // arm sizes should not exceed total, and (for 2-arm) sum ~ total within 20%.
            if (sum > total * 1.02) {
                issues.push({ field: 'population', level: 'error', message: 'arm sizes (' + tn + '+' + cn + '=' + sum + ') exceed total N (' + total + ')' });
            } else if (Math.abs(sum - total) / total > 0.2) {
                issues.push({ field: 'population', level: 'warning', message: 'arm sizes sum (' + sum + ') differ from total N (' + total + ') by >20%' });
            }
        }
        const male = Number(flat['baseline.male']);
        if (isFinite(male) && (male < 0 || male > 100)) {
            issues.push({ field: 'baseline.male', level: 'error', message: '% male outside 0-100: ' + male });
        }
        return issues;
    }
}

class CompletenessValidator {
    validate(flat, domain) {
        const spec = DOMAIN_FIELDS[domain] || DOMAIN_FIELDS.DEFAULT;
        const has = function (f) { return flat[f] !== undefined && flat[f] !== null && flat[f] !== ''; };
        const missingRequired = spec.required.filter(function (f) { return !has(f); });
        const missingImportant = spec.important.filter(function (f) { return !has(f); });
        const issues = [];
        missingRequired.forEach(function (f) {
            issues.push({ field: f, level: 'error', message: 'required field missing: ' + f });
        });
        missingImportant.forEach(function (f) {
            issues.push({ field: f, level: 'warning', message: 'important field missing: ' + f });
        });
        return {
            issues,
            requiredTotal: spec.required.length,
            requiredFound: spec.required.length - missingRequired.length,
            importantTotal: spec.important.length,
            importantFound: spec.important.length - missingImportant.length,
        };
    }
}

function gradeFromScore(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 50) return 'D';
    return 'F';
}

class QualityChecker {
    constructor(options) {
        options = options || {};
        this.domain = options.domain || 'DEFAULT';
        this.rules = new RuleManager(options.preset);
        this.numeric = new NumericValidator();
        this.ci = new CIValidator();
        this.consistency = new ConsistencyValidator();
        this.completeness = new CompletenessValidator();
    }

    check(result) {
        const flat = flatten(result || {});
        const numericIssues = this.numeric.validate(flat);
        const ciIssues = this.ci.validate(flat);
        const consistencyIssues = this.consistency.validate(flat, result);
        const comp = this.completeness.validate(flat, this.domain);

        const allIssues = numericIssues.concat(ciIssues, consistencyIssues, comp.issues);
        const errors = allIssues.filter(function (i) { return i.level === 'error'; });
        const warnings = allIssues.filter(function (i) { return i.level === 'warning'; });

        const rw = this.rules.get('requiredWeight');
        const iw = this.rules.get('importantWeight');
        let score = 100;
        score -= (comp.requiredTotal - comp.requiredFound) * rw;
        score -= (comp.importantTotal - comp.importantFound) * iw;
        score -= errors.length * 8;
        score -= warnings.length * 2;
        score = Math.max(0, Math.min(100, Math.round(score)));

        const passScore = this.rules.get('passScore');
        const valid = errors.length === 0 && score >= passScore;

        return {
            score,
            grade: gradeFromScore(score),
            valid,
            domain: this.domain,
            preset: this.rules.presetName,
            passScore,
            completeness: {
                requiredFound: comp.requiredFound,
                requiredTotal: comp.requiredTotal,
                importantFound: comp.importantFound,
                importantTotal: comp.importantTotal,
            },
            issues: errors,
            warnings,
            issueCount: errors.length,
            warningCount: warnings.length,
        };
    }

    quickCheck(result) {
        const full = this.check(result);
        return {
            score: full.score,
            grade: full.grade,
            valid: full.valid,
            issueCount: full.issueCount,
            warningCount: full.warningCount,
        };
    }
}

function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

class QCReportGenerator {
    constructor(options) {
        this.options = options || {};
    }
    generateHTML(qcResult) {
        const o = this.options;
        const title = esc(o.title || 'RCTExtractor Quality-Control Report');
        const rows = function (arr, cls) {
            if (!arr || !arr.length) return '<li class="ok">none</li>';
            return arr.map(function (i) {
                return '<li class="' + cls + '"><code>' + esc(i.field) + '</code> ' + esc(i.message) + '</li>';
            }).join('');
        };
        const q = qcResult || {};
        return '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title>' +
            '<style>body{font:14px system-ui;margin:2rem;max-width:880px}' +
            '.grade{font-size:2.5rem;font-weight:700}.A,.B{color:#1a7f37}.C{color:#9a6700}.D,.F{color:#cf222e}' +
            'code{background:#f6f8fa;padding:1px 4px;border-radius:3px}li.error{color:#cf222e}li.warning{color:#9a6700}li.ok{color:#1a7f37}' +
            'table{border-collapse:collapse}td,th{border:1px solid #d0d7de;padding:4px 8px}</style></head><body>' +
            '<h1>' + title + '</h1>' +
            '<p class="grade ' + esc(q.grade) + '">' + esc(q.grade) + ' &middot; ' + esc(q.score) + '/100</p>' +
            '<table><tr><th>Valid</th><td>' + (q.valid ? 'yes' : 'no') + '</td></tr>' +
            '<tr><th>Domain</th><td>' + esc(q.domain) + '</td></tr>' +
            '<tr><th>Preset</th><td>' + esc(q.preset) + '</td></tr>' +
            '<tr><th>Required fields</th><td>' + esc(q.completeness && q.completeness.requiredFound) + '/' + esc(q.completeness && q.completeness.requiredTotal) + '</td></tr>' +
            '<tr><th>Errors</th><td>' + esc(q.issueCount) + '</td></tr>' +
            '<tr><th>Warnings</th><td>' + esc(q.warningCount) + '</td></tr></table>' +
            '<h2>Errors</h2><ul>' + rows(q.issues, 'error') + '</ul>' +
            '<h2>Warnings</h2><ul>' + rows(q.warnings, 'warning') + '</ul>' +
            '</body></html>';
    }
    generateJSON(qcResult) { return JSON.stringify(qcResult, null, 2); }
}

module.exports = {
    QualityChecker,
    QCReportGenerator,
    RuleManager,
    NumericValidator,
    CIValidator,
    ConsistencyValidator,
    CompletenessValidator,
    FIELD_RANGES,
    flatten,
};
