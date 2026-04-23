import { appendFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createAgent } from "langchain";
import { mapAiConfigTools } from "./toolsHelper.js";
import { aiClient } from "../ld.js";
import { LangChainProvider } from "@launchdarkly/server-sdk-ai-langchain";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Local CSV appended on each successful analyzeReceiptImage run. */
const RECEIPT_VISION_CSV_PATH =
  process.env.RECEIPT_VISION_CSV_PATH ||
  path.join(__dirname, "..", "..", "data", "receipt_vision_training.csv");

function escapeCsvField(value) {
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function appendReceiptVisionCsv(dataUrl, dataObj) {
  try {
    const dir = path.dirname(RECEIPT_VISION_CSV_PATH);
    await mkdir(dir, { recursive: true });
    let writeHeader = false;
    try {
      const st = await stat(RECEIPT_VISION_CSV_PATH);
      writeHeader = st.size === 0;
    } catch (e) {
      if (/** @type {NodeJS.ErrnoException} */ (e).code === "ENOENT") {
        writeHeader = true;
      } else {
        throw e;
      }
    }
    const expectedResponse = JSON.stringify(dataObj);
    const line = `${escapeCsvField(dataUrl)},${escapeCsvField(expectedResponse)}\n`;
    const payload = writeHeader
      ? `user_input,expected_response\n${line}`
      : line;
    await appendFile(RECEIPT_VISION_CSV_PATH, payload, "utf8");
  } catch (err) {
    console.error("receiptVision CSV append failed:", err);
  }
}

async function invokeReceiptItemizerAgent(agent, dataUrl) {
  return agent.invoke({
    messages: [
      new HumanMessage({
        content: [
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
        ],
      }),
    ],
  });
}

export async function analyzeReceiptImage(filePath, mediaType) {
  const defaultLdContext = { kind: "user", key: "receipt_itemization" };
  const defaultInstructions =
    "You extract structured data from receipt photos. Prefer values printed on the receipt; use 0 for unknown amounts and empty string only when a text field is missing.";

  const defaultAIAgentConfig = {
    enabled: true,
    model: { name: "gpt-4o" },
    provider: { name: "openai" },
    instructions: defaultInstructions,
  };

  const imageB64 = (await readFile(filePath)).toString("base64");
  const dataUrl = `data:${mediaType};base64,${imageB64}`;

  const agentConfig = await aiClient.agentConfig(
    "receipt-itemizer",
    defaultLdContext,
    { enabled: true },
    null,
  );

  if (!agentConfig.enabled || !agentConfig.tracker) {
    throw new Error(
      "Receipt itemizer AI config is disabled or missing a tracker.",
    );
  }

  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: agentConfig.model?.name ?? defaultAIAgentConfig.model.name,
    temperature:
      agentConfig.model?.parameters?.temperature ??
      defaultAIAgentConfig.model.parameters.temperature,
  });

  const { tracker } = agentConfig;

  const agent = createAgent({
    model,
    tools: mapAiConfigTools(agentConfig),
    systemPrompt: agentConfig.instructions,
  });

  const { messages } = await tracker.trackMetricsOf(
    LangChainProvider.getAIMetricsFromResponse,
    () => invokeReceiptItemizerAgent(agent, dataUrl),
  );

  const lastAi = messages.filter((m) => AIMessage.isInstance(m)).at(-1);
  if (!lastAi) {
    throw new Error("Receipt itemizer returned no assistant message.");
  }
  const data = JSON.parse(lastAi.text);
  return data;
}
