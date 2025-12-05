import { NeoPilotMisuseError } from "@neopilot/shared";
import {
  neoPilotInterrupt,
  convertActionToDynamicStructuredTool,
  convertActionsToDynamicStructuredTools,
  neopilotCustomizeConfig,
  neopilotEmitMessage,
  neopilotEmitState,
  neopilotEmitToolCall,
  neopilotExit,
} from "../langgraph";

describe("SDK-JS Error Handling", () => {
  describe("neoPilotInterrupt", () => {
    it("should throw NeoPilotMisuseError when neither message nor action provided", () => {
      expect(() => {
        neoPilotInterrupt({});
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        neoPilotInterrupt({});
      }).toThrow(
        "Either message or action (and optional arguments) must be provided for neoPilotInterrupt",
      );
    });

    it("should throw NeoPilotMisuseError when action is not a string", () => {
      expect(() => {
        neoPilotInterrupt({ action: 123 as any });
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        neoPilotInterrupt({ action: 123 as any });
      }).toThrow("Action must be a string when provided to neoPilotInterrupt");
    });

    it("should throw NeoPilotMisuseError when message is not a string", () => {
      expect(() => {
        neoPilotInterrupt({ message: 123 as any });
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        neoPilotInterrupt({ message: 123 as any });
      }).toThrow("Message must be a string when provided to neoPilotInterrupt");
    });

    it("should throw NeoPilotMisuseError when args is not an object", () => {
      expect(() => {
        neoPilotInterrupt({ action: "test", args: "invalid" as any });
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        neoPilotInterrupt({ action: "test", args: "invalid" as any });
      }).toThrow("Args must be an object when provided to neoPilotInterrupt");
    });
  });

  describe("convertActionToDynamicStructuredTool", () => {
    it("should throw NeoPilotMisuseError when actionInput is null/undefined", () => {
      expect(() => {
        convertActionToDynamicStructuredTool(null);
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        convertActionToDynamicStructuredTool(null);
      }).toThrow("Action input is required but was not provided");
    });

    it("should throw NeoPilotMisuseError when name is missing", () => {
      expect(() => {
        convertActionToDynamicStructuredTool({ description: "test" });
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        convertActionToDynamicStructuredTool({ description: "test" });
      }).toThrow("Action must have a valid 'name' property of type string");
    });

    it("should throw NeoPilotMisuseError when description is missing", () => {
      expect(() => {
        convertActionToDynamicStructuredTool({ name: "test" });
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        convertActionToDynamicStructuredTool({ name: "test" });
      }).toThrow("Action 'test' must have a valid 'description' property of type string");
    });

    it("should throw NeoPilotMisuseError when parameters is missing", () => {
      expect(() => {
        convertActionToDynamicStructuredTool({ name: "test", description: "test desc" });
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        convertActionToDynamicStructuredTool({ name: "test", description: "test desc" });
      }).toThrow("Action 'test' must have a 'parameters' property");
    });
  });

  describe("convertActionsToDynamicStructuredTools", () => {
    it("should throw NeoPilotMisuseError when actions is not an array", () => {
      expect(() => {
        convertActionsToDynamicStructuredTools("not an array" as any);
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        convertActionsToDynamicStructuredTools("not an array" as any);
      }).toThrow("Actions must be an array");
    });
  });

  describe("neopilotCustomizeConfig", () => {
    it("should throw NeoPilotMisuseError when baseConfig is not an object", () => {
      expect(() => {
        neopilotCustomizeConfig("invalid" as any);
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        neopilotCustomizeConfig("invalid" as any);
      }).toThrow("baseConfig must be an object or null/undefined");
    });

    it("should throw NeoPilotMisuseError when options is not an object", () => {
      expect(() => {
        neopilotCustomizeConfig({}, "invalid" as any);
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        neopilotCustomizeConfig({}, "invalid" as any);
      }).toThrow("options must be an object when provided");
    });

    it("should throw NeoPilotMisuseError when emitIntermediateState is not an array", () => {
      expect(() => {
        neopilotCustomizeConfig({}, { emitIntermediateState: "invalid" as any });
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        neopilotCustomizeConfig({}, { emitIntermediateState: "invalid" as any });
      }).toThrow("emitIntermediateState must be an array when provided");
    });

    it("should throw NeoPilotMisuseError when emitIntermediateState item is invalid", () => {
      expect(() => {
        neopilotCustomizeConfig({}, { emitIntermediateState: [{ invalidKey: "value" }] as any });
      }).toThrow(NeoPilotMisuseError);

      expect(() => {
        neopilotCustomizeConfig({}, { emitIntermediateState: [{ invalidKey: "value" }] as any });
      }).toThrow("emitIntermediateState[0] must have a valid 'stateKey' string property");
    });
  });

  describe("emit functions", () => {
    const mockConfig = { metadata: {} };

    it("should throw NeoPilotMisuseError when config is missing for neopilotExit", async () => {
      await expect(neopilotExit(null as any)).rejects.toThrow(NeoPilotMisuseError);
      await expect(neopilotExit(null as any)).rejects.toThrow(
        "LangGraph configuration is required for neopilotExit",
      );
    });

    it("should throw NeoPilotMisuseError when config is missing for neopilotEmitState", async () => {
      await expect(neopilotEmitState(null as any, {})).rejects.toThrow(NeoPilotMisuseError);
      await expect(neopilotEmitState(null as any, {})).rejects.toThrow(
        "LangGraph configuration is required for neopilotEmitState",
      );
    });

    it("should throw NeoPilotMisuseError when state is undefined for neopilotEmitState", async () => {
      await expect(neopilotEmitState(mockConfig, undefined)).rejects.toThrow(
        NeoPilotMisuseError,
      );
      await expect(neopilotEmitState(mockConfig, undefined)).rejects.toThrow(
        "State is required for neopilotEmitState",
      );
    });

    it("should throw NeoPilotMisuseError when message is invalid for neopilotEmitMessage", async () => {
      await expect(neopilotEmitMessage(mockConfig, "" as any)).rejects.toThrow(
        NeoPilotMisuseError,
      );
      await expect(neopilotEmitMessage(mockConfig, "" as any)).rejects.toThrow(
        "Message must be a non-empty string for neopilotEmitMessage",
      );
    });

    it("should throw NeoPilotMisuseError when tool name is invalid for neopilotEmitToolCall", async () => {
      await expect(neopilotEmitToolCall(mockConfig, "", {})).rejects.toThrow(
        NeoPilotMisuseError,
      );
      await expect(neopilotEmitToolCall(mockConfig, "", {})).rejects.toThrow(
        "Tool name must be a non-empty string for neopilotEmitToolCall",
      );
    });

    it("should throw NeoPilotMisuseError when args is undefined for neopilotEmitToolCall", async () => {
      await expect(neopilotEmitToolCall(mockConfig, "testTool", undefined)).rejects.toThrow(
        NeoPilotMisuseError,
      );
      await expect(neopilotEmitToolCall(mockConfig, "testTool", undefined)).rejects.toThrow(
        "Tool arguments are required for neopilotEmitToolCall",
      );
    });
  });
});
