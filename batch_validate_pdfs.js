/**
 * BATCH PDF VALIDATION PIPELINE
 * ==============================
 *
 * Validates the RCTExtractor on large collections of RCT PDFs.
 *
 * Features:
 * - Batch processing with configurable batch size
 * - Progress tracking with visual progress bar
 * - Per-specialty statistics
 * - Field extraction tracking
 * - Resume capability
 * - Error handling with continuation
 * - JSON and CSV output
 *
 * Usage:
 *   node batch_validate_pdfs.js [options]
 *
 * Options:
 *   --batch-size <n>     PDFs per batch (default: 100)
 *   --sample <n>         Process only first N PDFs per folder
 *   --output-dir <path>  Output directory (default: ./validation_results)
 *   --resume             Resume from checkpoint
 *   --specialty <name>   Process only specified specialty
 *   --verbose            Show detailed extraction results
 *   --help               Show help
 */

const fs = require('fs');
const path = require('path');
const { extractAndProcess, listPdfFiles } = require('./pdf_extractor.js');

// ============================================================
// CONFIGURATION
// ============================================================

const PDF_FOLDERS = [
    { name: 'cardiology', path: 'C:\\Users\\user\\cardiology_rcts', expected: 12202 },
    { name: 'oncology', path: 'C:\\Users\\user\\oncology_rcts', expected: 2865 },
    { name: 'infectious', path: 'C:\\Users\\user\\infectious_rcts', expected: 2213 },
    { name: 'diabetes', path: 'C:\\Users\\user\\diabetes_rcts', expected: 2141 },
    { name: 'neurology', path: 'C:\\Users\\user\\neurology_rcts', expected: 2007 },
    { name: 'respiratory', path: 'C:\\Users\\user\\respiratory_rcts', expected: 1545 },
    { name: 'rheumatology', path: 'C:\\Users\\user\\rheumatology_rcts', expected: 1277 }
];

const TRACKED_FIELDS = [
    'studyDesign',
    'sampleSize',
    'primaryOutcome',
    'hazardRatio',
    'relativeRisk',
    'oddsRatio',
    'meanDifference',
    'riskDifference',
    'confidenceInterval',
    'pValue',
    'followUpDuration',
    'interventionArm',
    'controlArm',
    'eventRates',
    'numberNeededToTreat',
    'subgroupAnalyses',
    'adverseEvents',
    'qualityScore'
];

const DEFAULT_CONFIG = {
    batchSize: 100,
    sampleSize: null,  // null means process all
    outputDir: path.join(__dirname, 'validation_results'),
    resume: false,
    specialty: null,   // null means all specialties
    verbose: false,
    maxPages: 50       // PDF extraction limit
};

// ============================================================
// PROGRESS BAR UTILITY
// ============================================================

class ProgressBar {
    constructor(total, description = 'Progress') {
        this.total = total;
        this.current = 0;
        this.description = description;
        this.startTime = Date.now();
        this.barWidth = 40;
    }

    update(current) {
        this.current = current;
        this.render();
    }

    increment() {
        this.current++;
        this.render();
    }

    render() {
        const percent = Math.min(100, Math.round((this.current / this.total) * 100));
        const filledWidth = Math.round((percent / 100) * this.barWidth);
        const emptyWidth = this.barWidth - filledWidth;

        const filledBar = '='.repeat(filledWidth);
        const emptyBar = '-'.repeat(emptyWidth);

        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = this.current / elapsed || 0;
        const eta = rate > 0 ? Math.round((this.total - this.current) / rate) : 0;

        const etaStr = eta > 60
            ? `${Math.floor(eta/60)}m ${eta%60}s`
            : `${eta}s`;

        process.stdout.write(
            `\r${this.description}: [${filledBar}${emptyBar}] ${percent}% ` +
            `(${this.current}/${this.total}) ETA: ${etaStr}   `
        );
    }

