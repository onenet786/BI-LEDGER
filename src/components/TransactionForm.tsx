/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  getParties, 
  getTenantSettings, 
  createTransaction, 
  getTransactions 
} from '../ledgerService';
import { Party, Branch, CustomFieldDefinition, TransactionType } from '../types';
import { 
  Plus, 
  CheckCircle, 
  ArrowRightLeft, 
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Percent,
  Calendar
} from 'lucide-react';

interface TransactionFormProps {
  username: string;
  refreshTrigger: number;
  triggerRefresh: () => void;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TransactionForm({
  username,
  refreshTrigger,
  triggerRefresh,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const [parties, setParties] = useState<Party[]>([]);
  const [settings, setSettings] = useState(getTenantSettings());

  // Form Fields State
  const [partyId, setPartyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('invoice');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().substring(0, 10));
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [amountTxn, setAmountTxn] = useState('');
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [projectId, setProjectId] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [tdsRate, setTdsRate] = useState('0');
  const [comments, setComments] = useState('');
  const [isDisputed, setIsDisputed] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // Error/Alert State
  const [errorText, setErrorText] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  useEffect(() => {
    setParties(getParties().filter(p => p.status !== 'inactive')); // active or blacklisted
    setSettings(getTenantSettings());
    setBranchId(settings.branches[0]?.id || '');
  }, [refreshTrigger]);

  const selectedParty = parties.find(p => p.id === partyId);

  // Auto set currency and rates when party is selected
  useEffect(() => {
    if (selectedParty) {
      setCurrencyCode(selectedParty.baseCurrency);
      const isPostPay = selectedParty.paymentTermsDays;
      if (isPostPay) {
        const d = new Date(transactionDate);
        d.setDate(d.getDate() + isPostPay);
        setDueDate(d.toISOString().substring(0, 10));
      }
    }
  }, [partyId]);

  // Apply default rates for simulator currencies
  useEffect(() => {
    if (currencyCode === 'USD') setExchangeRate('1.0');
    else if (currencyCode === 'EUR') setExchangeRate('1.10');
    else if (currencyCode === 'AED') setExchangeRate('0.272');
  }, [currencyCode]);

  // Compute calculated amounts instantly
  const amountTxnValue = parseFloat(amountTxn) || 0;
  const rateValue = parseFloat(exchangeRate) || 1.0;
  
  // Debit vs Credit Sign standard check for direct accounting:
  // Receivables are generally positive. Payables are recorded negative.
  // Invoiced: +Amount
  // Bill / Payable: -Amount
  // Payment Received: -Amount (closes AR debit)
  // Payment Made: +Amount (closes AP credit)
  // Advance: -Amount (liability credit)
  // Credit Note: -Amount
  // Debit Note: +Amount
  const getDirectionMultiplier = (): number => {
    switch (transactionType) {
      case 'invoice':
      case 'milestone_invoice':
      case 'retainer':
      case 'debit_note':
        return 1;
      case 'bill':
      case 'credit_note':
      case 'advance':
      case 'payment_received':
        return -1;
      case 'payment_made':
        return 1; // payment made goes positive to offset negative bill balances
      default:
        return 1;
    }
  };

  const netTxnValueWithMultiplier = amountTxnValue * getDirectionMultiplier();
  const calculatedBaseEquivalent = Math.abs(netTxnValueWithMultiplier * rateValue);
  const calculatedFinalWithSign = netTxnValueWithMultiplier * rateValue;

  // Withholding TDS calculations
  const tdsPercent = parseFloat(tdsRate) || 0;
  const calculatedTDSAmount = (calculatedBaseEquivalent * tdsPercent) / 100;
  const remittedAmountBase = calculatedBaseEquivalent - calculatedTDSAmount;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setSuccessInfo('');

    if (!partyId) {
      setErrorText('Identify a customer or supplier party first.');
      return;
    }
    if (!branchId) {
      setErrorText('Specify an active accounting branch location.');
      return;
    }
    if (amountTxnValue <= 0) {
      setErrorText('Transaction entry amount must be greater than zero.');
      return;
    }

    try {
      // Draft parameters package
      const transactionPayload = {
        partyId,
        branchId,
        transactionType,
        referenceNumber: referenceNumber || `${transactionType.substring(0,3).toUpperCase()}-${Date.now().toString().substring(8)}`,
        transactionDate,
        dueDate,
        currencyCode,
        amountInTxnCurrency: netTxnValueWithMultiplier,
        exchangeRate: rateValue,
        amountInBaseCurrency: calculatedFinalWithSign,
        status: 'posted' as any, // ledgerService overrides if approval triggers
        projectId: projectId || undefined,
        milestoneId: milestoneId || undefined,
        tdsAmount: calculatedTDSAmount,
        tdsRate: tdsPercent,
        isDisputed,
        createdBy: username,
        comments,
        customFields: customFieldValues,
      };

      const result = createTransaction(transactionPayload, username);

      if (result.status === 'pending_approval') {
        alert(`Maker-Checker Queue: Created entry representing $${calculatedBaseEquivalent.toFixed(2)} Base value. Due to the amount exceeding the approval threshold of $${settings.approvalThreshold}, this has been successfully sent to the Checker Authorization Queue.`);
      }

      triggerRefresh();
      onSuccess();
    } catch (err: any) {
      setErrorText(err.message);
    }
  };

  const handleCustomFieldChange = (fieldId: string, val: any) => {
    setCustomFieldValues(v => ({ ...v, [fieldId]: val }));
  };

  return (
    <div id="new-txn-form-box" className="bg-white border border-zinc-200 rounded-lg p-5">
      <div className="border-b border-zinc-100 pb-3 mb-4">
        <h2 className="text-sm font-bold text-zinc-950">Record Contextual Ledger Transaction</h2>
        <p className="text-[11px] text-zinc-500">Post dual-entry adjustments, invoices, payments, or client developments.</p>
      </div>

      {errorText && (
        <div id="txn-error-banner" className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-800 flex items-center gap-2 mb-4">
          <AlertCircle size={14} /> <span>{errorText}</span>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-4">
        
        {/* Row 1: Party and Branch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Select Ledger Party *</label>
            <select 
              id="txn-select-party"
              required
              className="w-full text-xs p-2.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 bg-white"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
            >
              <option value="">-- Choose Party --</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.code}] - Type: {p.type} ({p.baseCurrency})
                </option>
              ))}
            </select>
            {selectedParty && (
              <span className="text-[10px] text-zinc-500 block mt-1">
                Risk Rank: <strong className="text-zinc-650">{selectedParty.customFields['party-risk-rating'] || 'Medium'}</strong> | Limit Headroom: ${selectedParty.creditLimit.toLocaleString()}
              </span>
            )}
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Accounting Branch *</label>
            <select 
              id="txn-select-branch"
              required
              className="w-full text-xs p-2.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 bg-white"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {settings.branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Type and Ref */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Transaction Taxon *</label>
            <select 
              id="txn-select-type"
              required
              className="w-full text-xs p-2.5 border border-zinc-300 rounded focus:ring-1 focus:ring-zinc-900 bg-white"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as any)}
            >
              <option value="invoice">Client Invoice</option>
              <option value="milestone_invoice">Project Milestone Invoice</option>
              <option value="pay_received">Payment Received</option>
              <option value="bill">Vendor Bill (Payable)</option>
              <option value="payment_made">Payment Made to Vendor</option>
              <option value="advance">Advance / Pre-payment collected</option>
              <option value="retainer">Recurring Retainer fee</option>
              <option value="credit_note">Credit Note (Adjustment)</option>
              <option value="debit_note">Debit Note (Adjustment)</option>
              <option value="journal_adjustment">General Adjusting Entry</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Reference Voucher No</label>
            <input 
              id="txn-input-ref"
              type="text"
              placeholder="Auto-generated if empty"
              className="w-full text-xs p-2.5 border border-zinc-300 rounded"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Doc Date</label>
              <input 
                id="txn-input-date"
                type="date"
                required
                className="w-full text-xs p-2 border border-zinc-300 rounded"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Due Date</label>
              <input 
                id="txn-input-duedate"
                type="date"
                required
                className="w-full text-xs p-2 border border-zinc-300 rounded"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* --- CONTEXT EXPANSION A: MILESTONE LINKING --- */}
        {transactionType === 'milestone_invoice' && selectedParty && (
          <div id="contextual-project-selectors" className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-400 font-bold block mb-1">Select Active Project</label>
              <select
                id="txn-select-project"
                value={projectId}
                className="w-full text-xs p-2 bg-white border border-zinc-300 rounded"
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">-- Select Project --</option>
                {selectedParty.projects.map(pr => (
                  <option key={pr.id} value={pr.id}>{pr.name}</option>
                ))}
              </select>
            </div>
            {projectId && (
              <div>
                <label className="text-[10px] text-zinc-400 font-bold block mb-1">Select Milestone Billed</label>
                <select
                  id="txn-select-milestone"
                  value={milestoneId}
                  className="w-full text-xs p-2 bg-white border border-zinc-300 rounded"
                  onChange={(e) => setMilestoneId(e.target.value)}
                >
                  <option value="">-- Select Milestone --</option>
                  {selectedParty.projects.find(p => p.id === projectId)?.milestones.map(m => (
                    <option key={m.id} value={m.id}>{m.name} (${m.amount.toLocaleString()})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* --- CONTEXT EXPANSION B: MULTI-CURRENCY EXTRA FIELDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-100 pt-3">
          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Transaction Currency</label>
            <select
              id="txn-select-currency"
              required
              className="w-full text-xs p-2.5 border border-zinc-300 rounded focus:ring-1 bg-white"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
            >
              <option value="USD">USD ($ - Base Consolidated)</option>
              <option value="EUR">EUR (€ - Euro Union)</option>
              <option value="AED">AED (د.إ - Dirham Dubai)</option>
            </select>
          </div>

          {currencyCode !== 'USD' && (
            <div id="context-forex-rate" className="animate-fade-in">
              <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Exchange Rate (vs USD Base)</label>
              <input 
                id="txn-input-forex"
                type="number"
                step="0.00001"
                required
                className="w-full text-xs p-2.5 border border-zinc-300 rounded bg-amber-50/50"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
              />
              <span className="text-[9px] text-zinc-400 block mt-0.5">1 {currencyCode} = {exchangeRate} USD matches</span>
            </div>
          )}

          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Transaction Face Amount *</label>
            <input 
              id="txn-input-amount"
              type="number"
              step="0.01"
              required
              min="0.01"
              className="w-full text-xs p-2.5 border border-zinc-300 rounded font-semibold text-zinc-900"
              placeholder="0.00"
              value={amountTxn}
              onChange={(e) => setAmountTxn(e.target.value)}
            />
          </div>
        </div>

        {/* Computed equivalent block */}
        <div id="live-exchange-calc-bento" className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs flex items-center justify-between">
          <div>
            <span className="text-zinc-500 font-medium">Estimated Consolidated Base Value:</span>
            <span className="text-xs font-bold text-zinc-900 ml-1">
              ${calculatedBaseEquivalent.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </span>
          </div>
          <div>
            <span className="text-zinc-400">Direction Mode:</span>
            <span className={`ml-1 font-bold ${getDirectionMultiplier() > 0 ? 'text-zinc-900' : 'text-red-700'}`}>
              {getDirectionMultiplier() > 0 ? 'Debit Inward (Asset)' : 'Credit Outward (Liability)'}
            </span>
          </div>
        </div>

        {/* --- CONTEXT EXPANSION C: TDS PAYMENTS WITHHOLDING TAXES --- */}
        {(transactionType === 'pay_received' || transactionType === 'payment_made') && (
          <div id="contextual-tds-withholding" className="p-3 bg-neutral-50 border border-zinc-200 rounded-lg flex items-center gap-4 text-xs">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-zinc-700 flex items-center gap-1">
                <Percent size={12} /> Tax Deducted at Source / Withholding Rate (%)
              </label>
              <select
                id="txn-select-tds"
                className="w-full text-xs p-2 mt-1 bg-white border border-zinc-300 rounded"
                value={tdsRate}
                onChange={(e) => setTdsRate(e.target.value)}
              >
                <option value="0">No withholding (0%)</option>
                <option value="5">Professional Subcontracting Standard (5%)</option>
                <option value="10">Consultancy SLA standard rates (10%)</option>
                <option value="15">Cross-border consulting withholding (15%)</option>
              </select>
            </div>
            {tdsPercent > 0 && (
              <div className="text-right text-[10px] font-semibold bg-white p-2 border rounded">
                <span className="text-zinc-400 uppercase font-mono tracking-wider block">Withheld TDS Equivalent</span>
                <span className="text-red-600 block text-xs font-bold">${calculatedTDSAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-green-600 block mt-0.5">Net Cash Remitted: ${remittedAmountBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        )}

        {/* Workspace custom schemas dynamic injector */}
        {settings.customFields.filter(cf => cf.target === 'transaction').length > 0 && (
          <div id="workspace-transaction-custom-fields" className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 text-xs">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Workspace Fields Schema</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {settings.customFields.filter(cf => cf.target === 'transaction').map(cf => (
                <div key={cf.id}>
                  <label className="text-[10px] text-zinc-550 block mb-1 font-semibold">{cf.label}</label>
                  {cf.type === 'dropdown' ? (
                    <select
                      className="w-full text-xs p-2 bg-white border border-zinc-300 rounded"
                      value={customFieldValues[cf.id] || ''}
                      onChange={(e) => handleCustomFieldChange(cf.id, e.target.value)}
                    >
                      <option value="">-- Choose Option --</option>
                      {cf.options?.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type={cf.type === 'number' ? 'number' : 'text'}
                      className="w-full text-xs p-2 bg-white border border-zinc-300 rounded"
                      value={customFieldValues[cf.id] || ''}
                      onChange={(e) => handleCustomFieldChange(cf.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Narrative */}
        <div>
          <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Voucher Narration / Comment</label>
          <textarea 
            id="txn-comments"
            className="w-full p-2.5 border border-zinc-300 rounded text-xs text-zinc-805"
            placeholder="E.g. milestone invoice 2 cloud architecture deployment audit signoff, subject to standard SLA withholdings"
            rows={2}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        {/* Trigger check boxes */}
        <div className="flex gap-4 text-xs">
          <label className="flex items-center gap-1.5 font-bold cursor-pointer select-none">
            <input 
              type="checkbox" 
              className="rounded"
              checked={isDisputed}
              onChange={(e) => setIsDisputed(e.target.checked)}
            />
            Flag as Dispute disputed upon submit
          </label>
        </div>

        {/* Actions Button */}
        <div className="border-t border-zinc-150 pt-4 flex gap-2 justify-end">
          <button 
            id="btn-txn-cancel"
            type="button" 
            onClick={onCancel}
            className="px-4 py-2 border border-zinc-200 text-zinc-800 rounded hover:bg-zinc-50 cursor-pointer text-xs font-bold transition-all"
          >
            Cancel Post
          </button>
          <button 
            id="btn-txn-submit"
            type="submit" 
            className="px-5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded cursor-pointer text-xs font-extrabold transition-all shadow-xs"
          >
            Post Journal Entry
          </button>
        </div>

      </form>
    </div>
  );
}
