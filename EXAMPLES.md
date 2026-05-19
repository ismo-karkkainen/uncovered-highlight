# Examples

## Basic Usage

### Generating Coverage Data

```bash
# Run your program with V8 coverage enabled
NODE_V8_COVERAGE=coverage node your-program.js

# Or with npm scripts
NODE_V8_COVERAGE=coverage npm test
```

### View Coverage for a Single File

```bash
# Basic usage
uncovered-highlight src/myfile.ts

# With line numbers
uncovered-highlight --line-numbers src/myfile.ts

# Show gaps with "..." indicators
uncovered-highlight --line-numbers --show-omitted src/myfile.ts
```

### Adjust Context Lines

```bash
# Show only uncovered lines (no context)
uncovered-highlight --context 0 src/myfile.ts

# Show 1 line of context around uncovered code
uncovered-highlight --context 1 src/myfile.ts

# Show 5 lines of context
uncovered-highlight --context 5 src/myfile.ts
```

### Color Modes

```bash
# Dark mode (default) - white text, red highlight
uncovered-highlight src/myfile.ts

# Light mode - black text, red highlight
uncovered-highlight --color light src/myfile.ts

# Bold mode - normal text, bold for uncovered
uncovered-highlight --color bold src/myfile.ts
```

### Multiple Files

```bash
# Process multiple files
uncovered-highlight src/file1.ts src/file2.ts

# Use glob patterns (shell expansion)
uncovered-highlight src/*.ts

# Combine with options
uncovered-highlight --line-numbers --show-omitted src/*.ts
```

### Custom Directories

```bash
# Specify custom coverage directory
uncovered-highlight --coverage-dir ./my-coverage src/myfile.ts

# Specify custom TypeScript output directory
uncovered-highlight --out-dir ./build src/myfile.ts

# Both together
uncovered-highlight --coverage-dir ./cov --out-dir ./dist src/myfile.ts
```

## Programmatic Usage

### Basic Example

```typescript
import { 
  V8CoverageReader, 
  SourceMapProcessor, 
  HighlightProcessor 
} from 'uncovered-highlight';
import * as fs from 'fs';

async function processFile() {
  // Initialize components
  const reader = new V8CoverageReader('coverage');
  const processor = new SourceMapProcessor();
  const highlighter = new HighlightProcessor();

  // Read TypeScript source
  const tsPath = 'src/myfile.ts';
  const jsPath = 'dist/myfile.js';
  const sourceCode = fs.readFileSync(tsPath, 'utf-8');

  // Get coverage data
  const ranges = reader.getCoverageRanges(jsPath);
  
  // Map to TypeScript
  const mappedRanges = await processor.mapJsRangesToSource(jsPath, ranges);
  
  // Generate highlights
  const lineHighlights = highlighter.processSourceWithCoverage(
    sourceCode, 
    mappedRanges
  );

  // Display results
  for (const line of lineHighlights) {
    if (line.highlights.length > 0) {
      console.log(`Line ${line.lineNumber}: ${line.highlights.length} uncovered ranges`);
    }
  }

  // Clean up
  processor.destroy();
}

processFile().catch(console.error);
```

### Processing JavaScript Directly

```typescript
import { V8CoverageReader, HighlightProcessor } from 'uncovered-highlight';
import * as fs from 'fs';

function processJavaScript() {
  const reader = new V8CoverageReader('coverage');
  const highlighter = new HighlightProcessor();

  const jsPath = 'src/myfile.js';
  const sourceCode = fs.readFileSync(jsPath, 'utf-8');

  // Get coverage and process directly
  const ranges = reader.getCoverageRanges(jsPath);
  const lineHighlights = highlighter.processJsSourceWithCoverage(
    sourceCode, 
    ranges
  );

  // Find uncovered lines
  const uncoveredLines = lineHighlights.filter(
    line => line.highlights.length > 0
  );

  console.log(`Found ${uncoveredLines.length} lines with uncovered code`);
}

processJavaScript();
```

### Filtering Context Lines

```typescript
import { HighlightProcessor } from 'uncovered-highlight';

const highlighter = new HighlightProcessor();

// ... get lineHighlights as shown above ...

// Show only lines with uncovered code
const onlyUncovered = highlighter.filterContextLines(lineHighlights, 0);

// Show 2 lines of context
const withContext = highlighter.filterContextLines(lineHighlights, 2);

console.log(`All lines: ${lineHighlights.length}`);
console.log(`With context: ${withContext.length}`);
console.log(`Only uncovered: ${onlyUncovered.length}`);
```

### Custom Display Format

```typescript
function displayCustomFormat(lineHighlights: LineHighlight[]) {
  for (const line of lineHighlights) {
    if (line.highlights.length === 0) {
      // Fully covered line
      console.log(`✓ ${line.lineNumber}: ${line.lineContent}`);
    } else {
      // Line with uncovered code
      console.log(`✗ ${line.lineNumber}: ${line.lineContent}`);
      for (const h of line.highlights) {
        console.log(`  ^ uncovered: columns ${h.start}-${h.end}`);
      }
    }
  }
}
```

## Integration with Testing

### npm Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "test": "NODE_V8_COVERAGE=coverage mocha",
    "coverage:show": "uncovered-highlight --line-numbers --show-omitted src/*.ts",
    "coverage:report": "uncovered-highlight --context 0 src/*.ts | tee coverage-report.txt"
  }
}
```

### Post-test Hook

```json
{
  "scripts": {
    "test": "NODE_V8_COVERAGE=coverage mocha",
    "posttest": "uncovered-highlight --line-numbers src/**/*.ts"
  }
}
```

### CI Integration

```yaml
# .github/workflows/test.yml
name: Test with Coverage
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: NODE_V8_COVERAGE=coverage npm test
      - run: npx uncovered-highlight --line-numbers src/**/*.ts
```
