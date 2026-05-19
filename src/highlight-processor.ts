import { MappedCoverageRange, SourcePosition } from './source-map-processor';
import { CoverageRange } from './v8-coverage';

export interface HighlightRange {
  start: number;
  end: number;
}

export interface LineHighlight {
  lineNumber: number;
  lineContent: string;
  highlights: HighlightRange[];
}

export class HighlightProcessor {
  public processSourceWithCoverage(
    sourceCode: string,
    mappedRanges: MappedCoverageRange[]
  ): LineHighlight[] {
    const lines = this.splitIntoLines(sourceCode);
    const lineHighlights: LineHighlight[] = [];

    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      const lineContent = lines[i];
      const highlights = this.getHighlightsForLine(lineNumber, lineContent, mappedRanges);

      lineHighlights.push({
        lineNumber,
        lineContent,
        highlights
      });
    }

    return lineHighlights;
  }

  public processJsSourceWithCoverage(
    sourceCode: string,
    coverageRanges: CoverageRange[]
  ): LineHighlight[] {
    const lines = this.splitIntoLines(sourceCode);
    const lineHighlights: LineHighlight[] = [];
    const uncoveredRanges = coverageRanges.filter(r => !r.covered);

    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      const lineContent = lines[i];
      const lineStart = this.getLineStartOffset(lines, i);
      const lineEnd = lineStart + lineContent.length;
      const highlights = this.getHighlightsForLineFromOffsets(
        lineStart,
        lineEnd,
        lineContent,
        uncoveredRanges
      );

      lineHighlights.push({
        lineNumber,
        lineContent,
        highlights
      });
    }

    return lineHighlights;
  }

  private splitIntoLines(source: string): string[] {
    return source.split(/\r?\n/);
  }

  private getLineStartOffset(lines: string[], lineIndex: number): number {
    let offset = 0;
    for (let i = 0; i < lineIndex; i++) {
      offset += lines[i].length + 1;
    }
    return offset;
  }

  private getHighlightsForLine(
    lineNumber: number,
    lineContent: string,
    mappedRanges: MappedCoverageRange[]
  ): HighlightRange[] {
    const highlights: HighlightRange[] = [];
    const uncoveredRanges = mappedRanges.filter(r => !r.covered);

    for (const range of uncoveredRanges) {
      if (this.rangeIntersectsLine(range, lineNumber)) {
        const highlight = this.calculateLineHighlight(range, lineNumber, lineContent);
        if (highlight) {
          highlights.push(highlight);
        }
      }
    }

    return this.mergeHighlights(highlights);
  }

  private getHighlightsForLineFromOffsets(
    lineStart: number,
    lineEnd: number,
    lineContent: string,
    uncoveredRanges: CoverageRange[]
  ): HighlightRange[] {
    const highlights: HighlightRange[] = [];

    for (const range of uncoveredRanges) {
      if (range.start < lineEnd && range.end > lineStart) {
        const start = Math.max(0, range.start - lineStart);
        const end = Math.min(lineContent.length, range.end - lineStart);
        highlights.push({ start, end });
      }
    }

    return this.mergeHighlights(highlights);
  }

  private rangeIntersectsLine(range: MappedCoverageRange, lineNumber: number): boolean {
    return range.range.start.line <= lineNumber && range.range.end.line >= lineNumber;
  }

  private calculateLineHighlight(
    range: MappedCoverageRange,
    lineNumber: number,
    lineContent: string
  ): HighlightRange | null {
    let start = 0;
    let end = lineContent.length;

    if (range.range.start.line === lineNumber) {
      start = range.range.start.column;
    }

    if (range.range.end.line === lineNumber) {
      end = range.range.end.column;
    }

    if (start >= end || start >= lineContent.length) {
      return null;
    }

    end = Math.min(end, lineContent.length);

    return { start, end };
  }

  private mergeHighlights(highlights: HighlightRange[]): HighlightRange[] {
    if (highlights.length === 0) {
      return [];
    }

    const sorted = [...highlights].sort((a, b) => a.start - b.start);
    const merged: HighlightRange[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      if (next.start <= current.end) {
        current = {
          start: current.start,
          end: Math.max(current.end, next.end)
        };
      } else {
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);
    return merged;
  }

  public filterContextLines(
    lineHighlights: LineHighlight[],
    contextLines: number
  ): LineHighlight[] {
    const hasHighlights = lineHighlights.map(lh => lh.highlights.length > 0);
    const included: boolean[] = new Array(lineHighlights.length).fill(false);

    for (let i = 0; i < hasHighlights.length; i++) {
      if (hasHighlights[i]) {
        included[i] = true;

        for (let j = Math.max(0, i - contextLines); j <= Math.min(hasHighlights.length - 1, i + contextLines); j++) {
          included[j] = true;
        }
      }
    }

    return lineHighlights.filter((_, index) => included[index]);
  }
}
