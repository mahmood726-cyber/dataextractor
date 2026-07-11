// tests/html_webapp_loader.js
// ---------------------------------------------------------------------------
// Loads the standalone RCTExtractor_WebApp.html extractor objects in a Node
// `vm` sandbox so the inline (browser-only) extraction logic can be unit
// tested by the existing Node test harness. Added 2026-06-10 alongside the
// GLP-1 CVOT extraction-bug fixes that were extended into the HTML surface.
//
// The HTML defines `RCTExtractor`, `MedicalNER`, `WordEmbeddings`, and
// `NaiveBayesClassifier` as top-level `const`s and only touches the DOM inside
// event-handler functions (analyze(), showTab(), initTheme(), ...). We stub a
// minimal document/window/localStorage so the script evaluates, then capture
// the objects through an appended export line. No browser / jsdom needed.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadWebAppExtractor() {
    const htmlPath = path.join(__dirname, '..', 'RCTExtractor_WebApp.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const m = html.match(/<script>([\s\S]*?)<\/script>/);
    if (!m) throw new Error('No <script> block found in RCTExtractor_WebApp.html');
    let script = m[1];
    // Export the top-level objects (const declarations do not attach to the
    // vm context's global object on their own).
    script += '\n;globalThis.__WEBAPP__ = {' +
        ' RCTExtractor: (typeof RCTExtractor !== "undefined") ? RCTExtractor : null,' +
        ' MedicalNER: (typeof MedicalNER !== "undefined") ? MedicalNER : null' +
        ' };';

    const elStub = {
        classList: { add() {}, remove() {}, toggle() {} },
        addEventListener() {}, value: '', style: {},
        set innerHTML(v) {}, get innerHTML() { return ''; },
        disabled: false, querySelectorAll() { return []; },
        setAttribute() {}, getAttribute() { return null; }, appendChild() {},
    };
    const stub = () => elStub;
    const sandbox = {
        document: {
            getElementById: stub, querySelector: stub, querySelectorAll: () => [],
            addEventListener() {}, body: elStub, documentElement: elStub, createElement: stub,
        },
        localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
        console, setTimeout: () => {}, clearTimeout: () => {},
        Math, Date, parseFloat, parseInt, isFinite, isNaN, RegExp, JSON,
        Set, Map, Object, Array, String, Number, Boolean,
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.navigator = { userAgent: 'node' };
    sandbox.matchMedia = () => ({ matches: false, addEventListener() {} });

    vm.createContext(sandbox);
    vm.runInContext(script, sandbox, { timeout: 10000, filename: 'RCTExtractor_WebApp.html' });

    const out = sandbox.__WEBAPP__;
    if (!out || !out.RCTExtractor) throw new Error('Failed to load RCTExtractor from HTML');
    return out;
}

module.exports = { loadWebAppExtractor };
