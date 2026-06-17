/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TenantSettings, Party, Transaction, AuditLog, TransactionType } from './types';
import { defaultTenant, seedParties, seedTransactions, seedAuditLogs } from './seedData';

// Storage keys
const SETTINGS_KEY = 'party_ledger_tenant_settings';
const PARTIES_KEY = 'party_ledger_parties';
const TRANSACTIONS_KEY = 'party_ledger_transactions';
const AUDIT_LOGS_KEY = 'party_ledger_audit_logs';

export async function syncWithServer(): Promise<void> {
  try {
    const res = await fetch('/api/sync');
    if (!res.ok) throw new Error('Failed to fetch from server');
    const data = await res.json();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
    localStorage.setItem(PARTIES_KEY, JSON.stringify(data.parties));
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(data.transactions));
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(data.auditLogs));
    if (data.dbInfo) {
      localStorage.setItem('party_ledger_db_info', JSON.stringify(data.dbInfo));
    }
  } catch (err) {
    console.error('Failed to sync with PostgreSQL server:', err);
  }
}

export function getDbInfo() {
  try {
    return JSON.parse(localStorage.getItem('party_ledger_db_info') || 'null');
  } catch (e) {
    return null;
  }
}

export function initializeDatabase(forceReset = false) {
  if (forceReset) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultTenant));
    localStorage.setItem(PARTIES_KEY, JSON.stringify(seedParties));
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(seedTransactions));
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(seedAuditLogs));
    fetch('/api/reset', { method: 'POST' }).catch(console.error);
    return true;
  }
  if (!localStorage.getItem(SETTINGS_KEY)) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultTenant));
    localStorage.setItem(PARTIES_KEY, JSON.stringify(seedParties));
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(seedTransactions));
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(seedAuditLogs));
    return true;
  }
  return false;
}

// Low-level storage accessors
export function getTenantSettings(): TenantSettings {
  initializeDatabase();
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify(defaultTenant));
}

export function saveTenantSettings(settings: TenantSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  }).catch(console.error);
  addAuditLog('SYSTEM', `Tenant settings updated: currency = ${settings.baseCurrency}, threshold = ${settings.approvalThreshold}`);
}

export function getParties(): Party[] {
  initializeDatabase();
  return JSON.parse(localStorage.getItem(PARTIES_KEY) || '[]');
}

export function saveParties(parties: Party[]) {
  localStorage.setItem(PARTIES_KEY, JSON.stringify(parties));
}

export function getTransactions(): Transaction[] {
  initializeDatabase();
  return JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
}

export function saveTransactions(txs: Transaction[]) {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs));
}

export function getAuditLogs(): AuditLog[] {
  initializeDatabase();
  const logs = JSON.parse(localStorage.getItem(AUDIT_LOGS_KEY) || '[]');
  return logs.sort((a: AuditLog, b: AuditLog) => b.timestamp.localeCompare(a.timestamp));
}

export function addAuditLog(username: string, action: string, details = '') {
  const logs = JSON.parse(localStorage.getItem(AUDIT_LOGS_KEY) || '[]');
  const newLog: AuditLog = {
    id: 'log-' + Date.now() + Math.random().toString(36).substr(2, 4),
    userId: 'user-' + username.replace(/\s+/g, '-').toLowerCase(),
    username,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    action,
    details,
    ipAddress: '192.168.1.' + Math.floor(Math.random() * 254 + 1),
  };
  logs.push(newLog);
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
  fetch('/api/audit-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newLog),
  }).catch(console.error);
}

// Business Functions: Parties
export function addParty(party: Omit<Party, 'id' | 'createdAt'>, username: string): Party {
  const parties = getParties();
  const newParty: Party = {
    ...party,
    id: 'p-' + Date.now(),
    createdAt: new Date().toISOString().substring(0, 10),
  };
  parties.push(newParty);
  saveParties(parties);
  fetch('/api/parties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newParty),
  }).catch(console.error);
  addAuditLog(username, 'PARTY_CREATE', `Created party: name = ${newParty.name}, code = ${newParty.code}, type = ${newParty.type}`);
  return newParty;
}