    complete() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        process.stdout.write(
            `\r${this.description}: [${('=').repeat(this.barWidth)}] 100% ` +
            `(${this.total}/${this.total}) Done in ${elapsed.toFixed(1)}s\n`
        );
    }
}

// ============================================================
// CHECKPOINT/RESUME MANAGEMENT
// ============================================================

class CheckpointManager {
    constructor(outputDir) {
        this.checkpointFile = path.join(outputDir, 'checkpoint.json');
        this.checkpoint = this.load();
    }

    load() {
        if (fs.existsSync(this.checkpointFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.checkpointFile, 'utf8'));
            } catch (e) {
                console.warn('Warning: Could not load checkpoint file');
            }
        }
        return {
            processedFiles: {},
            specialtyProgress: {},
            lastUpdated: null
        };
    }

    save() {
        this.checkpoint.lastUpdated = new Date().toISOString();
        fs.writeFileSync(this.checkpointFile, JSON.stringify(this.checkpoint, null, 2));
    }

    isProcessed(filePath) {
        return this.checkpoint.processedFiles[filePath] === true;
    }

    markProcessed(filePath) {
        this.checkpoint.processedFiles[filePath] = true;
    }

    getSpecialtyProgress(specialty) {
        return this.checkpoint.specialtyProgress[specialty] || { processed: 0, total: 0 };
    }

    updateSpecialtyProgress(specialty, processed, total) {
        this.checkpoint.specialtyProgress[specialty] = { processed, total };
    }

    clearCheckpoint() {
        this.checkpoint = {
            processedFiles: {},
            specialtyProgress: {},
            lastUpdated: null
        };
        if (fs.existsSync(this.checkpointFile)) {
            fs.unlinkSync(this.checkpointFile);
        }
    }
}

// ============================================================
// FIELD EXTRACTION ANALYZER
// ============================================================

function analyzeExtraction(result) {
    const fields = {
        // Study identification
        studyDesign: false,
        sampleSize: false,
        primaryOutcome: false,

        // Effect measures
        hazardRatio: false,
        relativeRisk: false,
        oddsRatio: false,
        meanDifference: false,
        riskDifference: false,
        rateRatio: false,

        // Statistical measures
        confidenceInterval: false,
        pValue: false,
        standardError: false,

        // Study details
        followUpDuration: false,
        interventionArm: false,
        controlArm: false,
        eventRates: false,
        numberNeededToTreat: false,

        // Additional
        subgroupAnalyses: false,
        adverseEvents: false,
        qualityScore: false,

        // Counts
        totalEffectMeasures: 0,
        totalCIsExtracted: 0,
        totalPValues: 0
    };

    if (!result) return fields;

    // Check study design
    if (result.studyType || result.design) {
        fields.studyDesign = true;
    }

    // Check sample size
    if (result.sampleSize || result.n || (result.arms && result.arms.length > 0)) {
        fields.sampleSize = true;
        if (result.arms) {
            fields.interventionArm = result.arms.some(a => a.type === 'intervention' || a.type === 'treatment');
            fields.controlArm = result.arms.some(a => a.type === 'control' || a.type === 'placebo');
        }
    }

    // Check outcomes
    if (result.primaryOutcome || result.outcomes?.primary) {
        fields.primaryOutcome = true;
    }

    // Check effect measures
    if (result.effectMeasures) {
        const em = result.effectMeasures;

        if (em.hazardRatios?.length > 0) {
            fields.hazardRatio = true;
            fields.totalEffectMeasures += em.hazardRatios.length;
            fields.totalCIsExtracted += em.hazardRatios.filter(h => h.ciLo && h.ciHi).length;
        }

        if (em.relativeRisks?.length > 0) {
            fields.relativeRisk = true;
            fields.totalEffectMeasures += em.relativeRisks.length;
            fields.totalCIsExtracted += em.relativeRisks.filter(r => r.ciLo && r.ciHi).length;
        }

        if (em.oddsRatios?.length > 0) {
            fields.oddsRatio = true;
            fields.totalEffectMeasures += em.oddsRatios.length;
            fields.totalCIsExtracted += em.oddsRatios.filter(o => o.ciLo && o.ciHi).length;
        }

        if (em.meanDifferences?.length > 0) {
            fields.meanDifference = true;
            fields.totalEffectMeasures += em.meanDifferences.length;
            fields.totalCIsExtracted += em.meanDifferences.filter(m => m.ciLo && m.ciHi).length;
        }

        if (em.riskDifferences?.length > 0) {
            fields.riskDifference = true;
            fields.totalEffectMeasures += em.riskDifferences.length;
        }

        if (em.rateRatios?.length > 0) {
            fields.rateRatio = true;
            fields.totalEffectMeasures += em.rateRatios.length;
        }

        if (em.numberNeededToTreat?.length > 0) {
            fields.numberNeededToTreat = true;
        }
    }

    // Check confidence intervals (from primary result)
    if (result.primaryResult?.ci || result.ci) {
        fields.confidenceInterval = true;
    }

    // Check p-values
    if (result.pValues?.length > 0 || result.primaryResult?.pValue) {
        fields.pValue = true;
        fields.totalPValues = result.pValues?.length || 1;
    }

    // Check follow-up duration
    if (result.followUp || result.studyDuration) {
        fields.followUpDuration = true;
    }

    // Check event rates
    if (result.eventRates || (result.arms && result.arms.some(a => a.events))) {
        fields.eventRates = true;
    }

    // Check subgroup analyses
    if (result.subgroups?.length > 0 || result.subgroupAnalyses) {
        fields.subgroupAnalyses = true;
    }

    // Check adverse events
    if (result.adverseEvents?.length > 0 || result.safetyOutcomes) {
        fields.adverseEvents = true;
    }

    // Check quality/bias assessment
    if (result.riskOfBias || result.qualityAssessment || result.robScore) {
        fields.qualityScore = true;
    }

    // Check SE
    if (result.effectMeasures) {
        const allMeasures = [
            ...(result.effectMeasures.hazardRatios || []),
            ...(result.effectMeasures.relativeRisks || []),
            ...(result.effectMeasures.oddsRatios || [])
        ];
        fields.standardError = allMeasures.some(m => m.se);
    }

    return fields;
}

