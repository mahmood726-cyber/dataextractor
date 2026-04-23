# Contributing to RCTExtractor

Thank you for your interest in contributing to RCTExtractor! This document provides comprehensive guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Adding Extraction Patterns](#adding-extraction-patterns)
- [Documentation](#documentation)
- [Recognition](#recognition)

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

**Summary**: Be respectful, inclusive, and constructive. We're all here to make systematic reviews easier and more accurate.

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 14+** (18 LTS or 20 LTS recommended)
- **npm 7+** or **yarn 1.22+**
- **Git** for version control
- A code editor (VS Code recommended with ESLint extension)

### Quick Start

```bash
# Fork the repository on GitHub first, then:

# Clone your fork
git clone https://github.com/YOUR_USERNAME/rctextractor.git
cd rctextractor

# Add upstream remote
git remote add upstream https://github.com/rctextractor/rctextractor.git

# Install dependencies
npm install

# Run tests to verify setup
npm test

# Run validation suite
npm run validate
```

---

## Development Setup

### Repository Structure

```
rctextractor/
├── index.js                      # Main entry point
├── RCTExtractor_v4_8_AI.js      # Core extraction engine
├── LocalAI.js                    # AI/ML modules
├── RCTExtractor_WebApp.html     # Standalone web application
├── extract_cli.js                # Command-line interface
├── pdf_extractor.js              # PDF processing
│
├── docs/                         # Documentation
│   ├── API.md                    # API reference
│   ├── PATTERNS.md               # Pattern documentation
│   └── ARCHITECTURE.md           # System architecture
│
├── examples/                     # Usage examples
│   ├── basic_extraction.js
│   ├── batch_processing.js
│   └── sample_data/
│
├── validation/                   # Validation framework
│   ├── gold_standard.json        # Reference data
│   └── run_validation.js
│
├── tests/                        # Test suite
│   ├── test_suite.js
│   └── test_runner.js
│
├── .github/                      # GitHub templates
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
└── formats/                      # Export format specs
    ├── REVMAN5_XML_SPEC.md
    └── REVMAN_WEB_JSON_SPEC.md
```

### Environment Setup

```bash
# Install development dependencies
npm install --include=dev

# Set up pre-commit hooks (optional but recommended)
npm run setup-hooks

# Verify ESLint is working
npm run lint

# Run in development mode with watch
npm run dev
```

### IDE Configuration

**VS Code Settings** (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "javascript.validate.enable": true,
  "eslint.validate": ["javascript", "javascriptreact"]
}
```

---

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

| Type | Description | Label |
|------|-------------|-------|
| Bug fixes | Fix incorrect extraction or errors | `bug` |
| New patterns | Add support for new data formats | `enhancement` |
| Documentation | Improve docs, examples, tutorials | `documentation` |
| Performance | Optimize extraction speed | `performance` |
| Tests | Add test cases and validation data | `testing` |
| Features | New functionality (discuss first) | `feature` |

### Contribution Workflow

1. **Check existing issues** - Search for related issues or discussions
2. **Open an issue** - Discuss your proposed change before starting work
3. **Fork and branch** - Create a feature branch from `main`
4. **Develop** - Make your changes following our guidelines
5. **Test** - Ensure all tests pass and add new tests
6. **Document** - Update docs if needed
7. **Submit PR** - Create a pull request with clear description
8. **Review** - Address feedback from maintainers
9. **Merge** - Once approved, your PR will be merged

### Branch Naming

Use descriptive branch names:

```bash
# Feature branches
feature/add-network-meta-analysis
feature/revman-xml-export

# Bug fixes
fix/hr-extraction-negative-values
fix/sample-size-cluster-rct

# Documentation
docs/update-api-reference
docs/add-migration-guide

# Performance
perf/optimize-regex-patterns
```

---

## Code Style Guidelines

### ESLint Configuration

We use ESLint for code quality. Our configuration:

```javascript
// .eslintrc.js
module.exports = {
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Errors
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Style
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],

    // Best practices
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

### Code Formatting

```javascript
// Good: Clear, well-documented code
/**
 * Extracts hazard ratio from clinical trial text.
 * @param {string} text - The trial text to process
 * @returns {object|null} - Extracted HR with CI and p-value
 */
function extractHazardRatio(text) {
  const patterns = [
    // Primary pattern: "HR 0.74 (95% CI: 0.65-0.85)"
    /HR\s*([\d.]+)\s*\(95%\s*CI[:\s]*([\d.]+)\s*[-–]\s*([\d.]+)\)/gi,

    // Secondary pattern: "hazard ratio of 0.74"
    /hazard\s+ratio\s+(?:of\s+)?([\d.]+)/gi
  ];

  for (const pattern of patterns) {
    const match = safeRegexExec(pattern, text);
    if (match) {
      return {
        effect: parseFloat(match[1]),
        ciLo: match[2] ? parseFloat(match[2]) : null,
        ciHi: match[3] ? parseFloat(match[3]) : null,
        source: 'prose',
        confidence: 0.85
      };
    }
  }

  return null;
}

// Bad: Unclear, undocumented code
function getHR(t) {
  var m = t.match(/HR\s*([\d.]+)/);
  return m ? m[1] : null;
}
```

### Naming Conventions

```javascript
// Functions: camelCase, verb-prefixed
function extractSampleSize() { }
function validateInput() { }
function parseConfidenceInterval() { }

// Classes: PascalCase
class DomainDetector { }
class TextNormalizer { }

// Constants: UPPER_SNAKE_CASE
const MAX_INPUT_LENGTH = 10 * 1024 * 1024;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

// Private functions: prefix with underscore
function _internalHelper() { }

// Boolean variables: is/has/should prefix
const isValid = true;
const hasConfidenceInterval = false;
const shouldIncludeRoB = true;
```

### Comments and Documentation

```javascript
/**
 * Module for extracting PICO elements from clinical trial text.
 * @module PICOExtractor
 */

/**
 * Extracts population characteristics from trial text.
 *
 * @param {string} text - Clinical trial text
 * @param {object} options - Extraction options
 * @param {boolean} [options.includeBaseline=true] - Include baseline characteristics
 * @param {number} [options.confidenceThreshold=0.5] - Minimum confidence
 * @returns {PopulationData} Extracted population data
 *
 * @example
 * const pop = extractPopulation(text, { includeBaseline: true });
 * console.log(pop.sampleSize); // 4744
 *
 * @throws {ValidationError} If text is empty or invalid
 */
function extractPopulation(text, options = {}) {
  // Implementation...
}

// Inline comments for complex logic
function calculateConfidence(sources) {
  // Weight sources by reliability: table > prose > fallback
  // Then apply logistic calibration per Platt scaling
  const weights = sources.map(s => SOURCE_WEIGHTS[s] || 0.5);
  const raw = weights.reduce((sum, w) => sum + w, 0) / weights.length;

  // Logistic calibration: 1 / (1 + exp(-z))
  // where z = -1.2 + 3.5 * raw (trained on validation set)
  return 1 / (1 + Math.exp(-(-1.2 + 3.5 * raw)));
}
```

---

## Testing Requirements

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "extraction"

# Run with coverage
npm run test:coverage

# Run validation suite
npm run validate

# List available test suites
npm run test:list
```

### Test Structure

```javascript
// tests/test_extraction.js

describe('Effect Measure Extraction', () => {
  describe('Hazard Ratio', () => {
    it('should extract HR from standard format', () => {
      const text = 'The hazard ratio was 0.74 (95% CI: 0.65-0.85)';
      const result = extract(text);

      expect(result.contrast.type).toBe('HR');
      expect(result.contrast.effect).toBe(0.74);
      expect(result.contrast.ciLo).toBe(0.65);
      expect(result.contrast.ciHi).toBe(0.85);
    });

    it('should handle HR with p-value', () => {
      const text = 'HR 0.74; 95% CI 0.65 to 0.85; P<0.001';
      const result = extract(text);

      expect(result.contrast.p).toBeLessThan(0.001);
    });

    it('should return null for non-HR text', () => {
      const text = 'No significant difference was found';
      const result = extract(text);

      expect(result.contrast.hazardRatio).toBeNull();
    });
  });
});
```

### Writing Tests

**Requirements for all PRs:**

1. **New patterns must have 3+ test cases**
2. **Tests must cover edge cases**
3. **Maintain 100% accuracy on validation set**
4. **No regression in existing tests**

**Test Case Template:**

```javascript
// test_cases/new_pattern.js

module.exports = {
  name: 'New Pattern Test Cases',
  cases: [
    {
      id: 'NEW_001',
      description: 'Standard format',
      input: 'The new pattern showed X results',
      expected: {
        field: 'X',
        confidence: 0.9
      }
    },
    {
      id: 'NEW_002',
      description: 'Variant format',
      input: 'Results for X were...',
      expected: {
        field: 'X'
      }
    },
    {
      id: 'NEW_003',
      description: 'Edge case - missing data',
      input: 'No data available',
      expected: {
        field: null
      }
    }
  ]
};
```

### Validation Requirements

```bash
# Run full validation against 65-trial gold standard
npm run validate

# Expected output:
# Validation Results
# ==================
# Overall Accuracy: 100% (65/65 trials)
# Effect Measures: 100% (65/65)
# Sample Sizes: 100% (130/130)
# Demographics: 100% (130/130)
# No regressions detected
```

**Your PR must maintain 100% accuracy on the existing validation set.**

---

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] Validation accuracy maintained (`npm run validate`)
- [ ] ESLint passes with no errors (`npm run lint`)
- [ ] Documentation updated if needed
- [ ] CHANGELOG.md updated for user-facing changes
- [ ] Commit messages are clear and descriptive

### PR Template

When creating a PR, fill out this template:

```markdown
## Description
Brief description of the changes.

## Related Issue
Fixes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Added support for X pattern
- Fixed edge case in Y extraction
- Updated documentation for Z

## Testing
- [ ] All existing tests pass
- [ ] New tests added
- [ ] Validation accuracy: 100%

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. **Automated checks** run on PR submission
2. **Maintainer review** within 3-5 business days
3. **Address feedback** - respond to comments and make changes
4. **Re-review** if substantial changes were made
5. **Approval and merge** by maintainer

### Merge Requirements

- All CI checks pass
- At least one maintainer approval
- No unresolved review comments
- Up to date with main branch

---

## Issue Guidelines

### Bug Reports

Use the bug report template and include:

1. **Clear title**: `[BUG] HR extraction fails for negative values`
2. **Description**: What happened vs. what should happen
3. **Reproduction steps**: Minimal code to reproduce
4. **Sample input**: Text that triggers the bug (anonymized)
5. **Environment**: OS, Node version, RCTExtractor version
6. **Error output**: Full error message/stack trace

**Example:**

```markdown
## Bug Description
The hazard ratio extractor returns NaN when the CI contains negative values.

## Steps to Reproduce
```javascript
const result = extract('HR 0.74 (95% CI: -0.15 to 0.85)');
console.log(result.contrast.ciLo); // NaN
```

## Expected Behavior
Should return ciLo: -0.15

## Environment
- OS: Windows 11
- Node.js: 18.17.0
- RCTExtractor: 4.9.5
```

### Feature Requests

1. **Clear title**: `[FEATURE] Support for network meta-analysis export`
2. **Use case**: Why is this needed?
3. **Proposed solution**: How should it work?
4. **Alternatives**: Other approaches considered
5. **Examples**: Sample input/output

### New Pattern Requests

When requesting support for a new data format:

1. **Pattern description**: What format should be matched?
2. **3+ examples**: Real text samples that should match
3. **Expected output**: What should be extracted?
4. **Prevalence**: How common is this format?

---

## Adding Extraction Patterns

### Pattern Guidelines

1. **Be specific** - Avoid overly broad patterns
2. **Order matters** - More specific patterns first
3. **Use safe regex** - Avoid catastrophic backtracking
4. **Include confidence** - Weight by source reliability

### Adding a New Pattern

```javascript
// 1. Add pattern to appropriate module
// In RCTExtractor_v4_8_AI.js

const SAMPLE_SIZE_PATTERNS = [
  // Existing patterns...

  // NEW: Add your pattern with comment
  // Pattern: "enrolled X participants (Y in treatment, Z in control)"
  /enrolled\s+([\d,]+)\s*participants?\s*\(([\d,]+)\s*in\s*(?:the\s*)?treatment[,;]\s*([\d,]+)\s*in\s*(?:the\s*)?control\)/gi
];

// 2. Add test cases
// In tests/test_sample_size.js

it('should extract from enrolled format', () => {
  const text = 'We enrolled 4744 participants (2373 in treatment, 2371 in control)';
  const result = extract(text);

  expect(result.totals.n).toBe(4744);
  expect(result.arm.treatment.n).toBe(2373);
  expect(result.arm.control.n).toBe(2371);
});

// 3. Add to validation gold standard if appropriate
// In validation/gold_standard.json
```

### Pattern Testing

```bash
# Test your pattern in isolation
node -e "
const pattern = /your-pattern/gi;
const text = 'sample text';
const matches = text.match(pattern);
console.log(matches);
"

# Run against test suite
npm test -- --grep "sample size"

# Run full validation
npm run validate
```

---

## Documentation

### When to Update Docs

- Adding new public API methods
- Changing existing behavior
- Adding new patterns (update PATTERNS.md)
- Configuration changes
- Breaking changes

### Documentation Files

| File | Content |
|------|---------|
| README.md | Overview, quick start, basic usage |
| docs/API.md | Complete API reference |
| docs/PATTERNS.md | Supported extraction patterns |
| docs/ARCHITECTURE.md | System design and internals |
| CHANGELOG.md | Version history |
| MIGRATION.md | Upgrade guides |

### JSDoc Standards

```javascript
/**
 * Short description of the function.
 *
 * Longer description with more details about behavior,
 * edge cases, and usage notes.
 *
 * @param {string} text - Description of parameter
 * @param {object} [options] - Optional parameter
 * @param {boolean} [options.flag=false] - Option with default
 * @returns {ResultType} Description of return value
 *
 * @example
 * // Example usage
 * const result = myFunction('input');
 * console.log(result.field);
 *
 * @throws {ErrorType} When this error occurs
 * @since 4.9.5
 * @see RelatedFunction
 */
```

---

## Recognition

### Contributors

All contributors are recognized in:

- **README.md** - Contributors section
- **Release notes** - For each release with contributions
- **Academic publications** - For significant contributions

### Types of Recognition

| Contribution | Recognition |
|--------------|-------------|
| Bug fix | Listed in release notes |
| New pattern | Listed in release notes + PATTERNS.md |
| Major feature | README contributors + release notes |
| Documentation | Listed in release notes |
| Significant contribution | Academic paper acknowledgment |

### Academic Citation

If your contribution is used in research publications, we will:

1. Acknowledge your contribution in the paper
2. Include you as a co-author for substantial contributions
3. Cite your affiliated institution if provided

---

## Questions?

- **GitHub Discussions**: For general questions
- **GitHub Issues**: For bugs and feature requests
- **Pull Request Comments**: For contribution-specific questions

Thank you for contributing to RCTExtractor and helping make systematic reviews faster and more accurate!
