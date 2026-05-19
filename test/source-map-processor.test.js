const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const { V8CoverageReader } = require('../dist/v8-coverage');
const { SourceMapProcessor } = require('../dist/source-map-processor');

describe('SourceMapProcessor', function() {
  let reader;
  let processor;

  before(function() {
    const coverageDir = path.join(__dirname, '..', 'coverage');
    reader = new V8CoverageReader(coverageDir);
    processor = new SourceMapProcessor();
  });

  after(function() {
    processor.destroy();
  });

  it('should load source map for test1.js', async function() {
    const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
    const consumer = await processor.loadSourceMap(test1JsPath);
    expect(consumer).to.not.be.null;
  });

  it('should load source map for test2.js', async function() {
    const test2JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test2.js');
    const consumer = await processor.loadSourceMap(test2JsPath);
    expect(consumer).to.not.be.null;
  });

  it('should load source map for test3.js', async function() {
    const test3JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test3.js');
    const consumer = await processor.loadSourceMap(test3JsPath);
    expect(consumer).to.not.be.null;
  });

  it('should convert JS offset to position', function() {
    const jsCode = "line 1\nline 2\nline 3";
    const pos1 = processor.jsOffsetToPosition(jsCode, 0);
    expect(pos1.line).to.equal(1);
    expect(pos1.column).to.equal(0);

    const pos2 = processor.jsOffsetToPosition(jsCode, 7);
    expect(pos2.line).to.equal(2);
    expect(pos2.column).to.equal(0);

    const pos3 = processor.jsOffsetToPosition(jsCode, 14);
    expect(pos3.line).to.equal(3);
    expect(pos3.column).to.equal(0);
  });

  it('should map JavaScript coverage ranges to TypeScript source', async function() {
    const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
    const ranges = reader.getCoverageRanges(test1JsPath);

    const mappedRanges = await processor.mapJsRangesToSource(test1JsPath, ranges);
    expect(mappedRanges).to.be.an('array');

    for (const mapped of mappedRanges) {
      expect(mapped).to.have.property('source');
      expect(mapped).to.have.property('range');
      expect(mapped).to.have.property('covered');
      expect(mapped.range).to.have.property('start');
      expect(mapped.range).to.have.property('end');
      expect(mapped.range.start).to.have.property('line');
      expect(mapped.range.start).to.have.property('column');
      expect(mapped.source).to.include('test1.ts');
    }
  });

  it('should map ranges for test2.js', async function() {
    const test2JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test2.js');
    const ranges = reader.getCoverageRanges(test2JsPath);

    const mappedRanges = await processor.mapJsRangesToSource(test2JsPath, ranges);
    expect(mappedRanges).to.be.an('array');
    expect(mappedRanges.length).to.be.greaterThan(0);

    for (const mapped of mappedRanges) {
      expect(mapped.source).to.include('test2.ts');
    }
  });

  it('should map ranges for test3.js', async function() {
    const test3JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test3.js');
    const ranges = reader.getCoverageRanges(test3JsPath);

    const mappedRanges = await processor.mapJsRangesToSource(test3JsPath, ranges);
    expect(mappedRanges).to.be.an('array');
    expect(mappedRanges.length).to.be.greaterThan(0);

    for (const mapped of mappedRanges) {
      expect(mapped.source).to.include('test3.ts');
    }
  });

  it('should find source file from JS file path', function() {
    const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
    const sourcePath = processor.findSourceFile(test1JsPath, 'test1.ts');
    expect(sourcePath).to.not.be.null;
    expect(sourcePath).to.include('test1.ts');
    expect(fs.existsSync(sourcePath)).to.be.true;
  });
});
