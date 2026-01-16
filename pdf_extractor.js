/**
 * PDF EXTRACTOR MODULE for RCTExtractor
 * ======================================
 *
 * Provides PDF text extraction capability for the RCTExtractor pipeline.
 * Uses pdf-parse library for Node.js CLI extraction.
 *
 * Features:
 * - Multi-page PDF text extraction
 * - Column layout detection and reordering
 * - Header/footer removal
 * - Reference section detection
 * - Clean text output suitable for RCTExtractor
 *
 * Usage:
 *   const { extractPdfText, extractAndProcess } = require('./pdf_extractor.js');
 *   const text = await extractPdfText('path/to/file.pdf');
 *   const result = await extractAndProcess('path/to/file.pdf');
 */

const fs = require('fs');
const path = require('path');

// Lazy load pdf-parse to avoid issues if not installed
let pdfParse = null;
function getPdfParse() {
    if (!pdfParse) {
        try {
            pdfParse = require('pdf-parse');
        } catch (e) {
            throw new Error(
                'pdf-parse module not found. Install it with: npm install pdf-parse\n' +
                'Error: ' + e.message
            );
        }
    }
    return pdfParse;
}

// ============================================================
// TEXT CLEANING UTILITIES
// ============================================================

/**
 * Detect if text appears to be in a two-column layout
 * @param {string} text - Raw extracted text
 * @returns {boolean} - True if two-column layout detected
 */
function detectColumnLayout(text) {
    const lines = text.split('\n');
    let shortLineCount = 0;
    let totalLines = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 10) { // Skip very short lines
            totalLines++;
            // In column layouts, lines often end mid-word or mid-sentence
            if (trimmed.length < 60 && !trimmed.match(/[.!?;:]$/)) {
                shortLineCount++;
            }
        }
    }

    // If more than 40% of lines are short without proper endings, likely column layout
    return totalLines > 0 && (shortLineCount / totalLines) > 0.4;
}

/**
 * Remove common headers and footers from extracted text
 * @param {string} text - Raw extracted text
 * @returns {string} - Text with headers/footers removed
 */
function removeHeadersFooters(text) {
    const lines = text.split('\n');
    const cleanedLines = [];

    // Patterns for headers/footers to remove
    const headerFooterPatterns = [
        // Page numbers
        /^[\s]*\d+[\s]*$/,
        /^[\s]*Page\s+\d+\s*(of\s+\d+)?[\s]*$/i,
        /^[\s]*-\s*\d+\s*-[\s]*$/,
        // Journal headers
        /^[\s]*[A-Z][a-z]+\s+\d{4}[\s]*$/,  // Month Year
        /^[\s]*\d{1,2}\s+[A-Z][a-z]+\s+\d{4}[\s]*$/,  // Day Month Year
        /^[\s]*©\s*\d{4}[\s]*/,  // Copyright
        /^[\s]*doi[:.\s]/i,
        /^[\s]*10\.\d{4,}/,  // DOI numbers
        /^[\s]*https?:\/\//i,  // URLs
        // Common journal elements
        /^[\s]*ORIGINAL\s+(ARTICLE|RESEARCH)[\s]*$/i,
        /^[\s]*RESEARCH\s+ARTICLE[\s]*$/i,
        /^[\s]*CLINICAL\s+TRIAL[\s]*$/i,
        /^[\s]*n\s+engl\s+j\s+med/i,
        /^[\s]*The\s+new\s+england\s+journal/i,
        /^[\s]*Downloaded\s+from/i,
        /^[\s]*For\s+personal\s+use\s+only/i,
        /^[\s]*This\s+article\s+has\s+been\s+cited\s+by/i
    ];

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines at start
        if (cleanedLines.length === 0 && !trimmed) {
            continue;
        }

        // Check against header/footer patterns
        let isHeaderFooter = false;
        for (const pattern of headerFooterPatterns) {
            if (pattern.test(trimmed)) {
                isHeaderFooter = true;
                break;
            }
        }

        if (!isHeaderFooter) {
            cleanedLines.push(line);
        }
    }

    return cleanedLines.join('\n');
}

/**
 * Attempt to reconstruct paragraphs from fragmented PDF text
 * @param {string} text - Text with line breaks
 * @returns {string} - Text with reconstructed paragraphs
 */