// ============================================================
// RESULTS AGGREGATOR
// ============================================================

class ResultsAggregator {
    constructor() {
        this.results = [];
        this.specialtyStats = {};
        this.overallStats = {
            total: 0,
            success: 0,
            failure: 0,
            fieldCounts: {},
            averageExtractionTime: 0,
            totalExtractionTime: 0
        };
    }

    addResult(specialty, filePath, result, extractionTime, error = null) {
        const entry = {
            specialty,
            fileName: path.basename(filePath),
            filePath,
            success: !error,
            error: error ? error.message || String(error) : null,
            extractionTime,
            timestamp: new Date().toISOString()
        };

        if (result && !error) {
            entry.fields = analyzeExtraction(result);
            entry.summary = {
                effectMeasures: entry.fields.totalEffectMeasures,
                confidenceIntervals: entry.fields.totalCIsExtracted,
                pValues: entry.fields.totalPValues
            };
        }

        this.results.push(entry);
        this.updateStats(specialty, entry);
    }

    updateStats(specialty, entry) {
        // Initialize specialty stats if needed
        if (!this.specialtyStats[specialty]) {
            this.specialtyStats[specialty] = {
                total: 0,
                success: 0,
                failure: 0,
                fieldCounts: {},
                totalExtractionTime: 0,
                errors: []
            };
        }

        const stats = this.specialtyStats[specialty];
        stats.total++;
        this.overallStats.total++;

        if (entry.success) {
            stats.success++;
            this.overallStats.success++;

            // Count fields
            if (entry.fields) {
                for (const [field, hasField] of Object.entries(entry.fields)) {
                    if (typeof hasField === 'boolean' && hasField) {
                        stats.fieldCounts[field] = (stats.fieldCounts[field] || 0) + 1;
                        this.overallStats.fieldCounts[field] =
                            (this.overallStats.fieldCounts[field] || 0) + 1;
                    }
                }
            }
        } else {
            stats.failure++;
            this.overallStats.failure++;
            if (entry.error) {
                stats.errors.push({
                    file: entry.fileName,
                    error: entry.error
                });
            }
        }

        stats.totalExtractionTime += entry.extractionTime || 0;
        this.overallStats.totalExtractionTime += entry.extractionTime || 0;
    }

