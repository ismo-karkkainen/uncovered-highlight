# Changes from prompt-b-2.txt

## Summary of Changes

All requirements from prompt-b-2.txt have been implemented and tested.

## 1. Test Programs Coverage Directory ✓

**Change**: Moved testprogs coverage directory from `coverage/` to `testprogs/coverage/`

**Implementation**:
- Updated `package.json` script to use `NODE_V8_COVERAGE=testprogs/coverage`
- Regenerated coverage data in the new location
- Updated all test files to reference the new location
- Makes testprogs directory self-contained like a package

**Files Changed**:
- `package.json` - Updated testprogs:run script
- `test/v8-coverage.test.js` - Updated coverage path
- `test/source-map-processor.test.js` - Updated coverage path  
- `test/highlight-processor.test.js` - Updated coverage path
- `test/integration.test.js` - Updated coverage path

## 2. Auto-Discovery of Coverage and Tsconfig ✓

**Change**: The tool now searches for `coverage/` directory and `tsconfig.json` from the source file's directory upward

**Implementation**:
- Added `findCoverageDir(filePath)` method that searches from the source file location up to the root
- Modified `run()` method to auto-detect coverage directory when not specified
- Existing `findOutDirFromTsConfig()` already searches upward for tsconfig.json

**Usage**:
```bash
# Works from any directory
cd testprogs && uncovered-highlight test1.ts

# No need to specify --coverage-dir if coverage/ is in parent directories
uncovered-highlight src/deep/nested/file.ts
```

**Files Changed**:
- `src/cli.ts` - Added findCoverageDir() method and updated run()

## 3. Changed Highlighting Style ✓

**Change**: Highlighting changed from red background to red text (or bold text)

**Before**:
- Dark mode: White text (`\x1b[37m`) with red background (`\x1b[101m`)
- Light mode: Black text (`\x1b[30m`) with red background (`\x1b[41m`)
- Bold mode: Normal text with bold highlight (`\x1b[1m`)

**After**:
- Dark mode: Normal text with red text (`\x1b[31m`) for uncovered
- Light mode: Normal text with red text (`\x1b[31m`) for uncovered  
- Bold mode: Normal text with bold text (`\x1b[1m`) for uncovered

**Rationale**: Red background was too strong and distracting. Red text is more subtle and easier to read.

**Files Changed**:
- `src/cli.ts` - Updated colorSchemes object

## 4. Show-Omitted Default Changed ✓

**Change**: `--show-omitted` is now enabled by default

**Implementation**:
- Changed default value from `false` to `true` in `parseArgs()`
- Added `--no-show-omitted` flag to disable it
- Updated help text and documentation

**Usage**:
```bash
# Default - shows "..." for gaps
uncovered-highlight src/file.ts

# Disable
uncovered-highlight --no-show-omitted src/file.ts
```

**Files Changed**:
- `src/cli.ts` - Changed default, added --no-show-omitted support, updated help text

## 5. Git Ignore *.tgz ✓

**Change**: Added `*.tgz` to `.gitignore`

**Files Changed**:
- `.gitignore` - Added `*.tgz` pattern

## Documentation Updates

Updated all documentation to reflect the changes:

**README.md**:
- Updated option descriptions for auto-detection and new defaults
- Updated color scheme descriptions (red text instead of red background)
- Added auto-discovery to features list

**EXAMPLES.md**:
- Updated examples to reflect new defaults
- Updated color mode descriptions
- Added examples showing auto-discovery works from subdirectories

**QUICKSTART.md**:
- Updated option table with new defaults
- Updated color mode descriptions
- Simplified examples (removed redundant --show-omitted)

**CLI Help Text**:
- Updated to show "default: auto-detected" for coverage-dir
- Updated to show "default: on" for show-omitted
- Added --no-show-omitted to options list
- Updated color mode descriptions
- Updated examples to match new behavior

## Testing

All 35 tests pass with the new changes:
- Tests updated to use new coverage location
- Coverage auto-detection tested manually
- New highlighting style verified visually
- Default show-omitted behavior confirmed

## Visual Comparison

**Old highlighting** (red background):
```
[37m  } else if (language === "spanish") [0m[101m{[0m
[101m    console.log("spanish branch - NOT visible");[0m
```

**New highlighting** (red text):
```
[0m  } else if (language === "spanish") [0m[31m{[0m
[31m    console.log("spanish branch - NOT visible");[0m
```

The new style is more readable and less visually overwhelming.

## Verification Commands

```bash
# Test coverage auto-detection
cd testprogs && node ../dist/cli.js test1.ts

# Test default show-omitted (should see "...")
node dist/cli.js --line-numbers testprogs/test1.ts | grep '\.\.\.'

# Test disabling show-omitted (should NOT see "...")
node dist/cli.js --line-numbers --no-show-omitted testprogs/test1.ts | grep '\.\.\.'

# Test new highlighting (should see [31m for red, not [101m for red bg)
node dist/cli.js --context 0 testprogs/test1.ts | head -5

# Run all tests
npm test
```

All requirements from prompt-b-2.txt have been successfully implemented.
