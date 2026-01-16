const fs = require('fs');
const path = require('path');
const { RCTExtractor } = require('./RCTExtractor_v4_8_AI.js');

const baseDir = __dirname;

function stripBom(text) {
    return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

function normalizeText(text) {
    return stripBom(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function parseArgs(argv) {
    const args = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith('--')) {
            args._.push(arg);
            continue;
        }
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
            if (Object.prototype.hasOwnProperty.call(args, key)) {
                const existing = args[key];
                args[key] = Array.isArray(existing)
                    ? [...existing, next]
                    : [existing, next];
            } else {
                args[key] = next;
            }
            i++;
        } else {
            args[key] = true;
        }
    }
    return args;
}

const STUDY_NAME_STOPWORDS = new Set([
    'the',
    'two',
    'three',
    'one',
    'assigned',
    'our',
    'this',
    'that',
    'current',
    'previous',
    'after',
    'after the',
    'during',
    'during the',
    'from the',
    'overall',
    'list of',
    'results',
    'control',
    'controlled',
    'randomized',
    'randomised',
    'partners',
    'partner',
    'committee',
    'yes',
    'no',
    'end',
    'end of',
    'and',
    'with',
    'in',
    'of',
    'for',
    'one such',
    'among the',
    'these three',
    'outcomes the',
    'control therapy',
    'randomization and',
    'periodically at',
    'receive the',
    'provide the',
    'discontinued the',
    'heart failure',
    'inr',
    'kccq',
    'nyha',
    'lvef',
    'gfr',
    'bmi',
    'ecg',
    'iqr',
    'cabg',
    'pci',
    'timi',
    'paper',
    'study',
    'trial',
    'doi',
    'placebo',
    'placebo controlled',
    'placebo-controlled',
    'double blind',
    'double-blind',
    'single blind',
    'single-blind',
    'primary',
    'primary outcome',
    'primary endpoint',
    'primary end point'
]);

const STUDY_NAME_BLOCKLIST = new Set([
    'precise',
    'cabg',
    'pci'
]);

function normalizeStudyName(name) {
    return name
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function isBlocklistedStudyName(name) {
    if (!name) return false;
    const normalized = normalizeStudyName(name);
    if (!normalized) return false;
    return STUDY_NAME_BLOCKLIST.has(normalized);
}

function isLikelyStudyName(name) {
    if (!name) return false;
    const normalized = normalizeStudyName(name);
    if (!normalized) return false;
    if (STUDY_NAME_STOPWORDS.has(normalized)) return false;
    if (STUDY_NAME_BLOCKLIST.has(normalized)) return false;
    if (/^paper\s*\d+$/i.test(name)) return false;
    if (/^doi[:\s]/i.test(name)) return false;
    if (/^\d+$/.test(normalized)) return false;
    if (normalized.length < 3) return false;
    if (normalized.length > 40) return false;
    return true;
}

function printUsage() {
    const lines = [
        'Usage: node extract_cli.js [options] <file1.txt> [file2.txt ...]',
        '',
        'Options:',
        '  --input <file>     Single input file (repeatable)',
        '  --inputs <a,b>     Comma-separated input list',
        '  --dir <path>       Directory of .txt files (repeatable)',
        '  --ext <ext>        File extension to include (default: txt)',
        '  --recursive        Recurse into subdirectories for --dir',
        '  --output <path>    Write JSON results to path',
        '  --summary-only     Store compact per-file summaries in JSON output',
        '  --filter-clean     Keep only plausibly clean rows (summary-only)',
        '  --metafor <path>   Write metafor CSV to path (combines all inputs)',
        '  --rcode <path>     Write metafor R script to path',
        '  --summary          Print summary for each input',
        '  --quiet            Suppress stdout output',
        '  --help             Show this help message'
    ];
    process.stdout.write(`${lines.join('\n')}\n`);
}

function ensureDirForFile(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function resolveInputPath(filePath) {
    return path.isAbsolute(filePath) ? filePath : path.join(baseDir, filePath);
}

function listDirFiles(dirPath, ext, recursive) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (recursive) {
                files.push(...listDirFiles(entryPath, ext, recursive));
            }
            continue;
        }
        if (entry.isFile() && entry.name.toLowerCase().endsWith(ext)) {
            files.push(entryPath);
        }
    }
    return files;
}

