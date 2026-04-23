/**
 * RCTExtractor - AI-Enhanced RCT Data Extraction Engine
 * ======================================================
 *
 * Main entry point for the rctextractor npm package.
 *
 * This module provides comprehensive tools for extracting structured data
 * from randomized controlled trial (RCT) publications for systematic reviews
 * and meta-analysis.
 *
 * Features:
 * - Effect measure extraction (HR, RR, OR, RD, MD, NNT, NNH, IRR, SMD)
 * - Population and sample size extraction (18+ formats)
 * - Outcome and endpoint identification
 * - Risk of Bias 2.0 assessment
 * - GRADE certainty evaluation
 * - AI-enhanced semantic matching
 * - PDF text extraction and processing
 * - Safe regex execution with timeout protection
 * - Calibrated confidence scoring
 * - Quality Control and Validation module
 *
 * @module rctextractor
 * @version 5.1.0
 *
 * @changelog 5.1.0 (2026-01-23)
 * - Added multi-language support (English, Spanish, German, French, Chinese, Japanese)
 * - Added Network Meta-Analysis (NMA) support with CINeMA assessment
 * - Added multi-arm trial detection and pairwise comparison extraction
 * - Added netmeta R package export format
 * - Added league table generation and treatment rankings
 * - Version aligned across all modules
 *
 * @changelog 5.0.0 (2026-01-16)
 * - NMA support: multi-arm trial detection, treatment networks
 * - CINeMA confidence assessment (6 domains)
 * - League table generation
 * - Treatment ranking probabilities (SUCRA)
 *
 * @changelog 4.9.7 (2026-01-16)
 * - Added comprehensive QC (Quality Control) module
 * - QC includes: numeric validation, CI validation, consistency checks, completeness
 * - Configurable domain-specific rules (HF, AF, DM, ONCOLOGY, etc.)
 * - Quality score calculation (0-100) with letter grades
 * - HTML/JSON/CSV/Markdown report generation
 * - Suspicious value detection and flagging
 * - Rule presets for different use cases (strict, lenient, cochrane, regulatory)
 *
 * @changelog 4.9.6 (2026-01-16)
 * - Added IRR (Incidence Rate Ratio) extraction for COVID/infection trials
 * - Added SMD/Cohen's d/Hedges' g extraction for meta-analysis
 * - Added safe regex wrapper with timeout protection
 * - Added input validation with graceful error handling
 * - Added calibrated confidence scoring using logistic regression
 * - Added additional sample size patterns (approximate, per-arm, ranges, ITT)
 * - Improved error handling with graceful degradation
 */

'use strict';

// Core extraction engine with AI enhancements
const {
    RCTExtractor,
    LocalAI,
    AIStrategies,
    QualityScorer,
    BiasDetector,
    FieldPredictor,
    ValidationFramework
} = require('./RCTExtractor_v4_8_AI.js');

// Local AI module for semantic analysis
const {
    WordEmbeddings,
    NaiveBayesClassifier,
    MedicalNER,
    ConfidenceCalibrator,
    SemanticSearch,
    EnsembleExtractor
} = require('./LocalAI.js');

// PDF extraction utilities
const {
    extractPdfText,
    extractAndProcess,
    batchExtract,
    listPdfFiles,
    detectColumnLayout,
    removeHeadersFooters,
    reconstructParagraphs,
    removeReferences,
    cleanPdfArtifacts,
    extractTables
} = require('./pdf_extractor.js');

// Quality Control module
const QC = require('./qc');
const {
    QualityChecker,
    QCReportGenerator,
    RuleManager,
    NumericValidator,
    CIValidator,
    ConsistencyValidator,
    CompletenessValidator
} = QC;

// Visualization module
const viz = require('./viz');

