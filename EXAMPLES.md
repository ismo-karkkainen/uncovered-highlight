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
# Basic usage (line numbers shown by default, no "..." indicators)
uncovered-highlight src/myfile.ts

# Without line numbers
uncovered-highlight -n src/myfile.ts

# Show "..." indicators for omitted lines
uncovered-highlight -s src/myfile.ts
```

### Adjust Context Lines

```bash
# Show only uncovered lines (no context)
uncovered-highlight -x 0 src/myfile.ts

# Show 1 line of context around uncovered code
uncovered-highlight -x 1 src/myfile.ts

# Show 5 lines of context
uncovered-highlight -x 5 src/myfile.ts
```

### Highlight Colors

```bash
# Red highlighting (default)
uncovered-highlight src/myfile.ts

# Bold text for uncovered code
uncovered-highlight -h bold src/myfile.ts

# Green highlighting
uncovered-highlight -h green src/myfile.ts

# Underline highlighting
uncovered-highlight -h underline src/myfile.ts

# Reverse video (swap foreground/background)
uncovered-highlight -h reverse src/myfile.ts

# Custom ANSI code (e.g., 35 = magenta)
uncovered-highlight -h 35 src/myfile.ts
```

### Multiple Files

```bash
# Process multiple files
uncovered-highlight src/file1.ts src/file2.ts

# Use glob patterns (shell expansion)
uncovered-highlight src/*.ts

# Combine with options
uncovered-highlight -s -h bold src/*.ts
```

### Custom Directories

```bash
# Coverage directory is auto-detected from source file location
# But you can override it:
uncovered-highlight -c ./my-coverage src/myfile.ts

# Works with subdirectories (e.g., c8 creates coverage/tmp/)
uncovered-highlight -c ./coverage/tmp src/myfile.ts

# Auto-discovers coverage files in subdirectories
# If coverage/ has no files, checks coverage/tmp/, coverage/data/, etc.
uncovered-highlight src/myfile.ts

# Specify custom TypeScript output directory
uncovered-highlight -o ./build src/myfile.ts

# Both together
uncovered-highlight -c ./cov -o ./dist src/myfile.ts

# Works from any directory - will find coverage/ or tsconfig.json in parent directories
cd src/subdir && uncovered-highlight myfile.ts
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
    "coverage:show": "uncovered-highlight -s src/*.ts",
    "coverage:report": "uncovered-highlight -x 0 src/*.ts | tee coverage-report.txt"
  }
}
```

### Post-test Hook

```json
{
  "scripts": {
    "test": "NODE_V8_COVERAGE=coverage mocha",
    "posttest": "uncovered-highlight src/**/*.ts"
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
      - run: npx uncovered-highlight src/**/*.ts
```
