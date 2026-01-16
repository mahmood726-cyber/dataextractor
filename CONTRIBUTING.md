# Contributing to RCTExtractor

Thank you for your interest in contributing to RCTExtractor! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** - Search the issue tracker to see if the bug has already been reported
2. **Create a new issue** - If not found, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce the bug
   - Expected behavior vs actual behavior
   - Sample text input (if applicable, anonymized)
   - Browser/Node.js version
   - RCTExtractor version

### Suggesting Features

1. Open an issue with the `enhancement` label
2. Describe the feature and its use case
3. Explain how it would benefit systematic review workflows

### Submitting Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Write clear code** with comments for complex logic
3. **Add tests** for new extraction patterns or features
4. **Update documentation** if adding new features
5. **Follow the code style** - Maintain consistency with existing code
6. **Submit the PR** with a clear description of changes

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/rctextractor.git
cd rctextractor

# Install dependencies
npm install

# Run tests
npm test

# Test extraction
node extract_cli.js --input "sample.txt" --output result.json
```

## Code Structure

```
rctextractor/
├── RCTExtractor_v4_8_AI.js   # Main extraction engine
├── LocalAI.js                 # AI modules (embeddings, NER, classifier)
├── RCTExtractor_WebApp.html   # Standalone web application
├── extract_cli.js             # Command-line interface
├── pdf_extractor.js           # PDF text extraction
├── split_papers.js            # Multi-paper splitting utilities
└── run_tests.js               # Test runner
```

## Adding New Extraction Patterns

When adding new patterns for data extraction:

1. Add the pattern to the appropriate extractor module
2. Add test cases to the validation suite
3. Include at least 3 example texts that match the pattern
4. Document the pattern in code comments

Example:
```javascript
// Pattern: "median survival X months (95% CI: Y-Z)"
const survivalPattern = /median\s+survival\s+([\d.]+)\s*months?\s*\(95%\s*CI[:\s]*([\d.]+)\s*[-–]\s*([\d.]+)\)/i;
```

## Validation Guidelines

All extraction changes must:

1. Maintain 100% accuracy on the existing 65-trial validation set
2. Not break extraction for any previously working patterns
3. Include new gold standard data for new patterns

Run validation with:
```bash
node run_validation_combined.js
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test files
node run_tests.js --tests test_extraction_node.js,node_test_v2.js

# List available tests
node run_tests.js --list
```

### Writing Tests

Tests should:
- Cover both positive and negative cases
- Use realistic clinical trial text
- Test edge cases (unusual formatting, multi-arm trials, etc.)

## Documentation

When contributing documentation:

1. Use clear, concise language
2. Include code examples where helpful
3. Update the README if adding user-facing features
4. Add JSDoc comments for new functions

## Pull Request Checklist

Before submitting your PR, ensure:

- [ ] Code follows existing style conventions
- [ ] All tests pass (`npm test`)
- [ ] Validation accuracy is maintained
- [ ] Documentation is updated
- [ ] Commit messages are clear and descriptive
- [ ] No debug code or console.log statements left in

## Questions?

If you have questions about contributing:

1. Check the existing documentation
2. Open a discussion in GitHub Issues
3. Review existing PRs for examples

## Recognition

Contributors will be acknowledged in:
- The project README
- Release notes for their contributions
- Academic publications (for significant contributions)

Thank you for helping make systematic reviews faster and more accurate!