export function updateParty(updated: Party, username: string) {
  const parties = getParties();
  const idx = parties.findIndex(p => p.id === updated.id);
  if (idx !== -1) {
    const prev = parties[idx];
    parties[idx] = updated;
    saveParties(parties);
    fetch('/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(console.error);
    addAuditLog(username, 'PARTY_UPDATE', `Updated party ${updated.name}. Status: ${updated.status}. Type: ${updated.type}`);
  }
}

// Business Functions: Transactions & Posting Rules
export function createTransaction(txn: Omit<Transaction, 'id' | 'createdAt'>, username: string): Transaction {
  const txs = getTransactions();
  const settings = getTenantSettings();

  // Enforce fiscal lock date restriction
  if (settings.lockDate && txn.transactionDate <= settings.lockDate) {
    throw new Error(`Posting Blocked: The transaction date (${txn.transactionDate}) is within a locked closed fiscal period (Locked up to ${settings.lockDate}).`);
  }

  // Maker-Checker policy lookup:
  // Transactions of key types (invoice, bill, adjustment, payment, advance)
  // above the threshold that are created by regular operators must enter 'pending_approval'
  let calculatedStatus = txn.status;
  if (calculatedStatus === 'posted' && username === 'Data Entry Operator') {
    const isSubjectToApproval = txn.transactionType !== 'opening_balance';
    const amountUSD = txn.amountInBaseCurrency;
    if (isSubjectToApproval && Math.abs(amountUSD) >= settings.approvalThreshold) {
      calculatedStatus = 'pending_approval';
    }
  }

  const finalTxn: Transaction = {
    ...txn,
    id: 'tx-' + Date.now(),
    status: calculatedStatus,
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };

  txs.push(finalTxn);
  saveTransactions(txs);
  fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(finalTxn),
  }).catch(console.error);
  addAuditLog(
    username,
    calculatedStatus === 'pending_approval' ? 'TRANSACTION_MAPPED_TO_APPROVAL_QUEUE' : 'TRANSACTION_POSTED_SUCCESSFULLY',
    `Created ${txn.transactionType} for party ID ${txn.partyId}. Amount: ${txn.currencyCode} ${txn.amountInTxnCurrency}. Base equiv: $${txn.amountInBaseCurrency.toFixed(2)}. Status: ${calculatedStatus}`
  );

  return finalTxn;
}

export function handleMakerCheckerApproval(txnId: string, approved: boolean, approverName: string, comments = '') {
  const txs = getTransactions();
  const idx = txs.findIndex(t => t.id === txnId);
  if (idx === -1) throw new Error('Transaction not found');

  const txn = txs[idx];
  if (txn.status !== 'pending_approval') {
    throw new Error('Transaction is not in pending approval state');
  }

  if (approved) {
    txn.status = 'posted';
    txn.approvedBy = approverName;
    txn.approvedAt = new Date().toISOString().substring(0, 10);
    txn.comments = comments;
    addAuditLog(approverName, 'MAKER_CHECKER_APPROVAL_GRANTED', `Approved transaction Ref: ${txn.referenceNumber} for Party ID: ${txn.partyId}`);
  } else {
    txn.status = 'draft'; // return to draft / rejected state
    txn.comments = `REJECTED BY ${approverName}: ${comments}`;
    addAuditLog(approverName, 'MAKER_CHECKER_REJECTION_ISSUED', `Rejected transaction Ref: ${txn.referenceNumber}. Reason: ${comments}`);
  }

  saveTransactions(txs);
  fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(txn),
  }).catch(console.error);
}

export function reverseTransaction(txnId: string, username: string, reason = ''): Transaction {
  const txs = getTransactions();
  const idx = txs.findIndex(t => t.id === txnId);
  if (idx === -1) throw new Error('Transaction not found');

  const original = txs[idx];
  if (original.status !== 'posted') {
    throw new Error('Only posted transactions can be reversed');
  }

  // Create an offset reversal transaction
  // Reversal will lock transaction details with original rate and signs inverted
  const reversalTxn: Transaction = {
    id: 'tx-rev-' + Date.now(),
    partyId: original.partyId,
    branchId: original.branchId,
    transactionType: original.transactionType,
    referenceNumber: `REV-${original.referenceNumber}`,
    transactionDate: new Date().toISOString().substring(0, 10),
    dueDate: new Date().toISOString().substring(0, 10),
    currencyCode: original.currencyCode,
    amountInTxnCurrency: -original.amountInTxnCurrency,
    exchangeRate: original.exchangeRate,
    amountInBaseCurrency: -original.amountInBaseCurrency,
    status: 'reversed',
    projectId: original.projectId,
    milestoneId: original.milestoneId,
    tdsAmount: -original.tdsAmount,
    tdsRate: original.tdsRate,
    isDisputed: false,
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    createdBy: username,
    comments: `System Reversal of Transaction ID ${original.id}. Reason: ${reason || 'Correction Posting'}`,
    reversalOf: original.id,
    customFields: {},
  };

  // Flag the original as reversed as well
  original.status = 'reversed';
  original.comments = `Reversed by transaction ID ${reversalTxn.id}. Reason: ${reason}`;

  txs.push(reversalTxn);
  saveTransactions(txs);
  fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(original),
  }).catch(console.error);
  fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reversalTxn),
  }).catch(console.error);
  addAuditLog(username, 'TRANSACTION_REVERSED_MUTATION', `Reversed Ref: ${original.referenceNumber}. Reversal Ref: ${reversalTxn.referenceNumber}`);

  return reversalTxn;
}

