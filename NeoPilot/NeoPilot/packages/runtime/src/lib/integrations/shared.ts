import { YogaInitialContext } from "graphql-yoga";
import { buildSchemaSync } from "type-graphql";
import { CopilotResolver } from "../../graphql/resolvers/copilot.resolver";
import { useDeferStream } from "@graphql-yoga/plugin-defer-stream";
import { CopilotRuntime } from "../runtime/copilot-runtime";
import { CopilotServiceAdapter } from "../../service-adapters";
import { CopilotCloudOptions } from "../cloud";
import { LogLevel, createLogger } from "../logger";
import { createYoga } from "graphql-yoga";
import telemetry from "../telemetry-client";
import { StateResolver } from "../../graphql/resolvers/state.resolver";
import * as packageJson from "../../../package.json";
import { NeoPilotError, NeoPilotErrorCode } from "@neopilot/shared";

const logger = createLogger();

export const addCustomHeaderPlugin = {
  onResponse({ response }) {
    // Set your custom header; adjust the header name and value as needed
    response.headers.set("X-NeoPilot-Runtime-Version", packageJson.version);
  },
};

type AnyPrimitive = string | boolean | number | null;
export type CopilotRequestContextProperties = Record<
  string,
  AnyPrimitive | Record<string, AnyPrimitive>
>;

export type GraphQLContext = YogaInitialContext & {
  _neopilot: CreateCopilotRuntimeServerOptions;
  properties: CopilotRequestContextProperties;
  logger: typeof logger;
};

export interface CreateCopilotRuntimeServerOptions {
  runtime: CopilotRuntime<any>;
  serviceAdapter: CopilotServiceAdapter;
  endpoint: string;
  baseUrl?: string;
  cloud?: CopilotCloudOptions;
  properties?: CopilotRequestContextProperties;
  logLevel?: LogLevel;
}

export async function createContext(
  initialContext: YogaInitialContext,
  neoPilotContext: CreateCopilotRuntimeServerOptions,
  contextLogger: typeof logger,
  properties: CopilotRequestContextProperties = {},
): Promise<Partial<GraphQLContext>> {
  logger.debug({ neoPilotContext }, "Creating GraphQL context");
  const ctx: GraphQLContext = {
    ...initialContext,
    _neopilot: {
      ...neoPilotContext,
    },
    properties: { ...properties },
    logger: contextLogger,
  };
  return ctx;
}

export function buildSchema(
  options: {
    emitSchemaFile?: string;
  } = {},
) {
  logger.debug("Building GraphQL schema...");
  const schema = buildSchemaSync({
    resolvers: [CopilotResolver, StateResolver],
    emitSchemaFile: options.emitSchemaFile,
  });
  logger.debug("GraphQL schema built successfully");
  return schema;
}

export type CommonConfig = {
  logging: typeof logger;
  schema: ReturnType<typeof buildSchema>;
  plugins: Parameters<typeof createYoga>[0]["plugins"];
  context: (ctx: YogaInitialContext) => Promise<Partial<GraphQLContext>>;
  maskedErrors: {
    maskError: (error: any, message: string, isDev?: boolean) => any;
  };
};

export function getCommonConfig(options: CreateCopilotRuntimeServerOptions): CommonConfig {
  const logLevel = (process.env.LOG_LEVEL as LogLevel) || (options.logLevel as LogLevel) || "error";
  const logger = createLogger({ level: logLevel, component: "getCommonConfig" });

  const contextLogger = createLogger({ level: logLevel });

  if (options.cloud) {
    telemetry.setCloudConfiguration({
      publicApiKey: options.cloud.publicApiKey,
      baseUrl: options.cloud.baseUrl,
    });
  }

  if (options.properties?._neopilot) {
    telemetry.setGlobalProperties({
      _neopilot: {
        ...(options.properties._neopilot as Record<string, any>),
      },
    });
  }

  telemetry.setGlobalProperties({
    runtime: {
      serviceAdapter: options.serviceAdapter.constructor.name,
    },
  });

  // User error codes that should not be logged as server errors
  const userErrorCodes = [
    NeoPilotErrorCode.AGENT_NOT_FOUND,
    NeoPilotErrorCode.API_NOT_FOUND,
    NeoPilotErrorCode.REMOTE_ENDPOINT_NOT_FOUND,
    NeoPilotErrorCode.CONFIGURATION_ERROR,
    NeoPilotErrorCode.MISSING_PUBLIC_API_KEY_ERROR,
  ];

  return {
    logging: createLogger({ component: "Yoga GraphQL", level: logLevel }),
    schema: buildSchema(),
    plugins: [useDeferStream(), addCustomHeaderPlugin],
    context: (ctx: YogaInitialContext): Promise<Partial<GraphQLContext>> =>
      createContext(ctx, options, contextLogger, options.properties),
    // Suppress logging for user configuration errors
    maskedErrors: {
      maskError: (error: any, message: string, isDev?: boolean) => {
        // Check if this is a user configuration error (could be wrapped in GraphQLError)
        const originalError = error.originalError || error;
        const extensions = error.extensions;
        const errorCode = extensions?.code;

        // Suppress logging for user errors based on error code
        if (errorCode && userErrorCodes.includes(errorCode)) {
          // Log user configuration errors at debug level instead
          console.debug("User configuration error:", error.message);
          return error;
        }

        // Check if the original error is a user error
        if (
          originalError instanceof NeoPilotError &&
          userErrorCodes.includes(originalError.code)
        ) {
          // Log user configuration errors at debug level instead
          console.debug("User configuration error:", error.message);
          return error;
        }

        // For application errors, log normally and mask if needed
        console.error("Application error:", error);
        return error;
      },
    },
  };
}
