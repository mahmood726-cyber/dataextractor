/**
 * RUN BATCH VALIDATION - Sample Test Script
 * ==========================================
 *
 * Runs the batch validation pipeline on a sample of PDFs
 * from each specialty and generates a summary report.
 *
 * Usage:
 *   node run_batch_validation.js [sample_size] [--full] [--specialty <name>]
 *
 * Examples:
 *   node run_batch_validation.js              # Default: 100 per specialty
 *   node run_batch_validation.js 50           # 50 per specialty
 *   node run_batch_validation.js --full       # Process ALL PDFs (24,250)
 *   node run_batch_validation.js --specialty cardiology  # Only cardiology
 */

const fs = require('fs');
const path = require('path');
const {
    runValidation,
    ResultsAggregator,
    PDF_FOLDERS,
    DEFAULT_CONFIG
} = require('./batch_validate_pdfs.js');

// ============================================================
// CONFIGURATION
// ============================================================

const SAMPLE_SIZE_DEFAULT = 100;
const OUTPUT_DIR = path.join(__dirname, 'validation_results');

// ============================================================
// REPORT GENERATOR
// ============================================================

function generateMarkdownReport(summary, outputPath) {
    const lines = [];

    lines.push('# RCT PDF Extraction Validation Report');
    lines.push('');
    lines.push(`**Generated:** ${summary.timestamp}`);
    lines.push('');

    // Overall Statistics
    lines.push('## Overall Statistics');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total PDFs Processed | ${summary.overall.total} |`);
    lines.push(`| Successful Extractions | ${summary.overall.success} |`);
    lines.push(`| Failed Extractions | ${summary.overall.failure} |`);
    lines.push(`| Success Rate | ${summary.overall.successRate} |`);
    lines.push(`| Average Extraction Time | ${summary.overall.averageExtractionTime} |`);
    lines.push(`| Total Extraction Time | ${summary.overall.totalExtractionTime} |`);
    lines.push('');

    // Field Extraction Rates
    lines.push('## Field Extraction Rates');
    lines.push('');
    lines.push('| Field | Extraction Rate | Count |');
    lines.push('|-------|-----------------|-------|');

    const sortedFields = Object.entries(summary.fieldExtractionRates)
        .sort((a, b) => {
            const rateA = parseFloat(a[1].rate);
            const rateB = parseFloat(b[1].rate);
            return rateB - rateA;
        });

    for (const [field, data] of sortedFields) {
        lines.push(`| ${field} | ${data.rate} | ${data.count} |`);
    }
    lines.push('');

    // Per-Specialty Results
    lines.push('## Results by Specialty');
    lines.push('');

    for (const specialty of summary.bySpecialty) {
        lines.push(`### ${specialty.specialty.charAt(0).toUpperCase() + specialty.specialty.slice(1)}`);
        lines.push('');
        lines.push('| Metric | Value |');
        lines.push('|--------|-------|');
        lines.push(`| Total | ${specialty.total} |`);
        lines.push(`| Success | ${specialty.success} |`);
        lines.push(`| Failure | ${specialty.failure} |`);
        lines.push(`| Success Rate | ${specialty.successRate} |`);
        lines.push(`| Avg Extraction Time | ${specialty.averageExtractionTime} |`);
        lines.push('');

        // Top fields for this specialty
        if (specialty.fieldExtractionRates && Object.keys(specialty.fieldExtractionRates).length > 0) {
            lines.push('**Top Extracted Fields:**');
            lines.push('');
            const topFields = Object.entries(specialty.fieldExtractionRates)
                .sort((a, b) => parseFloat(b[1].rate) - parseFloat(a[1].rate))
                .slice(0, 10);

            for (const [field, data] of topFields) {
                lines.push(`- ${field}: ${data.rate}`);
            }
            lines.push('');
        }

        // Show errors if any
        if (specialty.topErrors && specialty.topErrors.length > 0) {
            lines.push('**Sample Errors:**');
            lines.push('');
            for (const err of specialty.topErrors.slice(0, 5)) {
                lines.push(`- \`${err.file}\`: ${err.error.slice(0, 100)}`);
            }
            lines.push('');
        }
    }

    // Key Insights
    lines.push('## Key Insights');
    lines.push('');

    // Calculate some insights
    const overallRate = parseFloat(summary.overall.successRate);
    const hrRate = parseFloat(summary.fieldExtractionRates.hazardRatio?.rate || '0');
    const ciRate = parseFloat(summary.fieldExtractionRates.confidenceInterval?.rate || '0');
    const ssRate = parseFloat(summary.fieldExtractionRates.sampleSize?.rate || '0');

    if (overallRate >= 95) {
        lines.push('- **Excellent extraction success rate** (>= 95%)');
    } else if (overallRate >= 80) {
        lines.push('- **Good extraction success rate** (>= 80%)');
    } else {
        lines.push('- **Moderate extraction success rate** - may need improvement');
    }

    if (hrRate >= 50) {
        lines.push(`- **Hazard ratio extraction** working well (${hrRate}%)`);
    }
    if (ciRate >= 40) {
        lines.push(`- **Confidence intervals** being captured (${ciRate}%)`);
    }
    if (ssRate >= 60) {
        lines.push(`- **Sample size extraction** effective (${ssRate}%)`);
    }

    // Best/worst performing specialties
    const sortedSpecialties = [...summary.bySpecialty].sort((a, b) =>
        parseFloat(b.successRate) - parseFloat(a.successRate)
    );

    if (sortedSpecialties.length > 1) {
        lines.push(`- **Best performing specialty:** ${sortedSpecialties[0].specialty} (${sortedSpecialties[0].successRate})`);
        lines.push(`- **Most challenging specialty:** ${sortedSpecialties[sortedSpecialties.length-1].specialty} (${sortedSpecialties[sortedSpecialties.length-1].successRate})`);
    }

    lines.push('');
    lines.push('---');
    lines.push('*Report generated by RCTExtractor Batch Validation Pipeline*');

    fs.writeFileSync(outputPath, lines.join('\n'));
    return outputPath;
}

