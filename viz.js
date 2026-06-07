// viz.js -- Visualization module for RCTExtractor (dependency-free SVG/HTML).
//
// RECONSTRUCTED 2026-06-07. The original ./viz was never committed and had no
// recoverable source. This is a NEW clean-room implementation to the contract
// index.js exports (forestPlot, funnelPlot, robMatrix, robSummary, gradeTable,
// generateAllVisualizations, generateInteractiveReport). Plots are emitted as
// self-contained SVG/HTML strings (no DOM, no external libs). It is NOT the
// original lost module.
'use strict';

function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function num(x) { const n = Number(x); return isFinite(n) ? n : null; }

// --- Forest plot -----------------------------------------------------------
// studies: [{label, effect, ciLo, ciHi, weight?}]. Ratio measures plotted on a
// log x-axis with a null line at 1. Optional pooled: {effect, ciLo, ciHi, label}.
function forestPlot(studies, options) {
    options = options || {};
    studies = (studies || []).filter(function (s) { return num(s.effect) != null; });
    const W = options.width || 720;
    const rowH = 26;
    const top = 40, left = 250, right = 40;
    const plotW = W - left - right;
    const H = top + (studies.length + (options.pooled ? 2 : 1)) * rowH + 30;
    const log = options.scale !== 'linear';
    const all = [];
    studies.forEach(function (s) { [s.effect, s.ciLo, s.ciHi].forEach(function (v) { if (num(v) != null) all.push(num(v)); }); });
    if (options.pooled) { [options.pooled.effect, options.pooled.ciLo, options.pooled.ciHi].forEach(function (v) { if (num(v) != null) all.push(num(v)); }); }
    let lo = Math.min.apply(null, all.concat(log ? [1] : [0]));
    let hi = Math.max.apply(null, all.concat(log ? [1] : [0]));
    if (log) { lo = Math.max(lo, 0.01); }
    const t = function (v) {
        const a = log ? Math.log(Math.max(v, 0.01)) : v;
        const L = log ? Math.log(lo) : lo;
        const Hh = log ? Math.log(hi) : hi;
        return left + (Hh === L ? plotW / 2 : (a - L) / (Hh - L) * plotW);
    };
    const parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" font-family="system-ui,sans-serif" font-size="12">');
    parts.push('<text x="10" y="22" font-weight="700">' + esc(options.title || 'Forest plot') + '</text>');
    // null line
    const nullX = t(log ? 1 : 0);
    parts.push('<line x1="' + nullX + '" y1="' + top + '" x2="' + nullX + '" y2="' + (H - 30) + '" stroke="#999" stroke-dasharray="3,3"/>');
    let y = top + rowH;
    studies.forEach(function (s) {
        const e = num(s.effect), clo = num(s.ciLo), chi = num(s.ciHi);
        parts.push('<text x="10" y="' + (y + 4) + '">' + esc(s.label || '') + '</text>');
        if (clo != null && chi != null) {
            parts.push('<line x1="' + t(clo) + '" y1="' + y + '" x2="' + t(chi) + '" y2="' + y + '" stroke="#333"/>');
        }
        const box = Math.max(3, Math.min(9, 3 + (num(s.weight) || 0) / 12));
        parts.push('<rect x="' + (t(e) - box) + '" y="' + (y - box) + '" width="' + (2 * box) + '" height="' + (2 * box) + '" fill="#2563eb"/>');
        parts.push('<text x="' + (W - right) + '" y="' + (y + 4) + '" text-anchor="end">' + e.toFixed(2) +
            (clo != null && chi != null ? ' (' + clo.toFixed(2) + '-' + chi.toFixed(2) + ')' : '') + '</text>');
        y += rowH;
    });
    if (options.pooled && num(options.pooled.effect) != null) {
        const p = options.pooled, e = num(p.effect), clo = num(p.ciLo), chi = num(p.ciHi);
        const cx = t(e), cyl = (clo != null ? t(clo) : cx), cyh = (chi != null ? t(chi) : cx);
        parts.push('<polygon points="' + cx + ',' + (y - 8) + ' ' + cyh + ',' + y + ' ' + cx + ',' + (y + 8) + ' ' + cyl + ',' + y + '" fill="#cf222e"/>');
        parts.push('<text x="10" y="' + (y + 4) + '" font-weight="700">' + esc(p.label || 'Pooled') + '</text>');
    }
    // axis
    parts.push('<line x1="' + left + '" y1="' + (H - 28) + '" x2="' + (W - right) + '" y2="' + (H - 28) + '" stroke="#333"/>');
    parts.push('<text x="' + left + '" y="' + (H - 12) + '">' + lo.toFixed(2) + '</text>');
    parts.push('<text x="' + (W - right) + '" y="' + (H - 12) + '" text-anchor="end">' + hi.toFixed(2) + '</text>');
    parts.push('</svg>');
    return parts.join('');
}

