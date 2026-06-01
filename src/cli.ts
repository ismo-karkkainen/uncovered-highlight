#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { V8CoverageReader } from './v8-coverage';
import { SourceMapProcessor } from './source-map-processor';
import { HighlightProcessor, LineHighlight } from './highlight-processor';

interface CliOptions {
  coverageDir?: string;
  outDir?: string;
  showLineNumbers: boolean;
  contextLines: number;
  showOmitted: boolean;
  highlightColor: string;
  files: string[];
}

class CoverageHighlightCli {
  private colorCodes: Record<string, string> = {
    black: '30',
    red: '31',
    green: '32',
    yellow: '33',
    blue: '34',
    magenta: '35',
    cyan: '36',
    white: '37',
    bold: '1',
    underline: '4',
    reverse: '7'
  };

  public async run(args: string[]): Promise<void> {
    const options = this.parseArgs(args);

    if (options.files.length === 0) {
      this.showUsage();
      process.exit(1);
    }

    let coverageDir = options.coverageDir;

    if (!coverageDir) {
      if (options.files.length > 0) {
        const foundDir = this.findCoverageDir(options.files[0]);
        if (foundDir) {
          coverageDir = foundDir;
        } else {
          coverageDir = 'coverage';
        }
      } else {
        coverageDir = 'coverage';
      }
    }

    if (!fs.existsSync(coverageDir)) {
      console.error(`Coverage directory not found: ${coverageDir}`);
      process.exit(1);
    }

    const reader = new V8CoverageReader(coverageDir);
    const processor = new SourceMapProcessor();
    const highlighter = new HighlightProcessor();

    try {
      for (const file of options.files) {
        await this.processFile(file, options, reader, processor, highlighter);
      }
    } finally {
      processor.destroy();
    }
  }

  private async processFile(
    filePath: string,
    options: CliOptions,
    reader: V8CoverageReader,
    processor: SourceMapProcessor,
    highlighter: HighlightProcessor
  ): Promise<void> {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }

    const absolutePath = path.resolve(filePath);
    const sourceCode = fs.readFileSync(absolutePath, 'utf-8');

    let lineHighlights: LineHighlight[];

    if (filePath.endsWith('.ts')) {
      lineHighlights = await this.processTypeScriptFile(
        absolutePath,
        sourceCode,
        options,
        reader,
        processor,
        highlighter
      );
    } else if (filePath.endsWith('.js')) {
      lineHighlights = this.processJavaScriptFile(
        absolutePath,
        sourceCode,
        reader,
        highlighter
      );
    } else {
      console.error(`Unsupported file type: ${filePath}`);
      return;
    }

    if (options.contextLines >= 0) {
      lineHighlights = highlighter.filterContextLines(lineHighlights, options.contextLines);
    }