// Library modules (audit, batch processing, caching, etc.)
const lib = require('./lib');
const {
    // Audit logging
    AuditLogger,
    createAuditLogger,
    getDefaultLogger,
    log: auditLog,
    createExpressMiddleware: createAuditMiddleware,
    LOG_LEVELS,
    AUDIT_EVENT_TYPES,
    // Batch processing
    BatchProcessor,
    WorkerPool,
    ProgressTracker,
    CheckpointManager,
    ResultsAggregator,
    processBatch,
    BATCH_DEFAULT_CONFIG,
    // Multi-level caching
    Cache,
    MultiLevelCache,
    MemoryCache,
    DiskCache,
    RedisCache,
    CacheKeyGenerator,
    CacheInvalidator,
    CachedExtractor,
    createCache,
    createMultiLevelCache,
    createCachedExtractor,
    CACHE_DEFAULT_CONFIG
} = lib;

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

/**
 * Extract RCT data from text content
 * @param {string} text - The text content to extract from
 * @param {Object} options - Extraction options
 * @param {boolean} options.enableAI - Enable AI-enhanced extraction (default: true)
 * @param {boolean} options.verbose - Enable verbose logging (default: false)
 * @returns {Object} Extracted RCT data
 */
function extract(text, options = {}) {
    // RCTExtractor is a singleton object, not a class
    return RCTExtractor.extract(text, options);
}

/**
 * Extract RCT data from a PDF file
 * @param {string} pdfPath - Path to the PDF file
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} Extracted RCT data
 */
async function extractFromPdf(pdfPath, options = {}) {
    return await extractAndProcess(pdfPath, options);
}

/**
 * Batch extract from multiple PDF files
 * @param {string[]} pdfPaths - Array of PDF file paths
 * @param {Object} options - Extraction options
 * @returns {Promise<Object[]>} Array of extraction results
 */
async function extractFromPdfs(pdfPaths, options = {}) {
    return await batchExtract(pdfPaths, options);
}

/**
 * Create an RCTExtractor reference with custom configuration
 * Note: RCTExtractor is a singleton object, not a class
 * @param {Object} config - Configuration options (currently unused, for future extensibility)
 * @returns {Object} RCTExtractor object reference
 */
function createExtractor(config = {}) {
    // RCTExtractor is a singleton object, return it directly
    return RCTExtractor;
}

/**
 * Validate extraction results against ground truth
 * @param {Object} extracted - Extracted data
 * @param {Object} groundTruth - Ground truth data
 * @returns {Object} Validation report
 */
function validate(extracted, groundTruth) {
    return ValidationFramework.generateValidationReport(extracted, groundTruth);
}

/**
 * Calculate semantic similarity between two terms
 * @param {string} term1 - First term
 * @param {string} term2 - Second term
 * @returns {number} Similarity score (0-1)
 */
function similarity(term1, term2) {
    return LocalAI.similarity(term1, term2);
}

/**
 * Get the package version
 * @returns {string} Package version
 */
function getVersion() {
    return '5.1.0-AI-NMA-i18n';
}

/**
 * Extract with quality control
 * @param {string} text - The text content to extract from
 * @param {Object} options - Extraction options
 * @param {boolean} options.runQC - Run quality control (default: true)
 * @param {string} options.domain - Domain for QC (HF, AF, DM, ONCOLOGY, etc.)
 * @param {string} options.qcPreset - QC preset (strict, lenient, cochrane, regulatory)
 * @returns {Object} Extracted RCT data with QC results
 */
function extractWithQC(text, options = {}) {
    // RCTExtractor is a singleton object, not a class
    const result = RCTExtractor.extract(text, options);

    if (options.runQC !== false) {
        const qcOptions = {
            domain: options.domain || result._meta?.domain,
            preset: options.qcPreset
        };
        const checker = new QualityChecker(qcOptions);
        result._qc = checker.check(result);
    }

    return result;
}

/**
 * Extract from PDF with quality control
 * @param {string} pdfPath - Path to the PDF file
 * @param {Object} options - Extraction and QC options
 * @returns {Promise<Object>} Extracted RCT data with QC results
 */
