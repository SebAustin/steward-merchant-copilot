// Runtime proof (no network for schema checks; mock LLM drives a tool call)
import { generateText, isStepCount, asSchema } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { ALL_TOOLS_ENABLED } from '@paypal/agent-toolkit/ai-sdk';
import { createPayPalTools } from './paypal-tools-adapter.js';

const tools = createPayPalTools({ clientId: 'fake', clientSecret: 'fake', configuration: { actions: ALL_TOOLS_ENABLED, context: { sandbox: true } } });
let ok = 0; const bad: string[] = [];
for (const [n, t] of Object.entries(tools)) {
  try { const js = await asSchema(t.inputSchema as any).jsonSchema as any; if (js.type === 'object') ok++; else bad.push(n); } catch (e) { bad.push(n + ': ' + (e as Error).message); }
}
console.log(`tools=${Object.keys(tools).length} jsonSchemaObjects=${ok} bad=${JSON.stringify(bad)}`);
console.log('list_disputes schema:', JSON.stringify(await asSchema(tools.list_disputes.inputSchema as any).jsonSchema).slice(0, 400));
const v = await asSchema(tools.accept_dispute_claim.inputSchema as any).validate!({ dispute_id: 123 });
console.log('validation of bad input ->', v.success);

let call = 0;
const model = new MockLanguageModelV4({
  doGenerate: async () => (call++ === 0
    ? { content: [{ type: 'tool-call', toolCallId: 't1', toolName: 'get_dispute', input: JSON.stringify({ dispute_id: 'PP-D-12345' }) }],
        finishReason: { unified: 'tool-calls', raw: 'tool_use' }, usage: u(), warnings: [] }
    : { content: [{ type: 'text', text: 'done' }], finishReason: { unified: 'stop', raw: 'end_turn' }, usage: u(), warnings: [] }) as any,
});
const res = await generateText({ model, tools, prompt: 'get dispute', stopWhen: isStepCount(3) });
const tr = res.steps[0].content.filter((c: any) => c.type === 'tool-result' || c.type === 'tool-error');
console.log('step0 tool outcome:', tr.map((c: any) => c.type + ' ' + (c.error?.message ?? '')).join(' / ').slice(0, 300));
console.log('final text:', res.text, 'steps:', res.steps.length);
function u() { return { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } }; }