    getSpecialtyReport(specialty) {
        const stats = this.specialtyStats[specialty];
        if (!stats) return null;

        const successRate = stats.total > 0 ? (stats.success / stats.total * 100).toFixed(2) : 0;
        const avgTime = stats.success > 0 ? (stats.totalExtractionTime / stats.success).toFixed(2) : 0;

        return {
            specialty,
            total: stats.total,
            success: stats.success,
            failure: stats.failure,
            successRate: `${successRate}%`,
            averageExtractionTime: `${avgTime}ms`,
            fieldExtractionRates: this.calculateFieldRates(stats),
            topErrors: stats.errors.slice(0, 10)
        };
    }

    calculateFieldRates(stats) {
        const rates = {};
        for (const [field, count] of Object.entries(stats.fieldCounts)) {
            rates[field] = {
                count,
                rate: stats.success > 0 ? `${(count / stats.success * 100).toFixed(2)}%` : '0%'
            };
        }
        return rates;
    }

    getSummaryReport() {
        const successRate = this.overallStats.total > 0
            ? (this.overallStats.success / this.overallStats.total * 100).toFixed(2)
            : 0;
        const avgTime = this.overallStats.success > 0
            ? (this.overallStats.totalExtractionTime / this.overallStats.success).toFixed(2)
            : 0;

        return {
            timestamp: new Date().toISOString(),
            overall: {
                total: this.overallStats.total,
                success: this.overallStats.success,
                failure: this.overallStats.failure,
                successRate: `${successRate}%`,
                averageExtractionTime: `${avgTime}ms`,
                totalExtractionTime: `${(this.overallStats.totalExtractionTime / 1000).toFixed(2)}s`
            },
            fieldExtractionRates: this.calculateFieldRates(this.overallStats),
            bySpecialty: Object.keys(this.specialtyStats).map(s => this.getSpecialtyReport(s))
        };
    }

    exportToJSON(filePath) {
        const report = {
            summary: this.getSummaryReport(),
            detailedResults: this.results
        };
        fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    }

    exportToCSV(filePath) {
        const headers = [
            'specialty',
            'fileName',
            'success',
            'error',
            'extractionTime',
            'effectMeasures',
            'confidenceIntervals',
            'pValues',
            'studyDesign',
            'sampleSize',
            'primaryOutcome',
            'hazardRatio',
            'relativeRisk',
            'oddsRatio',
            'meanDifference',
            'riskDifference',
            'followUpDuration',
            'numberNeededToTreat',
            'timestamp'
        ];

        const rows = this.results.map(r => [
            r.specialty,
            r.fileName,
            r.success,
            r.error || '',
            r.extractionTime || 0,
            r.summary?.effectMeasures || 0,
            r.summary?.confidenceIntervals || 0,
            r.summary?.pValues || 0,
            r.fields?.studyDesign || false,
            r.fields?.sampleSize || false,
            r.fields?.primaryOutcome || false,
            r.fields?.hazardRatio || false,
            r.fields?.relativeRisk || false,
            r.fields?.oddsRatio || false,
            r.fields?.meanDifference || false,
            r.fields?.riskDifference || false,
            r.fields?.followUpDuration || false,
            r.fields?.numberNeededToTreat || false,
            r.timestamp
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(v =>
                typeof v === 'string' && v.includes(',') ? `"${v}"` : v
            ).join(','))
        ].join('\n');

        fs.writeFileSync(filePath, csvContent);
    }
}

