#!/usr/bin/env node
// sentinel:skip-file — hardcoded paths are fixture/registry/audit-narrative data for this repo's research workflow, not portable application configuration. Same pattern as push_all_repos.py and E156 workbook files.
/**
 * REJECTION-BASED Validation: Ship only high-confidence extractions
 * ==================================================================
 *
 * Key insight: Instead of maximizing accuracy on all extractions,
 * achieve <1% false-ship rate by REJECTING uncertain extractions.
 *
 * Confidence factors:
 * 1. Number of effect measures found (fewer = more confident)
 * 2. Agreement between multiple extraction methods
 * 3. Corruption detection results
 * 4. Sample size reasonableness
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { RCTExtractor, CorruptionDetector, ValidationGates } = require('./RCTExtractor_v4_8_AI.js');

const MATCHES_PATH = 'C:/Users/user/Downloads/TruthCert-Validation-Papers/results/pairwise_pdf_matches.json';

function loadMatches() {
    try {
        const data = JSON.parse(fs.readFileSync(MATCHES_PATH, 'utf8'));
        return data.matches || [];
    } catch (e) {
        console.error('Error loading matches:', e.message);
        return [];
    }
}

function extractPdfText(pdfPath) {
    try {
        return execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000
        });
    } catch (e) {
        return null;
    }
}

function calculateOR(a, b, c, d) {
    const aa = a || 0.5;
    const bb = b || 0.5;
    const cc = c || 0.5;
    const dd = d || 0.5;
    return (aa * dd) / (bb * cc);
}

function compareEffects(extracted, groundTruth, tolerance = 0.15) {
    if (!extracted || !groundTruth) return false;
    const diff = Math.abs(extracted - groundTruth);
    const relDiff = diff / Math.max(Math.abs(groundTruth), 0.01);
    return relDiff <= tolerance;
}

function calculateConfidence(extraction, effectMeasures) {
    let confidence = 1.0;
    const reasons = [];

    // Factor 1: Number of effect measures (fewer = better)
    const numOrs = (effectMeasures.oddsRatios || []).length;
    const numRrs = (effectMeasures.relativeRisks || []).length;
    const numHrs = (effectMeasures.hazardRatios || []).length;
    const totalMeasures = numOrs + numRrs + numHrs;

    if (totalMeasures === 0) {
        confidence *= 0.1;
        reasons.push('no_measures_found');
    } else if (totalMeasures === 1) {
        confidence *= 1.0;  // Perfect - exactly one measure
        reasons.push('single_measure');
    } else if (totalMeasures <= 3) {
        confidence *= 0.7;
        reasons.push('few_measures');
    } else {
        confidence *= 0.3;  // Many measures = ambiguous
        reasons.push('many_measures');
    }

    // Factor 2: Check if extraction has errors
    if (extraction.error || extraction.warning) {
        confidence *= 0.3;
        reasons.push('extraction_error');
    }

    // Factor 3: Primary measure consistency
    if (effectMeasures.primary && effectMeasures.primary.value) {
        confidence *= 1.0;
        reasons.push('has_primary');
    }

    // Factor 4: Confidence intervals present
    const hasCI = (effectMeasures.oddsRatios || []).some(o => o.ciLow && o.ciHigh);
    if (hasCI) {
        confidence *= 1.2;  // Boost for having CIs
        reasons.push('has_ci');
    }

    return { confidence: Math.min(confidence, 1.0), reasons };
}

async function runRejectionValidation() {
    console.log('='.repeat(70));
    console.log('REJECTION-BASED Validation: Ship only high-confidence extractions');
    console.log('='.repeat(70));
    console.log();

    const matches = loadMatches();
    console.log(`Loaded ${matches.length} PDF-Pairwise matches`);

    const MAX_SAMPLES = 200;
    const samplesToTest = matches.slice(0, MAX_SAMPLES);

    // Test different confidence thresholds
    const thresholds = [0.3, 0.5, 0.7, 0.9];
    const thresholdResults = {};

    for (const threshold of thresholds) {
        thresholdResults[threshold] = {
            shipped: 0,
            correct: 0,
            incorrect: 0,
            rejected: 0,
            details: []
        };
    }

    let processed = 0;

    for (const match of samplesToTest) {
        processed++;

        if (!fs.existsSync(match.pdf_path)) continue;

        const gs = match.gold_standard;
        if (!gs || !gs.treatment_n || !gs.control_n) continue;

        const pdfText = extractPdfText(match.pdf_path);
        if (!pdfText || pdfText.length < 100) continue;

        // Extract
        const extraction = RCTExtractor.extract(pdfText);
        const effectMeasures = extraction.effectMeasures || {};

        // Calculate ground truth
        const gt_or = calculateOR(
            gs.treatment_events,
            gs.treatment_n - gs.treatment_events,
            gs.control_events,
            gs.control_n - gs.control_events
        );

        // Get best matching OR
        const allOrs = (effectMeasures.oddsRatios || []).map(o => o.value);
        let bestOr = null;
        let bestDiff = Infinity;
        for (const or of allOrs) {
            const diff = Math.abs(or - gt_or) / Math.max(gt_or, 0.01);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestOr = or;
            }
        }

        // If no OR found, use primary or first RR
        if (!bestOr) {
            if (effectMeasures.primary && effectMeasures.primary.value) {
                bestOr = effectMeasures.primary.value;
            } else if ((effectMeasures.relativeRisks || []).length > 0) {
                bestOr = effectMeasures.relativeRisks[0].value;
            }
        }

        // Calculate confidence
        const { confidence, reasons } = calculateConfidence(extraction, effectMeasures);

        // Check correctness
        const isCorrect = bestOr && compareEffects(bestOr, gt_or, 0.15);

        // Apply to each threshold
        for (const threshold of thresholds) {
            const result = thresholdResults[threshold];

            if (confidence >= threshold && bestOr) {
                // SHIP
                result.shipped++;
                if (isCorrect) {
                    result.correct++;
                } else {
                    result.incorrect++;
                }
            } else {
                // REJECT
                result.rejected++;
            }

            result.details.push({
                id: match.dataset_id,
                confidence,
                shipped: confidence >= threshold && bestOr,
                correct: isCorrect,
                gt_or,
                extracted_or: bestOr,
                reasons
            });
        }

        if (processed % 20 === 0) {
            console.log(`Progress: ${processed}/${samplesToTest.length}`);
        }
    }

    // Results
    console.log();
    console.log('='.repeat(70));
    console.log('REJECTION-BASED VALIDATION RESULTS');
    console.log('='.repeat(70));
    console.log();
    console.log('Threshold | Shipped | Correct | Incorrect | Accuracy | False-Ship | Reject Rate');
    console.log('-'.repeat(80));

    for (const threshold of thresholds) {
        const r = thresholdResults[threshold];
        const accuracy = r.shipped > 0 ? (r.correct / r.shipped * 100).toFixed(1) : '0.0';
        const falseShip = r.shipped > 0 ? (r.incorrect / r.shipped * 100).toFixed(1) : '0.0';
        const rejectRate = ((r.rejected / (r.shipped + r.rejected)) * 100).toFixed(1);

        console.log(`${threshold.toFixed(1).padStart(9)} | ${r.shipped.toString().padStart(7)} | ${r.correct.toString().padStart(7)} | ${r.incorrect.toString().padStart(9)} | ${accuracy.padStart(8)}% | ${falseShip.padStart(10)}% | ${rejectRate.padStart(11)}%`);
    }

    console.log();

    // Find optimal threshold for Contract v1
    let optimalThreshold = null;
    for (const threshold of thresholds.reverse()) {
        const r = thresholdResults[threshold];
        const falseShipRate = r.shipped > 0 ? r.incorrect / r.shipped : 1;
        if (falseShipRate < 0.01 && r.shipped > 0) {
            optimalThreshold = threshold;
            break;
        }
    }

    if (optimalThreshold) {
        console.log(`Contract v1 MET at threshold ${optimalThreshold}:`);
        const r = thresholdResults[optimalThreshold];
        console.log(`  Shipped: ${r.shipped}, Correct: ${r.correct}, False-ship rate: ${((r.incorrect/r.shipped)*100).toFixed(2)}%`);
    } else {
        console.log('Contract v1 NOT MET at any tested threshold.');
        console.log('Need to improve confidence scoring or add more validation gates.');
    }

    // Save results
    const outputPath = 'C:/Users/user/Downloads/TruthCert-Validation-Papers/results/rejection_validation.json';
    fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        thresholds: thresholdResults
    }, null, 2));

    console.log(`\nResults saved to: ${outputPath}`);
}

runRejectionValidation().catch(console.error);