// --- Funnel plot -----------------------------------------------------------
// studies: [{effect, se}]. y-axis = SE inverted (precise studies on top).
function funnelPlot(studies, options) {
    options = options || {};
    studies = (studies || []).filter(function (s) { return num(s.effect) != null && num(s.se) != null; });
    const W = options.width || 520, H = options.height || 420;
    const pad = 50;
    const effs = studies.map(function (s) { return num(s.effect); });
    const ses = studies.map(function (s) { return num(s.se); });
    const eLo = Math.min.apply(null, effs.concat([0])), eHi = Math.max.apply(null, effs.concat([0]));
    const seMax = Math.max.apply(null, ses.concat([0.01]));
    const tx = function (e) { return pad + (eHi === eLo ? (W - 2 * pad) / 2 : (e - eLo) / (eHi - eLo) * (W - 2 * pad)); };
    const ty = function (se) { return pad + se / seMax * (H - 2 * pad); }; // 0 SE at top
    const center = studies.length ? effs.reduce(function (a, b) { return a + b; }, 0) / effs.length : 0;
    const parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" font-family="system-ui" font-size="11">'];
    parts.push('<text x="10" y="20" font-weight="700">' + esc(options.title || 'Funnel plot') + '</text>');
    // pseudo 95% funnel
    const top = ty(0), bot = ty(seMax);
    parts.push('<polygon points="' + tx(center) + ',' + top + ' ' + tx(center - 1.96 * seMax) + ',' + bot + ' ' + tx(center + 1.96 * seMax) + ',' + bot + '" fill="#eef2ff" stroke="#c7d2fe"/>');
    parts.push('<line x1="' + tx(center) + '" y1="' + top + '" x2="' + tx(center) + '" y2="' + bot + '" stroke="#999" stroke-dasharray="3,3"/>');
    studies.forEach(function (s) {
        parts.push('<circle cx="' + tx(num(s.effect)) + '" cy="' + ty(num(s.se)) + '" r="4" fill="#2563eb" fill-opacity="0.7"/>');
    });
    parts.push('<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" stroke="#333"/>');
    parts.push('<text x="' + (W / 2) + '" y="' + (H - 14) + '" text-anchor="middle">effect</text>');
    parts.push('<text x="14" y="' + (H / 2) + '" transform="rotate(-90 14 ' + (H / 2) + ')" text-anchor="middle">standard error</text>');
    parts.push('</svg>');
    return parts.join('');
}

// --- Risk-of-bias matrix (traffic lights) ----------------------------------
// assessments: [{study, domains:{d1:'low'|'some'|'high'|'na', ...}, overall?}]
const ROB_COLORS = { low: '#1a7f37', some: '#9a6700', high: '#cf222e', na: '#999', unclear: '#9a6700' };
const ROB_SYMBOL = { low: '+', some: '?', high: '-', na: ' ', unclear: '?' };
function robMatrix(assessments, options) {
    options = options || {};
    assessments = assessments || [];
    const domains = options.domains || ['d1', 'd2', 'd3', 'd4', 'd5', 'overall'];
    const cell = 34, left = 200, top = 60;
    const W = left + domains.length * cell + 20;
    const H = top + assessments.length * cell + 20;
    const parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" font-family="system-ui" font-size="11">'];
    parts.push('<text x="10" y="22" font-weight="700">' + esc(options.title || 'Risk of bias (RoB 2.0)') + '</text>');
    domains.forEach(function (d, i) {
        parts.push('<text x="' + (left + i * cell + cell / 2) + '" y="' + (top - 8) + '" text-anchor="middle">' + esc(d) + '</text>');
    });
    assessments.forEach(function (a, r) {
        const y = top + r * cell;
        parts.push('<text x="10" y="' + (y + cell / 2 + 4) + '">' + esc(a.study || ('Study ' + (r + 1))) + '</text>');
        domains.forEach(function (d, i) {
            const v = (a.domains && a.domains[d]) || a[d] || (d === 'overall' ? a.overall : null) || 'na';
            const key = String(v).toLowerCase();
            const x = left + i * cell;
            parts.push('<circle cx="' + (x + cell / 2) + '" cy="' + (y + cell / 2) + '" r="12" fill="' + (ROB_COLORS[key] || '#999') + '"/>');
            parts.push('<text x="' + (x + cell / 2) + '" y="' + (y + cell / 2 + 4) + '" text-anchor="middle" fill="#fff" font-weight="700">' + (ROB_SYMBOL[key] || '?') + '</text>');
        });
    });
    parts.push('</svg>');
    return parts.join('');
}