// ============================================================
// BATCH PROCESSOR
// ============================================================

async function processBatch(pdfFiles, specialty, config, checkpoint, aggregator) {
    const progress = new ProgressBar(pdfFiles.length, `Processing ${specialty}`);

    for (let i = 0; i < pdfFiles.length; i++) {
        const filePath = pdfFiles[i];

        // Skip if already processed (resume mode)
        if (config.resume && checkpoint.isProcessed(filePath)) {
            progress.increment();
            continue;
        }

        const startTime = Date.now();
        let result = null;
        let error = null;

        try {
            result = await extractAndProcess(filePath, {
                maxPages: config.maxPages,
                keepReferences: false
            });
        } catch (e) {
            error = e;
            if (config.verbose) {
                console.error(`\nError processing ${path.basename(filePath)}: ${e.message}`);
            }
        }

        const extractionTime = Date.now() - startTime;
        aggregator.addResult(specialty, filePath, result, extractionTime, error);

        checkpoint.markProcessed(filePath);

        // Save checkpoint every batch
        if ((i + 1) % config.batchSize === 0) {
            checkpoint.updateSpecialtyProgress(specialty, i + 1, pdfFiles.length);
            checkpoint.save();
        }

        progress.increment();
    }

    progress.complete();

    // Final checkpoint save for this specialty
    checkpoint.updateSpecialtyProgress(specialty, pdfFiles.length, pdfFiles.length);
    checkpoint.save();
}

async function runValidation(config) {
    console.log('\n========================================');
    console.log('  BATCH PDF VALIDATION PIPELINE v1.0');
    console.log('========================================\n');

    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
    }

    const checkpoint = new CheckpointManager(config.outputDir);
    const aggregator = new ResultsAggregator();

    // Clear checkpoint if not resuming
    if (!config.resume) {
        checkpoint.clearCheckpoint();
    }

    // Filter folders by specialty if specified
    let folders = PDF_FOLDERS;
    if (config.specialty) {
        folders = folders.filter(f => f.name.toLowerCase() === config.specialty.toLowerCase());
        if (folders.length === 0) {
            console.error(`Specialty not found: ${config.specialty}`);
            console.log('Available specialties:', PDF_FOLDERS.map(f => f.name).join(', '));
            process.exit(1);
        }
    }

    // Process each specialty folder
    const startTime = Date.now();
    let totalPdfs = 0;

    for (const folder of folders) {
        console.log(`\n--- ${folder.name.toUpperCase()} ---`);

        // Check if folder exists
        if (!fs.existsSync(folder.path)) {
            console.log(`Warning: Folder not found: ${folder.path}`);
            continue;
        }

        // List PDF files
        let pdfFiles = listPdfFiles(folder.path, true);
        console.log(`Found ${pdfFiles.length} PDFs (expected: ${folder.expected})`);

        // Apply sample limit if specified
        if (config.sampleSize && config.sampleSize < pdfFiles.length) {
            pdfFiles = pdfFiles.slice(0, config.sampleSize);
            console.log(`Processing sample of ${config.sampleSize} PDFs`);
        }

        totalPdfs += pdfFiles.length;

        // Process in batches
        await processBatch(pdfFiles, folder.name, config, checkpoint, aggregator);

        // Show specialty stats
        const specialtyReport = aggregator.getSpecialtyReport(folder.name);
        if (specialtyReport) {
            console.log(`  Success rate: ${specialtyReport.successRate}`);
            console.log(`  Avg extraction time: ${specialtyReport.averageExtractionTime}`);
        }
    }

    // Generate final reports
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n========================================');
    console.log('         VALIDATION COMPLETE');
    console.log('========================================\n');

    const summary = aggregator.getSummaryReport();

    console.log('OVERALL STATISTICS:');
    console.log(`  Total PDFs processed: ${summary.overall.total}`);
    console.log(`  Successful extractions: ${summary.overall.success}`);
    console.log(`  Failed extractions: ${summary.overall.failure}`);
    console.log(`  Success rate: ${summary.overall.successRate}`);
    console.log(`  Average extraction time: ${summary.overall.averageExtractionTime}`);
    console.log(`  Total time: ${totalTime}s`);

    console.log('\nFIELD EXTRACTION RATES:');
    const fieldRates = summary.fieldExtractionRates;
    const sortedFields = Object.entries(fieldRates)
        .sort((a, b) => parseInt(b[1].rate) - parseInt(a[1].rate))
        .slice(0, 15);

    for (const [field, data] of sortedFields) {
        console.log(`  ${field}: ${data.rate} (${data.count})`);
    }

    // Export results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const jsonPath = path.join(config.outputDir, `validation_results_${timestamp}.json`);
    const csvPath = path.join(config.outputDir, `validation_results_${timestamp}.csv`);
    const summaryPath = path.join(config.outputDir, `validation_summary_${timestamp}.json`);

    aggregator.exportToJSON(jsonPath);
    aggregator.exportToCSV(csvPath);
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('\nOUTPUT FILES:');
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  CSV: ${csvPath}`);
    console.log(`  Summary: ${summaryPath}`);

    return summary;
}

// ============================================================
// CLI INTERFACE
// ============================================================

function parseArgs(args) {
    const config = { ...DEFAULT_CONFIG };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--batch-size':
                config.batchSize = parseInt(args[++i], 10) || DEFAULT_CONFIG.batchSize;
                break;
            case '--sample':
                config.sampleSize = parseInt(args[++i], 10) || null;
                break;
            case '--output-dir':
                config.outputDir = args[++i] || DEFAULT_CONFIG.outputDir;
                break;
            case '--resume':
                config.resume = true;
                break;
            case '--specialty':
                config.specialty = args[++i] || null;
                break;
            case '--verbose':
                config.verbose = true;
                break;
            case '--max-pages':
                config.maxPages = parseInt(args[++i], 10) || DEFAULT_CONFIG.maxPages;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
        }
    }

    return config;
}

function showHelp() {
    console.log(`