function reconstructParagraphs(text) {
    const lines = text.split('\n');
    const paragraphs = [];
    let currentParagraph = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const nextLine = lines[i + 1]?.trim() || '';

        // Empty line indicates paragraph break
        if (!trimmed) {
            if (currentParagraph.length > 0) {
                paragraphs.push(currentParagraph.join(' '));
                currentParagraph = [];
            }
            continue;
        }

        // Check if this line should continue to next
        const shouldContinue =
            // Line ends with hyphen (word continuation)
            trimmed.endsWith('-') ||
            // Line doesn't end with sentence-ending punctuation and next line exists
            (!trimmed.match(/[.!?:;]$/) && nextLine && !nextLine.match(/^[A-Z\d•●▪]/)) ||
            // Line is very short (likely mid-column)
            (trimmed.length < 50 && nextLine && nextLine.length > 0);

        if (trimmed.endsWith('-')) {
            // Remove hyphen and join with next word
            currentParagraph.push(trimmed.slice(0, -1));
        } else {
            currentParagraph.push(trimmed);
        }

        // Start new paragraph if this looks like an ending
        if (!shouldContinue || trimmed.match(/^(METHODS?|RESULTS?|DISCUSSION|CONCLUSION|REFERENCES?|ABSTRACT|BACKGROUND|INTRODUCTION|ACKNOWLEDGMENTS?):?$/i)) {
            if (currentParagraph.length > 0) {
                paragraphs.push(currentParagraph.join(' '));
                currentParagraph = [];
            }
        }
    }

    // Don't forget the last paragraph
    if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '));
    }

    return paragraphs.join('\n\n');
}

/**
 * Remove reference section (usually not needed for data extraction)
 * @param {string} text - Full text
 * @param {boolean} keepReferences - If true, keep references section
 * @returns {string} - Text with references section removed
 */
function removeReferences(text, keepReferences = false) {
    if (keepReferences) {
        return text;
    }

    // Find references section
    const refPatterns = [
        /\n\s*REFERENCES?\s*\n/i,
        /\n\s*References?\s*\n/,
        /\n\s*BIBLIOGRAPHY\s*\n/i,
        /\n\s*LITERATURE\s+CITED\s*\n/i
    ];

    for (const pattern of refPatterns) {
        const match = text.match(pattern);
        if (match) {
            const refStart = match.index;
            // Check if this is near the end of the document (last 30%)
            if (refStart > text.length * 0.7) {
                return text.slice(0, refStart);
            }
        }
    }

    return text;
}

/**
 * Clean up common PDF extraction artifacts
 * @param {string} text - Raw text
 * @returns {string} - Cleaned text
 */