// --- RoB summary (stacked horizontal bars per domain) ----------------------
function robSummary(assessments, options) {
    options = options || {};
    assessments = assessments || [];
    const domains = options.domains || ['d1', 'd2', 'd3', 'd4', 'd5', 'overall'];
    const levels = ['low', 'some', 'high'];
    const W = options.width || 620, rowH = 30, left = 80, top = 50, barW = W - left - 120;
    const H = top + domains.length * rowH + 20;
    const parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" font-family="system-ui" font-size="11">'];
    parts.push('<text x="10" y="22" font-weight="700">' + esc(options.title || 'RoB summary') + '</text>');
    domains.forEach(function (d, r) {
        const counts = { low: 0, some: 0, high: 0 };
        assessments.forEach(function (a) {
            let v = (a.domains && a.domains[d]) || a[d] || (d === 'overall' ? a.overall : null);
            v = String(v || '').toLowerCase();
            if (v === 'unclear') v = 'some';
            if (counts[v] != null) counts[v]++;
        });
        const total = counts.low + counts.some + counts.high || 1;
        const y = top + r * rowH;
        parts.push('<text x="10" y="' + (y + rowH / 2 + 4) + '">' + esc(d) + '</text>');
        let x = left;
        levels.forEach(function (lv) {
            const w = counts[lv] / total * barW;
            if (w > 0) {
                parts.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (rowH - 8) + '" fill="' + ROB_COLORS[lv] + '"/>');
                x += w;
            }
        });
        parts.push('<text x="' + (left + barW + 8) + '" y="' + (y + rowH / 2 + 4) + '">' + total + ' studies</text>');
    });
    parts.push('</svg>');
    return parts.join('');
}

// --- GRADE summary-of-findings table (HTML) --------------------------------
// rows: [{outcome, studies, participants, effect, certainty, importance?}]
function gradeTable(rows, options) {
    options = options || {};
    rows = rows || [];
    const cls = { high: 'A', moderate: 'B', low: 'C', 'very low': 'D' };
    const body = rows.map(function (r) {
        const c = String(r.certainty || '').toLowerCase();
        return '<tr><td>' + esc(r.outcome) + '</td><td>' + esc(r.studies) + '</td><td>' + esc(r.participants) +
            '</td><td>' + esc(r.effect) + '</td><td class="grade-' + (cls[c] || 'D') + '">' + esc(r.certainty || '') + '</td></tr>';
    }).join('');
    return '<table class="grade"><caption>' + esc(options.title || 'GRADE summary of findings') + '</caption>' +
        '<thead><tr><th>Outcome</th><th>#Studies</th><th>#Participants</th><th>Effect</th><th>Certainty</th></tr></thead>' +
        '<tbody>' + (body || '<tr><td colspan="5">no outcomes</td></tr>') + '</tbody></table>';
}

function generateAllVisualizations(data, options) {
    data = data || {};
    options = options || {};
    return {
        forest: forestPlot(data.studies || [], Object.assign({ pooled: data.pooled }, options.forest)),
        funnel: funnelPlot(data.funnelStudies || data.studies || [], options.funnel),
        robMatrix: robMatrix(data.rob || [], options.rob),
        robSummary: robSummary(data.rob || [], options.rob),
        gradeTable: gradeTable(data.grade || [], options.grade),
    };
}

function generateInteractiveReport(data, options) {
    options = options || {};
    const v = generateAllVisualizations(data, options);
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(options.title || 'RCTExtractor visual report') + '</title>' +
        '<style>body{font:14px system-ui;margin:2rem;max-width:900px}section{margin:2rem 0}' +
        'table.grade{border-collapse:collapse}table.grade td,table.grade th{border:1px solid #d0d7de;padding:4px 8px}' +
        '.grade-A{color:#1a7f37}.grade-B{color:#3f7f17}.grade-C{color:#9a6700}.grade-D{color:#cf222e}</style></head><body>' +
        '<h1>' + esc(options.title || 'RCTExtractor visual report') + '</h1>' +
        '<section><h2>Forest</h2>' + v.forest + '</section>' +
        '<section><h2>Funnel</h2>' + v.funnel + '</section>' +
        '<section><h2>Risk of bias</h2>' + v.robMatrix + v.robSummary + '</section>' +
        '<section><h2>GRADE</h2>' + v.gradeTable + '</section>' +
        '</body></html>';
}

module.exports = {
    forestPlot,
    funnelPlot,
    robMatrix,
    robSummary,
    gradeTable,
    generateAllVisualizations,
    generateInteractiveReport,
};
