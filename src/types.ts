/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';
  options?: string[]; // for dropdown
  target: 'party' | 'transaction';
}

export interface TenantSettings {
  id: string;
  name: string;
  baseCurrency: string; // e.g. "USD", "PKR", "EUR", "AED"
  fiscalYearStartMonth: number; // 1 = Jan, 7 = Jul, etc.
  transactionNumbering: {
    invoice: string;
    bill: string;
    payment_received: string;
    payment_made: string;
    advance: string;
    milestone_invoice: string;
    retainer: string;
    credit_note: string;
    debit_note: string;
    journal_adjustment: string;
    opening_balance: string;
  };
  approvalThreshold: number; // e.g. 5000 (amounts above this require Checker approval for critical entries)
  customFields: CustomFieldDefinition[];
  branches: Branch[];
  lockDate?: string; // fiscal close lock date ISO - no backdating allowed before this date
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface Milestone {
  id: string;
  name: string;
  amount: number;
  status: 'open' | 'billed';
}

export interface Project {
  id: string;
  name: string;
  milestones: Milestone[];
}

export interface PartyDocument {
  id: string;
  name: string;
  type: 'contract' | 'invoice' | 'kyc' | 'other';
  uploadDate: string;
  size: string;
}

export interface AuditNote {
  id: string;
  timestamp: string;
  user: string;
  message: string;
}

export interface Party {
  id: string;
  name: string;
  code: string; // unique code e.g. "CON-001"
  type: 'client' | 'vendor' | 'both';
  status: 'active' | 'inactive' | 'blacklisted';
  baseCurrency: string;
  taxId: string;
  creditLimit: number;
  paymentTermsDays: number;
  contacts: Contact[];
  projects: Project[];
  documents: PartyDocument[];
  auditNotes: AuditNote[];
  customFields: Record<string, any>;
  createdAt: string;
}

export type TransactionType =
  | 'invoice'
  | 'bill'
  | 'payment_received'
  | 'payment_made'
  | 'advance'
  | 'milestone_invoice'
  | 'retainer'
  | 'credit_note'
  | 'debit_note'
  | 'journal_adjustment'
  | 'opening_balance';

export type TransactionStatus =
  | 'draft'
  | 'pending_approval'
  | 'posted'
  | 'reversed'
  | 'written_off';

export interface Transaction {
  id: string;
  partyId: string;
  branchId: string;
  transactionType: TransactionType;
  referenceNumber: string;
  transactionDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  currencyCode: string;
  amountInTxnCurrency: number;
  exchangeRate: number; // 1 TxnCurrency = X BaseCurrency
  amountInBaseCurrency: number; // calculated at transaction date
  status: TransactionStatus;
  projectId?: string;
  milestoneId?: string;
  tdsAmount: number; // tax deducted at source / withholding
  tdsRate: number; // percentage (e.g. 10 for 10%)
  isDisputed: boolean;
  reconciledAt?: string; // date of reconciliation
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  comments?: string;
  reversalOf?: string; // ID of the transaction this is reversing
  customFields: Record<string, any>;
}

export interface OpeningBalance {
  id: string;
  partyId: string;
  mode: 'lump_sum' | 'granular';
  goLiveDate: string;
  amountDebit: number; // what you are owed (receivables side)
  amountCredit: number; // what you owe (payables side)
  baseCurrencyEquivalent: number;
  linkedTransactionId?: string; // links to transaction log entry
  fiscalYearIsolated: boolean; // defaults to true
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  timestamp: string;
  action: string;
  details: string;
  ipAddress: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: string;
  name: string;
}

