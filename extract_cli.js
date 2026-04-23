#!/usr/bin/env node
/**
 * RCTExtractor CLI - Enhanced Command Line Interface for RCT Data Extraction
 * @version 4.9.6
 * @license MIT
 *
 * Features:
 * - Interactive mode with guided prompts
 * - Progress bars and spinners
 * - Colorized output
 * - Tab completion support
 * - Configuration file support (.rctextractorrc)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Lazy-load heavy dependencies
let inquirer, ora, chalk, cliProgress;

const baseDir = __dirname;
const VERSION = '4.9.6';

// ============================================================
// CONFIGURATION FILE SUPPORT
// ============================================================

const CONFIG_FILE_NAMES = [
    '.rctextractorrc',
    '.rctextractorrc.json',
    '.rctextractorrc.js',
    'rctextractor.config.js',
    'rctextractor.config.json'
];

function findConfigFile() {
    // Search in current directory, then home directory
    const searchPaths = [process.cwd(), os.homedir(), baseDir];

    for (const searchPath of searchPaths) {
        for (const configName of CONFIG_FILE_NAMES) {
            const configPath = path.join(searchPath, configName);
            if (fs.existsSync(configPath)) {
                return configPath;
            }
        }
    }
    return null;
}

function loadConfig(configPath) {
    if (!configPath) return {};

    try {
        const ext = path.extname(configPath);
        if (ext === '.js') {
            return require(configPath);
        } else {
            const content = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(content);
        }
    } catch (err) {
        console.error(`Warning: Failed to load config from ${configPath}: ${err.message}`);
        return {};
    }
}

function createDefaultConfig() {
    return {
        // Default options
        output: null,
        format: 'json',
        summaryOnly: false,
        filterClean: false,
        recursive: false,
        ext: 'txt',
        quiet: false,
        color: true,
        interactive: false,

        // Default directories
        defaultInputDir: null,
        defaultOutputDir: null,

        // Export settings
        metafor: null,
        rcode: null,

        // Display preferences
        showProgress: true,
        showSummary: true,
        verbosity: 'normal' // 'quiet', 'normal', 'verbose'
    };
}

function mergeConfig(defaults, fileConfig, cliArgs) {
    return { ...defaults, ...fileConfig, ...cliArgs };
}

// ============================================================
// COLOR UTILITIES (enhanced with chalk fallback)
// ============================================================

const isColorSupported = process.stdout.isTTY && !process.env.NO_COLOR;

// ANSI fallback colors
const ansiColors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m'
};

function getColorizer() {
    if (!isColorSupported) {
        // Return no-op functions
        const noop = (text) => text;
        return {
            red: noop, green: noop, yellow: noop, blue: noop,
            magenta: noop, cyan: noop, white: noop, gray: noop,
            bold: noop, dim: noop, italic: noop, underline: noop,
            bgRed: noop, bgGreen: noop, bgYellow: noop, bgBlue: noop
        };
    }

    // Try to use chalk if available
    try {
        if (!chalk) chalk = require('chalk');
        return chalk;
    } catch {
        // Fall back to ANSI codes
        const colorFn = (colorName) => (text) =>
            `${ansiColors[colorName] || ''}${text}${ansiColors.reset}`;

        return {
            red: colorFn('red'),
            green: colorFn('green'),
            yellow: colorFn('yellow'),
            blue: colorFn('blue'),
            magenta: colorFn('magenta'),
            cyan: colorFn('cyan'),
            white: colorFn('white'),
            gray: colorFn('gray'),
            bold: colorFn('bold'),
            dim: colorFn('dim'),
            italic: colorFn('italic'),
            underline: colorFn('underline'),
            bgRed: colorFn('bgRed'),
            bgGreen: colorFn('bgGreen'),
            bgYellow: colorFn('bgYellow'),
            bgBlue: colorFn('bgBlue')
        };
    }
}

const c = getColorizer();

// Semantic color functions
const success = (text) => c.green(text);
const warning = (text) => c.yellow(text);
const error = (text) => c.red(text);
const info = (text) => c.cyan(text);
const highlight = (text) => c.bold(c.white(text));
const muted = (text) => c.dim(text);

// ============================================================
// SPINNER UTILITIES
// ============================================================

function createSpinner(text) {
    try {
        if (!ora) ora = require('ora');
        return ora({
            text,
            spinner: 'dots',
            color: 'cyan'
        });
    } catch {
        // Fallback spinner for when ora is not available
        const frames = ['|', '/', '-', '\\'];
        let frameIndex = 0;
        let interval = null;
        let currentText = text;

        return {
            start() {
                if (!process.stdout.isTTY) {
                    process.stdout.write(`${currentText}\n`);
                    return this;
                }
                interval = setInterval(() => {
                    process.stdout.write(`\r${frames[frameIndex]} ${currentText}`);
                    frameIndex = (frameIndex + 1) % frames.length;
                }, 80);
                return this;
            },
            stop() {
                if (interval) {
                    clearInterval(interval);
                    interval = null;
                    process.stdout.write('\r' + ' '.repeat(currentText.length + 3) + '\r');
                }
                return this;
            },
            succeed(msg) {
                this.stop();
                process.stdout.write(`${success('\u2714')} ${msg || currentText}\n`);
                return this;
            },
            fail(msg) {
                this.stop();
                process.stdout.write(`${error('\u2718')} ${msg || currentText}\n`);
                return this;
            },
            warn(msg) {
                this.stop();
                process.stdout.write(`${warning('\u26A0')} ${msg || currentText}\n`);
                return this;
            },
            info(msg) {
                this.stop();
                process.stdout.write(`${info('\u2139')} ${msg || currentText}\n`);
                return this;
            },
            text: currentText,
            set text(val) { currentText = val; }
        };
    }
}

// ============================================================
// PROGRESS BAR UTILITIES
// ============================================================

function createProgressBar(total, options = {}) {
    const defaultOptions = {
        format: '{bar} {percentage}% | {value}/{total} | {filename}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: true,
        stopOnComplete: true
    };

    try {
        if (!cliProgress) cliProgress = require('cli-progress');
        const bar = new cliProgress.SingleBar(
            { ...defaultOptions, ...options },
            cliProgress.Presets.shades_classic
        );
        bar.start(total, 0, { filename: '' });
        return bar;
    } catch {
        // Fallback progress bar
        let current = 0;
        let filename = '';
        const barLength = 30;

        function render() {
            if (!process.stdout.isTTY) return;
            const percent = Math.round((current / total) * 100);
            const filled = Math.round(barLength * (current / total));
            const bar = success('\u2588'.repeat(filled)) + muted('\u2591'.repeat(barLength - filled));
            const display = filename.length > 25 ? filename.slice(0, 22) + '...' : filename.padEnd(25);
            process.stdout.write(`\r[${bar}] ${percent}% | ${current}/${total} | ${display}`);
        }

        return {
            update(value, payload = {}) {
                current = value;
                if (payload.filename) filename = payload.filename;
                render();
            },
            increment(payload = {}) {
                current++;
                if (payload.filename) filename = payload.filename;
                render();
            },
            stop() {
                if (process.stdout.isTTY) {
                    process.stdout.write('\r' + ' '.repeat(80) + '\r');
                }
            }
        };
    }
}

// ============================================================
// TAB COMPLETION SUPPORT
// ============================================================

function setupTabCompletion() {
    // Generate completion script for bash/zsh
    const completionScript = `
###-begin-rctextract-completions-###
#
# RCTExtractor CLI tab completion
#
_rctextract_completions() {
    local cur="\${COMP_WORDS[COMP_CWORD]}"
    local prev="\${COMP_WORDS[COMP_CWORD-1]}"

    # Options
    local opts="--help --version --input --inputs --dir --ext --recursive --output --summary-only --filter-clean --metafor --rcode --summary --quiet --no-color --interactive --config --init-config --completion"
    local short_opts="-h -v -i -d -o -r -s -q"

    # File extensions
    local extensions="txt pdf html xml json"

    case "\${prev}" in
        -i|--input|-d|--dir|-o|--output|--metafor|--rcode|--config)
            # File/directory completion
            COMPREPLY=( $(compgen -f -- "\${cur}") )
            return 0
            ;;
        --ext)
            COMPREPLY=( $(compgen -W "\${extensions}" -- "\${cur}") )
            return 0
            ;;
    esac

    if [[ \${cur} == -* ]]; then
        COMPREPLY=( $(compgen -W "\${opts} \${short_opts}" -- "\${cur}") )
        return 0
    fi

    # Default to file completion
    COMPREPLY=( $(compgen -f -- "\${cur}") )
}
complete -F _rctextract_completions rctextract
complete -F _rctextract_completions node
###-end-rctextract-completions-###
`;
    return completionScript;
}

function setupZshCompletion() {
    const zshScript = `
#compdef rctextract

_rctextract() {
    local -a options
    options=(
        '-h[Show help]'
        '--help[Show help]'
        '-v[Show version]'
        '--version[Show version]'
        '-i[Input file]:file:_files'
        '--input[Input file]:file:_files'
        '--inputs[Comma-separated inputs]:files:'
        '-d[Input directory]:directory:_files -/'
        '--dir[Input directory]:directory:_files -/'
        '--ext[File extension]:extension:(txt pdf html xml json)'
        '-r[Recursive search]'
        '--recursive[Recursive search]'
        '-o[Output file]:file:_files'
        '--output[Output file]:file:_files'
        '--summary-only[Compact summaries only]'
        '--filter-clean[Filter clean rows only]'
        '--metafor[Metafor CSV output]:file:_files'
        '--rcode[R code output]:file:_files'
        '-s[Show summary]'
        '--summary[Show summary]'
        '-q[Quiet mode]'
        '--quiet[Quiet mode]'
        '--no-color[Disable colors]'
        '--interactive[Interactive mode]'
        '--config[Config file]:file:_files'
        '--init-config[Initialize config file]'
        '--completion[Show completion script]'
    )
    _arguments $options '*:file:_files'
}

_rctextract "$@"
`;
    return zshScript;
}

// ============================================================
// INTERACTIVE MODE
// ============================================================

async function runInteractiveMode(config) {
    try {
        if (!inquirer) inquirer = require('inquirer');
    } catch (err) {
        console.error(error('Interactive mode requires inquirer. Install with: npm install inquirer'));
        process.exit(1);
    }

    console.log('\n' + c.bold(c.cyan('='.repeat(60))));
    console.log(c.bold(c.cyan('  RCTExtractor Interactive Mode')));
    console.log(c.bold(c.cyan('='.repeat(60))) + '\n');

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'inputType',
            message: 'How would you like to provide input?',
            choices: [
                { name: 'Single file', value: 'single' },
                { name: 'Multiple files', value: 'multiple' },
                { name: 'Directory', value: 'directory' }
            ]
        },
        {
            type: 'input',
            name: 'inputPath',
            message: (answers) => {
                if (answers.inputType === 'single') return 'Enter the file path:';
                if (answers.inputType === 'multiple') return 'Enter file paths (comma-separated):';
                return 'Enter the directory path:';
            },
            validate: (input, answers) => {
                if (!input.trim()) return 'Please enter a path';
                if (answers.inputType === 'directory') {
                    const resolved = path.resolve(input);
                    if (!fs.existsSync(resolved)) return `Directory not found: ${resolved}`;
                    if (!fs.statSync(resolved).isDirectory()) return `Not a directory: ${resolved}`;
                }
                return true;
            }
        },
        {
            type: 'confirm',
            name: 'recursive',
            message: 'Search subdirectories recursively?',
            default: false,
            when: (answers) => answers.inputType === 'directory'
        },
        {
            type: 'input',
            name: 'ext',
            message: 'File extension to include:',
            default: 'txt',
            when: (answers) => answers.inputType === 'directory'
        },
        {
            type: 'confirm',
            name: 'wantOutput',
            message: 'Save results to a file?',
            default: true
        },
        {
            type: 'list',
            name: 'outputFormat',
            message: 'Output format:',
            choices: [
                { name: 'JSON (full extraction results)', value: 'json' },
                { name: 'JSON (summary only)', value: 'summary' },
                { name: 'CSV (metafor format)', value: 'csv' },
                { name: 'Both JSON and CSV', value: 'both' }
            ],
            when: (answers) => answers.wantOutput
        },
        {
            type: 'input',
            name: 'outputPath',
            message: (answers) => {
                if (answers.outputFormat === 'csv') return 'Output CSV file path:';
                if (answers.outputFormat === 'both') return 'Output JSON file path:';
                return 'Output JSON file path:';
            },
            default: (answers) => {
                const ext = answers.outputFormat === 'csv' ? 'csv' : 'json';
                return `extraction_results.${ext}`;
            },
            when: (answers) => answers.wantOutput
        },
        {
            type: 'input',
            name: 'csvPath',
            message: 'Output CSV file path:',
            default: 'metafor_data.csv',
            when: (answers) => answers.outputFormat === 'both'
        },
        {
            type: 'confirm',
            name: 'generateRCode',
            message: 'Generate R script for metafor analysis?',
            default: true,
            when: (answers) => answers.outputFormat === 'csv' || answers.outputFormat === 'both'
        },
        {
            type: 'input',
            name: 'rcodePath',
            message: 'R script file path:',
            default: 'analysis.R',
            when: (answers) => answers.generateRCode
        },
        {
            type: 'confirm',
            name: 'filterClean',
            message: 'Filter to only plausibly clean extractions?',
            default: false,
            when: (answers) => answers.outputFormat === 'summary'
        },
        {
            type: 'confirm',
            name: 'showSummary',
            message: 'Display extraction summaries in console?',
            default: true
        }
    ]);

    // Build CLI arguments from interactive answers
    const args = { _: [] };

    if (answers.inputType === 'single') {
        args.input = answers.inputPath.trim();
    } else if (answers.inputType === 'multiple') {
        args.inputs = answers.inputPath;
    } else {
        args.dir = answers.inputPath.trim();
        args.recursive = answers.recursive;
        args.ext = answers.ext;
    }

    if (answers.wantOutput) {
        if (answers.outputFormat === 'summary') {
            args['summary-only'] = true;
            args.output = answers.outputPath;
        } else if (answers.outputFormat === 'json') {
            args.output = answers.outputPath;
        } else if (answers.outputFormat === 'csv') {
            args.metafor = answers.outputPath;
        } else if (answers.outputFormat === 'both') {
            args.output = answers.outputPath;
            args.metafor = answers.csvPath;
        }

        if (answers.generateRCode) {
            args.rcode = answers.rcodePath;
        }
    }

    if (answers.filterClean) {
        args['filter-clean'] = true;
    }

    args.summary = answers.showSummary;

    console.log('\n' + muted('Starting extraction with your settings...\n'));

    return args;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

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
        if (!arg.startsWith('--') && !arg.startsWith('-')) {
            args._.push(arg);
            continue;
        }

        // Handle short flags
        if (arg.startsWith('-') && !arg.startsWith('--')) {
            const key = arg.slice(1);
            const next = argv[i + 1];
            if (next && !next.startsWith('-')) {
                args[key] = next;
                i++;
            } else {
                args[key] = true;
            }
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

// ============================================================
// STUDY NAME VALIDATION
// ============================================================

const STUDY_NAME_STOPWORDS = new Set([
    'the', 'two', 'three', 'one', 'assigned', 'our', 'this', 'that',
    'current', 'previous', 'after', 'after the', 'during', 'during the',
    'from the', 'overall', 'list of', 'results', 'control', 'controlled',
    'randomized', 'randomised', 'partners', 'partner', 'committee',
    'yes', 'no', 'end', 'end of', 'and', 'with', 'in', 'of', 'for',
    'one such', 'among the', 'these three', 'outcomes the', 'control therapy',
    'randomization and', 'periodically at', 'receive the', 'provide the',
    'discontinued the', 'heart failure', 'inr', 'kccq', 'nyha', 'lvef',
    'gfr', 'bmi', 'ecg', 'iqr', 'cabg', 'pci', 'timi', 'paper', 'study',
    'trial', 'doi', 'placebo', 'placebo controlled', 'placebo-controlled',
    'double blind', 'double-blind', 'single blind', 'single-blind',
    'primary', 'primary outcome', 'primary endpoint', 'primary end point'
]);

const STUDY_NAME_BLOCKLIST = new Set(['precise', 'cabg', 'pci']);

function normalizeStudyName(name) {
    return name.replace(/[^a-zA-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isBlocklistedStudyName(name) {
    if (!name) return false;
    const normalized = normalizeStudyName(name);
    return normalized ? STUDY_NAME_BLOCKLIST.has(normalized) : false;
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
    if (normalized.length < 3 || normalized.length > 40) return false;
    return true;
}

// ============================================================
// HELP AND VERSION OUTPUT
// ============================================================

function printBanner() {
    const banner = `
${c.bold(c.cyan('  ____   ____ _____ _____      _                  _             '))}
${c.bold(c.cyan(' |  _ \\ / ___|_   _| ____|_  _| |_ _ __ __ _  ___| |_ ___  _ __ '))}
${c.bold(c.cyan(' | |_) | |     | | |  _| \\ \\/ / __| \'__/ _\` |/ __| __/ _ \\| \'__|'))}
${c.bold(c.cyan(' |  _ <| |___  | | | |___ >  <| |_| | | (_| | (__| || (_) | |   '))}
${c.bold(c.cyan(' |_| \\_\\\\____| |_| |_____/_/\\_\\\\__|_|  \\__,_|\\___|\\__\\___/|_|   '))}
${muted('  AI-powered clinical trial data extraction')}  ${c.yellow('v' + VERSION)}
`;
    return banner;
}

function printUsage() {
    const usage = `
${printBanner()}

${c.bold('USAGE')}
  ${success('rctextract')} [options] <file1.txt> [file2.txt ...]
  ${muted('node extract_cli.js')} [options] <file1.txt> [file2.txt ...]

${c.bold('INPUT OPTIONS')}
  ${c.yellow('-i, --input')} <file>       Single input file (repeatable)
  ${c.yellow('--inputs')} <a,b,c>         Comma-separated input list
  ${c.yellow('-d, --dir')} <path>         Directory of files (repeatable)
  ${c.yellow('--ext')} <ext>              File extension (default: txt)
  ${c.yellow('-r, --recursive')}          Recurse into subdirectories

${c.bold('OUTPUT OPTIONS')}
  ${c.yellow('-o, --output')} <path>      Write JSON results to path
  ${c.yellow('--summary-only')}           Store compact per-file summaries
  ${c.yellow('--filter-clean')}           Keep only plausibly clean rows
  ${c.yellow('--metafor')} <path>         Write metafor CSV to path
  ${c.yellow('--rcode')} <path>           Write metafor R script to path

${c.bold('DISPLAY OPTIONS')}
  ${c.yellow('-s, --summary')}            Print summary for each input
  ${c.yellow('-q, --quiet')}              Suppress stdout output
  ${c.yellow('--no-color')}               Disable colored output

${c.bold('INTERACTIVE & CONFIG')}
  ${c.yellow('--interactive')}            Run in interactive mode with prompts
  ${c.yellow('--config')} <path>          Use specific config file
  ${c.yellow('--init-config')}            Create default .rctextractorrc file
  ${c.yellow('--completion')} [shell]     Output shell completion script (bash/zsh)

${c.bold('INFO')}
  ${c.yellow('-v, --version')}            Show version number
  ${c.yellow('-h, --help')}               Show this help message

${c.bold('EXAMPLES')}
  ${muted('# Extract from a single file')}
  ${success('rctextract')} paper.txt

  ${muted('# Interactive mode with guided prompts')}
  ${success('rctextract')} --interactive

  ${muted('# Extract from multiple files with JSON output')}
  ${success('rctextract')} -i paper1.txt -i paper2.txt -o results.json

  ${muted('# Process a directory recursively')}
  ${success('rctextract')} --dir ./papers --recursive --output all_results.json

  ${muted('# Export for R/metafor analysis')}
  ${success('rctextract')} --dir ./papers --metafor data.csv --rcode analysis.R

  ${muted('# Quick summary with filtering')}
  ${success('rctextract')} --dir ./papers --summary-only --filter-clean

  ${muted('# Initialize configuration file')}
  ${success('rctextract')} --init-config

${c.bold('CONFIGURATION FILE')}
  Create ${c.cyan('.rctextractorrc')} in your project or home directory:
  ${muted(JSON.stringify({ output: 'results.json', recursive: true, ext: 'txt' }, null, 2).split('\n').join('\n  '))}

${c.bold('TAB COMPLETION')}
  ${muted('# Add to your ~/.bashrc or ~/.zshrc:')}
  eval "$(rctextract --completion bash)"
  ${muted('# Or for zsh:')}
  eval "$(rctextract --completion zsh)"

${c.bold('OUTPUT FORMATS')}
  ${c.cyan('JSON')}     Full extraction results with all fields
  ${c.cyan('CSV')}      Metafor-compatible format for meta-analysis in R
  ${c.cyan('Summary')}  Compact per-study summaries

${c.bold('MORE INFO')}
  Documentation: ${c.blue('https://github.com/rctextractor/rctextractor')}
  Report issues: ${c.blue('https://github.com/rctextractor/rctextractor/issues')}
`;

    process.stdout.write(usage + '\n');
}

function printVersion() {
    process.stdout.write(`${c.cyan('rctextractor')} version ${c.bold(VERSION)}\n`);
}

function initConfigFile() {
    const configPath = path.join(process.cwd(), '.rctextractorrc');

    if (fs.existsSync(configPath)) {
        console.log(warning(`Config file already exists: ${configPath}`));
        return false;
    }

    const defaultConfig = {
        // Input settings
        ext: 'txt',
        recursive: false,

        // Output settings
        output: null,
        summaryOnly: false,
        filterClean: false,

        // Export settings
        metafor: null,
        rcode: null,

        // Display settings
        color: true,
        showProgress: true,
        showSummary: true,
        quiet: false,

        // Default paths (optional)
        defaultInputDir: null,
        defaultOutputDir: null
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(success(`Created config file: ${configPath}`));
    console.log(muted('Edit this file to customize default behavior.'));
    return true;
}

// ============================================================
// FILE HANDLING
// ============================================================

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

// ============================================================
// SUMMARY BUILDER
// ============================================================

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

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
    let args = parseArgs(process.argv.slice(2));

    // Handle short flags
    if (args.h) args.help = true;
    if (args.v) args.version = true;
    if (args.i) args.input = args.i;
    if (args.d) args.dir = args.d;
    if (args.o) args.output = args.o;
    if (args.r) args.recursive = true;
    if (args.s) args.summary = true;
    if (args.q) args.quiet = true;

    // Handle special commands
    if (args.version) {
        printVersion();
        process.exit(0);
    }

    if (args.help) {
        printUsage();
        process.exit(0);
    }

    if (args['init-config']) {
        initConfigFile();
        process.exit(0);
    }

    if (args.completion) {
        const shell = typeof args.completion === 'string' ? args.completion : 'bash';
        if (shell === 'zsh') {
            process.stdout.write(setupZshCompletion());
        } else {
            process.stdout.write(setupTabCompletion());
        }
        process.exit(0);
    }

    // Load configuration
    const configPath = args.config || findConfigFile();
    const fileConfig = loadConfig(configPath);
    const defaultConfig = createDefaultConfig();
    const config = mergeConfig(defaultConfig, fileConfig, args);

    // Interactive mode
    if (args.interactive || (args._.length === 0 && !args.input && !args.inputs && !args.dir)) {
        // If no inputs provided, offer interactive mode
        if (!args.interactive && process.stdin.isTTY) {
            try {
                if (!inquirer) inquirer = require('inquirer');
                const { useInteractive } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'useInteractive',
                    message: 'No input files specified. Would you like to use interactive mode?',
                    default: true
                }]);
                if (useInteractive) {
                    args = await runInteractiveMode(config);
                } else {
                    printUsage();
                    process.exit(1);
                }
            } catch {
                printUsage();
                process.exit(1);
            }
        } else if (args.interactive) {
            args = await runInteractiveMode(config);
        } else {
            printUsage();
            process.exit(1);
        }
    }

    // Load extractor
    let RCTExtractor;
    const spinner = createSpinner('Loading RCTExtractor...');

    if (!args.quiet) spinner.start();

    try {
        const extractorModule = require('./RCTExtractor_v4_8_AI.js');
        RCTExtractor = extractorModule.RCTExtractor;
        if (!args.quiet) spinner.succeed('RCTExtractor loaded');
    } catch (err) {
        if (!args.quiet) spinner.fail(`Failed to load RCTExtractor: ${err.message}`);
        process.exit(1);
    }

    const { inputFiles, errors } = collectInputs(args);

    if (errors.length > 0) {
        errors.forEach(err => console.error(error(`Error: ${err}`)));
    }

    if (inputFiles.length === 0) {
        console.error(error('No input files found'));
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

    if (!quiet) {
        console.log(info(`\nProcessing ${totalFiles} file${totalFiles > 1 ? 's' : ''}...\n`));
    }

    const startTime = Date.now();

    // Create progress bar for multiple files
    let progressBar = null;
    if (!quiet && totalFiles > 1 && process.stdout.isTTY) {
        progressBar = createProgressBar(totalFiles);
    }

    for (let index = 0; index < inputFiles.length; index++) {
        const filePath = inputFiles[index];
        const displayName = path.basename(filePath);

        if (!fs.existsSync(filePath)) {
            const message = `Missing input file: ${filePath}`;
            if (!quiet) {
                if (progressBar) progressBar.stop();
                console.error(`${error('\u2718')} ${message}`);
            }
            results.push({ file: displayName, path: filePath, error: message });
            hadError = true;
            continue;
        }

        try {
            // Update progress
            if (progressBar) {
                progressBar.update(index, { filename: displayName });
            } else if (!quiet && totalFiles === 1) {
                const fileSpinner = createSpinner(`Processing ${displayName}...`);
                fileSpinner.start();
            }

            const extractStart = Date.now();
            const text = normalizeText(fs.readFileSync(filePath, 'utf8'));
            const result = RCTExtractor.extract(text);
            const extractTime = Date.now() - extractStart;

            if (summaryOnly) {
                const summary = buildSummary(result);
                if (!filterClean || summary.plausibility.clean) {
                    results.push({ file: displayName, path: filePath, summary, processingTime: extractTime });
                }
            } else {
                results.push({ file: displayName, path: filePath, result, processingTime: extractTime });
            }

            if (args.metafor || args.rcode) {
                metaforResults.push(result);
            }

            if (showSummary && !quiet && !progressBar) {
                const summaryText = RCTExtractor.getSummary(result);
                console.log(`\n${c.bold(c.cyan(`=== ${displayName} ===`))}\n${summaryText}`);
            }

            if (progressBar) {
                progressBar.increment({ filename: displayName });
            }

        } catch (err) {
            const message = `Extraction failed for ${displayName}: ${err.message}`;
            if (!quiet) {
                if (progressBar) progressBar.stop();
                console.error(`${error('\u2718')} ${message}`);
            }
            results.push({ file: displayName, path: filePath, error: message });
            hadError = true;
        }
    }

    // Stop progress bar
    if (progressBar) {
        progressBar.stop();
    }

    const totalTime = Date.now() - startTime;

    // Write outputs
    if (args.output) {
        const outputPath = path.resolve(baseDir, args.output);
        ensureDirForFile(outputPath);
        const payload = {
            generatedAt: new Date().toISOString(),
            version: VERSION,
            totalFiles: totalFiles,
            successCount: results.filter(r => !r.error).length,
            errorCount: results.filter(r => r.error).length,
            totalProcessingTime: totalTime,
            results
        };
        fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
        if (!quiet) {
            console.log(`${success('\u2714')} Wrote JSON: ${outputPath}`);
        }
    }

    if (args.metafor) {
        if (metaforResults.length === 0) {
            if (!quiet) {
                console.error(`${error('\u2718')} No successful extractions for metafor export`);
            }
            hadError = true;
        } else {
            const outputPath = path.resolve(baseDir, args.metafor);
            ensureDirForFile(outputPath);
            const metafor = RCTExtractor.exportMetaforFormat(metaforResults);
            fs.writeFileSync(outputPath, metafor.csvFormat);
            if (!quiet) {
                console.log(`${success('\u2714')} Wrote metafor CSV: ${outputPath}`);
            }
            if (args.rcode) {
                const rPath = path.resolve(baseDir, args.rcode);
                ensureDirForFile(rPath);
                fs.writeFileSync(rPath, metafor.rCode);
                if (!quiet) {
                    console.log(`${success('\u2714')} Wrote R code: ${rPath}`);
                }
            }
        }
    }

    // Print summary statistics
    if (!quiet) {
        const successCount = results.filter(r => !r.error).length;
        const errorCount = results.filter(r => r.error).length;

        console.log('\n' + c.bold('Summary'));
        console.log(c.dim('-'.repeat(40)));
        console.log(`  ${success('\u2714')} Successful: ${c.bold(successCount)} files`);
        if (errorCount > 0) {
            console.log(`  ${error('\u2718')} Failed:     ${c.bold(errorCount)} files`);
        }
        console.log(`  ${info('\u23F1')} Total time: ${c.bold((totalTime / 1000).toFixed(2) + 's')}`);
        if (totalFiles > 1) {
            console.log(`  ${info('\u23F1')} Avg/file:   ${c.bold((totalTime / totalFiles).toFixed(0) + 'ms')}`);
        }
        console.log('');
    }

    if (hadError) {
        process.exit(1);
    }
}

// Run main function
if (require.main === module) {
    main().catch(err => {
        console.error(error(`Fatal error: ${err.message}`));
        process.exit(1);
    });
}

module.exports = {
    parseArgs,
    collectInputs,
    buildSummary,
    loadConfig,
    findConfigFile,
    createDefaultConfig
};