    this.displayHighlights(filePath, lineHighlights, options);
  }

  private async processTypeScriptFile(
    tsPath: string,
    sourceCode: string,
    options: CliOptions,
    reader: V8CoverageReader,
    processor: SourceMapProcessor,
    highlighter: HighlightProcessor
  ): Promise<LineHighlight[]> {
    const jsPath = this.findCompiledJs(tsPath, options.outDir || undefined);

    if (!jsPath) {
      console.error(`Could not find compiled JavaScript for: ${tsPath}`);
      return [];
    }

    const coverageRanges = reader.getCoverageRanges(jsPath);
    const mappedRanges = await processor.mapJsRangesToSource(jsPath, coverageRanges);

    return highlighter.processSourceWithCoverage(sourceCode, mappedRanges);
  }

  private processJavaScriptFile(
    jsPath: string,
    sourceCode: string,
    reader: V8CoverageReader,
    highlighter: HighlightProcessor
  ): LineHighlight[] {
    const coverageRanges = reader.getCoverageRanges(jsPath);
    return highlighter.processJsSourceWithCoverage(sourceCode, coverageRanges);
  }

  private findCompiledJs(tsPath: string, outDirOption?: string): string | null {
    let outDir: string | null = outDirOption || null;
    let rootDir: string | null = null;
    let tsconfigDir: string | null = null;

    if (!outDir) {
      const configInfo = this.findTsConfigInfo(tsPath);
      if (configInfo) {
        outDir = configInfo.outDir;
        rootDir = configInfo.rootDir;
        tsconfigDir = configInfo.configDir;
      }
    }

    if (!outDir) {
      return null;
    }

    const absoluteTsPath = path.resolve(tsPath);
    const tsBasename = path.basename(tsPath, '.ts');
    const jsFilename = tsBasename + '.js';

    const possiblePaths: string[] = [];

    if (rootDir && tsconfigDir) {
      const absoluteRootDir = path.resolve(tsconfigDir, rootDir);
      const relativeFromRoot = path.relative(absoluteRootDir, absoluteTsPath);
      const relativeDir = path.dirname(relativeFromRoot);

      if (!relativeFromRoot.startsWith('..')) {
        possiblePaths.push(path.join(outDir, relativeDir, jsFilename));
      }
    }

    const tsDir = path.dirname(absoluteTsPath);
    possiblePaths.push(path.join(outDir, jsFilename));
    possiblePaths.push(path.join(outDir, path.relative(tsDir, path.join(tsDir, jsFilename))));

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }

    return null;
  }

  private findTsConfigInfo(tsPath: string): { outDir: string; rootDir: string | null; configDir: string } | null {
    let currentDir = path.dirname(path.resolve(tsPath));

    while (currentDir !== path.dirname(currentDir)) {
      const tsconfigPath = path.join(currentDir, 'tsconfig.json');

      if (fs.existsSync(tsconfigPath)) {
        try {
          const content = fs.readFileSync(tsconfigPath, 'utf-8');
          const config = JSON.parse(content);

          if (config.compilerOptions && config.compilerOptions.outDir) {
            const outDir = path.resolve(currentDir, config.compilerOptions.outDir);
            const rootDir = config.compilerOptions.rootDir
              ? path.resolve(currentDir, config.compilerOptions.rootDir)
              : null;

            return { outDir, rootDir, configDir: currentDir };
          }
        } catch (error) {
          console.error(`Failed to parse tsconfig.json: ${tsconfigPath}`);
        }
      }

      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  private findCoverageDir(filePath: string): string | null {
    let currentDir = path.dirname(path.resolve(filePath));

    while (currentDir !== path.dirname(currentDir)) {
      const coverageDir = path.join(currentDir, 'coverage');

      if (fs.existsSync(coverageDir) && fs.statSync(coverageDir).isDirectory()) {
        return coverageDir;
      }

      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  private displayHighlights(
    filePath: string,
    lineHighlights: LineHighlight[],
    options: CliOptions
  ): void {
    if (options.files.length > 1) {
      console.log(`\n=== ${filePath} ===\n`);
    }

    const highlightCode = this.getHighlightCode(options.highlightColor);
    let lastLineNumber = 0;

    for (const line of lineHighlights) {
      if (options.showOmitted && lastLineNumber > 0 && line.lineNumber > lastLineNumber + 1) {
        console.log('...');
      }

      const linePrefix = options.showLineNumbers ? `${line.lineNumber.toString().padStart(4)}  ` : '';
      const highlighted = this.applyHighlights(line.lineContent, line.highlights, highlightCode);

      console.log(linePrefix + highlighted);
      lastLineNumber = line.lineNumber;
    }
  }

  private getHighlightCode(color: string): string {
    if (/^\d/.test(color)) {
      return `\x1b[${color}m`;
    }
    const code = this.colorCodes[color];
    if (code) {
      return `\x1b[${code}m`;
    }
    return '\x1b[31m';
  }

  private applyHighlights(
    content: string,
    highlights: { start: number; end: number }[],
    highlightCode: string
  ): string {
    const reset = '\x1b[0m';

    if (highlights.length === 0) {
      return content;
    }

    let result = '';
    let lastIndex = 0;

    for (const highlight of highlights) {
      if (highlight.start > lastIndex) {
        result += content.substring(lastIndex, highlight.start);
      }

      result += highlightCode + content.substring(highlight.start, highlight.end) + reset;
      lastIndex = highlight.end;
    }

    if (lastIndex < content.length) {
      result += content.substring(lastIndex);
    }

    return result;
  }

  private parseArgs(args: string[]): CliOptions {
    const options: CliOptions = {
      showLineNumbers: true,
      contextLines: 2,
      showOmitted: false,
      highlightColor: 'red',
      files: []
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--coverage-dir' || arg === '-c' && i + 1 < args.length) {
        options.coverageDir = args[++i];
      } else if (arg === '--out-dir' || arg === '-o' && i + 1 < args.length) {
        options.outDir = args[++i];
      } else if (arg === '--no-line-numbers' || arg === '-n') {
        options.showLineNumbers = false;
      } else if (arg === '--context' || arg === '-x' && i + 1 < args.length) {
        options.contextLines = parseInt(args[++i], 10);
      } else if (arg === '--hide-omitted' || arg === '-m') {
        options.showOmitted = false;
      } else if (arg === '--show-omitted' || arg === '-s') {
        options.showOmitted = true;
      } else if (arg === '--highlight' || arg === '-h' && i + 1 < args.length) {
        options.highlightColor = args[++i];
      } else if (arg === '--help') {
        this.showUsage();
        process.exit(0);
      } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
        options.files.push(arg);
      }
    }

    return options;
  }

  private showUsage(): void {
    console.log(`
Usage: uncovered-highlight [options] <file...>

Options:
  -c, --coverage-dir <dir>   Coverage data directory (default: auto-detected)
  -o, --out-dir <dir>        TypeScript output directory (overrides tsconfig.json)
  -n, --no-line-numbers      Hide line numbers (default: shown)
  -x, --context <n>          Number of context lines around uncovered code (default: 2)
  -s, --show-omitted         Show "..." for omitted lines
  -m, --hide-omitted         Hide "..." for omitted lines (default)
  -h, --highlight <color>    Highlight color: black, red, green, yellow, blue, magenta, cyan, white, bold, underline, reverse
                             Or use numeric ANSI code (e.g., "31" for red) (default: red)
  --help                     Show this help message

Examples:
  uncovered-highlight src/file.ts
  uncovered-highlight -n src/file.ts
  uncovered-highlight -h bold -x 3 src/*.ts
  uncovered-highlight -s src/file.ts
    `);
  }
}

if (require.main === module) {
  const cli = new CoverageHighlightCli();
  cli.run(process.argv.slice(2)).catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

export { CoverageHighlightCli };