async function extractFromPdfWithQC(pdfPath, options = {}) {
    const result = await extractAndProcess(pdfPath, options);

    if (options.runQC !== false) {
        const qcOptions = {
            domain: options.domain || result._meta?.domain,
            preset: options.qcPreset
        };
        const checker = new QualityChecker(qcOptions);
        result._qc = checker.check(result);
    }

    return result;
}

/**
 * Run quality control on extraction result
 * @param {Object} extractionResult - Result from extract() or extractFromPdf()
 * @param {Object} options - QC options (domain, preset)
 * @returns {Object} QC result with score, grade, issues, etc.
 */
function runQC(extractionResult, options = {}) {
    const checker = new QualityChecker(options);
    return checker.check(extractionResult);
}

/**
 * Quick quality check - returns just score and grade
 * @param {Object} extractionResult - Result from extract() or extractFromPdf()
 * @param {Object} options - QC options (domain, preset)
 * @returns {Object} { score, grade, valid, issueCount, warningCount }
 */
function quickQC(extractionResult, options = {}) {
    const checker = new QualityChecker(options);
    return checker.quickCheck(extractionResult);
}

/**
 * Generate QC report in HTML format
 * @param {Object} qcResult - Result from runQC()
 * @param {Object} options - Report options (title, includeCharts, etc.)
 * @returns {string} HTML report
 */
function generateQCReport(qcResult, options = {}) {
    const generator = new QCReportGenerator(options);
    return generator.generateHTML(qcResult);
}

// ============================================================
// MODULE EXPORTS
// ============================================================

module.exports = {
    // Main extraction class
    RCTExtractor,

    // Convenience functions
    extract,
    extractFromPdf,
    extractFromPdfs,
    createExtractor,
    validate,
    similarity,
    getVersion,

    // QC convenience functions
    extractWithQC,
    extractFromPdfWithQC,
    runQC,
    quickQC,
    generateQCReport,

    // AI/ML modules
    LocalAI,
    AIStrategies,
    WordEmbeddings,
    NaiveBayesClassifier,
    MedicalNER,
    ConfidenceCalibrator,
    FieldPredictor,
    SemanticSearch,
    EnsembleExtractor,

    // Quality and validation
    QualityScorer,
    BiasDetector,
    ValidationFramework,

    // Quality Control module
    QC,
    QualityChecker,
    QCReportGenerator,
    RuleManager,
    NumericValidator,
    CIValidator,
    ConsistencyValidator,
    CompletenessValidator,

    // PDF utilities
    extractPdfText,
    extractAndProcess,
    batchExtract,
    listPdfFiles,
    detectColumnLayout,
    removeHeadersFooters,
    reconstructParagraphs,
    removeReferences,
    cleanPdfArtifacts,
    extractTables,

    // Visualization module
    viz,
    forestPlot: viz.forestPlot,
    funnelPlot: viz.funnelPlot,
    robMatrix: viz.robMatrix,
    robSummary: viz.robSummary,
    gradeTable: viz.gradeTable,
    generateAllVisualizations: viz.generateAllVisualizations,
    generateInteractiveReport: viz.generateInteractiveReport,

    // Library modules
    lib,

    // Audit logging
    AuditLogger,
    createAuditLogger,
    getDefaultLogger,
    auditLog,
    createAuditMiddleware,
    LOG_LEVELS,
    AUDIT_EVENT_TYPES,

    // Batch processing (advanced parallel processing with worker pools)
    BatchProcessor,
    WorkerPool,
    ProgressTracker,
    CheckpointManager,
    ResultsAggregator,
    processBatch,
    BATCH_DEFAULT_CONFIG,

    // Multi-level intelligent caching
    Cache,
    MultiLevelCache,
    MemoryCache,
    DiskCache,
    RedisCache,
    CacheKeyGenerator,
    CacheInvalidator,
    CachedExtractor,
    createCache,
    createMultiLevelCache,
    createCachedExtractor,
    CACHE_DEFAULT_CONFIG
};
