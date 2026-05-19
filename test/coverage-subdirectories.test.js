const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const { V8CoverageReader } = require('../dist/v8-coverage');

describe('Coverage Subdirectories', function() {
  it('should load coverage from subdirectories when main directory is empty', function() {
    const testDir = path.join(__dirname, '..', 'example', 'coverage');

    if (!fs.existsSync(testDir)) {
      this.skip();
      return;
    }

    const reader = new V8CoverageReader(testDir);
    const scripts = reader.getAllScriptPaths();

    expect(scripts).to.be.an('array');
    expect(scripts.length).to.be.greaterThan(0);

    const hasExampleFiles = scripts.some(s => s.includes('callclasses.js'));
    expect(hasExampleFiles).to.be.true;
  });

  it('should prioritize coverage files in main directory over subdirectories', function() {
    const testDir = path.join(__dirname, '..', 'testprogs', 'coverage');
    const reader = new V8CoverageReader(testDir);
    const scripts = reader.getAllScriptPaths();

    expect(scripts).to.be.an('array');
    expect(scripts.length).to.be.greaterThan(0);

    const hasTestFiles = scripts.some(s => s.includes('test1.js') || s.includes('test2.js'));
    expect(hasTestFiles).to.be.true;
  });
});
