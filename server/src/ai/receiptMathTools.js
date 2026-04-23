function addToolFn({ a, b }) {
  console.log(`Using the add tool with ${a} + ${b}`);
  return a + b;
}

function subtractToolFn({ a, b }) {
  console.log(`Using the subtract tool with ${a} - ${b}`);
  return a - b;
}

function multiplyToolFn({ a, b }) {
  console.log(`Using the multiply tool with ${a} * ${b}`);
  return a * b;
}

function divideToolFn({ a, b }) {
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
