/**
 * R Package Dataset Validation Script for Dataextractor
 *
 * This script validates extraction results against 115 datasets from R packages:
 * - metadat (93 datasets)
 * - netmeta (9 datasets)
 * - meta (7 datasets)
 * - mada (6 datasets)
 *
 * Usage: node validate_r_datasets.js [--dataset=name] [--report]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    datasetsJsonPath: path.join(__dirname, 'r_package_datasets.json'),
    exportedDatasetsDir: path.join(__dirname, 'datasets'),
    reportOutputPath: path.join(__dirname, 'validation_report.json'),
    htmlReportPath: path.join(__dirname, 'validation_report.html')
};

// Known ground truth values for key datasets
const GROUND_TRUTH = {
    // dat.bcg - BCG Vaccine Against Tuberculosis (13 studies)
    'dat.bcg': {
        package: 'metadat',
        num_studies: 13,
        data_type: 'binary',
        expected_columns: ['trial', 'author', 'year', 'tpos', 'tneg', 'cpos', 'cneg', 'ablat', 'alloc'],
        sample_values: {
            first_study: {
                trial: 1,
                author: 'Aronson',
                year: 1948,
                tpos: 4,
                tneg: 119,
                cpos: 11,
                cneg: 128,
                ablat: 44,
                alloc: 'random'
            },
            last_study: {
                trial: 13,
                author: 'Comstock & Webster',
                year: 1969,
                tpos: 29,
                tneg: 17825,
                cpos: 45,
                cneg: 17854,
                ablat: 18,
                alloc: 'systematic'
            }
        },
        totals: {
            total_tpos: 306,
            total_tneg: 71710,
            total_cpos: 691,
            total_cneg: 71936
        }
    },

    // dat.baker2009 - COPD Treatments (39 studies, network meta-analysis)
    'dat.baker2009': {
        package: 'metadat',
        num_studies: 39,
        data_type: 'binary',
        expected_columns: ['study', 'year', 'id', 'treatment', 'exac', 'total'],
        treatments: ['placebo', 'budesonide', 'fluticasone', 'salmeterol', 'formoterol',
                     'budesonide+formoterol', 'fluticasone+salmeterol', 'tiotropium'],
        num_treatments: 8,
        total_observations: 28217,
        sample_values: {
            first_row: {
                study: 'Brusasco 2003',
                year: 2003
            }
        }
    },

    // dat.hasselblad1998 - Smoking Cessation Counseling (24 studies)
    'dat.hasselblad1998': {
        package: 'metadat',
        num_studies: 24,
        data_type: 'binary',
        expected_columns: ['id', 'study', 'authors', 'year', 'trt', 'xi', 'ni'],
        treatments: ['no contact', 'self-help', 'individual counseling', 'group counseling'],
        num_treatments: 4,
        total_observations: 50,
        sample_values: {
            first_row: {
                id: 1,
                study: 1,
                authors: 'Blondal, 1989'
            }
        }
    },

    // dat.normand1999 - Hospital Stay of Stroke Patients (9 studies)
    'dat.normand1999': {
        package: 'metadat',
        num_studies: 9,
        data_type: 'continuous',
        expected_columns: ['source', 'n1i', 'm1i', 'sd1i', 'n2i', 'm2i', 'sd2i'],
        total_participants: 1298,
        sample_values: {
            first_study: {
                source: 1,
                n1i: 60,
                m1i: 55,
                sd1i: 47,
                n2i: 90,
                m2i: 75,
                sd2i: 64
            },
            last_study: {
                source: 9,
                n1i: 16,
                m1i: 10.3,
                sd1i: 6.5,
                n2i: 148,
                m2i: 21.6,
                sd2i: 22
            }
        }
    },

    // dat.linde2016 - Antidepressants (93 studies)
    'dat.linde2016': {
        package: 'metadat',
        num_studies: 93,
        data_type: 'binary',
        expected_columns: ['id', 'lnOR', 'selnOR', 'treat1', 'treat2'],
        num_treatments: 22,
        sample_values: {
            first_row: {
                id: 1
            }
        }
    },

    // dat.yusuf1985 - Beta Blockers for MI (21 studies)
    'dat.yusuf1985': {
        package: 'metadat',
        num_studies: 21,
        data_type: 'binary',
        expected_columns: ['table', 'id', 'trial', 'ai', 'n1i', 'ci', 'n2i']
    },

    // dat.raudenbush1985 - Teacher Expectations (19 studies)
    'dat.raudenbush1985': {
        package: 'metadat',
        num_studies: 19,
        data_type: 'continuous',
        expected_columns: ['study', 'author', 'year', 'weeks', 'setting', 'tester', 'n1i', 'n2i', 'yi', 'vi']
    },

    // dat.senn2013 - Glucose-Lowering Agents (26 studies)
    'dat.senn2013': {
        package: 'metadat',
        num_studies: 26,
        data_type: 'continuous',
        expected_columns: ['study', 'ni', 'treatment', 'comment', 'mi', 'sdi'],
        num_treatments: 10,
        total_arms: 53
    },

    // dat.dogliotti2014 - Antithrombotic Treatments (20 studies)
    'dat.dogliotti2014': {
        package: 'metadat',
        num_studies: 20,
        data_type: 'binary',
        expected_columns: ['study', 'id', 'treatment', 'stroke', 'total'],
        num_treatments: 8,
        total_participants: 79808
    },

    // dat.kearon1998 - Venous Ultrasonography DTA (30 studies)
    'dat.kearon1998': {
        package: 'metadat',
        num_studies: 30,
        data_type: 'diagnostic',
        expected_columns: ['id', 'author', 'year', 'patients', 'tp', 'np', 'tn', 'nn']
    },

    // dat.konstantopoulos2011 - School Calendars (56 effect sizes)
    'dat.konstantopoulos2011': {
        package: 'metadat',
        num_studies: 56,
        data_type: 'continuous',
        expected_columns: ['district', 'school', 'study', 'yi', 'vi', 'year']
    },

    // dat.berkey1998 - Periodontal Disease (5 studies, multivariate)
    'dat.berkey1998': {
        package: 'metadat',
        num_studies: 5,
        data_type: 'continuous'
    },

    // dat.linde2005 - St. John's Wort (26 studies)
    'dat.linde2005': {
        package: 'metadat',
        num_studies: 26,
        data_type: 'binary'
    },

    // dat.colditz1994 - BCG Vaccine (alias for dat.bcg)
    'dat.colditz1994': {
        package: 'metadat',
        num_studies: 13,
        data_type: 'binary',
        is_alias_of: 'dat.bcg'
    },

    // dat.riley2003 - Neuroblastoma Prognosis (81 studies)
    'dat.riley2003': {
        package: 'metadat',
        num_studies: 81,
        data_type: 'survival',
        expected_columns: ['study', 'yi', 'vi', 'sei', 'outcome']
    },

    // dat.pignon2000 - Head/Neck Cancer (65 trials)
    'dat.pignon2000': {
        package: 'metadat',
        num_studies: 65,
        data_type: 'survival',
        expected_columns: ['id', 'trial', 'OmE', 'V', 'grp']
    },

    // netmeta datasets
    'Baker2009': {
        package: 'netmeta',
        num_studies: 39,
        data_type: 'binary',
        is_alias_of: 'dat.baker2009'
    },

    'Dogliotti2014': {
        package: 'netmeta',
        num_studies: 20,
        data_type: 'binary',
        total_participants: 79808
    },

    'Linde2016': {
        package: 'netmeta',
        num_studies: 93,
        data_type: 'binary',
        num_treatments: 22
    },

    // meta datasets
    'Fleiss1993bin': {
        package: 'meta',
        data_type: 'binary',
        expected_columns: ['study', 'year', 'd.asp', 'n.asp', 'd.plac', 'n.plac']
    },

    'Olkin1995': {
        package: 'meta',
        data_type: 'binary',
        expected_columns: ['author', 'year', 'ev.exp', 'n.exp', 'ev.cont', 'n.cont']
    },

    // mada datasets (diagnostic accuracy)
    'AuditC': {
        package: 'mada',
        data_type: 'diagnostic',
        expected_columns: ['TP', 'FN', 'FP', 'TN']
    },

    'Dementia': {
        package: 'mada',
        data_type: 'diagnostic',
        expected_columns: ['TP', 'FN', 'FP', 'TN']
    }
};

/**
 * Load the R package datasets metadata
 */