function collectInputs(args) {
    const requested = [];
    const errors = [];
    if (args.inputs) {
        const inputsArgs = Array.isArray(args.inputs) ? args.inputs : [args.inputs];
        for (const entry of inputsArgs) {
            requested.push(
                ...String(entry).split(',').map(item => item.trim()).filter(Boolean)
            );
        }
    }
    if (args.input) {
        const inputArgs = Array.isArray(args.input) ? args.input : [args.input];
        requested.push(...inputArgs);
    }
    if (args._.length) {
        requested.push(...args._);
    }

    const extRaw = args.ext ? String(args.ext) : 'txt';
    const ext = extRaw.startsWith('.') ? extRaw.toLowerCase() : `.${extRaw.toLowerCase()}`;
    if (args.dir) {
        const dirArgs = Array.isArray(args.dir) ? args.dir : [args.dir];
        for (const dir of dirArgs) {
            const resolvedDir = resolveInputPath(dir);
            if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
                errors.push(`Missing directory: ${resolvedDir}`);
                continue;
            }
            requested.push(...listDirFiles(resolvedDir, ext, Boolean(args.recursive)));
        }
    }

    const unique = Array.from(new Set(requested.map(resolveInputPath)));
    return { inputFiles: unique, errors };
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printUsage();
        process.exit(0);
    }

    const { inputFiles, errors } = collectInputs(args);
    if (errors.length > 0) {
        process.stderr.write(`${errors.join('\n')}\n`);
    }
    if (inputFiles.length === 0) {
        printUsage();
        process.exit(1);
    }

    const totalFiles = inputFiles.length;
    const summaryOnly = Boolean(args['summary-only']);
    const filterClean = Boolean(args['filter-clean']);
    const showSummary = Boolean(args.summary) || !args.output;
    const quiet = Boolean(args.quiet);
    const results = [];
    const metaforResults = [];
    let hadError = false;

    function buildSummary(result) {
        const ratioTypes = new Set(['HR', 'RR', 'OR', 'RateRatio']);
        const minDomainConfidence = 0.7;
        const minSampleSize = 100;
        const maxCiRatio = 1.8;
        const primary = result.effectMeasures?.primary || {};
        const contrast = result.contrast || {};
        const studyCandidate = result.study?.acronym || result.trial?.acronym || null;
        const summary = {
            study: isLikelyStudyName(studyCandidate) ? studyCandidate : null,
            domain: result._meta?.domainName || result._meta?.domain || null,
            domainConfidence: result._meta?.domainConfidence ?? null,
            n: result.population?.n ?? null,
            treatmentN: result.treatment?.n ?? result.population?.treatmentN ?? null,
            controlN: result.control?.n ?? result.population?.controlN ?? null,
            primaryEffect: primary.value ?? contrast.effect ?? null,
            primaryEffectType: primary.type ?? contrast.measureType ?? null,
            primaryCiLo: primary.ciLo ?? contrast.ciLo ?? null,
            primaryCiHi: primary.ciHi ?? contrast.ciHi ?? null,
            followUpMonths: result.study?.followUp ?? result.followupNormalized?.months ?? null,
            grade: result.grade?.overallCertainty ?? null,
            rob2Overall: result._meta?.biasAssessment?.rob2?.overallJudgment ?? null,
            qualityGrade: result._meta?.qualityScore?.grade ?? null
        };
        const issues = [];
        const effect = summary.primaryEffect;
        const ciLo = summary.primaryCiLo;
        const ciHi = summary.primaryCiHi;
        const type = summary.primaryEffectType;

        if (!summary.study) {
            if (studyCandidate && isBlocklistedStudyName(studyCandidate)) {
                issues.push('study_name_blocklisted');
            } else {
                issues.push(studyCandidate ? 'study_name_filtered' : 'missing_study_name');
            }
        }
        if (!Number.isFinite(summary.n) || summary.n <= 0) {
            issues.push('missing_sample_size');
        }
        if (Number.isFinite(summary.n) && summary.n < minSampleSize) {
            issues.push('small_sample_size');
        }
        if (!Number.isFinite(effect)) {
            issues.push('missing_effect');
        }
        if (Number.isFinite(summary.domainConfidence) && summary.domainConfidence < minDomainConfidence) {
            issues.push('low_domain_confidence');
        }
        if (Number.isFinite(ciLo) && Number.isFinite(ciHi) && ciLo >= ciHi) {
            issues.push('invalid_ci_bounds');
        }
        if (type && ratioTypes.has(type)) {
            if (Number.isFinite(effect) && (effect < 0.3 || effect > 3)) {
                issues.push('effect_out_of_range');
            }
            if (!Number.isFinite(ciLo) || !Number.isFinite(ciHi)) {
                issues.push('missing_ci');
            }
            if (Number.isFinite(ciLo) && Number.isFinite(ciHi) && ciLo > 0 && ciHi > 0) {
                const ratio = ciHi / ciLo;
                if (ratio >= maxCiRatio) {
                    issues.push('ci_ratio_too_wide');
                }
            }
            if (Number.isFinite(ciLo) && ciLo <= 0) {
                issues.push('ci_nonpositive');
            }
            if (Number.isFinite(ciHi) && ciHi <= 0) {
                issues.push('ci_nonpositive');
            }
        }

        summary.plausibility = {
            clean: issues.length === 0,
            issues
        };
        return summary;
    }

    for (let index = 0; index < inputFiles.length; index++) {
        const filePath = inputFiles[index];
        const displayName = path.basename(filePath);
        if (!fs.existsSync(filePath)) {
            const message = `Missing input file: ${filePath}`;
            if (!quiet) {
                process.stderr.write(`${message}\n`);
            }
            results.push({ file: displayName, path: filePath, error: message });
            hadError = true;
            continue;
        }

        try {
            if (!quiet) {
                process.stdout.write(`Processing (${index + 1}/${totalFiles}): ${displayName}\n`);
            }
            const text = normalizeText(fs.readFileSync(filePath, 'utf8'));
            const result = RCTExtractor.extract(text);
            if (summaryOnly) {
                const summary = buildSummary(result);
                if (!filterClean || summary.plausibility.clean) {
                    results.push({ file: displayName, path: filePath, summary });
                }
            } else {
                results.push({ file: displayName, path: filePath, result });
            }
            if (args.metafor || args.rcode) {
                metaforResults.push(result);
            }

            if (showSummary && !quiet) {
                const summary = RCTExtractor.getSummary(result);
                process.stdout.write(`\n=== ${displayName} ===\n${summary}\n`);
            }
        } catch (err) {
            const message = `Extraction failed for ${displayName}: ${err.message}`;
            if (!quiet) {
                process.stderr.write(`${message}\n`);
            }
            results.push({ file: displayName, path: filePath, error: message });
            hadError = true;
        }
    }

    if (args.output) {
        const outputPath = path.resolve(baseDir, args.output);
        ensureDirForFile(outputPath);
        const payload = {
            generatedAt: new Date().toISOString(),
            results
        };
        fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
        if (!quiet) {
            process.stdout.write(`\nWrote JSON: ${outputPath}\n`);
        }
    }

    if (args.metafor) {
        if (metaforResults.length === 0) {
            if (!quiet) {
                process.stderr.write('No successful extractions for metafor export\n');
            }
            hadError = true;
        } else {
            const outputPath = path.resolve(baseDir, args.metafor);
            ensureDirForFile(outputPath);
            const metafor = RCTExtractor.exportMetaforFormat(metaforResults);
            fs.writeFileSync(outputPath, metafor.csvFormat);
            if (!quiet) {
                process.stdout.write(`Wrote metafor CSV: ${outputPath}\n`);
            }
            if (args.rcode) {
                const rPath = path.resolve(baseDir, args.rcode);
                ensureDirForFile(rPath);
                fs.writeFileSync(rPath, metafor.rCode);
                if (!quiet) {
                    process.stdout.write(`Wrote R code: ${rPath}\n`);
                }
            }
        }
    }

    if (hadError) {
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
