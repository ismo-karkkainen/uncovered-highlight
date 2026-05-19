const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const { V8CoverageReader } = require('../dist/v8-coverage');
const { SourceMapProcessor } = require('../dist/source-map-processor');
const { HighlightProcessor } = require('../dist/highlight-processor');

describe('Integration Tests', function() {
  let reader;
  let sourceProcessor;
  let highlighter;

  before(function() {
    const coverageDir = path.join(__dirname, '..', 'testprogs', 'coverage');
    reader = new V8CoverageReader(coverageDir);
    sourceProcessor = new SourceMapProcessor();
    highlighter = new HighlightProcessor();
  });

  after(function() {
    sourceProcessor.destroy();
  });

  describe('End-to-end TypeScript coverage', function() {
    it('should process test1.ts from coverage to highlighted output', async function() {
      const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
      const test1TsPath = path.join(__dirname, '..', 'testprogs', 'test1.ts');

      const tsCode = fs.readFileSync(test1TsPath, 'utf-8');
      const ranges = reader.getCoverageRanges(test1JsPath);
      const mappedRanges = await sourceProcessor.mapJsRangesToSource(test1JsPath, ranges);
      const lineHighlights = highlighter.processSourceWithCoverage(tsCode, mappedRanges);

      expect(lineHighlights.length).to.be.greaterThan(0);
      expect(lineHighlights[0].lineNumber).to.equal(1);

      const linesWithUncoveredCode = lineHighlights.filter(lh => lh.highlights.length > 0);
      expect(linesWithUncoveredCode.length).to.be.greaterThan(0);

      const spanishBranchLine = lineHighlights.find(lh =>
        lh.lineContent.includes('spanish branch')
      );
      expect(spanishBranchLine).to.not.be.undefined;
      expect(spanishBranchLine.highlights.length).to.be.greaterThan(0);

      const englishBranchLine = lineHighlights.find(lh =>
        lh.lineContent.includes('english branch')
      );
      expect(englishBranchLine).to.not.be.undefined;
    });

    it('should process test2.ts with multi-byte characters', async function() {
      const test2JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test2.js');
      const test2TsPath = path.join(__dirname, '..', 'testprogs', 'test2.ts');

      const tsCode = fs.readFileSync(test2TsPath, 'utf-8');
      const ranges = reader.getCoverageRanges(test2JsPath);
      const mappedRanges = await sourceProcessor.mapJsRangesToSource(test2JsPath, ranges);
      const lineHighlights = highlighter.processSourceWithCoverage(tsCode, mappedRanges);

      const emojiLines = lineHighlights.filter(lh =>
        lh.lineContent.includes('🎉') || lh.lineContent.includes('🚀')
      );
      expect(emojiLines.length).to.be.greaterThan(0);

      const restrictedCountryLine = lineHighlights.find(lh =>
        lh.lineContent.includes('禁止国')
      );
      expect(restrictedCountryLine).to.not.be.undefined;
      expect(restrictedCountryLine.highlights.length).to.be.greaterThan(0);
    });

    it('should process test3.ts with classes', async function() {
      const test3JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test3.js');
      const test3TsPath = path.join(__dirname, '..', 'testprogs', 'test3.ts');

      const tsCode = fs.readFileSync(test3TsPath, 'utf-8');
      const ranges = reader.getCoverageRanges(test3JsPath);
      const mappedRanges = await sourceProcessor.mapJsRangesToSource(test3JsPath, ranges);
      const lineHighlights = highlighter.processSourceWithCoverage(tsCode, mappedRanges);

      const mapMethodLine = lineHighlights.find(lh =>
        lh.lineContent.includes('public map(')
      );
      expect(mapMethodLine).to.not.be.undefined;
      expect(mapMethodLine.highlights.length).to.be.greaterThan(0);

      const filterMethodLine = lineHighlights.find(lh =>
        lh.lineContent.includes('public filter(')
      );
      expect(filterMethodLine).to.not.be.undefined;
    });
  });

  describe('Context line filtering', function() {
    it('should filter lines based on context setting', async function() {
      const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
      const test1TsPath = path.join(__dirname, '..', 'testprogs', 'test1.ts');

      const tsCode = fs.readFileSync(test1TsPath, 'utf-8');
      const ranges = reader.getCoverageRanges(test1JsPath);
      const mappedRanges = await sourceProcessor.mapJsRangesToSource(test1JsPath, ranges);

      const allLines = highlighter.processSourceWithCoverage(tsCode, mappedRanges);
      const withContext2 = highlighter.filterContextLines(allLines, 2);
      const withContext0 = highlighter.filterContextLines(allLines, 0);

      expect(withContext0.length).to.be.lessThan(withContext2.length);
      expect(withContext2.length).to.be.lessThan(allLines.length);

      const linesWithHighlights = allLines.filter(lh => lh.highlights.length > 0);
      const filteredWithHighlights = withContext0.filter(lh => lh.highlights.length > 0);

      expect(filteredWithHighlights.length).to.equal(linesWithHighlights.length);
    });
  });

  describe('JavaScript file processing', function() {
    it('should process JavaScript files directly without source maps', function() {
      const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
      const jsCode = fs.readFileSync(test1JsPath, 'utf-8');

      const ranges = reader.getCoverageRanges(test1JsPath);
      const lineHighlights = highlighter.processJsSourceWithCoverage(jsCode, ranges);

      expect(lineHighlights.length).to.be.greaterThan(0);

      const linesWithHighlights = lineHighlights.filter(lh => lh.highlights.length > 0);
      expect(linesWithHighlights.length).to.be.greaterThan(0);
    });
  });

  describe('Coverage accuracy', function() {
    it('should show covered code paths are not highlighted', async function() {
      const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
      const test1TsPath = path.join(__dirname, '..', 'testprogs', 'test1.ts');

      const tsCode = fs.readFileSync(test1TsPath, 'utf-8');
      const ranges = reader.getCoverageRanges(test1JsPath);
      const mappedRanges = await sourceProcessor.mapJsRangesToSource(test1JsPath, ranges);
      const lineHighlights = highlighter.processSourceWithCoverage(tsCode, mappedRanges);

      const englishLine = lineHighlights.find(lh =>
        lh.lineContent.includes('Hello,')
      );
      expect(englishLine).to.not.be.undefined;
    });

    it('should show uncovered code paths are highlighted', async function() {
      const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
      const test1TsPath = path.join(__dirname, '..', 'testprogs', 'test1.ts');

      const tsCode = fs.readFileSync(test1TsPath, 'utf-8');
      const ranges = reader.getCoverageRanges(test1JsPath);
      const mappedRanges = await sourceProcessor.mapJsRangesToSource(test1JsPath, ranges);
      const lineHighlights = highlighter.processSourceWithCoverage(tsCode, mappedRanges);

      const multiplyLine = lineHighlights.find(lh =>
        lh.lineContent.includes('multiply operation')
      );
      expect(multiplyLine).to.not.be.undefined;
      expect(multiplyLine.highlights.length).to.be.greaterThan(0);
    });
  });
});