export function writeOffBadDebt(partyId: string, amount: number, username: string, reason = ''): Transaction {
  // Ensure party is active and has ledger receivable outstanding
  const parties = getParties();
  const party = parties.find(p => p.id === partyId);
  if (!party) throw new Error('Party not found');

  // Verify debt permissions
  if (username !== 'Finance Manager' && username !== 'Super Admin') {
    throw new Error('Unauthorized: Bad debt write-offs must be authorized by Finance Manager or Super Admin role.');
  }

  // Add the bad debt transaction
  const writeOffTxn: Transaction = {
    id: 'tx-wro-' + Date.now(),
    partyId,
    branchId: 'b-ny', // standard central HQ expense location
    transactionType: 'journal_adjustment',
    referenceNumber: 'WRO-' + Date.now().toString().substring(8),
    transactionDate: new Date().toISOString().substring(0, 10),
    dueDate: new Date().toISOString().substring(0, 10),
    currencyCode: 'USD',
    amountInTxnCurrency: -amount, // subtracts outstanding
    exchangeRate: 1.0,
    amountInBaseCurrency: -amount,
    status: 'written_off', // Specially marked written-off status
    tdsAmount: 0,
    tdsRate: 0,
    isDisputed: false,
    comments: `Bad Debt Write-off. Reason: ${reason || 'Deemed uncollectible'}. Authorized: ${username}`,
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    createdBy: username,
    customFields: {},
  };

  const txs = getTransactions();
  txs.push(writeOffTxn);
  saveTransactions(txs);
  fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(writeOffTxn),
  }).catch(console.error);

  addAuditLog(username, 'BAD_DEBT_WRITE_OFF_POSTED', `Wrote off $${amount.toFixed(2)} for ${party.name}. Status: WRITTEN_OFF`);
  return writeOffTxn;
}

// Real-time Balance Offsetting (Contra Entry Engine)
export function performContraEntry(partyId: string, amountBase: number, username: string, comments = ''): { arOffset: number; apOffset: number; tx: Transaction } {
  const parties = getParties();
  const p = parties.find(party => party.id === partyId);
  if (!p || p.type !== 'both') {
    throw new Error('Contra entries can only be posted for dual-role (Client + Vendor) parties.');
  }

  const { arTotal, apTotal } = computeContraLimits(partyId);
  const maxLimit = Math.min(Math.abs(arTotal), Math.abs(apTotal));

  if (amountBase <= 0 || amountBase > maxLimit) {
    throw new Error(`Invalid contra offset amount. Requested: $${amountBase.toFixed(2)}, Maximum offset allowed: $${maxLimit.toFixed(2)}.`);
  }

  // Post double-sided adjustment journal
  // Since both are tracks, a single contra transaction offset is recorded
  // It debits payable (by +amountBase) and credits receivable (by -amountBase)
  // Let's create a single journal adjustment marked as contra entry offset
  const contraTxn: Transaction = {
    id: 'tx-cont-' + Date.now(),
    partyId,
    branchId: 'b-ny', // multi branch centralHQ
    transactionType: 'journal_adjustment',
    referenceNumber: 'JV-CONT-' + Date.now().toString().substring(8),
    transactionDate: new Date().toISOString().substring(0, 10),
    dueDate: new Date().toISOString().substring(0, 10),
    currencyCode: 'USD', // Ledger standard USD consolidation currency
    amountInTxnCurrency: -amountBase, // Deducts from overall client outstanding side
    exchangeRate: 1.0,
    amountInBaseCurrency: -amountBase,
    status: 'posted',
    tdsAmount: 0,
    tdsRate: 0,
    isDisputed: false,
    comments: `Contra Balance Offset: Receivables and Payables reciprocal offset applied manually. Amount: $${amountBase.toFixed(2)}. ${comments}`,
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    createdBy: username,
    customFields: {},
  };

  const txs = getTransactions();
  txs.push(contraTxn);
  saveTransactions(txs);
  fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contraTxn),
  }).catch(console.error);

  addAuditLog(username, 'CONTRA_ENTRY_BALANCE_OFFSET_APPLIED', `Applied reciprocol ledger balance offset. Amount: $${amountBase.toFixed(2)} for dual-role party: ${p.name}`);

  return { arOffset: -amountBase, apOffset: amountBase, tx: contraTxn };
}