function loadDatasetsMetadata() {
    try {
        const data = fs.readFileSync(CONFIG.datasetsJsonPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading datasets metadata: ${error.message}`);
        return null;
    }
}

/**
 * Load an exported dataset from the datasets folder
 */
function loadExportedDataset(datasetName) {
    const filePath = path.join(CONFIG.exportedDatasetsDir, `${datasetName}.json`);
    try {
        if (!fs.existsSync(filePath)) {
            return { error: 'not_exported', message: `Dataset file not found: ${filePath}` };
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { error: 'parse_error', message: error.message };
    }
}

/**
 * Validate a single dataset against ground truth
 */
function validateDataset(datasetName, exportedData, groundTruth) {
    const results = {
        dataset: datasetName,
        package: groundTruth?.package || 'unknown',
        tests: [],
        passed: 0,
        failed: 0,
        warnings: 0
    };

    // Check if data was loaded
    if (exportedData.error) {
        results.tests.push({
            test: 'data_loaded',
            status: 'failed',
            expected: 'data loaded successfully',
            actual: exportedData.message
        });
        results.failed++;
        return results;
    }

    // Ensure we have array data
    const dataArray = Array.isArray(exportedData) ? exportedData : exportedData.data || [];

    // Test 1: Number of studies/rows
    if (groundTruth?.num_studies) {
        const actualCount = dataArray.length;
        const test = {
            test: 'num_studies',
            expected: groundTruth.num_studies,
            actual: actualCount
        };

        if (actualCount === groundTruth.num_studies) {
            test.status = 'passed';
            results.passed++;
        } else {
            test.status = 'failed';
            test.difference = actualCount - groundTruth.num_studies;
            results.failed++;
        }
        results.tests.push(test);
    }

    // Test 2: Expected columns
    if (groundTruth?.expected_columns && dataArray.length > 0) {
        const actualColumns = Object.keys(dataArray[0]);
        const missingColumns = groundTruth.expected_columns.filter(col => !actualColumns.includes(col));
        const extraColumns = actualColumns.filter(col => !groundTruth.expected_columns.includes(col));

        const test = {
            test: 'columns',
            expected: groundTruth.expected_columns,
            actual: actualColumns,
            missing: missingColumns,
            extra: extraColumns
        };

        if (missingColumns.length === 0) {
            test.status = 'passed';
            results.passed++;
        } else {
            test.status = 'failed';
            results.failed++;
        }
        results.tests.push(test);
    }

    // Test 3: Sample values (first study)
    if (groundTruth?.sample_values?.first_study && dataArray.length > 0) {
        const firstRow = dataArray[0];
        const expected = groundTruth.sample_values.first_study;
        const mismatches = [];

        for (const [key, value] of Object.entries(expected)) {
            if (firstRow[key] !== value) {
                mismatches.push({
                    field: key,
                    expected: value,
                    actual: firstRow[key]
                });
            }
        }

        const test = {
            test: 'first_study_values',
            expected: expected,
            actual: firstRow,
            mismatches: mismatches
        };

        if (mismatches.length === 0) {
            test.status = 'passed';
            results.passed++;
        } else {
            test.status = 'failed';
            results.failed++;
        }
        results.tests.push(test);
    }

    // Test 4: Sample values (last study)
    if (groundTruth?.sample_values?.last_study && dataArray.length > 0) {
        const lastRow = dataArray[dataArray.length - 1];
        const expected = groundTruth.sample_values.last_study;
        const mismatches = [];

        for (const [key, value] of Object.entries(expected)) {
            if (lastRow[key] !== value) {
                mismatches.push({
                    field: key,
                    expected: value,
                    actual: lastRow[key]
                });
            }
        }

        const test = {
            test: 'last_study_values',
            expected: expected,
            actual: lastRow,
            mismatches: mismatches
        };

        if (mismatches.length === 0) {
            test.status = 'passed';
            results.passed++;
        } else {
            test.status = 'failed';
            results.failed++;
        }
        results.tests.push(test);
    }

    // Test 5: Totals validation
    if (groundTruth?.totals && dataArray.length > 0) {
        const calculatedTotals = {};
        for (const key of Object.keys(groundTruth.totals)) {
            const columnName = key.replace('total_', '');
            calculatedTotals[key] = dataArray.reduce((sum, row) => sum + (row[columnName] || 0), 0);
        }

        const mismatches = [];
        for (const [key, value] of Object.entries(groundTruth.totals)) {
            if (calculatedTotals[key] !== value) {
                mismatches.push({
                    field: key,
                    expected: value,
                    actual: calculatedTotals[key]
                });
            }
        }

        const test = {
            test: 'column_totals',
            expected: groundTruth.totals,
            actual: calculatedTotals,
            mismatches: mismatches
        };

        if (mismatches.length === 0) {
            test.status = 'passed';
            results.passed++;
        } else {
            test.status = 'failed';
            results.failed++;
        }
        results.tests.push(test);
    }

    // Test 6: Number of treatments (for NMA datasets)
    if (groundTruth?.num_treatments && dataArray.length > 0) {
        const treatmentColumn = ['treatment', 'trt', 'treat1', 'treat2'].find(
            col => dataArray[0].hasOwnProperty(col)
        );

        if (treatmentColumn) {
            const uniqueTreatments = new Set();
            dataArray.forEach(row => {
                if (row[treatmentColumn]) uniqueTreatments.add(row[treatmentColumn]);
                if (row.treat1) uniqueTreatments.add(row.treat1);
                if (row.treat2) uniqueTreatments.add(row.treat2);
            });

            const test = {
                test: 'num_treatments',
                expected: groundTruth.num_treatments,
                actual: uniqueTreatments.size,
                treatments: Array.from(uniqueTreatments)
            };

            if (uniqueTreatments.size === groundTruth.num_treatments) {
                test.status = 'passed';
                results.passed++;
            } else {
                test.status = 'warning';
                results.warnings++;
            }
            results.tests.push(test);
        }
    }

    // Test 7: Total participants
    if (groundTruth?.total_participants && dataArray.length > 0) {
        const sampleSizeColumns = ['total', 'n', 'ni', 'n1i', 'n2i', 'patients'];
        let totalParticipants = 0;

        for (const col of sampleSizeColumns) {
            if (dataArray[0].hasOwnProperty(col)) {
                totalParticipants = dataArray.reduce((sum, row) => sum + (row[col] || 0), 0);
                break;
            }
        }

        // For two-group designs, sum both groups
        if (dataArray[0].hasOwnProperty('n1i') && dataArray[0].hasOwnProperty('n2i')) {
            totalParticipants = dataArray.reduce((sum, row) =>
                sum + (row.n1i || 0) + (row.n2i || 0), 0);
        }

        const test = {
            test: 'total_participants',
            expected: groundTruth.total_participants,
            actual: totalParticipants
        };

        if (totalParticipants === groundTruth.total_participants) {
            test.status = 'passed';
            results.passed++;
        } else {
            test.status = 'warning';
            test.difference = totalParticipants - groundTruth.total_participants;
            results.warnings++;
        }
        results.tests.push(test);
    }

    // Test 8: Data type validation
    if (groundTruth?.data_type) {
        const test = {
            test: 'data_type',
            expected: groundTruth.data_type,
            detected: detectDataType(dataArray)
        };

        if (test.detected === groundTruth.data_type) {
            test.status = 'passed';
            results.passed++;
        } else {
            test.status = 'warning';
            results.warnings++;
        }
        results.tests.push(test);
    }

    return results;
}

/**
 * Detect the data type of a dataset based on its columns
 */
function detectDataType(dataArray) {
    if (!dataArray || dataArray.length === 0) return 'unknown';

    const columns = Object.keys(dataArray[0]).map(c => c.toLowerCase());

    // Diagnostic accuracy (TP, FP, TN, FN)
    if (columns.some(c => ['tp', 'fp', 'tn', 'fn'].includes(c))) {
        return 'diagnostic';
    }

    // Binary (events and totals)
    if (columns.some(c => ['tpos', 'tneg', 'cpos', 'cneg'].includes(c))) {
        return 'binary';
    }
    if (columns.some(c => c.includes('event') || c === 'exac' || c === 'stroke')) {
        return 'binary';
    }

    // Continuous (means and SDs)
    if (columns.some(c => c.includes('sd') || c.includes('mean') || c === 'yi')) {
        return 'continuous';
    }

    // Survival (hazard ratios, O-E)
    if (columns.some(c => c === 'hr' || c === 'ome' || c === 'sei')) {
        return 'survival';
    }

    // Network meta-analysis indicators
    if (columns.includes('treat1') && columns.includes('treat2')) {
        return 'binary'; // NMA is usually binary outcome
    }

    return 'unknown';
}

/**
 * Generate R code for exporting datasets
 */
function generateRExportCode() {
    const metadata = loadDatasetsMetadata();
    if (!metadata) return null;

    let rCode = `# R Script to Export Meta-Analysis Datasets to JSON
# Generated by validate_r_datasets.js
# Run this script in R to export datasets for validation

# Install required packages if not already installed
install_if_missing <- function(pkg) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    install.packages(pkg, repos = "https://cloud.r-project.org")
  }
}

install_if_missing("metadat")
install_if_missing("netmeta")
install_if_missing("meta")
install_if_missing("mada")
install_if_missing("jsonlite")

# Load libraries
library(metadat)
library(netmeta)
library(meta)
library(mada)
library(jsonlite)

# Create output directory
output_dir <- "datasets"
if (!dir.exists(output_dir)) {
  dir.create(output_dir)
}

# Function to export dataset to JSON
export_dataset <- function(dataset_name, package_name) {
  tryCatch({
    # Load the dataset
    data(list = dataset_name, package = package_name)
    df <- get(dataset_name)

    # Convert to JSON and save
    json_path <- file.path(output_dir, paste0(dataset_name, ".json"))
    write_json(df, json_path, pretty = TRUE, auto_unbox = TRUE)

    cat(sprintf("Exported: %s (%d rows)\\n", dataset_name, nrow(df)))
    return(TRUE)
  }, error = function(e) {
    cat(sprintf("Failed: %s - %s\\n", dataset_name, e$message))
    return(FALSE)
  })
}

# Export key datasets from metadat
cat("\\n=== Exporting metadat datasets ===\\n")
`;

    // Add metadat datasets
    const metadatDatasets = metadata.packages.metadat.datasets;
    for (const ds of metadatDatasets) {
        rCode += `export_dataset("${ds.name}", "metadat")\n`;
    }

    // Add netmeta datasets
    rCode += `\ncat("\\n=== Exporting netmeta datasets ===\\n")\n`;
    const netmetaDatasets = metadata.packages.netmeta.datasets;
    for (const ds of netmetaDatasets) {
        rCode += `export_dataset("${ds.name}", "netmeta")\n`;
    }

    // Add meta datasets
    rCode += `\ncat("\\n=== Exporting meta datasets ===\\n")\n`;
    const metaDatasets = metadata.packages.meta.datasets;
    for (const ds of metaDatasets) {
        rCode += `export_dataset("${ds.name}", "meta")\n`;
    }

    // Add mada datasets
    rCode += `\ncat("\\n=== Exporting mada datasets ===\\n")\n`;
    const madaDatasets = metadata.packages.mada.datasets;
    for (const ds of madaDatasets) {
        rCode += `export_dataset("${ds.name}", "mada")\n`;
    }

    rCode += `
cat("\\n=== Export Complete ===\\n")
cat(sprintf("Datasets exported to: %s\\n", normalizePath(output_dir)))
`;

    return rCode;
}

/**
 * Generate validation test cases
 */
function generateTestCases() {
    const testCases = [];

    for (const [datasetName, groundTruth] of Object.entries(GROUND_TRUTH)) {
        const testCase = {
            name: datasetName,
            package: groundTruth.package,
            data_type: groundTruth.data_type,
            tests: []
        };

        // Add specific tests based on ground truth
        if (groundTruth.num_studies) {
            testCase.tests.push({
                type: 'row_count',
                expected: groundTruth.num_studies,
                description: `Should have exactly ${groundTruth.num_studies} studies/rows`
            });
        }

        if (groundTruth.expected_columns) {
            testCase.tests.push({
                type: 'columns',
                expected: groundTruth.expected_columns,
                description: `Should have columns: ${groundTruth.expected_columns.join(', ')}`
            });
        }

        if (groundTruth.sample_values?.first_study) {
            testCase.tests.push({
                type: 'first_row',
                expected: groundTruth.sample_values.first_study,
                description: 'First row values should match expected'
            });
        }

        if (groundTruth.totals) {
            testCase.tests.push({
                type: 'totals',
                expected: groundTruth.totals,
                description: 'Column totals should match expected values'
            });
        }

        testCases.push(testCase);
    }

    return testCases;
}

/**
 * Run validation on all datasets
 */
function runValidation(specificDataset = null) {
    const results = {
        timestamp: new Date().toISOString(),
        summary: {
            total_datasets: 0,
            validated: 0,
            passed: 0,
            failed: 0,
            not_exported: 0
        },
        datasets: []
    };

    const datasetsToValidate = specificDataset
        ? { [specificDataset]: GROUND_TRUTH[specificDataset] }
        : GROUND_TRUTH;

    for (const [datasetName, groundTruth] of Object.entries(datasetsToValidate)) {
        if (!groundTruth) {
            console.log(`Unknown dataset: ${datasetName}`);
            continue;
        }

        results.summary.total_datasets++;
        console.log(`Validating: ${datasetName}...`);

        const exportedData = loadExportedDataset(datasetName);

        if (exportedData.error === 'not_exported') {
            results.summary.not_exported++;
            results.datasets.push({
                dataset: datasetName,
                status: 'not_exported',
                message: 'Dataset not yet exported from R'
            });
            continue;
        }

        const validationResult = validateDataset(datasetName, exportedData, groundTruth);
        results.summary.validated++;

        if (validationResult.failed === 0) {
            results.summary.passed++;
            validationResult.status = 'passed';
        } else {
            results.summary.failed++;
            validationResult.status = 'failed';
        }

        results.datasets.push(validationResult);
    }

    return results;
}

/**
 * Generate HTML validation report
 */
function generateHtmlReport(results) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>R Dataset Validation Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h2 { color: #444; margin-top: 30px; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card .number {
            font-size: 2.5em;
            font-weight: bold;
        }
        .summary-card .label { color: #666; }
        .passed .number { color: #28a745; }
        .failed .number { color: #dc3545; }
        .warning .number { color: #ffc107; }
        .not-exported .number { color: #6c757d; }

        .dataset {
            background: white;
            margin: 15px 0;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .dataset-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .dataset-name { font-size: 1.3em; font-weight: bold; }
        .dataset-package { color: #666; font-size: 0.9em; }
        .status-badge {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
        }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-not-exported { background: #e2e3e5; color: #383d41; }

        .test-results {
            display: grid;
            gap: 10px;
        }
        .test {
            display: flex;
            align-items: center;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .test-icon {
            width: 24px;
            height: 24px;
            margin-right: 10px;
            font-size: 1.2em;
        }
        .test-passed .test-icon::before { content: "\\2713"; color: #28a745; }
        .test-failed .test-icon::before { content: "\\2717"; color: #dc3545; }
        .test-warning .test-icon::before { content: "\\26A0"; color: #ffc107; }
        .test-name { font-weight: 500; flex: 1; }
        .test-details { color: #666; font-size: 0.9em; }

        .code-block {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
        }

        .instructions {
            background: #e7f3fe;
            border-left: 4px solid #007bff;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1>R Package Dataset Validation Report</h1>
    <p>Generated: ${results.timestamp}</p>

    <div class="summary">
        <div class="summary-card">
            <div class="number">${results.summary.total_datasets}</div>
            <div class="label">Total Datasets</div>
        </div>
        <div class="summary-card passed">
            <div class="number">${results.summary.passed}</div>
            <div class="label">Passed</div>
        </div>
        <div class="summary-card failed">
            <div class="number">${results.summary.failed}</div>
            <div class="label">Failed</div>
        </div>
        <div class="summary-card not-exported">
            <div class="number">${results.summary.not_exported}</div>
            <div class="label">Not Exported</div>
        </div>
    </div>

    ${results.summary.not_exported > 0 ? `
    <div class="instructions">
        <strong>Note:</strong> ${results.summary.not_exported} datasets have not been exported from R yet.
        Run the <code>export_r_datasets.R</code> script in R to export the datasets, then re-run validation.
    </div>
    ` : ''}

    <h2>Dataset Results</h2>

    ${results.datasets.map(ds => `
    <div class="dataset">
        <div class="dataset-header">
            <div>
                <span class="dataset-name">${ds.dataset}</span>
                <span class="dataset-package">(${ds.package || 'unknown'})</span>
            </div>
            <span class="status-badge status-${ds.status || 'not-exported'}">${(ds.status || 'not exported').toUpperCase()}</span>
        </div>
        ${ds.tests ? `
        <div class="test-results">
            ${ds.tests.map(test => `
            <div class="test test-${test.status}">
                <div class="test-icon"></div>
                <div class="test-name">${test.test}</div>
                <div class="test-details">
                    Expected: ${JSON.stringify(test.expected)} |
                    Actual: ${JSON.stringify(test.actual)}
                    ${test.mismatches?.length ? ` | Mismatches: ${test.mismatches.length}` : ''}
                </div>
            </div>
            `).join('')}
        </div>
        ` : `<p>${ds.message || 'No validation performed'}</p>`}
    </div>
    `).join('')}

    <h2>How to Export R Datasets</h2>
    <p>To export the datasets from R for validation, run the following in R:</p>
    <div class="code-block">
source("export_r_datasets.R")
    </div>
    <p>This will create JSON files in the <code>datasets/</code> folder that can be validated.</p>
</body>
</html>`;

    return html;
}

