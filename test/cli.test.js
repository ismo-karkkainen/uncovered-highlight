const { expect } = require('chai');
const path = require('path');
const { CoverageHighlightCli } = require('../dist/cli');

describe('CLI', function() {
  let cli;

  beforeEach(function() {
    cli = new CoverageHighlightCli();
  });

  it('should create CLI instance', function() {
    expect(cli).to.not.be.undefined;
    expect(cli).to.have.property('run');
  });

  it('should process file successfully', async function() {
    const test1Path = path.join(__dirname, '..', 'testprogs', 'test1.ts');
    const args = ['--context', '0', test1Path];

    await cli.run(args);
  });

  it('should handle multiple files', async function() {
    const test1Path = path.join(__dirname, '..', 'testprogs', 'test1.ts');
    const test2Path = path.join(__dirname, '..', 'testprogs', 'test2.ts');
    const args = ['--context', '0', test1Path, test2Path];

    await cli.run(args);
  });

  it('should handle line numbers option', async function() {
    const test1Path = path.join(__dirname, '..', 'testprogs', 'test1.ts');
    const args = ['--context', '0', test1Path];

    await cli.run(args);
  });

  it('should handle different highlight colors', async function() {
    const test1Path = path.join(__dirname, '..', 'testprogs', 'test1.ts');

    await cli.run(['--highlight', 'red', '--context', '0', test1Path]);
    await cli.run(['--highlight', 'green', '--context', '0', test1Path]);
    await cli.run(['--highlight', 'bold', '--context', '0', test1Path]);
  });

  it('should handle context setting', async function() {
    const test1Path = path.join(__dirname, '..', 'testprogs', 'test1.ts');

    await cli.run(['--context', '0', test1Path]);
    await cli.run(['--context', '1', test1Path]);
    await cli.run(['--context', '5', test1Path]);
  });

  it('should handle JavaScript files', async function() {
    const test1JsPath = path.join(__dirname, '..', 'testprogs', 'dist', 'test1.js');
    const args = ['--context', '0', test1JsPath];

    await cli.run(args);
  });
});
