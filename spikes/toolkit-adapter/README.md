# PROTOTYPE: throwaway

Question: can @paypal/agent-toolkit (ai@4, zod3) tools run under AI SDK 7?
Verdict: yes, via `tool({ description, inputSchema: zodSchema(t.parameters), execute })`. See docs/adr/0001 on main.
