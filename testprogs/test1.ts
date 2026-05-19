// Test program 1: Various function calls with conditional paths
// Multi-byte characters: 你好, Привет, مرحبا, こんにちは

function greet(name: string, language: string): string {
  console.log("greet() called - always visible");

  if (language === "english") {
    console.log("english branch - should be visible");
    return `Hello, ${name}!`;
  } else if (language === "spanish") {
    console.log("spanish branch - NOT visible");
    return `¡Hola, ${name}!`;
  } else if (language === "chinese") {
    console.log("chinese branch - NOT visible");
    return `你好, ${name}!`;
  } else {
    console.log("default language branch - NOT visible");
    return `Greetings, ${name}!`;
  }
}

function calculate(operation: string, a: number, b: number): number {
  console.log("calculate() called - always visible");

  try {
    if (operation === "add") {
      console.log("add operation - should be visible");
      return a + b;
    } else if (operation === "subtract") {
      console.log("subtract operation - should be visible");
      return a - b;
    } else if (operation === "multiply") {
      console.log("multiply operation - NOT visible");
      return a * b;
    } else if (operation === "divide") {
      console.log("divide operation - should be visible");
      if (b === 0) {
        console.log("division by zero - NOT visible");
        throw new Error("Division by zero");
      }
      return a / b;
    } else {
      console.log("unknown operation - should be visible");
      throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.log("catch block - should be visible");
    if (error instanceof Error) {
      console.log(`Error caught: ${error.message} - should be visible`);
    }
    throw error;
  }
}

function processArray(arr: number[], threshold: number): number[] {
  console.log("processArray() called - always visible");

  const result: number[] = [];
  for (const num of arr) {
    console.log(`processing ${num} - should be visible`);
    if (num > threshold) {
      console.log(`${num} > ${threshold} - should be visible`);
      result.push(num);
    } else {
      console.log(`${num} <= ${threshold} - NOT visible`);
    }
  }

  return result;
}

// Main execution
console.log("=== Test Program 1 Starting === - always visible");

console.log(greet("World", "english"));
console.log(greet("المستخدم", "arabic"));

console.log(`5 + 3 = ${calculate("add", 5, 3)}`);
console.log(`10 - 4 = ${calculate("subtract", 10, 4)}`);
console.log(`8 / 2 = ${calculate("divide", 8, 2)}`);

try {
  console.log("attempting unknown operation - should be visible");
  calculate("modulo", 10, 3);
} catch (error) {
  console.log("caught error from unknown operation - should be visible");
}

const numbers = [1, 5, 3, 8, 2];
console.log(`Numbers > 3: ${JSON.stringify(processArray(numbers, 3))}`);

console.log("=== Test Program 1 Completed === - always visible");
