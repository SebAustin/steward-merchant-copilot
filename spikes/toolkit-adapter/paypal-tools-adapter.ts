// SPIKE (throwaway): adapt @paypal/agent-toolkit@1.11.0 (ai@4 / zod@3 tools) to AI SDK 7 tools.
import { tool, zodSchema, type ToolSet } from 'ai';
import { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';

type ToolkitConfig = ConstructorParameters<typeof PayPalAgentToolkit>[0]['configuration'];

// Shape returned by toolkit.getTools(): { [name]: { description, parameters: z3.ZodObject, execute(args) => Promise<string /*JSON*/> } }
type LegacyTool = {
  description?: string;
  parameters: unknown; // zod v3 ZodObject from the toolkit's own nested zod@3.25.x
  execute?: (args: unknown, opts?: unknown) => PromiseLike<unknown>;
};

export function createPayPalTools(opts: {
  clientId: string;
  clientSecret: string;
  configuration: ToolkitConfig;
}): ToolSet {
  const toolkit = new PayPalAgentToolkit(opts);
  const legacy = toolkit.getTools() as unknown as Record<string, LegacyTool>;
  const out: ToolSet = {};
  for (const [name, t] of Object.entries(legacy)) {
    const execute = t.execute;
    if (!execute) continue;
    out[name] = tool({
      description: t.description,
      // AI SDK 7 zodSchema() accepts zod v3 (>=3.25.76) or v4 and converts v3 via its built-in zod3-to-json-schema.
      inputSchema: zodSchema(t.parameters as Parameters<typeof zodSchema>[0]),
      execute: async (input: unknown) => {
        // Toolkit never throws: run() returns JSON.stringify(result) or JSON.stringify({error:{...}}).
        const raw = await execute(input);
        const parsed = typeof raw === 'string' ? safeJson(raw) : raw;
        if (parsed && typeof parsed === 'object' && 'error' in parsed) {
          throw new Error(`PayPal ${name} failed: ${JSON.stringify((parsed as { error: unknown }).error)}`);
        }
        return parsed;
      },
    });
  }
  return out;
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}
