import * as fs from 'fs';
import * as path from 'path';
import { SourceMapConsumer, RawSourceMap } from 'source-map';
import { CoverageRange } from './v8-coverage';

export interface SourcePosition {
  line: number;
  column: number;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

export interface MappedCoverageRange {
  source: string;
  range: SourceRange;
  covered: boolean;
}

export class SourceMapProcessor {
  private sourceMapCache: Map<string, SourceMapConsumer> = new Map();

  public async loadSourceMap(jsFilePath: string): Promise<SourceMapConsumer | null> {
    if (this.sourceMapCache.has(jsFilePath)) {
      return this.sourceMapCache.get(jsFilePath)!;
    }

    const mapFilePath = jsFilePath + '.map';
    if (!fs.existsSync(mapFilePath)) {
      return null;
    }

    try {
      const mapContent = fs.readFileSync(mapFilePath, 'utf-8');
      const rawSourceMap: RawSourceMap = JSON.parse(mapContent);
      const consumer = await new SourceMapConsumer(rawSourceMap);
      this.sourceMapCache.set(jsFilePath, consumer);
      return consumer;
    } catch (error) {
      console.error(`Failed to load source map for ${jsFilePath}:`, error);
      return null;
    }
  }

  public jsOffsetToPosition(jsCode: string, offset: number): SourcePosition {
    let line = 1;
    let column = 0;
    let currentOffset = 0;

    while (currentOffset < offset && currentOffset < jsCode.length) {
      if (jsCode[currentOffset] === '\n') {
        line++;
        column = 0;
      } else {
        column++;
      }
      currentOffset++;
    }

    return { line, column };
  }

  public async mapJsRangeToSource(
    jsFilePath: string,
    jsCode: string,
    range: CoverageRange
  ): Promise<MappedCoverageRange | null> {
    const consumer = await this.loadSourceMap(jsFilePath);
    if (!consumer) {
      return null;
    }

    const startPos = this.jsOffsetToPosition(jsCode, range.start);
    const endPos = this.jsOffsetToPosition(jsCode, range.end);

    const originalStart = consumer.originalPositionFor({
      line: startPos.line,
      column: startPos.column
    });

    const originalEnd = consumer.originalPositionFor({
      line: endPos.line,
      column: endPos.column
    });

    if (!originalStart.source || !originalStart.line || !originalEnd.line) {
      return null;
    }

    return {
      source: originalStart.source,
      range: {
        start: {
          line: originalStart.line,
          column: originalStart.column || 0
        },
        end: {
          line: originalEnd.line,
          column: originalEnd.column || 0
        }
      },
      covered: range.covered
    };
  }

  public async mapJsRangesToSource(
    jsFilePath: string,
    ranges: CoverageRange[]
  ): Promise<MappedCoverageRange[]> {
    const jsCode = fs.readFileSync(jsFilePath, 'utf-8');
    const mappedRanges: MappedCoverageRange[] = [];

    for (const range of ranges) {
      const mapped = await this.mapJsRangeToSource(jsFilePath, jsCode, range);
      if (mapped) {
        mappedRanges.push(mapped);
      }
    }

    return mappedRanges;
  }

  public findSourceFile(jsFilePath: string, sourceName: string): string | null {
    const jsDir = path.dirname(jsFilePath);
    const possiblePaths = [
      path.resolve(jsDir, sourceName),
      path.resolve(jsDir, '..', sourceName),
      path.resolve(sourceName)
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }

    return null;
  }

  public destroy(): void {
    for (const consumer of this.sourceMapCache.values()) {
      consumer.destroy();
    }
    this.sourceMapCache.clear();
  }
}
