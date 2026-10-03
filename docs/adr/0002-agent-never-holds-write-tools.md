# The agent never holds a tool that writes to PayPal

The model is given read tools and **propose** tools only. A propose tool records a Proposal; it cannot reach PayPal. An Execution happens only in a separate server route that verifies an Approval (or a Standing Policy match for invoice reminders) and runs exactly once per Proposal.

We chose this over "ask for confirmation in chat, then call the write tool" because that pattern trusts the model to honor the confirmation. Untrusted Text in disputes and invoice notes can steer the model, so containing prompt injection has to be structural, not behavioral. Evals measure containment; they don't provide it.
