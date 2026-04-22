import { appendFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Local CSV appended on each successful analyzeReceiptImage run. */
const RECEIPT_VISION_CSV_PATH =
  process.env.RECEIPT_VISION_CSV_PATH ||
  path.join(__dirname, "..", "..", "data", "receipt_vision_training.csv");

/**
 * @param {string} value
 */
function escapeCsvField(value) {
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * @param {string} dataUrl
 * @param {unknown} dataObj
 */
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

/**
 * JSON Schema for OpenAI structured outputs (`response_format.type: json_schema`, strict).
 * With strict mode, every key in `properties` must appear in `required` (use empty string / 0 when unknown).
 */
const RECEIPT_ITEMIZATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    merchantName: { type: "string" },
    transactionDate: { type: "string" },
    currency: { type: "string" },
    lineItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unitPrice: { type: "number" },
          lineTotal: { type: "number" },
        },
        required: ["description", "quantity", "unitPrice", "lineTotal"],
      },
    },
    subtotal: { type: "number" },
    taxTotal: { type: "number" },
    tipTotal: { type: "number" },
    miscellaneousChargesTotal: { type: "number" },
    total: { type: "number" },
    grandTotal: { type: "number" },
  },
  required: [
    "merchantName",
    "transactionDate",
    "currency",
    "lineItems",
    "subtotal",
    "taxTotal",
    "tipTotal",
    "miscellaneousChargesTotal",
    "total",
    "grandTotal",
  ],
};

const defaultSystemText =
  "You are a receipt parser. Respond with JSON only, matching the schema.";
const defaultInstructions =
  "You extract structured data from receipt photos. Prefer values printed on the receipt; use 0 for unknown amounts and empty string only when a text field is missing.";

function buildSystemPrompt() {
  if (process.env.RECEIPT_VISION_SYSTEM?.trim()) {
    return process.env.RECEIPT_VISION_SYSTEM.trim();
  }
  return `${defaultSystemText}\n\n${defaultInstructions}`;
}

export async function analyzeReceiptImage(filePath, mediaType) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for receipt vision.");
  }

  const modelName = process.env.RECEIPT_VISION_MODEL || "gpt-4o";
  const baseLlm = new ChatOpenAI({
    model: modelName,
    temperature: 0,
  });
  const structuredLlm = baseLlm.withStructuredOutput(
    RECEIPT_ITEMIZATION_SCHEMA,
    {
      name: "receipt_itemization",
      strict: true,
      method: "jsonSchema",
    },
  );

  const imageB64 = (await readFile(filePath)).toString("base64");
  const dataUrl = `data:${mediaType};base64,${imageB64}`;

  const systemText = buildSystemPrompt();

  const data = await structuredLlm.invoke([
    new SystemMessage(systemText),
    new HumanMessage({
      content: [
        {
          type: "text",
          text: "Itemize this receipt. Apply the JSON schema exactly.",
        },
        {
          type: "image_url",
          image_url: { url: dataUrl },
        },
      ],
    }),
  ]);

  await appendReceiptVisionCsv(dataUrl, data);

  return data;
}
