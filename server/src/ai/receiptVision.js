import { readFile } from "node:fs/promises";
import { OpenAIProvider } from "@launchdarkly/server-sdk-ai-openai";
import { aiClient } from "../ld.js";

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
const defaultLdContext = { kind: "user", key: "receipt-upload" };
const defaultAIAgentConfig = {
  enabled: true,
  model: { name: "gpt-4o" },
  provider: { name: "openai" },
  instructions:
    "You extract structured data from receipt photos. Prefer values printed on the receipt; use 0 for unknown amounts and empty string only when a text field is missing.",
};

export async function analyzeReceiptImage(filePath, mediaType) {
  const agentConfig = await aiClient.agentConfig(
    "receipt-itemizer",
    defaultLdContext,
    defaultAIAgentConfig,
  );

  if (!agentConfig.enabled || !agentConfig.tracker) {
    throw new Error(
      "Receipt itemizer AI config is disabled or missing a tracker.",
    );
  }

  const provider = await OpenAIProvider.create(agentConfig);

  const imageB64 = (await readFile(filePath)).toString("base64");
  const dataUrl = `data:${mediaType};base64,${imageB64}`;

  const systemText = agentConfig.instructions ?? defaultSystemText;

  const messages = [
    { role: "system", content: systemText },
    {
      role: "user",
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
    },
  ];

  const { data, metrics } = await agentConfig.tracker.trackMetricsOf(
    (result) => result.metrics,
    () => provider.invokeStructuredModel(messages, RECEIPT_ITEMIZATION_SCHEMA),
  );

  if (!metrics.success) {
    throw new Error("Receipt structured model invocation did not succeed.");
  }

  return data;
}
