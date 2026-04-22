import { init } from "@launchdarkly/node-server-sdk";
import { initAi } from "@launchdarkly/server-sdk-ai";

import dotenv from "dotenv";

dotenv.config();

const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;

// Initialize LaunchDarkly client
const ldClient = init(sdkKey);
const aiClient = initAi(ldClient);

export { ldClient, aiClient };
