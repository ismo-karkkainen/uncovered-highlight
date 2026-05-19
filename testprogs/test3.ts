// Test program 3: Exception handling and edge cases
// Multi-byte characters: Дерево, árbol, 树木, дерево

class DataProcessor {
  private data: number[];

  constructor(initialData: number[]) {
    console.log("DataProcessor constructor - always visible");
    this.data = initialData;
  }

  public filter(predicate: (n: number) => boolean): DataProcessor {
    console.log("filter() called - always visible");
    try {
      const filtered = this.data.filter(predicate);
      console.log(`Filtered ${this.data.length} to ${filtered.length} items - should be visible`);
      return new DataProcessor(filtered);
    } catch (error) {
      console.log("filter() error - NOT visible");
      throw new Error("Filter operation failed");
    }
  }

  public map(transform: (n: number) => number): DataProcessor {
    console.log("map() called - NOT visible");
    const mapped = this.data.map(transform);
    console.log(`Mapped ${this.data.length} items - NOT visible`);
    return new DataProcessor(mapped);
  }

  public reduce(reducer: (acc: number, n: number) => number, initial: number): number {
    console.log("reduce() called - should be visible");

    if (this.data.length === 0) {
      console.log("empty data for reduce - NOT visible");
      return initial;
    }

    try {
      const result = this.data.reduce(reducer, initial);
      console.log(`Reduced to: ${result} - should be visible`);
      return result;
    } catch (error) {
      console.log("reduce() error - NOT visible");
      throw new Error("Reduce operation failed");
    }
  }

  public getData(): number[] {
    console.log("getData() called - should be visible");
    return [...this.data];
  }
}

function safeParseInt(value: string): number {
  console.log(`safeParseInt("${value}") called - should be visible`);

  if (value === "") {
    console.log("empty string - NOT visible");
    throw new Error("Empty string");
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    console.log("NaN result - should be visible");
    throw new Error(`Cannot parse: ${value}`);
  }

  if (parsed < 0) {
    console.log("negative number - NOT visible");
    return 0;
  }

  console.log(`Parsed: ${parsed} - should be visible`);
  return parsed;
}

function processStringNumbers(strings: string[]): number {
  console.log("processStringNumbers() called - always visible");

  const numbers: number[] = [];

  for (const str of strings) {
    try {
      console.log(`Processing: "${str}" - should be visible`);
      const num = safeParseInt(str);
      numbers.push(num);
    } catch (error) {
      console.log(`Skipping invalid: "${str}" - should be visible`);
      if (error instanceof Error) {
        console.log(`Reason: ${error.message} - should be visible`);
      }
    }
  }

  if (numbers.length === 0) {
    console.log("No valid numbers - NOT visible");
    return 0;
  }

  const processor = new DataProcessor(numbers);
  const filtered = processor.filter(n => n > 5);
  const sum = filtered.reduce((acc, n) => acc + n, 0);

  console.log(`Final sum: ${sum} - should be visible`);
  return sum;
}

// Main execution
console.log("=== Test Program 3 Starting Дерево === - always visible");

const testStrings = ["10", "abc", "7", "3", "15", "xyz"];
const result = processStringNumbers(testStrings);
console.log(`Result: ${result}`);

// Additional test with valid numbers only
const validStrings = ["1", "2", "3"];
const processor = new DataProcessor(validStrings.map(s => parseInt(s, 10)));
const filtered = processor.filter(n => n > 0);
console.log(`Filtered data: ${JSON.stringify(filtered.getData())}`);

console.log("=== Test Program 3 Completed 树木 === - always visible");
