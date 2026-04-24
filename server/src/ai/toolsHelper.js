import { tool } from "langchain";
import { allTools } from "./receiptMathTools.js";

export function mapAiConfigTools(aiConfig) {
  // Tools available from the LD AI Config
  const toolsParam = aiConfig?.model?.parameters?.tools;
  const availableTools = toolsParam.map((tool) => tool.name);

  if (toolsParam == null || !Array.isArray(toolsParam)) {
    throw new Error("No tools on the AI Config!");
  }

  // Filter local tools to only include the tools that are in the LD AI Config
  // const configTools = allTools.filter((tool) =>
  //   availableTools.includes(tool.name),
  // );

  // Build the tools array from the config tools
  const tools = [];
  for (const toolParam of toolsParam) {
    const localTool = allTools.find((tool) => tool.name === toolParam.name);
    const langchainTool = tool(localTool.fn, {
      name: toolParam.name,
      description: toolParam.description,
      schema: toolParam.parameters,
    });
    tools.push(langchainTool);
  }

  return tools;
}
