export * from "./types";
export * from "./utils";
export * from "./constants";
export * from "./telemetry";

import * as packageJson from "../package.json";
export const NEOPILOT_VERSION = packageJson.version;
