# Changes from prompt-b-3.txt

## Summary of Changes

All requirements from prompt-b-3.txt have been implemented and tested.

## 1. Coverage Files in Subdirectories ✓

**Issue**: Some coverage tools (like c8) place coverage files in subdirectories under the coverage directory, such as `coverage/tmp/`.

**Solution**: Modified `V8CoverageReader` to search for coverage files in subdirectories when the main coverage directory doesn't contain any coverage files directly.

**Implementation**:
- Added `loadCoverageFromDir(dir)` method to load coverage files from a specific directory
- Modified `loadCoverageData(coverageDir)` to:
  1. First try to load coverage files from the main directory
  2. If no coverage files found, scan subdirectories and load from them
  3. This handles cases like `coverage/tmp/` where c8 and other tools store files

**Behavior**:
- If `coverage/` has coverage files directly, use those (prioritizes main directory)
- If `coverage/` is empty but has subdirectories with coverage files, use those
- Works with any subdirectory structure

**Example**:
```bash
# Works with coverage files in subdirectories
node dist/cli.js --coverage-dir coverage/tmp src/file.ts

# Also auto-discovers and uses coverage/tmp/ if coverage/ is empty
node dist/cli.js src/file.ts
```

**Files Changed**:
- `src/v8-coverage.ts` - Added subdirectory scanning logic

## 2. Fixed JavaScript File Location with rootDir ✓

**Issue**: When `tsconfig.json` has `rootDir: "."` and `outDir: "pkg"`, the compiled JavaScript files are in `pkg/src/file.js` (not `pkg/file.js`), and the tool wasn't finding them.

**Root Cause**: The tool was only using `outDir` and not considering `rootDir` to calculate the relative path structure.

**Solution**: 
- Created `findTsConfigInfo()` method that reads both `outDir` and `rootDir` from tsconfig.json
- Modified `findCompiledJs()` to:
  1. Read both outDir and rootDir from tsconfig
  2. Calculate the relative path of the TypeScript file from rootDir
  3. Apply the same relative structure under outDir

**Algorithm**:
```
tsPath = /project/src/callclasses.ts
rootDir = /project (from tsconfig)
outDir = /project/pkg (from tsconfig)

relative = src/callclasses.ts (relative from rootDir)
jsPath = /project/pkg/src/callclasses.js (outDir + relative)
```

**Example Scenarios**:

Scenario 1: `rootDir: "."`, `outDir: "pkg"`
```
src/file.ts → pkg/src/file.js ✓
```

Scenario 2: `rootDir: "src"`, `outDir: "dist"`
```
src/file.ts → dist/file.js ✓
```

Scenario 3: No rootDir specified
```
src/file.ts → dist/src/file.js or dist/file.js (tries both) ✓
```

**Files Changed**:
- `src/cli.ts` - Refactored `findCompiledJs()` and replaced `findOutDirFromTsConfig()` with `findTsConfigInfo()`

## Testing

### New Tests
Added `test/coverage-subdirectories.test.js` with 2 tests:
- Tests loading coverage from subdirectories
- Tests prioritization of main directory over subdirectories

**Total: 37 tests passing** (up from 35)

### Manual Testing

```bash
# Test exact command from prompt that was failing
cd example
node ../dist/cli.js --coverage-dir coverage/tmp src/callclasses.ts
# ✓ Works! Finds pkg/src/callclasses.js correctly

# Test auto-discovery of subdirectory coverage
node ../dist/cli.js src/callclasses.ts
# ✓ Works! Finds coverage/tmp/ automatically

# Test with testprogs (direct coverage files)
cd ../testprogs
node ../dist/cli.js test1.ts
# ✓ Works! Uses coverage/ directly (no subdirectories needed)
```

## Technical Details

### Coverage File Search Logic

```javascript
loadCoverageData(coverageDir) {
  // Try main directory first
  loadCoverageFromDir(coverageDir)
  
  // If no coverage files found, try subdirectories
  if (coverageData.length === 0) {
    for each subdirectory {
      loadCoverageFromDir(subdirectory)
    }
  }
}
```

### JavaScript File Resolution Logic

```javascript
findCompiledJs(tsPath) {
  // Get tsconfig info (outDir, rootDir, configDir)
  configInfo = findTsConfigInfo(tsPath)
  
  // Calculate paths to try
  possiblePaths = []
  
  if (rootDir exists) {
    // Calculate relative path from rootDir
    relative = path.relative(rootDir, tsPath)
    possiblePaths.push(outDir + relative)
  }
  
  // Fallback paths
  possiblePaths.push(outDir + basename)
  possiblePaths.push(outDir + relative-from-tsDir)
  
  // Try each path
  for path in possiblePaths {
    if (exists(path)) return path
  }
}
```

## Edge Cases Handled

1. **No rootDir in tsconfig** - Falls back to old behavior (direct filename or relative from tsDir)
2. **Coverage files directly in coverage/** - Uses them, doesn't search subdirectories
3. **Multiple subdirectories** - Scans all of them
4. **TypeScript file outside rootDir** - Skips rootDir-based path, tries fallbacks
5. **Mixed coverage locations** - Prioritizes main directory

## Verification Commands

```bash
# Verify subdirectory coverage loading
cd example
node ../dist/cli.js --coverage-dir coverage src/callclasses.ts

# Verify rootDir handling
ls pkg/src/callclasses.js  # File exists here
node ../dist/cli.js src/callclasses.ts  # Should find it

# Run all tests
cd ..
npm test  # 37 passing
```

## Example Directory Structure

```
example/
├── tsconfig.json           # rootDir: ".", outDir: "pkg"
├── src/
│   └── callclasses.ts     # Source file
├── pkg/
│   └── src/
│       └── callclasses.js # Compiled here (not pkg/callclasses.js)
└── coverage/
    ├── coverage-final.json # Not used (wrong format)
    └── tmp/                # Subdirectory with actual coverage
        └── coverage-*.json # Tool finds these
```

## Before vs After

**Before**:
- ❌ `node ../dist/cli.js --coverage-dir coverage/tmp src/callclasses.ts` - Failed to find pkg/src/callclasses.js
- ❌ Coverage in subdirectories ignored

**After**:
- ✓ Finds pkg/src/callclasses.js correctly by respecting rootDir
- ✓ Automatically discovers and uses coverage files in subdirectories
- ✓ All existing functionality preserved
- ✓ All tests passing

Both issues from prompt-b-3.txt have been successfully resolved.
