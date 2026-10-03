# PayPal integration: Agent Toolkit for reads, our own REST client for writes and gaps

The agent's **read** tools come from PayPal's official `@paypal/agent-toolkit` through a small adapter. The toolkit is built on AI SDK v4 with zod 3; the adapter re-wraps each tool for AI SDK 7 with `zodSchema()`. Every PayPal **write** (an approved Execution) goes through our own thin REST client instead, and so do the endpoints the toolkit lacks: dispute provide-evidence, webhook signature verification, and the sandbox dispute simulators.

We chose this because the write path must control the `PayPal-Request-Id` idempotency key, error typing and the Audit Entry. The toolkit's `execute` returns stringified JSON and hides those details. Using the toolkit for reads keeps PayPal's own agent tooling central to the product. `@paypal/paypal-server-sdk` was rejected because it has no Disputes, Invoicing or webhook support.

**Consequences:** the toolkit pulls a nested `ai@4` and `zod@3` into `node_modules`. It is used only server-side, behind the adapter, and must not leak into client bundles.
