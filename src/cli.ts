#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { V8CoverageReader } from './v8-coverage';
import { SourceMapProcessor } from './source-map-processor';
import { HighlightProcessor, LineHighlight } from './highlight-processor';

interface ColorScheme {
  text: string;
  highlight: string;
  reset: string;
}

interface CliOptions {
  coverageDir?: string;
  outDir?: string;
  showLineNumbers: boolean;
  contextLines: number;
  showOmitted: boolean;
  colorMode: 'dark' | 'light' | 'bold';
  files: string[];
}

class CoverageHighlightCli {
  private colorSchemes: Record<string, ColorScheme> = {
    dark: {
      text: '\x1b[0m',
      highlight: '\x1b[31m',
      reset: '\x1b[0m'
    },
    light: {
      text: '\x1b[0m',
      highlight: '\x1b[31m',
      reset: '\x1b[0m'
    },
    bold: {
      text: '\x1b[0m',
      highlight: '\x1b[1m',
      reset: '\x1b[0m'
    }
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

    const colorScheme = this.colorSchemes[options.colorMode];
    let lastLineNumber = 0;

    for (const line of lineHighlights) {
      if (options.showOmitted && lastLineNumber > 0 && line.lineNumber > lastLineNumber + 1) {
        console.log('...');
      }

      const linePrefix = options.showLineNumbers ? `${line.lineNumber.toString().padStart(4)}  ` : '';
      const highlighted = this.applyHighlights(line.lineContent, line.highlights, colorScheme);

      console.log(linePrefix + highlighted);
      lastLineNumber = line.lineNumber;
    }
  }

  private applyHighlights(
    content: string,
    highlights: { start: number; end: number }[],
    colorScheme: ColorScheme
  ): string {
    if (highlights.length === 0) {
      return colorScheme.text + content + colorScheme.reset;
    }

    let result = '';
    let lastIndex = 0;

    for (const highlight of highlights) {
      if (highlight.start > lastIndex) {
        result += colorScheme.text + content.substring(lastIndex, highlight.start) + colorScheme.reset;
      }

      result += colorScheme.highlight + content.substring(highlight.start, highlight.end) + colorScheme.reset;
      lastIndex = highlight.end;
    }

    if (lastIndex < content.length) {
      result += colorScheme.text + content.substring(lastIndex) + colorScheme.reset;
    }

    return result;
  }

  private parseArgs(args: string[]): CliOptions {
    const options: CliOptions = {
      showLineNumbers: false,
      contextLines: 2,
      showOmitted: true,
      colorMode: 'dark',
      files: []
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--coverage-dir' && i + 1 < args.length) {
        options.coverageDir = args[++i];
      } else if (arg === '--out-dir' && i + 1 < args.length) {
        options.outDir = args[++i];
      } else if (arg === '--line-numbers') {
        options.showLineNumbers = true;
      } else if (arg === '--context' && i + 1 < args.length) {
        options.contextLines = parseInt(args[++i], 10);
      } else if (arg === '--show-omitted') {
        options.showOmitted = true;
      } else if (arg === '--no-show-omitted') {
        options.showOmitted = false;
      } else if (arg === '--color' && i + 1 < args.length) {
        const mode = args[++i];
        if (mode === 'dark' || mode === 'light' || mode === 'bold') {
          options.colorMode = mode;
        }
      } else if (arg === '--help' || arg === '-h') {
        this.showUsage();
        process.exit(0);
      } else if (!arg.startsWith('--')) {
        options.files.push(arg);
      }
    }

    return options;
  }

  private showUsage(): void {
    console.log(`
Usage: uncovered-highlight [options] <file...>

Options:
  --coverage-dir <dir>   Coverage data directory (default: auto-detected)
  --out-dir <dir>        TypeScript output directory (overrides tsconfig.json)
  --line-numbers         Show line numbers
  --context <n>          Number of context lines around uncovered code (default: 2)
  --show-omitted         Show "..." for omitted lines (default: on)
  --no-show-omitted      Disable showing "..." for omitted lines
  --color <mode>         Color mode: dark (red text), light (red text), or bold (default: dark)
  -h, --help             Show this help message

Examples:
  uncovered-highlight src/file.ts
  uncovered-highlight --line-numbers src/file.ts
  uncovered-highlight --color bold --context 3 src/*.ts
  uncovered-highlight --no-show-omitted src/file.ts
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
