# Steward

Steward is an ops copilot for one small PayPal merchant. It notices money that needs attention, prepares the work, and acts only with the merchant's approval.

## Parties

**Merchant**:
The business owner whose PayPal account Steward operates on, and the only person who can approve actions.
_Avoid_: User, seller, admin

**Customer**:
A person or business that pays the Merchant: a retail buyer of an Order, or a wholesale café billed by Invoice.
_Avoid_: Buyer, client, payer (except when quoting PayPal field names)

## Money owed and money moved

**Order**:
A retail purchase a Customer paid for through PayPal checkout.
_Avoid_: Purchase, sale

**Transaction**:
A single money movement recorded on the Merchant's PayPal account (payment, refund, fee, reversal).
_Avoid_: Payment (too narrow), activity

**Invoice**:
A PayPal request for payment sent to a wholesale Customer, with a due date.
_Avoid_: Bill, payment request

**Overdue Invoice**:
An Invoice that is unpaid after its due date.
_Avoid_: Late invoice, outstanding invoice (outstanding includes not-yet-due)

**Refund**:
Money returned to a Customer against a captured Order, in full or in part.
_Avoid_: Reversal (PayPal uses that for chargebacks), return

## Disputes

**Dispute**:
A Customer's formal challenge of an Order through PayPal, with a reason and a seller response deadline.
_Avoid_: Claim, case, chargeback (a chargeback is a card-network dispute, a subtype)

**Response Deadline**:
The moment after which an unanswered Dispute is decided against the Merchant.
_Avoid_: Due date (reserved for Invoices)

**Evidence Packet**:
The facts Steward gathers for one Dispute (Order, shipment tracking, Invoice, prior Customer history), each with its source.
_Avoid_: Proof, attachments

**Contest** / **Accept**:
The two ways the Merchant can answer a Dispute: fight it with an Evidence Packet, or concede and refund.
_Avoid_: Fight / give up, appeal

## Steward's work

**Attention Item**:
Anything in the Merchant's account that Steward thinks needs a decision: an Overdue Invoice, an open Dispute, or a Risk Flag.
_Avoid_: Task, alert, ticket

**Risk Flag**:
Steward's explained suspicion about a Transaction or Customer (refund spike, repeat disputer, unusual first order).
_Avoid_: Fraud alert (Steward suspects; it never concludes fraud)

**Proposal**:
A concrete action Steward drafts for the Merchant to decide on, carrying its rationale, risk level, cited evidence, and amount at stake. A Proposal does nothing until it is approved.
_Avoid_: Suggestion, recommendation, action (an action is what happens after approval)

**Approval**:
The Merchant's explicit yes to one Proposal, which is the only thing that can cause an Execution.
_Avoid_: Confirmation, consent

**Rejection**:
The Merchant's explicit no to one Proposal. It is final for that Proposal.
_Avoid_: Dismissal, cancel

**Execution**:
The single PayPal write that carries out an approved Proposal. A Proposal has at most one Execution, however many times approval is retried.
_Avoid_: Run, apply

**Standing Policy**:
A Merchant-defined rule that pre-approves a narrow class of low-risk Proposals (invoice reminders only), within caps.
_Avoid_: Automation, rule, autopilot

**Audit Entry**:
An immutable record of a Proposal's life: who or what created it, approved or rejected it, and what its Execution returned.
_Avoid_: Log line, history

**Brief**:
Steward's plain-language summary of the current Attention Items, ordered by urgency and money at stake.
_Avoid_: Report, digest, dashboard

**Untrusted Text**:
Any words that came from a Customer or another outside party (dispute messages, invoice notes). Steward reads it as data, never as instructions.
_Avoid_: User input (ambiguous with the Merchant)
