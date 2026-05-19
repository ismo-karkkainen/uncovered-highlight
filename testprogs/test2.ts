// Test program 2: More complex paths with nested conditions
// Multi-byte characters: 🎉🎊🚀✨💻

interface User {
  name: string;
  age: number;
  country: string;
}

function validateUser(user: User): boolean {
  console.log("validateUser() called - always visible");

  if (!user.name) {
    console.log("name validation failed - NOT visible");
    return false;
  }

  if (user.age < 0) {
    console.log("negative age - NOT visible");
    return false;
  } else if (user.age < 18) {
    console.log("age < 18 - should be visible");
    return false;
  } else if (user.age > 120) {
    console.log("age > 120 - NOT visible");
    return false;
  }

  if (user.country === "禁止国") {
    console.log("restricted country - NOT visible");
    return false;
  }

  console.log("validation passed - should be visible");
  return true;
}

function processUserData(users: User[]): User[] {
  console.log("processUserData() called - always visible");

  const validUsers: User[] = [];

  for (const user of users) {
    console.log(`Processing user: ${user.name} - should be visible`);

    try {
      if (validateUser(user)) {
        console.log(`User ${user.name} is valid - should be visible`);
        validUsers.push(user);
      } else {
        console.log(`User ${user.name} is invalid - should be visible`);
      }
    } catch (error) {
      console.log(`Error processing user ${user.name} - NOT visible`);
      if (error instanceof Error) {
        console.log(`Error message: ${error.message} - NOT visible`);
      }
    }
  }

  return validUsers;
}

function formatOutput(users: User[]): string {
  console.log("formatOutput() called - always visible");

  if (users.length === 0) {
    console.log("no users to format - NOT visible");
    return "No valid users found";
  }

  if (users.length === 1) {
    console.log("single user - NOT visible");
    return `Found 1 user: ${users[0].name}`;
  }

  console.log("multiple users - should be visible");
  const names = users.map(u => u.name).join(", ");
  return `Found ${users.length} users: ${names}`;
}

// Main execution
console.log("=== Test Program 2 Starting 🚀 === - always visible");

const testUsers: User[] = [
  { name: "Alice", age: 25, country: "USA" },
  { name: "Bob", age: 16, country: "Canada" },
  { name: "Charlie ツ", age: 30, country: "Japan" },
  { name: "Diana Αλφα", age: 22, country: "Greece" }
];

const validUsers = processUserData(testUsers);
console.log(formatOutput(validUsers));

console.log("=== Test Program 2 Completed ✨ === - always visible");
