# Complete Tutorial & User Guide - Party Ledger BI Engine

Welcome to the comprehensive user manual for the **Service Enterprise Party Ledger Intelligence Engine**. This document provides an exhaustive, step-by-step tutorial covering every screen, workflow, calculation, and configuration setting in the system.

---

## Table of Contents
1. [Core Financial Concepts & Architecture](#1-core-financial-concepts--architecture)
2. [Role-Based Access Control (RBAC) & Personas](#2-role-based-access-control-rbac--personas)
3. [Dashboard Hub & Dashboard Widgets](#3-dashboard-hub--dashboard-widgets)
4. [Party Registry & 360° Profile Drilldowns](#4-party-registry--360-profile-drilldowns)
5. [Posting Transactions & Maker-Checker Workflows](#5-posting-transactions--maker-checker-workflows)
6. [Advanced BI Reports & Calculations](#6-advanced-bi-reports--calculations)
7. [Workspace Configuration & Settings](#7-workspace-configuration--settings)
8. [Immutable Security Audit Logs](#8-immutable-security-audit-logs)

---

## 1. Core Financial Concepts & Architecture

Before diving into the user interface, it is helpful to understand the architectural pillars of this engine:

* **Unified Directory (contra-eligible)**: Standard ERPs isolate clients (Accounts Receivable) from vendors (Accounts Payable). This ledger introduces **dual-role parties** ("both"), allowing a subcontractor who is also a client to be represented by a single unified profile. This enables reciprocity and **contra balance offsets**.
* **Consolidated Base Currency**: The workspace settings define a single **Base Currency** (e.g., USD). Every individual party profile has its own **Base Currency** (e.g., EUR, AED). Transactions are posted in the party's transaction currency, and the engine automatically translates them into the consolidated base currency using the transaction-specific exchange rate.
* **Fiscal Period Lock-Outs**: Prevents backdating. If a transaction date is on or before the administrator's designated **Lock Date**, posting is blocked to prevent tampering with closed accounting periods.

---

## 2. Role-Based Access Control (RBAC) & Personas

The system features **6 interactive role personas** that restrict menus, forms, and approval flows. Use the **Persona Switcher** in the top navigation bar to test different views:

1. **Super Admin**: Has unrestricted read/write access. Can post transactions directly, bypass queue approvals, override settings, and reset the database.
2. **Finance Manager**: Acts as the **Checker**. Authorized to approve or reject transactions drafted by operators, write off bad debts, and perform contra entries.
3. **Data Entry Operator**: Acts as the **Maker**. Can draft transactions. If a transaction exceeds the approval threshold, it is automatically routed to the pending approval queue. This role cannot access Settings or System Audit Logs.
4. **Auditor / Read-Only**: Can inspect profiles, run reports, and view audit trails, but cannot make modifications, create transactions, or access settings.
5. **Client Portal User**: Locked to a single client profile (Acme Enterprise Consulting) to view invoices, make simulated payments, and inspect outstanding balances. All other dashboard navigation tabs are hidden.
6. **Executive / C-Suite**: Focused on Business Intelligence (BI) analytics. Has read-only access to Dashboard widgets and reports, but writing/configuration menus are hidden.

---

## 3. Dashboard Hub & Dashboard Widgets

The **Dashboard Hub** is your starting center:

* **Consolidated BI Widgets**:
  * **Consolidated AR (Receivables)**: Total outstanding client balances in the consolidated base currency.
  * **Consolidated AP (Payables)**: Total outstanding supplier liabilities in the consolidated base currency.
  * **Net Position**: Consolidated AR minus Consolidated AP.
  * **Active Registry**: Count of active clients and vendors.
* **Pending Approvals Queue**: Only visible to **Super Admin** or **Finance Manager**. Displays draft transactions that exceed the Maker-Checker threshold.
  * Click **Approve** to post the transaction permanently to the general ledger.
  * Click **Reject** to send the transaction back to the drawer with rejection comments.
* **Consolidated Transaction Log**: Lists the most recent postings with their transaction reference, party, type, date, amount, and status indicators.

---

## 4. Party Registry & 360° Profile Drilldowns

The **Party Registry** contains the profiles of all business contacts.

### Registering a New Party
1. Navigate to the **Party Registry** tab.
2. Click **Register New Party** (accessible to *Super Admin* and *Finance Manager*).
3. Fill in the fields:
   * **Legal Corporate Name**: Full legal name.
   * **Corporate Unified Code**: A unique code (e.g., `CLI-VANGUARD`).
   * **Vessel Direction Type**: Select *Client Only (Receivable)*, *Vendor Only (Payable)*, or *Both (Dual role contra eligible)*.
   * **Credit Limit**: Maximum outstanding balance allowed.
   * **Payment Grace Days**: Net payment terms (e.g., 30 days).
   * **Tax compliance Identifier ID**: Tax ID (e.g., EIN or VAT code).
4. Click **Create Directory Record**.

### Party 360° Profile Inspect
Click **Inspect 360° Profile** on any party card to open their dashboard:
* **Balance Analysis**: Real-time breakdown of AR outstanding, AP outstanding, and net position.
* **Projects & Milestones**: Manage billing milestones for custom client contracts. Click **Add Project** or **Add Milestone** to track deliverable-based invoicing.
* **Contacts**: Registry of key stakeholder accounts, telephone lines, and emails.
* **Compliance Documents**: Upload contract PDF templates or KYC documentation.
* **Audit Notes**: Interactive trace log of communications and ledger entries.

#### Advanced Controls (Drilldown Page)
* **Bad Debt Write-off**: If a client goes into default, the *Finance Manager* or *Super Admin* can write off outstanding receivables. Click **Write off Bad Debt**, specify the amount and reason, and the system will post a corrective journal entry.
* **Contra Balance Offset**: Available for **Dual-role** parties. If you have both receivables and payables outstanding, you can click **Apply Reciprocal Contra Offset** to manually offset mutual debts up to the lesser of the two outstandings.

---

## 5. Posting Transactions & Maker-Checker Workflows

To post a new transaction:

1. Go to the **Post Transaction** tab.
2. Fill out the transaction form:
   * **Party**: Select from the active registry.
   * **Branch**: Assign to a specific branch office.
   * **Transaction Type**: Invoice, Bill, Payment Received, Payment Made, Advance, Retainer, etc.
   * **Reference Number**: Serial identifier (e.g. Invoice number).
   * **Dates**: Transaction posting date and payment due date.
   * **Currency**: The currency the transaction was billed in.
   * **Amount & Exchange Rate**: Input transaction amount. The exchange rate will translate it into the consolidated base currency.
   * **TDS/Withholding**: Specify tax rates (e.g., 10% withholding tax). The engine automatically deducts it from payments.
   * **Custom Fields**: Enter any custom fields defined (e.g., *Cost Center* dropdown).
3. Click **Post Transaction Entry**.

### The Maker-Checker Workflow Cycle
* If you are logged in as a **Data Entry Operator**:
  * Any transaction with a base currency amount **greater than or equal to the approval threshold** (configured in settings, e.g. $8,000) will be saved as **Pending Approval**.
  * It will **not** be calculated in reports or balances until approved.
  * It will appear in the **Pending Approvals Queue** on the Dashboard for a *Finance Manager* or *Super Admin* to review and authorize.

---

## 6. Advanced BI Reports & Calculations

The **Financial Intelligence** tab provides 12 reports generated in real time from posted transactions:

1. **Party Statement (General Ledger)**: Filter by party, branch, or dates to view chronological debits, credits, and running net balances.
2. **Accounts Receivables (AR) Aging**: Groups unpaid invoices into aging buckets (`Current`, `1-30 days`, `31-60 days`, `61-90 days`, and `90+ days`) using FIFO (first-in-first-out) allocation of payments.
3. **Accounts Payables (AP) Aging**: Same as above, showing aged supplier invoices.
4. **Outstanding Summary**: Overview of AR, AP, and Net Position for every party in the registry.
5. **Cash Flow Analysis**: Displays actual cash inflows (payments received/advances) vs cash outflows (payments made) per party.
6. **TDS Withholding Tax Report**: A compliance log of all transactions with tax withheld at source.
7. **Forex Gain & Loss Revaluation**: Real-time gain or loss calculations based on differences between the transaction date exchange rate and the current market rates.
8. **Bad Debt Log**: Details of all bad debts written off, tracking write-off dates, amounts, and audit comments.
9. **Contra Offset Log**: A ledger of all applied reciprocal contra offsets.
10. **BI Profitability**: Calculates gross project profit margins per party by subtracting subcontractor costs (Bills) from contract revenues (Invoices).
11. **BI Advance Deposit Utilization**: Tracks the utilization rate (%) of customer advance deposits against billed milestone invoices.
12. **BI Collection Velocity (DSO)**: Shows the average time (in days) it takes to collect payments from clients after invoicing.

---

## 7. Workspace Configuration & Settings

Navigate to **Workspace Settings** to customize parameters:

* **Organization Details**: Edit organization name and view the consolidated base currency.
* **Fiscal Settings**: Select the starting month of the fiscal year.
* **Maker-Checker Policy**: Define the threshold value above which operator entries require authorization.
* **Fiscal Close Lock Date**: Prevent backdated transactions before this date.
* **Branch Registry**: Manage multiple business locations (add new branches with code tags).
* **Custom Fields Definitions**: Add metadata fields (text, number, date, dropdown options) to either *Party Directory* or *Transaction* forms.

---

## 8. Immutable Security Audit Logs

The **System Audit Logs** screen tracks all operations performed in the workspace. Each log record includes:
* **Timestamp**: Date and time of the event.
* **User**: The role persona that triggered the event.
* **System Intervention (Action)**: Category (e.g. `PARTY_CREATE`, `TRANSACTION_POSTED_SUCCESSFULLY`, `FISCAL_PERIOD_CLOSED`).
* **Audit Details**: Text description including primary values.
* **IP Address**: Simulated origin IP for security auditing compliance.

*Note: The audit log is immutable and cannot be cleared or modified by non-admin accounts.*