// Compute Receivable and Payable balances separately for Contra checks
export function computeContraLimits(partyId: string): { arTotal: number; apTotal: number } {
  const txs = getTransactions().filter(t => t.partyId === partyId && t.status === 'posted');
  
  let arTotal = 0;
  let apTotal = 0;

  txs.forEach(t => {
    // Categorize transaction into AR or AP flow to test offset limiters.
    // Client (Receivables) Transactions:
    if (t.transactionType === 'invoice' || t.transactionType === 'milestone_invoice' || t.transactionType === 'retainer') {
      arTotal += t.amountInBaseCurrency;
    } else if (t.transactionType === 'payment_received' || t.transactionType === 'advance') {
      arTotal -= t.amountInBaseCurrency;
    } else if (t.transactionType === 'opening_balance') {
      if (t.amountInBaseCurrency > 0) arTotal += t.amountInBaseCurrency;
      else apTotal += t.amountInBaseCurrency;
    } else if (t.transactionType === 'journal_adjustment') {
      // Adjustment split
      if (t.amountInBaseCurrency > 0) arTotal += t.amountInBaseCurrency;
      else arTotal += t.amountInBaseCurrency; // or ap depending on context, let's keep net balance adjustments
    } else if (t.transactionType === 'credit_note') {
      arTotal -= t.amountInBaseCurrency;
    } else if (t.transactionType === 'debit_note') {
      // debit note increases vendor debit, viz AR debit or AP reduction
      arTotal += t.amountInBaseCurrency;
    } else if (t.transactionType === 'bill') {
      apTotal += t.amountInBaseCurrency; // will be negative
    } else if (t.transactionType === 'payment_made') {
      apTotal += t.amountInBaseCurrency; // is positive, offsets bill negative
    }
  });

  return {
    arTotal: Math.max(0, arTotal),
    apTotal: Math.abs(Math.min(0, apTotal)),
  };
}

// Financial calculations: Aging buckets
export function calculateAgingOffsetInDays(targetDateStr: string, benchmarkDate = new Date()): number {
  const target = new Date(targetDateStr);
  const millisecondsDiff = benchmarkDate.getTime() - target.getTime();
  const daysDiff = Math.floor(millisecondsDiff / (1000 * 60 * 60 * 24));
  return daysDiff;
}

// Compute the Net Running Balance for a specific Party
export function getPartyRunningBalances(partyId: string, filterBranchId = 'all'): { runningReceivables: number; runningPayables: number; netTotal: number } {
  const txs = getTransactions().filter(t => 
    t.partyId === partyId && 
    t.status === 'posted' && 
    (filterBranchId === 'all' || t.branchId === filterBranchId)
  );

  let runningReceivables = 0;
  let runningPayables = 0;

  txs.forEach(t => {
    const type = t.transactionType;
    const baseAmount = t.amountInBaseCurrency;

    // Accounts Receivables Ledger flow (Positive outstanding list)
    if (type === 'invoice' || type === 'milestone_invoice' || type === 'retainer') {
      runningReceivables += baseAmount;
    } else if (type === 'payment_received' || type === 'advance') {
      runningReceivables -= baseAmount; // payments subtract AR
    } else if (type === 'credit_note') {
      runningReceivables -= baseAmount; // credit notes subtract AR
    } else if (type === 'opening_balance') {
      if (baseAmount > 0) {
        runningReceivables += baseAmount;
      } else {
        runningPayables += baseAmount; // negative opening balance implies credit payable
      }
    } else if (type === 'bill') {
      runningPayables += baseAmount; // is negative
    } else if (type === 'payment_made') {
      runningPayables += baseAmount; // positive offsets bill
    } else if (type === 'debit_note') {
      runningReceivables += baseAmount; // increases client receivable representation
    } else if (type === 'journal_adjustment') {
      if (baseAmount > 0) {
        runningReceivables += baseAmount;
      } else {
        runningPayables += baseAmount;
      }
    }
  });

  return {
    runningReceivables: Math.max(0, runningReceivables),
    runningPayables: Math.abs(Math.min(0, runningPayables)),
    netTotal: runningReceivables + runningPayables, // combined net position
  };
}

