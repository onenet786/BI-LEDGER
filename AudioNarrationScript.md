# Video Tutorial - Audio Narration Voiceover Script

This document contains a complete, module-wise voiceover script designed for recording a video tutorial or feeding into a text-to-speech engine to present the **Party Ledger BI Engine**.

---

## Intro: Welcome
* **Visual**: Show the top header logo "LEDGER" and the Persona Switcher set to "Super Admin".
* **Audio Narration (Voiceover)**:
  > *"Welcome to the training tutorial for the Service Enterprise Party Ledger Engine. In this video, we will walk you through the system module-by-module, showing you how to manage multi-currency accounts, configure maker-checker policies, perform contra offsets, and run real-time business intelligence reports. Let's begin by reviewing the core workspace settings."*

---

## Module 1: Architecture & Workspace Settings
* **Visual**: Click the **Workspace Settings** tab. Hover over the Organization Name, Base Currency (USD), and Fiscal Lock Date inputs.
* **Audio Narration (Voiceover)**:
  > *"First, let's explore Module One: Workspace Settings. The engine is built around a single consolidated base currency, which is USD. Here, you can set the starting month of your fiscal year and define the Maker-Checker policy limit—which dictates when a transaction draft requires supervisor approval. Most importantly, you can set a Fiscal Close Lock Date. Once a lock date is set, the ledger automatically blocks any backdated transactions on or before that date, preventing tampering with closed financial books."*

---

## Module 2: The Dashboard Hub & RBAC Personas
* **Visual**: Click back to the **Dashboard Hub**. Point out the Consolidated AR, AP, Net Position widgets, the Persona dropdown, and the Pending Approvals list.
* **Audio Narration (Voiceover)**:
  > *"Next is Module Two: The Dashboard Hub. The top widgets display your consolidated receivables, payables, and net cash position. In the top-right corner, you can switch between six interactive persona roles—such as Super Admin, Finance Manager, and Data Entry Operator. For instance, when logged in as a supervisor, you'll see the Pending Approvals Queue. This is where draft transactions created by operators that exceed the approval threshold are routed for supervisor checker authorization."*

---

## Module 3: Party Registry & 360° Profiles
* **Visual**: Click the **Party Registry** tab. Search for 'Acme', then click **Inspect 360° Profile** on the Acme Consulting card.
* **Audio Narration (Voiceover)**:
  > *"Now we move to Module Three: The Party Registry. Unlike traditional ERPs that separate clients and vendors, this engine allows dual-role registry profiles. If we inspect a party's 360-degree profile, we get a full breakdown of their contacts, contract documents, billing milestones, and running audit notes. Supervisors also have access to advanced ledger controls here, allowing them to write off bad debts or apply reciprocal Contra offsets to instantly settle mutual accounts."*

---

## Module 4: Posting Transactions & Tax Deduction (TDS)
* **Visual**: Click the **Post Transaction** tab. Hover over the transaction type dropdown, branch locations, and the TDS Rate input box.
* **Audio Narration (Voiceover)**:
  > *"Let's look at Module Four: Posting Transactions. The taxonomy posting form handles invoices, bills, payments, advances, and journal adjustments. You can allocate entries to specific branches—like New York, London, or Dubai—and the system automatically factors in Tax Deductions at Source, or withholding tax, on subcontractor bills. If a transaction is posted by an operator and is above the approval threshold, the system flags it as 'pending approval' and locks it from the general ledger until approved."*

---

## Module 5: Financial Intelligence & BI Reporting
* **Visual**: Click the **Financial Intelligence** tab. Click through the report dropdowns: Party Statement, AR Aging, AP Aging, and BI Profitability.
* **Audio Narration (Voiceover)**:
  > *"Module Five covers Financial Intelligence. The reports center aggregates posted transactions to generate real-time statements,FIFO-based Accounts Receivables and Payables aging buckets, cash flows, and tax summaries. It also calculates foreign exchange revaluations, contract profitability margins, advance deposit utilization percentages, and collections velocity or DSO days, giving you instant business intelligence without exporting data."*

---

## Module 6: Immutable Security Auditing
* **Visual**: Click the **System Audit Logs** tab. Scroll down the log table showing log dates, users, actions, details, and simulated IP addresses.
* **Audio Narration (Voiceover)**:
  > *"Finally, we have Module Six: System Security Auditing. The engine maintains an immutable, chronological security audit trail. Every intervention—whether it is a database reset, settings adjustment, party creation, or transaction approval—is logged alongside the active persona, detailed changes, and a simulated origin IP address. This ensures full regulatory compliance and operational transparency. This concludes our walkthrough. You are now ready to deploy and operate the Party Ledger Engine."*
