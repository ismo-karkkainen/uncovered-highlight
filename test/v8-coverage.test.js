const { expect } = require('chai');
const path = require('path');
const { V8CoverageReader } = require('../dist/v8-coverage');

describe('V8CoverageReader', function() {
  let reader;

  before(function() {
    const coverageDir = path.join(__dirname, '..', 'coverage');
    reader = new V8CoverageReader(coverageDir);
  });

  it('should load coverage data from directory', function() {
    const scripts = reader.getAllScriptPaths();
    expect(scripts).to.be.an('array');
    expect(scripts.length).to.be.greaterThan(0);
  });

  it('should find coverage for test1.js', function() {
    const test1Path = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
    const coverage = reader.getScriptCoverage(test1Path);
    expect(coverage).to.not.be.undefined;
    expect(coverage.functions).to.be.an('array');
  });

  it('should find coverage for test2.js', function() {
    const test2Path = path.join(__dirname, '..', 'testprogs', 'dist', 'test2.js');
    const coverage = reader.getScriptCoverage(test2Path);
    expect(coverage).to.not.be.undefined;
    expect(coverage.functions).to.be.an('array');
  });

  it('should find coverage for test3.js', function() {
    const test3Path = path.join(__dirname, '..', 'testprogs', 'dist', 'test3.js');
    const coverage = reader.getScriptCoverage(test3Path);
    expect(coverage).to.not.be.undefined;
    expect(coverage.functions).to.be.an('array');
  });

  it('should return coverage ranges for test1.js', function() {
    const test1Path = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
    const ranges = reader.getCoverageRanges(test1Path);
    expect(ranges).to.be.an('array');
    expect(ranges.length).to.be.greaterThan(0);

    ranges.forEach(range => {
      expect(range).to.have.property('start');
      expect(range).to.have.property('end');
      expect(range).to.have.property('covered');
      expect(range.start).to.be.a('number');
      expect(range.end).to.be.a('number');
      expect(range.covered).to.be.a('boolean');
    });
  });

  it('should merge overlapping ranges', function() {
    const ranges = [
      { start: 0, end: 10, covered: true },
      { start: 5, end: 15, covered: true },
      { start: 20, end: 30, covered: true }
    ];

    const merged = reader.mergeRanges(ranges);
    expect(merged).to.be.an('array');
    expect(merged.length).to.equal(2);
    expect(merged[0].start).to.equal(0);
    expect(merged[0].end).to.equal(15);
    expect(merged[1].start).to.equal(20);
    expect(merged[1].end).to.equal(30);
  });

  it('should identify uncovered ranges', function() {
    const test1Path = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
    const fs = require('fs');
    const sourceCode = fs.readFileSync(test1Path, 'utf-8');

    const uncovered = reader.getUncoveredRanges(test1Path, sourceCode);
    expect(uncovered).to.be.an('array');

    uncovered.forEach(range => {
      expect(range.covered).to.be.false;
      expect(range.start).to.be.at.least(0);
      expect(range.end).to.be.at.most(sourceCode.length);
    });
  });
});
