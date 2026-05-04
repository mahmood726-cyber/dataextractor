/**
 * Batch Training Script for RCTExtractor
 * Processes PDFs in batches of 1000, extracts effect measures, identifies failures
 *
 * Usage: node batch_train.js [batch_number] [batch_size]
 * Default: batch 1, size 1000
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Configuration
const RCT_DIRS = [
    'C:\\Users\\user\\cardiology_rcts',
    'C:\\Users\\user\\oncology_rcts',
    'C:\\Users\\user\\diabetes_rcts',
    'C:\\Users\\user\\infectious_rcts',
    'C:\\Users\\user\\neurology_rcts',
    'C:\\Users\\user\\respiratory_rcts',
    'C:\\Users\\user\\rheumatology_rcts'
];

const OUTPUT_DIR = 'C:\\Users\\user\\Downloads\\Dataextractor\\batch_results';
const BATCH_SIZE = parseInt(process.argv[3]) || 1000;
const BATCH_NUM = parseInt(process.argv[2]) || 1;

// Load RCTExtractor
let RCTExtractor;
try {
    const module = require('./RCTExtractor_v4_8_AI.js');
    RCTExtractor = module.RCTExtractor;
    console.log(`[INFO] RCTExtractor loaded: v${RCTExtractor.version}`);
} catch (e) {
    console.error('[ERROR] Failed to load RCTExtractor:', e.message);
    process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Get all PDF files from RCT directories
 */
function getAllPDFs() {
    const pdfs = [];
    for (const dir of RCT_DIRS) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file.toLowerCase().endsWith('.pdf')) {
                pdfs.push(path.join(dir, file));
            }
        }
    }
    return pdfs;
}

/**
 * Extract text from PDF using pdftotext (must be installed)
 */
function extractTextFromPDF(pdfPath) {
    try {
        return execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
            encoding: 'utf-8',
            timeout: 30000,
            maxBuffer: 10 * 1024 * 1024
        });
    } catch (e) {
        try {
            return execFileSync('pdftotext', [pdfPath, '-'], {
                encoding: 'utf-8',
                timeout: 30000,
                maxBuffer: 10 * 1024 * 1024
            });
        } catch (e2) {
            return null;
        }
    }
}

/**
 * Alternative: Use pre-extracted text files if available
 */
function getExtractedTextPath(pdfPath) {
    const dir = path.dirname(pdfPath);
    const extractedDir = path.join(dir, 'extracted');
    const baseName = path.basename(pdfPath, '.pdf');
    const txtPath = path.join(extractedDir, baseName + '.txt');
    if (fs.existsSync(txtPath)) {
        return txtPath;
    }
    return null;
}

/**
 * Process a single PDF
 */
function processPDF(pdfPath) {
    const result = {
        file: path.basename(pdfPath),
        path: pdfPath,
        success: false,
        extraction: null,
        error: null,
        effectMeasures: {
            HR: 0, RR: 0, OR: 0, MD: 0, SMD: 0, NNT: 0, ARR: 0
        }
    };

    try {
        // First check for pre-extracted text
        let text = null;
        const extractedPath = getExtractedTextPath(pdfPath);
        if (extractedPath) {
            text = fs.readFileSync(extractedPath, 'utf-8');
        } else {
            text = extractTextFromPDF(pdfPath);
        }

        if (!text || text.length < 100) {
            result.error = 'No text extracted or text too short';
            return result;
        }

        // Run RCTExtractor
        const extraction = RCTExtractor.extract(text);
        result.extraction = extraction;
        result.success = !extraction.error && !extraction.warning;

        // Count effect measures - measures are in extraction.effectMeasures
        const em = extraction.effectMeasures || {};
        if (em.hazardRatios) result.effectMeasures.HR = em.hazardRatios.length;
        if (em.relativeRisks) result.effectMeasures.RR = em.relativeRisks.length;
        if (em.oddsRatios) result.effectMeasures.OR = em.oddsRatios.length;
        if (em.meanDifferences) result.effectMeasures.MD = em.meanDifferences.length;
        if (em.standardizedMeanDifferences) result.effectMeasures.SMD = em.standardizedMeanDifferences.length;
        if (em.numberNeededToTreat) result.effectMeasures.NNT = em.numberNeededToTreat.length;
        if (em.absoluteRiskReduction) result.effectMeasures.ARR = em.absoluteRiskReduction.length;
        // Also count from contrast if primary effect exists
        if (extraction.contrast?.effect && extraction.contrast?.measureType) {
            const type = extraction.contrast.measureType;
            if (type === 'HR' && result.effectMeasures.HR === 0) result.effectMeasures.HR = 1;
            if (type === 'RR' && result.effectMeasures.RR === 0) result.effectMeasures.RR = 1;
            if (type === 'OR' && result.effectMeasures.OR === 0) result.effectMeasures.OR = 1;
        }

    } catch (e) {
        result.error = e.message;
    }

    return result;
}

/**
 * Analyze batch results and identify improvement areas
 */
