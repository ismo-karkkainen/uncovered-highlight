# Quick Start Guide

## Installation

```bash
npm install uncovered-highlight
```

## Basic Usage (3 Steps)

### 1. Generate Coverage

```bash
NODE_V8_COVERAGE=coverage node your-program.js
```

### 2. View Coverage

```bash
npx uncovered-highlight src/your-file.ts
```

### 3. Customize (Optional)

```bash
# Hide line numbers (line numbers shown by default)
npx uncovered-highlight -n src/your-file.ts

# Show omitted line markers ("..." for gaps)
npx uncovered-highlight -s src/your-file.ts

# Bold text instead of red
npx uncovered-highlight -h bold src/your-file.ts

# Green highlighting
npx uncovered-highlight -h green src/your-file.ts

# Only show uncovered lines (no context)
npx uncovered-highlight -x 0 src/your-file.ts

# Multiple files
npx uncovered-highlight src/*.ts
```

## Common Patterns

### In package.json scripts:

```json
{
  "scripts": {
    "test": "NODE_V8_COVERAGE=coverage mocha",
    "coverage": "uncovered-highlight src/**/*.ts"
  }
}
```

Then run:
```bash
npm test && npm run coverage
```

### Quick check during development:

```bash
NODE_V8_COVERAGE=coverage node my-script.js && \
  uncovered-highlight -s my-script.js
```

### For TypeScript projects:

```bash
# Coverage is generated from JavaScript files
NODE_V8_COVERAGE=coverage node dist/app.js

# But you view the TypeScript source
uncovered-highlight src/app.ts
```

The tool automatically finds the compiled JavaScript and source maps!

## Options Reference

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --coverage-dir <dir>` | Coverage data location | Auto-detected or `coverage` |
| `-o, --out-dir <dir>` | TypeScript output (overrides tsconfig) | From tsconfig.json |
| `-n, --no-line-numbers` | Hide line numbers | Line numbers shown |
| `-x, --context <n>` | Context lines around uncovered | `2` |
| `-s, --show-omitted` | Show "..." for gaps | Off |
| `-m, --hide-omitted` | Hide "..." for gaps | On (default) |
| `-h, --highlight <color>` | Color: black, red, green, yellow, blue, magenta, cyan, white, bold, underline, reverse, or numeric code | `red` |

## Troubleshooting

**Coverage directory not found:**
```bash
uncovered-highlight -c ./my-coverage src/file.ts
```

**Can't find compiled JS:**
```bash
uncovered-highlight -o ./build src/file.ts
```

**Want to see everything:**
```bash
uncovered-highlight -x 999 src/file.ts
```

## Programmatic Usage

```typescript
import { V8CoverageReader, SourceMapProcessor, HighlightProcessor } from 'uncovered-highlight';

const reader = new V8CoverageReader('coverage');
const processor = new SourceMapProcessor();
const highlighter = new HighlightProcessor();

// Get coverage
const ranges = reader.getCoverageRanges('dist/app.js');

// Map to TypeScript
const mapped = await processor.mapJsRangesToSource('dist/app.js', ranges);

// Generate highlights
const highlights = highlighter.processSourceWithCoverage(sourceCode, mapped);

processor.destroy();
```

## More Information

- Full documentation: [README.md](README.md)
- Examples: [EXAMPLES.md](EXAMPLES.md)
- Implementation details: [IMPLEMENTATION.md](IMPLEMENTATION.md)
