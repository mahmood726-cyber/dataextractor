// Baseline probe for Dataextractor (RCTExtractor v5.1.0 AI engine).
//
// Loads the engine module and emits deterministic structural signals:
// version string, exported keys, and counts of known feature methods.
// No PDF I/O — keeps the probe fast and stable across reruns.
//
// Run: node probe.js

'use strict';
const path = require('path');
const fs = require('fs');

const engineRel = path.join(__dirname, 'RCTExtractor_v4_8_AI.js');
const engineExports = require(engineRel);

const e = engineExports.RCTExtractor;
const exportKeys = Object.keys(engineExports).sort();
const engineKeys = Object.keys(e);
const methodCount = engineKeys.filter(k => typeof e[k] === 'function').length;
const objectCount = engineKeys.filter(k => typeof e[k] === 'object' && e[k] !== null).length;

// File-size sanity (engine size is stable per version)
const stat = fs.statSync(engineRel);

console.log(JSON.stringify({
    version: e.version,
    n_exports: exportKeys.length,
    export_keys: exportKeys,
    n_engine_keys: engineKeys.length,
    n_methods: methodCount,
    n_object_subkeys: objectCount,
    engine_file_kb: Math.round(stat.size / 1024),
}));