function generateHTMLReport(summary, outputPath) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RCT PDF Extraction Validation Report</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { color: #2c3e50; margin-bottom: 10px; }
        h2 { color: #34495e; margin: 30px 0 15px; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
        h3 { color: #7f8c8d; margin: 20px 0 10px; }
        .timestamp { color: #7f8c8d; margin-bottom: 30px; }
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-box.success { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
        .stat-box.warning { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .stat-value { font-size: 2em; font-weight: bold; }
        .stat-label { font-size: 0.9em; opacity: 0.9; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th { background: #3498db; color: white; }
        tr:hover { background: #f8f9fa; }
        .progress-bar {
            height: 20px;
            background: #ecf0f1;
            border-radius: 10px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2ecc71);
            border-radius: 10px;
            transition: width 0.3s;
        }
        .specialty-card { margin: 15px 0; }
        .error-list { max-height: 200px; overflow-y: auto; background: #fff3cd; padding: 10px; border-radius: 4px; }
        .error-item { font-family: monospace; font-size: 0.85em; margin: 5px 0; }
        .insight { padding: 10px 15px; margin: 5px 0; border-left: 4px solid #3498db; background: #e8f4fd; }
        footer { text-align: center; margin-top: 40px; color: #7f8c8d; }
    </style>
</head>
<body>
    <h1>RCT PDF Extraction Validation Report</h1>
    <p class="timestamp">Generated: ${summary.timestamp}</p>

    <div class="card">
        <h2>Overall Statistics</h2>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-value">${summary.overall.total.toLocaleString()}</div>
                <div class="stat-label">Total PDFs Processed</div>
            </div>
            <div class="stat-box success">
                <div class="stat-value">${summary.overall.success.toLocaleString()}</div>
                <div class="stat-label">Successful Extractions</div>
            </div>
            <div class="stat-box warning">
                <div class="stat-value">${summary.overall.failure.toLocaleString()}</div>
                <div class="stat-label">Failed Extractions</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${summary.overall.successRate}</div>
                <div class="stat-label">Success Rate</div>
            </div>
        </div>
        <p><strong>Average Extraction Time:</strong> ${summary.overall.averageExtractionTime}</p>
        <p><strong>Total Processing Time:</strong> ${summary.overall.totalExtractionTime}</p>
    </div>

    <div class="card">
        <h2>Field Extraction Rates</h2>
        <table>
            <thead>
                <tr>
                    <th>Field</th>
                    <th>Extraction Rate</th>
                    <th>Count</th>
                    <th>Progress</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(summary.fieldExtractionRates)
                    .sort((a, b) => parseFloat(b[1].rate) - parseFloat(a[1].rate))
                    .map(([field, data]) => `
                        <tr>
                            <td>${field}</td>
                            <td>${data.rate}</td>
                            <td>${data.count.toLocaleString()}</td>
                            <td>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${data.rate}"></div>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
            </tbody>
        </table>
    </div>

    <div class="card">
        <h2>Results by Specialty</h2>
        ${summary.bySpecialty.map(specialty => `
            <div class="specialty-card">
                <h3>${specialty.specialty.charAt(0).toUpperCase() + specialty.specialty.slice(1)}</h3>
                <table>
                    <tr><td>Total</td><td>${specialty.total}</td></tr>
                    <tr><td>Success</td><td>${specialty.success}</td></tr>
                    <tr><td>Failure</td><td>${specialty.failure}</td></tr>
                    <tr><td>Success Rate</td><td>${specialty.successRate}</td></tr>
                    <tr><td>Avg Extraction Time</td><td>${specialty.averageExtractionTime}</td></tr>
                </table>
                ${specialty.topErrors && specialty.topErrors.length > 0 ? `
                    <div class="error-list">
                        <strong>Sample Errors:</strong>
                        ${specialty.topErrors.slice(0, 5).map(err => `
                            <div class="error-item">${err.file}: ${err.error.slice(0, 80)}...</div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>

    <div class="card">
        <h2>Key Insights</h2>
        ${generateInsightsHTML(summary)}
    </div>

    <footer>
        <p>Report generated by RCTExtractor Batch Validation Pipeline v1.0</p>
    </footer>
</body>
</html>`;

    fs.writeFileSync(outputPath, html);
    return outputPath;
}

function generateInsightsHTML(summary) {
    const insights = [];
    const overallRate = parseFloat(summary.overall.successRate);
    const hrRate = parseFloat(summary.fieldExtractionRates.hazardRatio?.rate || '0');
    const ciRate = parseFloat(summary.fieldExtractionRates.confidenceInterval?.rate || '0');
    const ssRate = parseFloat(summary.fieldExtractionRates.sampleSize?.rate || '0');

    if (overallRate >= 95) {
        insights.push('<div class="insight">Excellent extraction success rate (>= 95%) - pipeline is production-ready</div>');
    } else if (overallRate >= 80) {
        insights.push('<div class="insight">Good extraction success rate (>= 80%) - some improvements possible</div>');
    } else if (overallRate >= 60) {
        insights.push('<div class="insight">Moderate extraction success rate - optimization recommended</div>');
    } else {
        insights.push('<div class="insight">Low extraction success rate - significant improvements needed</div>');
    }

    if (hrRate >= 50) {
        insights.push(`<div class="insight">Hazard ratio extraction working well (${hrRate}%)</div>`);
    }
    if (ciRate >= 40) {
        insights.push(`<div class="insight">Confidence intervals being captured effectively (${ciRate}%)</div>`);
    }
    if (ssRate >= 60) {
        insights.push(`<div class="insight">Sample size extraction effective (${ssRate}%)</div>`);
    }

    // Best/worst specialties
    const sortedSpecialties = [...summary.bySpecialty].sort((a, b) =>
        parseFloat(b.successRate) - parseFloat(a.successRate)
    );

    if (sortedSpecialties.length > 1) {
        insights.push(`<div class="insight">Best performing specialty: ${sortedSpecialties[0].specialty} (${sortedSpecialties[0].successRate})</div>`);
        insights.push(`<div class="insight">Most challenging specialty: ${sortedSpecialties[sortedSpecialties.length-1].specialty} (${sortedSpecialties[sortedSpecialties.length-1].successRate})</div>`);
    }

    return insights.join('\n');
}

// ============================================================
// QUICK VALIDATION RUNNER
// ============================================================

async function runQuickValidation(sampleSize, specialty = null) {
    console.log('\n========================================');
    console.log('  QUICK VALIDATION - Sample Test');
    console.log('========================================\n');

    const config = {
        ...DEFAULT_CONFIG,
        sampleSize: sampleSize,
        specialty: specialty,
        outputDir: OUTPUT_DIR,
        resume: false,
        verbose: false
    };

    console.log(`Configuration:`);
    console.log(`  Sample size per specialty: ${sampleSize || 'ALL'}`);
    console.log(`  Specialty filter: ${specialty || 'ALL'}`);
    console.log(`  Output directory: ${config.outputDir}`);
    console.log('');

    // Calculate expected total
    let expectedTotal = 0;
    const folders = specialty
        ? PDF_FOLDERS.filter(f => f.name.toLowerCase() === specialty.toLowerCase())
        : PDF_FOLDERS;

    for (const folder of folders) {
        if (sampleSize) {
            expectedTotal += Math.min(sampleSize, folder.expected);
        } else {
            expectedTotal += folder.expected;
        }
    }
    console.log(`Expected PDFs to process: ~${expectedTotal.toLocaleString()}`);
    console.log('');

    try {
        const summary = await runValidation(config);

        // Generate reports
        console.log('\nGenerating reports...');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const mdPath = path.join(OUTPUT_DIR, `validation_report_${timestamp}.md`);
        const htmlPath = path.join(OUTPUT_DIR, `validation_report_${timestamp}.html`);

        generateMarkdownReport(summary, mdPath);
        generateHTMLReport(summary, htmlPath);

        console.log(`\nREPORTS GENERATED:`);
        console.log(`  Markdown: ${mdPath}`);
        console.log(`  HTML: ${htmlPath}`);

        return summary;

    } catch (error) {
        console.error('\nValidation failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// ============================================================
// FULL VALIDATION RUNNER
// ============================================================

async function runFullValidation() {
    console.log('\n========================================');
    console.log('  FULL VALIDATION - All 24,250 PDFs');
    console.log('========================================\n');

    console.log('WARNING: This will process ALL PDFs in all specialty folders.');
    console.log('Estimated time: Several hours depending on system performance.\n');

    const config = {
        ...DEFAULT_CONFIG,
        sampleSize: null,  // Process all
        specialty: null,
        outputDir: OUTPUT_DIR,
        resume: false,
        verbose: false,
        batchSize: 100
    };

    try {
        const summary = await runValidation(config);

        // Generate comprehensive reports
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const mdPath = path.join(OUTPUT_DIR, `full_validation_report_${timestamp}.md`);
        const htmlPath = path.join(OUTPUT_DIR, `full_validation_report_${timestamp}.html`);

        generateMarkdownReport(summary, mdPath);
        generateHTMLReport(summary, htmlPath);

        console.log(`\nFULL REPORTS GENERATED:`);
        console.log(`  Markdown: ${mdPath}`);
        console.log(`  HTML: ${htmlPath}`);

        return summary;

    } catch (error) {
        console.error('\nValidation failed:', error.message);
        process.exit(1);
    }
}

// ============================================================
// CLI INTERFACE
// ============================================================

async function main() {
    const args = process.argv.slice(2);

    // Check for help
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
RUN BATCH VALIDATION - Sample Test Script
==========================================

USAGE:
  node run_batch_validation.js [sample_size] [options]

ARGUMENTS:
  sample_size          Number of PDFs to process per specialty (default: 100)

OPTIONS:
  --full               Process ALL PDFs (24,250 total)
  --specialty <name>   Process only specified specialty
  --help, -h           Show this help message

EXAMPLES:
  node run_batch_validation.js              # Sample 100 per specialty
  node run_batch_validation.js 50           # Sample 50 per specialty
  node run_batch_validation.js 200          # Sample 200 per specialty
  node run_batch_validation.js --full       # Process ALL 24,250 PDFs
  node run_batch_validation.js --specialty cardiology   # Only cardiology
  node run_batch_validation.js 100 --specialty oncology # 100 oncology PDFs

SPECIALTIES:
  cardiology    (12,202 PDFs)
  oncology      (2,865 PDFs)
  infectious    (2,213 PDFs)
  diabetes      (2,141 PDFs)
  neurology     (2,007 PDFs)
  respiratory   (1,545 PDFs)
  rheumatology  (1,277 PDFs)

OUTPUT:
  Results are saved to: ${OUTPUT_DIR}
  - JSON with detailed results
  - CSV for spreadsheet analysis
  - Markdown report
  - HTML report with visualizations
`);
        process.exit(0);
    }

    // Check for full validation
    if (args.includes('--full')) {
        await runFullValidation();
        return;
    }

    // Parse specialty flag
    let specialty = null;
    const specialtyIdx = args.indexOf('--specialty');
    if (specialtyIdx !== -1 && args[specialtyIdx + 1]) {
        specialty = args[specialtyIdx + 1];
    }

    // Parse sample size (first numeric argument)
    let sampleSize = SAMPLE_SIZE_DEFAULT;
    for (const arg of args) {
        const num = parseInt(arg, 10);
        if (!isNaN(num) && num > 0) {
            sampleSize = num;
            break;
        }
    }

    await runQuickValidation(sampleSize, specialty);
}

// Export functions for programmatic use
module.exports = {
    runQuickValidation,
    runFullValidation,
    generateMarkdownReport,
    generateHTMLReport
};

// Run if executed directly
if (require.main === module) {
    main();
}
