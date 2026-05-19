const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const { V8CoverageReader } = require('../dist/v8-coverage');
const { SourceMapProcessor } = require('../dist/source-map-processor');
const { HighlightProcessor } = require('../dist/highlight-processor');

describe('HighlightProcessor', function() {
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

  it('should process JavaScript source with coverage', function() {
    const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
    const jsCode = fs.readFileSync(test1JsPath, 'utf-8');
    const ranges = reader.getCoverageRanges(test1JsPath);

    const lineHighlights = highlighter.processJsSourceWithCoverage(jsCode, ranges);
    expect(lineHighlights).to.be.an('array');
    expect(lineHighlights.length).to.be.greaterThan(0);

    for (const line of lineHighlights) {
      expect(line).to.have.property('lineNumber');
      expect(line).to.have.property('lineContent');
      expect(line).to.have.property('highlights');
      expect(line.lineNumber).to.be.a('number');
      expect(line.lineContent).to.be.a('string');
      expect(line.highlights).to.be.an('array');
    }
  });

  it('should process TypeScript source with mapped coverage', async function() {
    const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
    const test1TsPath = path.join(__dirname, '..', 'testprogs', 'test1.ts');
    const tsCode = fs.readFileSync(test1TsPath, 'utf-8');

    const ranges = reader.getCoverageRanges(test1JsPath);
    const mappedRanges = await sourceProcessor.mapJsRangesToSource(test1JsPath, ranges);

    const lineHighlights = highlighter.processSourceWithCoverage(tsCode, mappedRanges);
    expect(lineHighlights).to.be.an('array');
    expect(lineHighlights.length).to.be.greaterThan(0);

    for (const line of lineHighlights) {
      expect(line).to.have.property('lineNumber');
      expect(line).to.have.property('lineContent');
      expect(line).to.have.property('highlights');
    }
  });

  it('should identify uncovered lines in test1.ts', async function() {
    const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
    const test1TsPath = path.join(__dirname, '..', 'testprogs', 'test1.ts');
    const tsCode = fs.readFileSync(test1TsPath, 'utf-8');

    const ranges = reader.getCoverageRanges(test1JsPath);
    const mappedRanges = await sourceProcessor.mapJsRangesToSource(test1JsPath, ranges);

    const lineHighlights = highlighter.processSourceWithCoverage(tsCode, mappedRanges);
    const linesWithHighlights = lineHighlights.filter(line => line.highlights.length > 0);

    expect(linesWithHighlights.length).to.be.greaterThan(0);

    for (const line of linesWithHighlights) {
      for (const highlight of line.highlights) {
        expect(highlight).to.have.property('start');
        expect(highlight).to.have.property('end');
        expect(highlight.start).to.be.at.least(0);
        expect(highlight.end).to.be.at.most(line.lineContent.length);
        expect(highlight.start).to.be.lessThan(highlight.end);
      }
    }
  });

  it('should handle multi-byte characters correctly', async function() {
    const test2JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test2.js');
    const test2TsPath = path.join(__dirname, '..', 'testprogs', 'test2.ts');
    const tsCode = fs.readFileSync(test2TsPath, 'utf-8');

    const ranges = reader.getCoverageRanges(test2JsPath);
    const mappedRanges = await sourceProcessor.mapJsRangesToSource(test2JsPath, ranges);

    const lineHighlights = highlighter.processSourceWithCoverage(tsCode, mappedRanges);
    expect(lineHighlights).to.be.an('array');

    const hasMultiByte = lineHighlights.some(line =>
      line.lineContent.includes('🎉') ||
      line.lineContent.includes('🚀') ||
      line.lineContent.includes('ツ')
    );
    expect(hasMultiByte).to.be.true;
  });

  it('should filter context lines correctly', function() {
    const lineHighlights = [
      { lineNumber: 1, lineContent: 'line 1', highlights: [] },
      { lineNumber: 2, lineContent: 'line 2', highlights: [] },
      { lineNumber: 3, lineContent: 'line 3', highlights: [] },
      { lineNumber: 4, lineContent: 'line 4', highlights: [{ start: 0, end: 6 }] },
      { lineNumber: 5, lineContent: 'line 5', highlights: [] },
      { lineNumber: 6, lineContent: 'line 6', highlights: [] },
      { lineNumber: 7, lineContent: 'line 7', highlights: [] },
      { lineNumber: 8, lineContent: 'line 8', highlights: [] },
      { lineNumber: 9, lineContent: 'line 9', highlights: [] },
      { lineNumber: 10, lineContent: 'line 10', highlights: [{ start: 0, end: 7 }] }
    ];

    const filtered = highlighter.filterContextLines(lineHighlights, 1);
    expect(filtered).to.be.an('array');

    const lineNumbers = filtered.map(l => l.lineNumber);
    expect(lineNumbers).to.include(3);
    expect(lineNumbers).to.include(4);
    expect(lineNumbers).to.include(5);
    expect(lineNumbers).to.include(9);
    expect(lineNumbers).to.include(10);
    expect(lineNumbers).to.not.include(1);
    expect(lineNumbers).to.not.include(7);
  });

  it('should merge overlapping highlights', function() {
    const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
    const jsCode = fs.readFileSync(test1JsPath, 'utf-8');
    const ranges = reader.getCoverageRanges(test1JsPath);

    const lineHighlights = highlighter.processJsSourceWithCoverage(jsCode, ranges);

    for (const line of lineHighlights) {
      for (let i = 0; i < line.highlights.length - 1; i++) {
        expect(line.highlights[i].end).to.be.at.most(line.highlights[i + 1].start);
      }
    }
  });
});