function analyzeResults(results) {
    const analysis = {
        total: results.length,
        successful: 0,
        failed: 0,
        noExtraction: 0,
        effectMeasureTotals: { HR: 0, RR: 0, OR: 0, MD: 0, SMD: 0, NNT: 0, ARR: 0 },
        filesWithNoMeasures: [],
        filesWithMeasures: 0,
        commonErrors: {},
        patternGaps: []
    };

    for (const r of results) {
        if (r.success) {
            analysis.successful++;
            const hasAnyMeasure = Object.values(r.effectMeasures).some(v => v > 0);
            if (hasAnyMeasure) {
                analysis.filesWithMeasures++;
                for (const [k, v] of Object.entries(r.effectMeasures)) {
                    analysis.effectMeasureTotals[k] += v;
                }
            } else {
                analysis.filesWithNoMeasures.push(r.file);
            }
        } else {
            analysis.failed++;
            if (r.error) {
                analysis.commonErrors[r.error] = (analysis.commonErrors[r.error] || 0) + 1;
            }
            if (r.extraction?.warning) {
                analysis.noExtraction++;
            }
        }
    }

    // Identify potential pattern gaps
    if (analysis.effectMeasureTotals.SMD === 0) {
        analysis.patternGaps.push('SMD patterns may need improvement - 0 extractions');
    }
    if (analysis.effectMeasureTotals.NNT === 0) {
        analysis.patternGaps.push('NNT patterns may need improvement - 0 extractions');
    }

    const noMeasureRate = (analysis.filesWithNoMeasures.length / analysis.successful * 100).toFixed(1);
    if (parseFloat(noMeasureRate) > 30) {
        analysis.patternGaps.push(`High no-measure rate: ${noMeasureRate}% - may need more pattern coverage`);
    }

    return analysis;
}

/**
 * Save sample texts for failed extractions (for manual review)
 */
function saveSampleTexts(results, batchNum) {
    const samplesDir = path.join(OUTPUT_DIR, `batch_${batchNum}_samples`);
    if (!fs.existsSync(samplesDir)) {
        fs.mkdirSync(samplesDir, { recursive: true });
    }

    // Save samples of files with no measures found
    const noMeasureFiles = results.filter(r =>
        r.success && Object.values(r.effectMeasures).every(v => v === 0)
    ).slice(0, 20);

    for (const r of noMeasureFiles) {
        const extractedPath = getExtractedTextPath(r.path);
        if (extractedPath) {
            const text = fs.readFileSync(extractedPath, 'utf-8');
            // Save first 5000 chars for review
            fs.writeFileSync(
                path.join(samplesDir, r.file.replace('.pdf', '_sample.txt')),
                text.substring(0, 5000)
            );
        }
    }

    console.log(`[INFO] Saved ${noMeasureFiles.length} sample texts for review`);
}

/**
 * Main batch processing function
 */
async function runBatch() {
    console.log('\n' + '='.repeat(60));
    console.log(`BATCH TRAINING - Batch ${BATCH_NUM}, Size ${BATCH_SIZE}`);
    console.log('='.repeat(60) + '\n');

    // Get all PDFs
    const allPDFs = getAllPDFs();
    console.log(`[INFO] Total PDFs available: ${allPDFs.length}`);

    // Calculate batch slice
    const startIdx = (BATCH_NUM - 1) * BATCH_SIZE;
    const endIdx = Math.min(startIdx + BATCH_SIZE, allPDFs.length);
    const batchPDFs = allPDFs.slice(startIdx, endIdx);

    if (batchPDFs.length === 0) {
        console.log('[INFO] No more PDFs to process in this batch');
        return;
    }

    console.log(`[INFO] Processing PDFs ${startIdx + 1} to ${endIdx}`);
    console.log(`[INFO] Batch size: ${batchPDFs.length}\n`);

    // Process each PDF
    const results = [];
    let processed = 0;

    for (const pdfPath of batchPDFs) {
        const result = processPDF(pdfPath);
        results.push(result);
        processed++;

        // Progress update every 100 files
        if (processed % 100 === 0) {
            const pct = (processed / batchPDFs.length * 100).toFixed(1);
            const successRate = (results.filter(r => r.success).length / processed * 100).toFixed(1);
            console.log(`[PROGRESS] ${processed}/${batchPDFs.length} (${pct}%) - Success rate: ${successRate}%`);
        }
    }

    // Analyze results
    const analysis = analyzeResults(results);

    // Save results
    const outputPath = path.join(OUTPUT_DIR, `batch_${BATCH_NUM}_results.json`);
    fs.writeFileSync(outputPath, JSON.stringify({ results: results.map(r => ({
        file: r.file,
        success: r.success,
        error: r.error,
        effectMeasures: r.effectMeasures
    })), analysis }, null, 2));

    // Save sample texts for review
    saveSampleTexts(results, BATCH_NUM);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('BATCH SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total processed: ${analysis.total}`);
    console.log(`Successful: ${analysis.successful} (${(analysis.successful/analysis.total*100).toFixed(1)}%)`);
    console.log(`Failed: ${analysis.failed}`);
    console.log(`Files with measures: ${analysis.filesWithMeasures}`);
    console.log(`Files with no measures: ${analysis.filesWithNoMeasures.length}`);
    console.log('\nEffect Measure Totals:');
    for (const [k, v] of Object.entries(analysis.effectMeasureTotals)) {
        console.log(`  ${k}: ${v}`);
    }
    console.log('\nPattern Gaps Identified:');
    for (const gap of analysis.patternGaps) {
        console.log(`  - ${gap}`);
    }
    console.log('\nCommon Errors:');
    for (const [err, count] of Object.entries(analysis.commonErrors).slice(0, 5)) {
        console.log(`  - ${err}: ${count}`);
    }
    console.log(`\nResults saved to: ${outputPath}`);
    console.log('='.repeat(60) + '\n');

    // Return analysis for iteration
    return analysis;
}

// Run if called directly
runBatch().catch(console.error);