function cleanPdfArtifacts(text) {
    return text
        // Fix common ligature issues
        .replace(/ﬁ/g, 'fi')
        .replace(/ﬂ/g, 'fl')
        .replace(/ﬀ/g, 'ff')
        .replace(/ﬃ/g, 'ffi')
        .replace(/ﬄ/g, 'ffl')
        // Fix common character encoding issues
        .replace(/â€"/g, '—')
        .replace(/â€"/g, '-')
        .replace(/â€™/g, "'")
        .replace(/â€œ/g, '"')
        .replace(/â€/g, '"')
        .replace(/Â·/g, '·')
        .replace(/Â±/g, '±')
        .replace(/Ã—/g, '×')
        // Remove excessive whitespace
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        // Remove form feed characters
        .replace(/\f/g, '\n')
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
}

/**
 * Extract table data if detected (basic table extraction)
 * @param {string} text - Text containing potential tables
 * @returns {object} - Object with text and extracted tables
 */
function extractTables(text) {
    const tables = [];

    // Simple pattern for tables: lines with multiple tab/space-separated values
    const lines = text.split('\n');
    let tableLines = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Detect table rows (multiple values separated by spaces/tabs)
        const columns = line.trim().split(/\s{2,}|\t/).filter(c => c.trim());

        if (columns.length >= 3 && columns.some(c => /\d/.test(c))) {
            if (!inTable) {
                inTable = true;
                tableLines = [];
            }
            tableLines.push(columns);
        } else if (inTable && tableLines.length >= 2) {
            tables.push({
                rows: tableLines,
                startLine: i - tableLines.length,
                endLine: i - 1
            });
            inTable = false;
        } else {
            inTable = false;
        }
    }

    // Don't forget last table
    if (inTable && tableLines.length >= 2) {
        tables.push({
            rows: tableLines,
            startLine: lines.length - tableLines.length,
            endLine: lines.length - 1
        });
    }

    return { text, tables };
}

// ============================================================
// MAIN PDF EXTRACTION FUNCTIONS
// ============================================================

/**
 * Extract text from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @param {object} options - Extraction options
 * @param {boolean} options.keepReferences - Keep references section (default: false)
 * @param {boolean} options.reconstructParagraphs - Attempt to reconstruct paragraphs (default: true)
 * @param {boolean} options.extractTables - Extract table data (default: false)
 * @param {number} options.maxPages - Maximum pages to extract (default: all)
 * @returns {Promise<object>} - Extracted text and metadata
 */
async function extractPdfText(filePath, options = {}) {
    const {
        keepReferences = false,
        reconstructParagraphs: doReconstruct = true,
        extractTables: doExtractTables = false,
        maxPages = null
    } = options;

    // Validate file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found: ${filePath}`);
    }

    // Read PDF file
    const dataBuffer = fs.readFileSync(filePath);

    // Parse PDF
    const pdfParseLib = getPdfParse();

    const parseOptions = {};
    if (maxPages) {
        parseOptions.max = maxPages;
    }

    const pdfData = await pdfParseLib(dataBuffer, parseOptions);

    // Extract raw text
    let text = pdfData.text || '';

    // Clean PDF artifacts
    text = cleanPdfArtifacts(text);

    // Remove headers/footers
    text = removeHeadersFooters(text);

    // Remove references section if not needed
    text = removeReferences(text, keepReferences);

    // Reconstruct paragraphs
    if (doReconstruct) {
        text = reconstructParagraphs(text);
    }

    // Build result object
    const result = {
        text: text.trim(),
        metadata: {
            fileName: path.basename(filePath),
            filePath: filePath,
            pageCount: pdfData.numpages,
            info: pdfData.info || {},
            extractedAt: new Date().toISOString()
        }
    };

    // Extract tables if requested
    if (doExtractTables) {
        const tableData = extractTables(text);
        result.tables = tableData.tables;
    }

    return result;
}

/**
 * Extract PDF text and run RCTExtractor on it
 * @param {string} filePath - Path to the PDF file
 * @param {object} options - Extraction options (same as extractPdfText)
 * @returns {Promise<object>} - RCTExtractor result with PDF metadata
 */
async function extractAndProcess(filePath, options = {}) {
    // Lazy load RCTExtractor to avoid circular dependencies
    const { RCTExtractor } = require('./RCTExtractor_v4_8_AI.js');

    // Extract PDF text
    const pdfResult = await extractPdfText(filePath, options);

    // Run RCT extraction
    const rctResult = RCTExtractor.extract(pdfResult.text);

    // Combine results
    return {
        ...rctResult,
        _pdfMetadata: pdfResult.metadata,
        _pdfTables: pdfResult.tables || []
    };
}

/**
 * Batch extract from multiple PDF files
 * @param {string[]} filePaths - Array of PDF file paths
 * @param {object} options - Extraction options
 * @returns {Promise<object[]>} - Array of extraction results
 */
async function batchExtract(filePaths, options = {}) {
    const results = [];

    for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        console.log(`Processing PDF (${i + 1}/${filePaths.length}): ${path.basename(filePath)}`);

        try {
            const result = await extractAndProcess(filePath, options);
            results.push({
                file: path.basename(filePath),
                path: filePath,
                result: result,
                success: true
            });
        } catch (error) {
            console.error(`Error processing ${filePath}: ${error.message}`);
            results.push({
                file: path.basename(filePath),
                path: filePath,
                error: error.message,
                success: false
            });
        }
    }

    return results;
}

/**
 * List all PDF files in a directory
 * @param {string} dirPath - Directory path
 * @param {boolean} recursive - Recurse into subdirectories
 * @returns {string[]} - Array of PDF file paths
 */
function listPdfFiles(dirPath, recursive = false) {
    const files = [];

    if (!fs.existsSync(dirPath)) {
        return files;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && recursive) {
            files.push(...listPdfFiles(fullPath, recursive));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
            files.push(fullPath);
        }
    }

    return files;
}

// ============================================================
// CLI INTERFACE
// ============================================================

