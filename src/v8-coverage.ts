import * as fs from 'fs';
import * as path from 'path';

export interface V8CoverageRange {
  startOffset: number;
  endOffset: number;
  count: number;
}

export interface V8FunctionCoverage {
  functionName: string;
  ranges: V8CoverageRange[];
  isBlockCoverage: boolean;
}

export interface V8ScriptCoverage {
  scriptId: string;
  url: string;
  functions: V8FunctionCoverage[];
}

export interface V8CoverageResult {
  result: V8ScriptCoverage[];
}

export interface V8CoverageFile {
  'coverage-1': V8CoverageResult;
}

export interface CoverageRange {
  start: number;
  end: number;
  covered: boolean;
}

export class V8CoverageReader {
  private coverageData: V8ScriptCoverage[] = [];

  constructor(coverageDir: string) {
    this.loadCoverageData(coverageDir);
  }

  private loadCoverageData(coverageDir: string): void {
    if (!fs.existsSync(coverageDir)) {
      throw new Error(`Coverage directory does not exist: ${coverageDir}`);
    }

    const files = fs.readdirSync(coverageDir);
    const coverageFiles = files.filter((f: string) => f.startsWith('coverage-') && f.endsWith('.json'));

    for (const file of coverageFiles) {
      const filePath = path.join(coverageDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data: any = JSON.parse(content);

      if (data['coverage-1'] && data['coverage-1'].result) {
        this.coverageData.push(...data['coverage-1'].result);
      } else if (data.result && Array.isArray(data.result)) {
        this.coverageData.push(...data.result);
      }
    }
  }

  public getScriptCoverage(scriptPath: string): V8ScriptCoverage | undefined {
    const normalizedPath = path.resolve(scriptPath);
    return this.coverageData.find(script => {
      let scriptUrl = script.url;
      if (scriptUrl.startsWith('file://')) {
        scriptUrl = scriptUrl.replace(/^file:\/\//, '');
      }
      const normalizedUrl = path.resolve(scriptUrl);
      return normalizedUrl === normalizedPath;
    });
  }

  public getCoverageRanges(scriptPath: string): CoverageRange[] {
    const scriptCoverage = this.getScriptCoverage(scriptPath);
    if (!scriptCoverage) {
      return [];
    }

    const ranges: CoverageRange[] = [];

    for (const func of scriptCoverage.functions) {
      for (const range of func.ranges) {
        ranges.push({
          start: range.startOffset,
          end: range.endOffset,
          covered: range.count > 0
        });
      }
    }

    return ranges;
  }

  public mergeRanges(ranges: CoverageRange[]): CoverageRange[] {
    if (ranges.length === 0) {
      return [];
    }

    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged: CoverageRange[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      if (next.start <= current.end) {
        current = {
          start: current.start,
          end: Math.max(current.end, next.end),
          covered: current.covered && next.covered
        };
      } else {
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);
    return merged;
  }

  public getUncoveredRanges(scriptPath: string, sourceCode: string): CoverageRange[] {
    const ranges = this.getCoverageRanges(scriptPath);
    const merged = this.mergeRanges(ranges);

    const uncovered: CoverageRange[] = [];
    const coveredRanges = merged.filter(r => r.covered).sort((a, b) => a.start - b.start);

    if (coveredRanges.length === 0) {
      return [{ start: 0, end: sourceCode.length, covered: false }];
    }

    if (coveredRanges[0].start > 0) {
      uncovered.push({ start: 0, end: coveredRanges[0].start, covered: false });
    }

    for (let i = 0; i < coveredRanges.length - 1; i++) {
      const gap = coveredRanges[i + 1].start - coveredRanges[i].end;
      if (gap > 0) {
        uncovered.push({
          start: coveredRanges[i].end,
          end: coveredRanges[i + 1].start,
          covered: false
        });
      }
    }

    const lastCovered = coveredRanges[coveredRanges.length - 1];
    if (lastCovered.end < sourceCode.length) {
      uncovered.push({ start: lastCovered.end, end: sourceCode.length, covered: false });
    }

    return uncovered;
  }

  public getAllScriptPaths(): string[] {
    return this.coverageData.map(script => {
      let url = script.url;
      if (url.startsWith('file://')) {
        url = url.replace(/^file:\/\//, '');
      }
      return url;
    });
  }
}