BATCH PDF VALIDATION PIPELINE
=============================

Validates the RCTExtractor on large collections of RCT PDFs.

USAGE:
  node batch_validate_pdfs.js [options]

OPTIONS:
  --batch-size <n>     PDFs per batch for checkpoint saving (default: 100)
  --sample <n>         Process only first N PDFs per folder
  --output-dir <path>  Output directory (default: ./validation_results)
  --resume             Resume from last checkpoint
  --specialty <name>   Process only specified specialty
  --max-pages <n>      Max PDF pages to extract (default: 50)
  --verbose            Show detailed extraction results
  --help, -h           Show this help message

SPECIALTIES:
  cardiology    (12,202 PDFs)
  oncology      (2,865 PDFs)
  infectious    (2,213 PDFs)
  diabetes      (2,141 PDFs)
  neurology     (2,007 PDFs)
  respiratory   (1,545 PDFs)
  rheumatology  (1,277 PDFs)

EXAMPLES:
  # Process all PDFs
  node batch_validate_pdfs.js

  # Process sample of 100 from each specialty
  node batch_validate_pdfs.js --sample 100

  # Process only cardiology PDFs
  node batch_validate_pdfs.js --specialty cardiology

  # Resume interrupted validation
  node batch_validate_pdfs.js --resume

  # Custom batch size and output
  node batch_validate_pdfs.js --batch-size 50 --output-dir ./my_results
`);
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================

async function main() {
    const args = process.argv.slice(2);
    const config = parseArgs(args);

    try {
        await runValidation(config);
    } catch (error) {
        console.error('Fatal error:', error.message);
        if (config.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Export for programmatic use
module.exports = {
    runValidation,
    ResultsAggregator,
    CheckpointManager,
    ProgressBar,
    analyzeExtraction,
    PDF_FOLDERS,
    TRACKED_FIELDS,
    DEFAULT_CONFIG
};

// Run if executed directly
if (require.main === module) {
    main();
}
