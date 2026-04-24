function addToolFn(input) {
  const { a, b } = input;
  if (typeof a !== "number" || typeof b !== "number") {
    throw new Error("Invalid input");
  }
  console.log(`Using the add tool with ${a} + ${b}`);
  return a + b;
}

function subtractToolFn(input) {
  const { a, b } = input;
  if (typeof a !== "number" || typeof b !== "number") {
    throw new Error("Invalid input");
  }
  console.log(`Using the subtract tool with ${a} - ${b}`);
  return a - b;
}

function multiplyToolFn(input) {
  const { a, b } = input;
  if (typeof a !== "number" || typeof b !== "number") {
    throw new Error("Invalid input");
  }
  console.log(`Using the multiply tool with ${a} * ${b}`);
  return a * b;
}

function divideToolFn(input) {
  const { a, b } = input;
  if (typeof a !== "number" || typeof b !== "number") {
    throw new Error("Invalid input");
  }
  console.log(`Using the divide tool with ${a} / ${b}`);
  return a / b;
}

const subtractTool = {
  name: "subtract",
  fn: subtractToolFn,
};

const multiplyTool = {
  name: "multiply",
  fn: multiplyToolFn,
};

const divideTool = {
  name: "divide",
  fn: divideToolFn,
};

const addTool = {
  name: "add",
  fn: addToolFn,
};

export const allTools = [addTool, subtractTool, multiplyTool, divideTool];
