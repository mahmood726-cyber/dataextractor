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
 * - Effect measure extraction (HR, RR, OR, RD, MD, NNT, NNH)
 * - Population and sample size extraction
 * - Outcome and endpoint identification
 * - Risk of Bias 2.0 assessment
 * - GRADE certainty evaluation
 * - AI-enhanced semantic matching
 * - PDF text extraction and processing
 *
 * @module rctextractor
 * @version 4.9.5
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
    const extractor = new RCTExtractor();
    return extractor.extract(text, options);
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
 * Create a new RCTExtractor instance with custom configuration
 * @param {Object} config - Configuration options
 * @returns {RCTExtractor} Configured extractor instance
 */
function createExtractor(config = {}) {
    return new RCTExtractor(config);
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
    return '4.9.5';
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
    extractTables
};