/**
 * Main execution
 */
function main() {
    const args = process.argv.slice(2);
    const specificDataset = args.find(a => a.startsWith('--dataset='))?.split('=')[1];
    const generateReport = args.includes('--report');
    const generateR = args.includes('--generate-r');

    console.log('=== R Package Dataset Validation ===\n');

    // Generate R export code if requested
    if (generateR) {
        const rCode = generateRExportCode();
        const rPath = path.join(__dirname, 'export_r_datasets_generated.R');
        fs.writeFileSync(rPath, rCode);
        console.log(`Generated R export script: ${rPath}\n`);
    }

    // Run validation
    const results = runValidation(specificDataset);

    // Output summary
    console.log('\n=== Validation Summary ===');
    console.log(`Total datasets: ${results.summary.total_datasets}`);
    console.log(`Validated: ${results.summary.validated}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);
    console.log(`Not exported: ${results.summary.not_exported}`);

    // Save JSON report
    fs.writeFileSync(CONFIG.reportOutputPath, JSON.stringify(results, null, 2));
    console.log(`\nJSON report saved: ${CONFIG.reportOutputPath}`);

    // Generate HTML report if requested
    if (generateReport) {
        const htmlReport = generateHtmlReport(results);
        fs.writeFileSync(CONFIG.htmlReportPath, htmlReport);
        console.log(`HTML report saved: ${CONFIG.htmlReportPath}`);
    }

    // Output test cases
    const testCases = generateTestCases();
    const testCasesPath = path.join(__dirname, 'test_cases.json');
    fs.writeFileSync(testCasesPath, JSON.stringify(testCases, null, 2));
    console.log(`Test cases saved: ${testCasesPath}`);

    // Return appropriate exit code
    process.exit(results.summary.failed > 0 ? 1 : 0);
}

// Export functions for use as module
module.exports = {
    loadDatasetsMetadata,
    loadExportedDataset,
    validateDataset,
    generateRExportCode,
    generateTestCases,
    runValidation,
    GROUND_TRUTH,
    CONFIG
};

// Run if executed directly
if (require.main === module) {
    main();
}