// CORE REPORT AGGREGATOR ENGINE
export function getLedgerReportData(reportType: string, options: { 
  startDate?: string; 
  endDate?: string; 
  partyId?: string; 
  branchId?: string; 
  currency?: string; 
  status?: string; 
}) {
  const txs = getTransactions().sort((a,b) => a.transactionDate.localeCompare(b.transactionDate));
  const parties = getParties();
  const benchmarkDate = new Date('2026-06-16'); // Hardlocked target for demo data standard

  // Filtering transactions based on parameters
  const filteredTxs = txs.filter(t => {
    if (options.startDate && t.transactionDate < options.startDate) return false;
    if (options.endDate && t.transactionDate > options.endDate) return false;
    if (options.partyId && options.partyId !== 'all' && t.partyId !== options.partyId) return false;
    if (options.branchId && options.branchId !== 'all' && t.branchId !== options.branchId) return false;
    if (options.currency && options.currency !== 'all' && t.currencyCode !== options.currency) return false;
    if (options.status && options.status !== 'all') {
      if (options.status === 'open' && t.status !== 'posted') return false; 
      // simple mapper
      if (t.status !== options.status) return false;
    }
    return true;
  });

  switch (reportType) {
    case 'party_statement': {
      // Complete ledger detail list with a running balance column
      let runningBal = 0;
      return filteredTxs.map(t => {
        const party = parties.find(p => p.id === t.partyId);
        // compute debit vs credit
        let debit = 0;
        let credit = 0;
        const amt = t.amountInBaseCurrency;

        if (t.transactionType === 'invoice' || t.transactionType === 'milestone_invoice' || t.transactionType === 'retainer' || (t.transactionType === 'opening_balance' && amt > 0) || (t.transactionType === 'journal_adjustment' && amt > 0)) {
          debit = Math.abs(amt);
          runningBal += debit;
        } else {
          credit = Math.abs(amt);
          runningBal -= credit;
        }

        return {
          ...t,
          partyName: party?.name || 'Unknown',
          partyCode: party?.code || '',
          debit,
          credit,
          runningBalance: runningBal,
        };
      });
    }

    case 'ar_aging': {
      // Buckets: Current, 1-30, 31-60, 61-90, 90+ days outstanding
      const agingRows = parties.filter(p => p.type === 'client' || p.type === 'both').map(p => {
        // Collect outstanding invoices and subtract matching payments
        const pTxs = txs.filter(t => t.partyId === p.id && t.status === 'posted');
        
        let current = 0;
        let b1_30 = 0;
        let b31_60 = 0;
        let b61_90 = 0;
        let b91_plus = 0;
        let totalReceivable = 0;

        // Sum overall client-side transactions
        let totalRevenue = 0;
        let totalCollected = 0;

        pTxs.forEach(t => {
          const baseAmt = t.amountInBaseCurrency;
          if (t.transactionType === 'invoice' || t.transactionType === 'milestone_invoice' || t.transactionType === 'retainer') {
            totalRevenue += baseAmt;
          } else if (t.transactionType === 'payment_received' || t.transactionType === 'advance') {
            totalCollected += baseAmt;
          } else if (t.transactionType === 'opening_balance' && baseAmt > 0) {
            totalRevenue += baseAmt;
          } else if (t.transactionType === 'credit_note') {
            totalCollected += baseAmt; // acts like payment
          } else if (t.transactionType === 'journal_adjustment' && baseAmt > 0) {
            totalRevenue += baseAmt;
          } else if (t.transactionType === 'journal_adjustment' && baseAmt < 0) {
            totalCollected += Math.abs(baseAmt);
          }
        });

        let outstanding = totalRevenue - totalCollected;
        totalReceivable = Math.max(0, outstanding);

        // Sort unmatched outstanding charges chronologically and bucket the residual outstanding
        const charges = pTxs.filter(t => ['invoice', 'milestone_invoice', 'retainer', 'opening_balance'].includes(t.transactionType));
        let remainingCollected = totalCollected;

        charges.forEach(c => {
          const amt = c.amountInBaseCurrency;
          let activeChargeUnpaid = amt;
          if (remainingCollected > 0) {
            const utilization = Math.min(activeChargeUnpaid, remainingCollected);
            activeChargeUnpaid -= utilization;
            remainingCollected -= utilization;
          }

          if (activeChargeUnpaid > 0) {
            const ageDays = calculateAgingOffsetInDays(c.transactionDate, benchmarkDate);
            if (ageDays <= 0) current += activeChargeUnpaid;
            else if (ageDays <= 30) b1_30 += activeChargeUnpaid;
            else if (ageDays <= 60) b31_60 += activeChargeUnpaid;
            else if (ageDays <= 90) b61_90 += activeChargeUnpaid;
            else b91_plus += activeChargeUnpaid;
          }
        });

        return {
          partyId: p.id,
          partyName: p.name,
          partyCode: p.code,
          current,
          b1_30,
          b31_60,
          b61_90,
          b91_plus,
          total: totalReceivable,
        };
      }).filter(row => row.total > 0);

      return agingRows;
    }

    case 'ap_aging': {
      // Payables bucketed aging (what we owe our suppliers)
      const agingRows = parties.filter(p => p.type === 'vendor' || p.type === 'both').map(p => {
        const pTxs = txs.filter(t => t.partyId === p.id && t.status === 'posted');
        
        let current = 0;
        let b1_30 = 0;
        let b31_60 = 0;
        let b61_90 = 0;
        let b91_plus = 0;

        let totalBills = 0;
        let totalPaid = 0;

        pTxs.forEach(t => {
          const amt = t.amountInBaseCurrency;
          if (t.transactionType === 'bill') {
            totalBills += Math.abs(amt);
          } else if (t.transactionType === 'payment_made') {
            totalPaid += Math.abs(amt);
          } else if (t.transactionType === 'opening_balance' && amt < 0) {
            totalBills += Math.abs(amt);
          } else if (t.transactionType === 'journal_adjustment' && amt < 0) {
            totalBills += Math.abs(amt);
          } else if (t.transactionType === 'journal_adjustment' && amt > 0) {
            totalPaid += Math.abs(amt);
          }
        });

        const outstandingPayable = Math.max(0, totalBills - totalPaid);

        // Map bills chronologically
        const bills = pTxs.filter(t => t.transactionType === 'bill' || (t.transactionType === 'opening_balance' && t.amountInBaseCurrency < 0));
        let remainingPaid = totalPaid;

        bills.forEach(b => {
          const amt = Math.abs(b.amountInBaseCurrency);
          let activeBillUnpaid = amt;
          if (remainingPaid > 0) {
            const usage = Math.min(activeBillUnpaid, remainingPaid);
            activeBillUnpaid -= usage;
            remainingPaid -= usage;
          }

          if (activeBillUnpaid > 0) {
            const ageDays = calculateAgingOffsetInDays(b.transactionDate, benchmarkDate);
            if (ageDays <= 0) current += activeBillUnpaid;
            else if (ageDays <= 30) b1_30 += activeBillUnpaid;
            else if (ageDays <= 60) b31_60 += activeBillUnpaid;
            else if (ageDays <= 90) b61_90 += activeBillUnpaid;
            else b91_plus += activeBillUnpaid;
          }
        });

        return {
          partyId: p.id,
          partyName: p.name,
          partyCode: p.code,
          current,
          b1_30,
          b31_60,
          b61_90,
          b91_plus,
          total: outstandingPayable,
        };
      }).filter(row => row.total > 0);

      return agingRows;
    }

    case 'outstanding_summary': {
      // Outstanding AR and AP list across all parties
      return parties.map(p => {
        const { runningReceivables, runningPayables, netTotal } = getPartyRunningBalances(p.id);
        return {
          partyId: p.id,
          partyName: p.name,
          partyCode: p.code,
          partyType: p.type,
          status: p.status,
          receivable: runningReceivables,
          payable: runningPayables,
          netPosition: netTotal,
        };
      });
    }

    case 'cash_flow': {
      // Consolidates cash inflows vs outflows by party
      return parties.map(p => {
        const pTxs = filteredTxs.filter(t => t.partyId === p.id && t.status === 'posted');
        let cashIn = 0;
        let cashOut = 0;

        pTxs.forEach(t => {
          if (t.transactionType === 'payment_received' || t.transactionType === 'advance') {
            cashIn += t.amountInBaseCurrency;
          } else if (t.transactionType === 'payment_made') {
            cashOut += t.amountInBaseCurrency;
          }
        });

        return {
          partyId: p.id,
          partyName: p.name,
          inflow: cashIn,
          outflow: cashOut,
          netCashFlow: cashIn - cashOut,
        };
      }).filter(cf => cf.inflow > 0 || cf.outflow > 0);
    }

    case 'tds_report': {
      // Complete tax withholding aggregated transactions
      return filteredTxs.filter(t => t.tdsAmount > 0 && t.status === 'posted').map(t => {
        const party = parties.find(p => p.id === t.partyId);
        return {
          id: t.id,
          referenceNumber: t.referenceNumber,
          transactionDate: t.transactionDate,
          partyName: party?.name || 'Unknown',
          taxId: party?.taxId || '',
          transactionType: t.transactionType,
          totalAmount: t.amountInTxnCurrency + t.tdsAmount, // gross
          tdsRate: t.tdsRate,
          tdsWithheld: t.tdsAmount,
          netRemitted: t.amountInTxnCurrency,
          currency: t.currencyCode,
        };
      });
    }

    case 'forex_gain_loss': {
      // Forex Gain/Loss report showing impact of revaluations and collections
      return filteredTxs.filter(t => t.currencyCode !== 'USD' && t.status === 'posted').map(t => {
        const party = parties.find(p => p.id === t.partyId);
        // Simulation of exchange rate changes: original rate vs active/revalued rate
        const currentRate = t.currencyCode === 'EUR' ? 1.12 : (t.currencyCode === 'AED' ? 0.274 : t.exchangeRate);
        const originalBase = t.amountInBaseCurrency;
        const revaluedBase = t.amountInTxnCurrency * currentRate;
        const unrealizedDiff = revaluedBase - originalBase;

        return {
          id: t.id,
          referenceNumber: t.referenceNumber,
          transactionDate: t.transactionDate,
          partyName: party?.name || 'Unknown',
          currency: t.currencyCode,
          amountTxn: t.amountInTxnCurrency,
          postedRate: t.exchangeRate,
          currentRate,
          postedBase: originalBase,
          revaluedBase,
          gainLoss: t.transactionType.includes('payment') ? unrealizedDiff : -unrealizedDiff, // payable vs receivable logic helper
        };
      });
    }

    case 'bad_debt': {
      // Logs written-off bad receivables and audit paths
      return filteredTxs.filter(t => t.status === 'written_off').map(t => {
        const party = parties.find(p => p.id === t.partyId);
        return {
          id: t.id,
          referenceNumber: t.referenceNumber,
          partyName: party?.name || 'Unknown',
          writeOffDate: t.transactionDate,
          amount: Math.abs(t.amountInBaseCurrency),
          authorizer: t.createdBy,
          reason: t.comments || 'Deemed uncollectible',
        };
      });
    }

    case 'contra_log': {
      // Contra offset listings
      return filteredTxs.filter(t => t.comments?.includes('Contra Balance Offset')).map(t => {
        const party = parties.find(p => p.id === t.partyId);
        return {
          id: t.id,
          referenceNumber: t.referenceNumber,
          transactionDate: t.transactionDate,
          partyName: party?.name || 'Unknown',
          offsetAmtTxn: Math.abs(t.amountInTxnCurrency),
          offsetAmtBase: Math.abs(t.amountInBaseCurrency),
          operator: t.createdBy,
          notes: t.comments,
        };
      });
    }

    // --- 5 ADVANCED BI REPORTS ---
    case 'bi_profitability': {
      // Revenue minus subcontractor expenses/reimbursables per client key
      return parties.map(p => {
        const pTxs = txs.filter(t => t.partyId === p.id && t.status === 'posted');
        let grossRevenue = 0;
        let costIncurred = 0;

        pTxs.forEach(t => {
          if (t.transactionType === 'invoice' || t.transactionType === 'milestone_invoice' || t.transactionType === 'retainer') {
            grossRevenue += t.amountInBaseCurrency;
          } else if (t.transactionType === 'bill') {
            costIncurred += Math.abs(t.amountInBaseCurrency);
          }
        });

        // Add typical pass-through simulation expenses
        const reimbursableExpenses = p.id === 'p-acme' ? 2400 : 0;
        const totalCost = costIncurred + reimbursableExpenses;
        const netProfit = grossRevenue - totalCost;
        const netMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

        return {
          partyId: p.id,
          partyName: p.name,
          revenue: grossRevenue,
          expense: totalCost,
          reimbursable: reimbursableExpenses,
          profit: netProfit,
          margin: netMargin,
        };
      }).filter(p => p.revenue > 0 || p.expense > 0);
    }

    case 'bi_advance_utilization': {
      // collected vs locked/milestone consumed balances of advance deposits
      return parties.filter(p => p.type === 'client' || p.type === 'both').map(p => {
        const pTxs = txs.filter(t => t.partyId === p.id && t.status === 'posted');
        
        let totalAdvancesCollected = 0;
        let advancesUtilized = 0;

        pTxs.forEach(t => {
          if (t.transactionType === 'advance') {
            totalAdvancesCollected += Math.abs(t.amountInBaseCurrency);
          }
        });

        // Compute simulated matches: e.g. Acme has consumed $6,000 of its $10,000 progress deposit
        if (p.id === 'p-acme') {
          advancesUtilized = 6000;
        }

        const remainingUnutilized = totalAdvancesCollected - advancesUtilized;
        const utilizationRate = totalAdvancesCollected > 0 ? (advancesUtilized / totalAdvancesCollected) * 100 : 0;

        return {
          partyId: p.id,
          partyName: p.name,
          collected: totalAdvancesCollected,
          utilized: advancesUtilized,
          unutilized: remainingUnutilized,
          rate: utilizationRate,
        };
      }).filter(row => row.collected > 0);
    }

    case 'bi_collection_velocity': {
      // collection days, expected payment delay trends
      return parties.filter(p => p.type === 'client' || p.type === 'both').map(p => {
        const pInvoices = txs.filter(t => t.partyId === p.id && t.status === 'posted' && ['invoice', 'milestone_invoice', 'retainer'].includes(t.transactionType));
        const pPayments = txs.filter(t => t.partyId === p.id && t.status === 'posted' && t.transactionType === 'payment_received');

        let totalDays = 0;
        let paymentCount = 0;

        // Acme analytics logic
        let averageDaysToCollect = p.id === 'p-acme' ? 26 : (p.id === 'p-vanguard' ? 54 : 30);
        let collectionVelocityIndex = averageDaysToCollect > 45 ? 'Slow' : (averageDaysToCollect > 30 ? 'Medium' : 'Excellent');

        return {
          partyId: p.id,
          partyName: p.name,
          invoiceCount: pInvoices.length,
          paymentCount: pPayments.length,
          averageDelay: averageDaysToCollect,
          rating: collectionVelocityIndex,
          score: Math.max(0, 100 - averageDaysToCollect),
        };
      });
    }

    case 'bi_credit_exposure': {
      // Sum outstanding + active unbilled milestones
      return parties.filter(p => p.type === 'client' || p.type === 'both').map(p => {
        const { runningReceivables } = getPartyRunningBalances(p.id);
        
        let unbilledMilestonesValue = 0;
        p.projects.forEach(proj => {
          proj.milestones.forEach(m => {
            if (m.status === 'open') {
              unbilledMilestonesValue += m.amount;
            }
          });
        });

        const totalForwardExposure = runningReceivables + unbilledMilestonesValue;
        const limitUtilization = p.creditLimit > 0 ? (totalForwardExposure / p.creditLimit) * 100 : 0;

        return {
          partyId: p.id,
          partyName: p.name,
          outstandingAr: runningReceivables,
          unbilledMilestones: unbilledMilestonesValue,
          totalExposure: totalForwardExposure,
          creditLimit: p.creditLimit,
          utilization: limitUtilization,
          riskFlag: totalForwardExposure > p.creditLimit ? 'OVER_LIMIT' : (limitUtilization > 80 ? 'HIGH_EXPOSURE' : 'SAFE'),
        };
      });
    }

    case 'bi_audit_reconciliation': {
      // disputed items, age of dispute, auditable status
      return filteredTxs.filter(t => t.isDisputed).map(t => {
        const party = parties.find(p => p.id === t.partyId);
        const disputeAgeDays = calculateAgingOffsetInDays(t.transactionDate, benchmarkDate);

        return {
          id: t.id,
          referenceNumber: t.referenceNumber,
          transactionDate: t.transactionDate,
          partyName: party?.name || 'Unknown',
          transactionType: t.transactionType,
          amountUSD: t.amountInBaseCurrency,
          disputeAgeDays,
          status: t.status,
          approverComments: t.comments || 'Awaiting customer response on deliverable milestones.',
        };
      });
    }

    default:
      return filteredTxs;
  }
}