/**
 * Main CLI function
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
PDF Extractor for RCTExtractor
==============================

Usage:
  node pdf_extractor.js <file.pdf> [options]
  node pdf_extractor.js --dir <directory> [options]

Options:
  --dir <path>        Extract from all PDFs in directory
  --recursive         Recurse into subdirectories (with --dir)
  --output <path>     Write JSON output to file
  --text-only         Output only extracted text (no RCT processing)
  --keep-refs         Keep references section
  --max-pages <n>     Maximum pages to extract
  --extract-tables    Attempt to extract table data
  --quiet             Suppress progress output
  --help, -h          Show this help message

Examples:
  node pdf_extractor.js paper.pdf
  node pdf_extractor.js paper.pdf --output result.json
  node pdf_extractor.js --dir ./papers --recursive --output all_results.json
  node pdf_extractor.js paper.pdf --text-only
`);
        process.exit(0);
    }

    // Parse arguments
    const options = {
        keepReferences: args.includes('--keep-refs'),
        extractTables: args.includes('--extract-tables'),
        maxPages: null
    };

    const maxPagesIdx = args.indexOf('--max-pages');
    if (maxPagesIdx !== -1 && args[maxPagesIdx + 1]) {
        options.maxPages = parseInt(args[maxPagesIdx + 1], 10);
    }

    const textOnly = args.includes('--text-only');
    const quiet = args.includes('--quiet');
    const recursive = args.includes('--recursive');

    let outputPath = null;
    const outputIdx = args.indexOf('--output');
    if (outputIdx !== -1 && args[outputIdx + 1]) {
        outputPath = args[outputIdx + 1];
    }

    // Collect input files
    let inputFiles = [];

    const dirIdx = args.indexOf('--dir');
    if (dirIdx !== -1 && args[dirIdx + 1]) {
        const dirPath = args[dirIdx + 1];
        inputFiles = listPdfFiles(dirPath, recursive);
        if (inputFiles.length === 0) {
            console.error(`No PDF files found in: ${dirPath}`);
            process.exit(1);
        }
    } else {
        // Get positional arguments (PDF files)
        for (const arg of args) {
            if (!arg.startsWith('--') && arg.toLowerCase().endsWith('.pdf')) {
                inputFiles.push(arg);
            }
        }
    }

    if (inputFiles.length === 0) {
        console.error('No input PDF files specified');
        process.exit(1);
    }

    // Process files
    const results = [];

    for (let i = 0; i < inputFiles.length; i++) {
        const filePath = inputFiles[i];
        const fileName = path.basename(filePath);

        if (!quiet) {
            console.log(`Processing (${i + 1}/${inputFiles.length}): ${fileName}`);
        }

        try {
            if (textOnly) {
                const pdfResult = await extractPdfText(filePath, options);
                results.push({
                    file: fileName,
                    path: filePath,
                    text: pdfResult.text,
                    metadata: pdfResult.metadata,
                    success: true
                });

                if (!outputPath && !quiet) {
                    console.log('\n--- Extracted Text ---\n');
                    console.log(pdfResult.text);
                    console.log('\n--- End ---\n');
                }
            } else {
                const result = await extractAndProcess(filePath, options);
                results.push({
                    file: fileName,
                    path: filePath,
                    result: result,
                    success: true
                });

                if (!outputPath && !quiet) {
                    // Print summary
                    const { RCTExtractor } = require('./RCTExtractor_v4_8_AI.js');
                    console.log(`\n=== ${fileName} ===`);
                    console.log(RCTExtractor.getSummary(result));
                }
            }
        } catch (error) {
            console.error(`Error processing ${fileName}: ${error.message}`);
            results.push({
                file: fileName,
                path: filePath,
                error: error.message,
                success: false
            });
        }
    }

    // Write output if specified
    if (outputPath) {
        const output = {
            generatedAt: new Date().toISOString(),
            totalFiles: inputFiles.length,
            successCount: results.filter(r => r.success).length,
            errorCount: results.filter(r => !r.success).length,
            results: results
        };

        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        if (!quiet) {
            console.log(`\nWrote results to: ${outputPath}`);
        }
    }

    // Exit with error code if any failures
    const errorCount = results.filter(r => !r.success).length;
    if (errorCount > 0) {
        process.exit(1);
    }
}

// Run CLI if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error.message);
        process.exit(1);
    });
}

// ============================================================
// MODULE EXPORTS
// ============================================================

module.exports = {
    // Main extraction functions
    extractPdfText,
    extractAndProcess,
    batchExtract,

    // Utility functions
    listPdfFiles,
    detectColumnLayout,
    removeHeadersFooters,
    reconstructParagraphs,
    removeReferences,
    cleanPdfArtifacts,
    extractTables
};
