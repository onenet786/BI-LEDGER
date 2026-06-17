/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  getParties, 
  updateParty, 
  getTransactions, 
  getPartyRunningBalances, 
  performContraEntry, 
  computeContraLimits,
  reverseTransaction,
  writeOffBadDebt,
  addAuditLog
} from '../ledgerService';
import { Party, Transaction, Contact, AuditNote, PartyDocument } from '../types';
import { 
  Briefcase, 
  FileText, 
  Users, 
  BookOpen, 
  DollarSign, 
  ShieldAlert, 
  FileCheck, 
  ArrowRightLeft, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  CornerDownRight, 
  Inbox, 
  Trash2,
  Lock,
  ChevronDown,
  Info
} from 'lucide-react';

interface PartyProfileProps {
  partyId: string;
  activeRole: string;
  username: string;
  refreshTrigger: number;
  triggerRefresh: () => void;
  onBack: () => void;
}

export default function PartyProfile({
  partyId,
  activeRole,
  username,
  refreshTrigger,
  triggerRefresh,
  onBack,
}: PartyProfileProps) {
  const [party, setParty] = useState<Party | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'ledger' | 'projects' | 'documents' | 'contacts' | 'notes' | 'advances' | 'risk'>('ledger');

  // Input States for appends
  const [newNote, setNewNote] = useState('');
  const [newContact, setNewContact] = useState({ name: '', role: '', phone: '', email: '' });
  const [dragActive, setDragActive] = useState(false);
  const [contraOffsetAmount, setContraOffsetAmount] = useState('');
  const [writeOffAmount, setWriteOffAmount] = useState('');
  const [writeOffReason, setWriteOffReason] = useState('');

  // Transactions Filter
  const [typeFilter, setTypeFilter] = useState('all');
  const [disputeFilter, setDisputeFilter] = useState('all');

  useEffect(() => {
    const list = getParties();
    setParties(list);
    const p = list.find(item => item.id === partyId) || null;
    setParty(p);
    setTransactions(getTransactions().filter(t => t.partyId === partyId));
  }, [partyId, refreshTrigger]);

  const loadData = () => {
    const list = getParties();
    setParties(list);
    const p = list.find(item => item.id === partyId) || null;
    setParty(p);
    setTransactions(getTransactions().filter(t => t.partyId === partyId));
  };

  if (!party) {
    return (
      <div className="p-8 text-center bg-white border border-zinc-200 rounded-lg shadow-sm">
        <p className="text-zinc-500 font-medium">Party profile details could not be retrieved.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold cursor-pointer">Back to Directory</button>
      </div>
    );
  }

  // Running positions
  const balances = getPartyRunningBalances(party.id);
  const { arTotal, apTotal } = computeContraLimits(party.id);

  // Filter transactions
  const filteredTxs = transactions.filter(t => {
    if (typeFilter !== 'all' && t.transactionType !== typeFilter) return false;
    if (disputeFilter === 'disputed' && !t.isDisputed) return false;
    if (disputeFilter === 'reconciled' && !t.reconciledAt) return false;
    return true;
  }).sort((a,b) => b.transactionDate.localeCompare(a.transactionDate)); // Chronological reverse

  // Adding contact
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!party || !newContact.name || !newContact.email) return;

    const updated: Party = {
      ...party,
      contacts: [
        ...party.contacts,
        {
          id: 'c-' + Date.now(),
          ...newContact,
        },
      ],
    };

    updateParty(updated, username);
    setNewContact({ name: '', role: '', phone: '', email: '' });
    triggerRefresh();
  };

  // Appending Audit notes
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!party || !newNote.trim()) return;

    const updated: Party = {
      ...party,
      auditNotes: [
        {
          id: 'note-' + Date.now(),
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          user: username,
          message: newNote.trim(),
        },
        ...party.auditNotes,
      ],
    };

    updateParty(updated, username);
    setNewNote('');
    triggerRefresh();
  };

  // Drag and drop Simulated File Upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const newDoc: PartyDocument = {
        id: 'doc-' + Date.now(),
        name: file.name,
        type: file.name.endsWith('.pdf') ? 'contract' : 'other',
        uploadDate: new Date().toISOString().substring(0, 10),
        size: (file.size / (1024 * 1024)).toFixed(1) + 'MB',
      };

      const updated: Party = {
        ...party,
        documents: [...party.documents, newDoc],
      };

      updateParty(updated, username);
      addAuditLog(username, 'DOCUMENT_UPLOADER_MUTED', `Uploaded attachment ${file.name} to party: ${party.name}`);
      triggerRefresh();
    }
  };

  const handleManualUploadSim = () => {
    const names = [
      'Signed_Contract_Addendum_V2.pdf',
      'Corporate_Exemption_Form_W9.pdf',
      'Vendor_Incorporate_Directives.pdf',
      'Milestone_3_QA_Signoff_Card.pdf'
    ];
    const pickedName = names[Math.floor(Math.random() * names.length)];
    const newDoc: PartyDocument = {
      id: 'doc-' + Date.now(),
      name: pickedName,
      type: pickedName.includes('Contract') ? 'contract' : 'kyc',
      uploadDate: new Date().toISOString().substring(0, 10),
      size: (Math.random() * 3 + 0.5).toFixed(1) + 'MB',
    };

    const updated: Party = {
      ...party,
      documents: [...party.documents, newDoc],
    };

    updateParty(updated, username);
    addAuditLog(username, 'DOCUMENT_UPLOADER_MUTED', `Simulated file upload of ${pickedName} to customer record.`);
    triggerRefresh();
  };

  // Reversing posted transactions
  const handleReversal = (txId: string) => {
    if (!window.confirm('Are you absolutely sure you want to revert this posted transaction? This creates an immutable offset journal posting and marks the original reversed. This action is audited.')) return;
    try {
      reverseTransaction(txId, username, 'User requested profile ledger correction-reversal');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Bad Debt Write-Off Action
  const handleWriteOff = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(writeOffAmount);
    if (!amount || amount <= 0) {
      alert('Specify a valid numerical bad debt write-off value.');
      return;
    }

    try {
      writeOffBadDebt(party.id, amount, username, writeOffReason || 'Authorized ledger cleanup');
      setWriteOffAmount('');
      setWriteOffReason('');
      triggerRefresh();
    } catch (e: any) {
      alert(`Write-off Failed: ${e.message}`);
    }
  };

  // Contra Offset (Balance Offset) workflow
  const handleContraOffsetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(contraOffsetAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid balance offset amount.');
      return;
    }

    try {
      performContraEntry(party.id, amount, username, 'Profile mutual balancing trigger');
      setContraOffsetAmount('');
      triggerRefresh();
      alert(`Success: Contra entry applied successfully. Receivable and Payable adjusted mutually by $${amount.toFixed(2)}.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Disputing / Resolving flag toggle in interface
  const handleToggleDispute = (txId: string) => {
    const txs = getTransactions();
    const idx = txs.findIndex(t => t.id === txId);
    if (idx !== -1) {
      txs[idx].isDisputed = !txs[idx].isDisputed;
      if (txs[idx].isDisputed) {
        txs[idx].comments = 'Disputed by client: waiting for milestone validation';
      } else {
        txs[idx].comments = 'Dispute resolved after engineering audit validation';
      }
      localStorage.setItem('party_ledger_transactions', JSON.stringify(txs));
      addAuditLog(username, 'PARTY_TRANSACTION_DISPUTE_MUTATED', `Toggled dispute flag on transaction ${txs[idx].referenceNumber}`);
      triggerRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header back bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-3">
          <button 
            id="btn-profile-back"
            onClick={onBack} 
            className="text-xs font-semibold px-3 py-1.5 border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer"
          >
            ← Directory View
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${party.status === 'active' ? 'bg-green-500' : (party.status === 'blacklisted' ? 'bg-red-500' : 'bg-zinc-400')}`} />
              <h1 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
                {party.name} 
                <span className="text-xs font-mono font-medium text-zinc-400">({party.code})</span>
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Type: <strong className="uppercase">{party.type}</strong> | Functional Currency: <strong className="text-zinc-600">{party.baseCurrency}</strong> | Tax ID: {party.taxId || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {party.type === 'both' && (
            <span className="bg-zinc-150 inline-flex items-center gap-1.5 text-zinc-800 text-[10px] font-bold border border-zinc-350 px-2.5 py-1 rounded-full uppercase">
              <ArrowRightLeft size={10} /> Dual-Role Active
            </span>
          )}
          {party.status === 'blacklisted' && (
            <span className="bg-red-100 inline-flex items-center gap-1 text-red-800 text-[10px] font-bold border border-red-350 px-2.5 py-1 rounded-full uppercase animate-bounce">
              <AlertTriangle size={10} /> Legal Blacklist
            </span>
          )}
        </div>
      </div>

      {/* Profile Overview boxes */}
      <div id="profile-summary-bento" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-50 p-3.5 border border-zinc-200 rounded-lg">
          <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Client Receivables (OWED TO US)</span>
          <span className="text-xl font-bold text-zinc-900 mt-1 block">
            ${balances.runningReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-zinc-400 block mt-1">Sum of invoices, retainers, and client ledger offsets</span>
        </div>

        <div className="bg-zinc-50 p-3.5 border border-zinc-200 rounded-lg">
          <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Vendor Payables (WE OWE THEM)</span>
          <span className="text-xl font-bold text-zinc-900 mt-1 block">
            ${balances.runningPayables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-zinc-400 block mt-1">Sum of recorded subcontractor bills and outgoing payments</span>
        </div>

        <div className="bg-zinc-50 p-3.5 border border-zinc-200 rounded-lg flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Net Exposure Balance</span>
            <span className="text-xl font-semibold text-zinc-900 mt-1 block">
              ${(balances.runningReceivables - balances.runningPayables).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[9px] text-zinc-400 text-right font-mono block mt-2">
            Net: {(balances.runningReceivables - balances.runningPayables) > 0 ? 'Debit Inward Asset' : 'Credit Outward Liability'}
          </span>
        </div>
      </div>

      {/* Tabs list navigation */}
      <div id="profile-tabs-rail" className="border-b border-zinc-200 flex flex-wrap gap-1">
        {[
          { id: 'ledger', label: 'Ledger History', icon: BookOpen },
          { id: 'projects', label: 'Milestones & PM', icon: Briefcase },
          { id: 'documents', label: 'Documents Tray', icon: FileText },
          { id: 'contacts', label: 'Contacts Directory', icon: Users },
          { id: 'notes', label: 'Audit Notes Log', icon: Info },
          { id: 'advances', label: 'Advances utilization', icon: DollarSign },
          { id: 'risk', label: 'Credit Risk Analysis', icon: ShieldAlert },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-navigate-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-all ${
                isActive 
                  ? 'border-zinc-900 text-zinc-900 bg-zinc-50' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab View Panels */}
      <div className="bg-white border border-zinc-200 rounded-lg p-5">
        
        {/* --- TAB 1: LEDGER HISTORY --- */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="font-semibold text-sm text-zinc-900 flex items-center">
                Financial Transactions Log ({filteredTxs.length} records)
              </h3>
              <div className="flex flex-wrap gap-2 items-center text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Tx Type:</label>
                  <select 
                    id="ledger-filter-type"
                    className="p-1 border border-zinc-200 rounded focus:outline-hidden"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">All Transactions</option>
                    <option value="invoice">invoice</option>
                    <option value="bill">bill</option>
                    <option value="payment_received">payment received</option>
                    <option value="payment_made">payment made</option>
                    <option value="advance">advance deposit</option>
                    <option value="journal_adjustment">journal entry</option>
                    <option value="opening_balance">opening balance</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Status:</label>
                  <select 
                    id="ledger-filter-dispute"
                    className="p-1 border border-zinc-200 rounded focus:outline-hidden"
                    value={disputeFilter}
                    onChange={(e) => setDisputeFilter(e.target.value)}
                  >
                    <option value="all">All States</option>
                    <option value="disputed">Flagged Disputed</option>
                    <option value="reconciled">Fully Reconciled</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredTxs.length === 0 ? (
              <div className="text-center py-8">
                <Inbox className="mx-auto text-zinc-300 mb-2" size={32} />
                <p className="text-xs text-zinc-500 font-medium">No transactions match selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] text-zinc-400 uppercase font-mono">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Reference No</th>
                      <th className="py-2.5 px-3">Transaction Type</th>
                      <th className="py-2.5 px-3 text-right">Original Tx Amount</th>
                      <th className="py-2.5 px-3 text-right">Base Equivalent ($)</th>
                      <th className="py-2.5 px-3">State</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150">
                    {filteredTxs.map(t => {
                      const isInvoiceRole = ['invoice', 'milestone_invoice', 'retainer'].includes(t.transactionType);
                      const isBillRole = t.transactionType === 'bill';
                      const isReversed = t.status === 'reversed';
                      const isDisputed = t.isDisputed;

                      return (
                        <tr key={t.id} className={`hover:bg-zinc-50 ${isReversed ? 'bg-zinc-100 text-zinc-400 line-through' : ''} ${isDisputed ? 'bg-red-50/50' : ''}`}>
                          <td className="py-3 px-3 font-medium">{t.transactionDate}</td>
                          <td className="py-3 px-3 font-semibold font-mono text-zinc-900">{t.referenceNumber}</td>
                          <td className="py-3 px-3">
                            <span className="bg-neutral-100 text-neutral-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                              {t.transactionType.replace('_', ' ')}
                            </span>
                            {t.projectId && (
                              <span className="text-[9px] text-zinc-500 block mt-0.5 font-light flex items-center gap-0.5">
                                <CornerDownRight size={8} /> Project Milestone
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium">
                            {t.currencyCode === 'USD' ? '' : `${t.currencyCode} `}{t.amountInTxnCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {t.currencyCode !== 'USD' && (
                              <span className="text-[9px] text-zinc-400 block mt-0.5">Rate: {t.exchangeRate}</span>
                            )}
                          </td>
                          <td className={`py-3 px-3 text-right font-mono font-semibold ${t.amountInBaseCurrency > 0 ? 'text-zinc-900' : 'text-red-700'}`}>
                            ${t.amountInBaseCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {t.tdsAmount > 0 && (
                              <span className="text-[9px] text-red-500 block mt-0.5">TDS Withheld: ${t.tdsAmount}</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                                t.status === 'posted' ? 'bg-green-50 text-green-700 border-green-200' : 
                                (t.status === 'written_off' ? 'bg-red-50 text-red-700 border-red-200' : 
                                (t.status === 'pending_approval' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' : 'bg-zinc-100 text-zinc-500 border-zinc-200'))
                              }`}>
                                {t.status}
                              </span>
                              {isDisputed && (
                                <span className="bg-red-100 text-red-800 text-[8px] font-extrabold px-1.5 rounded uppercase">Disputed</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Disputes triggers */}
                              <button
                                id={`dispute-toggle-${t.id}`}
                                onClick={() => handleToggleDispute(t.id)}
                                className={`px-2 py-1 text-[9px] font-bold border rounded-xs cursor-pointer transition-colors ${
                                  isDisputed ? 'bg-zinc-900 hover:bg-zinc-800 text-white' : 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200'
                                }`}
                              >
                                {isDisputed ? 'Resolve dispute' : 'Dispute flag'}
                              </button>

                              {/* Reversal action strictly for posted ledger entries */}
                              {t.status === 'posted' && (
                                <button
                                  id={`revert-trigger-${t.id}`}
                                  onClick={() => handleReversal(t.id)}
                                  className="px-2 py-1 text-[9px] bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 font-bold rounded-xs cursor-pointer"
                                >
                                  Revert Line
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: PROJECTS & CONTRACTS --- */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-zinc-900">Linked PM Projects, Retainers, & Forward Milestones</h3>
            {party.projects.length === 0 ? (
              <div className="text-center py-6">
                <Briefcase className="mx-auto text-zinc-300 mb-2" size={32} />
                <p className="text-xs text-zinc-400 font-medium">No projects found. Add a project tracking ID to link invoices.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {party.projects.map(proj => {
                  const itemsBilled = proj.milestones.filter(m => m.status === 'billed').length;
                  const totalCount = proj.milestones.length;
                  const totalSpentValue = proj.milestones.reduce((acc, m) => acc + m.amount, 0);

                  return (
                    <div key={proj.id} id={`project-card-${proj.id}`} className="bg-zinc-50 p-4 border border-zinc-200 rounded-lg text-xs grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-widest block">Project Identifier</span>
                        <h4 className="text-sm font-bold text-zinc-900 mt-1 flex items-center gap-1.5">
                          <CheckCircle className="text-green-500" size={14} /> {proj.name}
                        </h4>
                        <span className="text-zinc-550 block mt-1.5">Consolidated Value: <strong>${totalSpentValue.toLocaleString()}</strong></span>
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-widest block">Billed Progress Gauge</span>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                            <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${(itemsBilled / totalCount) * 100}%` }} />
                          </div>
                          <span className="font-bold text-zinc-800">{itemsBilled}/{totalCount} Billed</span>
                        </div>
                      </div>
                      <div className="bg-white border rounded p-3">
                        <span className="text-[9px] text-zinc-400 uppercase font-bold block">Milestone Breakdowns</span>
                        <div className="space-y-1.5 mt-2">
                          {proj.milestones.map(m => (
                            <div key={m.id} className="flex justify-between items-center text-[10px] border-b border-zinc-100 pb-1">
                              <span className="text-zinc-700 font-medium">{m.name}</span>
                              <span className="flex items-center gap-1">
                                <strong className="text-zinc-900">${m.amount.toLocaleString()}</strong>
                                <span className={`text-[8px] font-bold px-1.5 rounded uppercase ${m.status === 'billed' ? 'bg-zinc-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>{m.status}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: DOCUMENTS TRAY --- */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="font-semibold text-sm text-zinc-900">Signed KYC, Contracts, and Statement Attachments</h3>
              <button 
                id="btn-doc-sim-upload"
                onClick={handleManualUploadSim}
                className="px-3 py-1.5 bg-zinc-900 text-white rounded hover:bg-zinc-800 text-[10px] font-bold cursor-pointer"
              >
                + Auto-simulate file Upload
              </button>
            </div>

            {/* Drag and Drop simulate panel */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`p-6 border-2 border-dashed rounded-lg text-center transition-all ${
                dragActive ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-500'
              }`}
            >
              <Inbox size={32} className="mx-auto text-zinc-300 mb-1" />
              <p className="text-xs text-zinc-500 font-medium select-none">Drag & Drop real compliance files here or click above to simulate.</p>
              <span className="text-[9px] text-zinc-400 block mt-1">Accepts PDF, JPG, PNG, CSV documents up to 5MB</span>
            </div>

            {party.documents.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-4">No uploaded KYC/Contracts on this party.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {party.documents.map(doc => (
                  <div key={doc.id} className="p-3 bg-zinc-50 rounded border border-zinc-200 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-zinc-650" />
                      <div>
                        <span className="font-bold text-zinc-900 block truncate max-w-[200px]">{doc.name}</span>
                        <span className="text-[9px] text-zinc-400 uppercase font-mono">Size: {doc.size} | Upload Date: {doc.uploadDate}</span>
                      </div>
                    </div>
                    <span className="bg-neutral-200 text-neutral-800 text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold">{doc.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 4: CONTACTS DIRECTORY --- */}
        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-zinc-900">Communication Contacts Map</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Left Side Add Contact Form */}
              <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-lg text-xs">
                <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-extrabold block mb-3">Add Contact Information</span>
                <form onSubmit={handleAddContact} className="space-y-2.5">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Contact Name *</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full p-2 border border-zinc-200 rounded bg-white text-xs text-zinc-805"
                      value={newContact.name}
                      onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Corporate Role</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-zinc-200 rounded bg-white text-xs text-zinc-805"
                      value={newContact.role}
                      onChange={(e) => setNewContact(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="Chief Financial Officer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Email Address *</label>
                    <input 
                      type="email" 
                      required 
                      className="w-full p-2 border border-zinc-200 rounded bg-white text-xs text-zinc-850"
                      value={newContact.email}
                      onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="jdoe@party.com"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Telephone Number</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-zinc-200 rounded bg-white text-xs text-zinc-805"
                      value={newContact.phone}
                      onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 555-012"
                    />
                  </div>
                  <button 
                    id="btn-add-contact-submit"
                    type="submit" 
                    className="w-full py-2 bg-zinc-950 text-white rounded text-xs font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Save Contact Details
                  </button>
                </form>
              </div>

              {/* Right list cards */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 align-start">
                {party.contacts.length === 0 ? (
                  <p className="text-xs text-zinc-400 p-4 border border-dashed rounded text-center col-span-2">No contact listings added. Add one using directory form.</p>
                ) : (
                  party.contacts.map(con => (
                    <div key={con.id} className="p-3 bg-white border border-zinc-200 rounded-lg flex flex-col justify-between text-xs min-h-[110px]">
                      <div>
                        <span className="font-bold text-zinc-900 block">{con.name}</span>
                        <span className="text-[10px] text-zinc-400 block italic font-medium">{con.role || 'Unspecified Executive'}</span>
                        <span className="text-[10px] text-zinc-600 block mt-2 hover:underline">{con.email}</span>
                        {con.phone && <span className="text-[10px] text-zinc-500 block">{con.phone}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 5: AUDIT NOTES LOG --- */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-zinc-900">Internal Audit Diary Comments</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Append form */}
              <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-lg text-xs">
                <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-extrabold block mb-3">Add Internal Diary Entry</span>
                <form onSubmit={handleAddNote} className="space-y-2.5">
                  <textarea 
                    className="w-full p-2 border border-zinc-200 rounded bg-white text-xs focus:outline-hidden min-h-[100px]"
                    required
                    placeholder="E.g. Approved specific milestone re-audit following deployment variances..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <button 
                    id="btn-add-note-submit"
                    type="submit" 
                    className="w-full py-2 bg-zinc-950 text-white rounded text-xs font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Commit Diary Note
                  </button>
                </form>
              </div>

              {/* Review Timeline */}
              <div className="md:col-span-2 space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {party.auditNotes.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-4 border border-dashed rounded-lg">No audit diary comments exist.</p>
                ) : (
                  party.auditNotes.map(n => (
                    <div key={n.id} className="p-3 bg-zinc-50 border border-zinc-250 rounded-lg text-xs text-zinc-700 relative">
                      <div className="flex justify-between items-center text-[9px] text-zinc-450 uppercase font-mono font-bold mb-1">
                        <span>By: {n.user}</span>
                        <span>{n.timestamp}</span>
                      </div>
                      <p className="leading-relaxed text-zinc-801">"{n.message}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 6: ADVANCES UTILIZATION --- */}
        {activeTab === 'advances' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-zinc-900">Pre-payment Cash Advances Utilizations</h3>
            
            {/* Advance metrics utilization tracking gauge */}
            {(() => {
              const advanceTxs = transactions.filter(t => t.transactionType === 'advance' && t.status === 'posted');
              const totalCollected = advanceTxs.reduce((acc, t) => acc + Math.abs(t.amountInBaseCurrency), 0);
              const totalSpent = party.id === 'p-acme' ? 6000 : 0; // Simulated utilized matches
              const remaining = totalCollected - totalSpent;
              const rate = totalCollected > 0 ? (totalSpent / totalCollected) * 105 : 0; // scaled for gauge representation

              return (
                <div id="advance-tracker" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-lg flex flex-col justify-between text-xs min-h-[140px]">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-extrabold block">Collected Advances</span>
                      <p className="text-2xl font-bold text-zinc-900 mt-2">${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-medium block">Inflows received prior to invoice generation</span>
                  </div>

                  <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-lg flex flex-col justify-between text-xs min-h-[140px]">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-extrabold block">Consumed Balance</span>
                      <p className="text-2xl font-bold text-zinc-900 mt-2">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-medium block">Debited against issued milestone invoices</span>
                  </div>

                  <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-lg flex flex-col justify-between text-xs min-h-[140px]">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-extrabold block">Unutilized Balance (Liability)</span>
                      <p className="text-2xl font-bold text-zinc-900 mt-2">${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-medium block">Unconsumed deposit representing cash liability</span>
                  </div>

                  <div className="md:col-span-3 bg-zinc-50 border p-4 rounded-lg">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-2">Advance Utilization Progress</span>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-neutral-200 h-3 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${Math.min(100, rate)}%` }} />
                      </div>
                      <span className="text-xs font-bold font-mono">{rate.toFixed(1)}% Consumed</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-3 font-medium">
                      All collected advances are isolated from monthly operating revenue reports. They clear down organically only as milestones are billed.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* --- TAB 7: CREDIT RISK ANALYSIS & CONTRA OFFSET --- */}
        {activeTab === 'risk' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-zinc-900">Forward Credit Risk Exposure & Limits</h3>
            
            {(() => {
              // Exposure Calculation
              let unbilledMilestonesValue = 0;
              party.projects.forEach(proj => {
                proj.milestones.forEach(m => {
                  if (m.status === 'open') {
                    unbilledMilestonesValue += m.amount;
                  }
                });
              });

              const outstandingAr = balances.runningReceivables;
              const totalExposure = outstandingAr + unbilledMilestonesValue;
              const limitUtilization = party.creditLimit > 0 ? (totalExposure / party.creditLimit) * 100 : 0;
              const riskFlag = totalExposure > party.creditLimit ? 'OVER_LIMIT' : (limitUtilization > 85 ? 'HIGH_EXPOSURE' : 'SAFE');

              return (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-50 border p-3 rounded-lg">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">Current Ledger Receivables</span>
                      <p className="text-base font-bold text-zinc-900 mt-1">${outstandingAr.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-50 border p-3 rounded-lg">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">Unbilled Milestones (Active PM)</span>
                      <p className="text-base font-bold text-zinc-900 mt-1">${unbilledMilestonesValue.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-50 border p-3 rounded-lg">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Weighted Exposure</span>
                      <p className="text-base font-bold text-zinc-900 mt-1">${totalExposure.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-50 border p-3 rounded-lg">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">Consolidated Credit Limit</span>
                      <p className="text-base font-bold text-zinc-900 mt-1">
                        {party.creditLimit > 0 ? `$${party.creditLimit.toLocaleString()}` : 'No credit allowed'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 border rounded-lg flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase">Limit Headroom Meter</span>
                      <div className="flex items-center gap-2 mt-1 min-w-[200px]">
                        <div className="flex-1 bg-zinc-200 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${riskFlag === 'OVER_LIMIT' ? 'bg-red-500' : (riskFlag === 'HIGH_EXPOSURE' ? 'bg-amber-500' : 'bg-zinc-900')}`} 
                            style={{ width: `${Math.min(100, limitUtilization)}%` }}
                          />
                        </div>
                        <span className="font-bold">{limitUtilization.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase block">State Classification</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase mt-1 inline-block ${
                        riskFlag === 'SAFE' ? 'bg-green-50 text-green-700 border-green-200' :
                        (riskFlag === 'HIGH_EXPOSURE' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200')
                      }`}>
                        {riskFlag.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Dual-role Balance Offsetting (Contra Entry Module) */}
                  {party.type === 'both' ? (
                    <div id="contra-offset-module" className="p-4 border border-zinc-200 bg-zinc-50 rounded-lg">
                      <span className="text-[11px] font-bold text-zinc-700 flex items-center gap-1.5 uppercase mb-1">
                        <ArrowRightLeft size={14} className="text-zinc-600" /> 
                        Dual-Role Contra Balance Offset Engine (Mutual Reconciliation)
                      </span>
                      <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">
                        This client also operates as an active vendor (you owe payable balances). Apply mutual credit adjustments (Contra Entries) to offset balances up to the lesser of the outstanding receivables or payables.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-205 pt-3 text-[10px] items-end">
                        <div>
                          <span className="text-zinc-450 uppercase block">Receivables Outstanding limit</span>
                          <span className="text-sm font-extrabold text-zinc-800 mt-1 block">${arTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-zinc-450 uppercase block">Payables Outstanding limit</span>
                          <span className="text-sm font-extrabold text-zinc-800 mt-1 block">${apTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-zinc-450 uppercase block">Lesser Maximum Limit (Available Offset)</span>
                          <span className="text-sm font-bold text-zinc-900 mt-1 block bg-neutral-100 p-1 rounded-sm">${Math.min(arTotal, apTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        {Math.min(arTotal, apTotal) > 0 ? (
                          <form onSubmit={handleContraOffsetSubmit} className="md:col-span-3 flex items-center gap-2 mt-2 border-t pt-3 flex-wrap">
                            <input 
                              type="number" 
                              required 
                              min="0.01"
                              step="0.01"
                              max={Math.min(arTotal, apTotal)}
                              placeholder={`E.g. ${Math.min(arTotal, apTotal).toFixed(2)}`}
                              className="p-2 border border-zinc-300 rounded focus:outline-hidden text-xs w-full sm:w-[150px]"
                              value={contraOffsetAmount}
                              onChange={(e) => setContraOffsetAmount(e.target.value)}
                            />
                            <button 
                              id="btn-contra-offset-apply"
                              type="submit" 
                              className="px-4 py-2 bg-zinc-950 text-white rounded font-bold text-xs hover:bg-zinc-800 cursor-pointer"
                            >
                              Post Balance Offset (Contra Entry)
                            </button>
                          </form>
                        ) : (
                          <div className="md:col-span-3 p-2 bg-neutral-100 rounded text-center text-zinc-450 italic font-medium mt-2">
                            A mutual outstanding offset cannot be generated since one or both sides (AR/AP Position) currently evaluate to zero.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Bad Debt Write-Off panel for super users */}
                  {(activeRole === 'Finance Manager' || activeRole === 'Super Admin') && outstandingAr > 0 && (
                    <div id="bad-debt-module" className="p-4 border border-red-200 bg-red-50/50 rounded-lg">
                      <span className="text-[11px] font-bold text-red-950 flex items-center gap-1.5 uppercase mb-1">
                        <AlertTriangle size={14} className="text-red-700" />
                        Write-off Uncollectible Accounts Receivable Asset (Bad Debt Entry)
                      </span>
                      <p className="text-[10px] text-red-900/80 mb-3 leading-relaxed">
                        Permanently clear bad or disputed receivables directly against the Bad Debt Expense account. This will completely zero out matching outstanding AR without issuing a credit note. This event is logged securely.
                      </p>
                      <form onSubmit={handleWriteOff} className="flex gap-2 items-end flex-wrap">
                        <div className="text-xs">
                          <label className="text-[10px] text-red-900 block mb-1 font-semibold">Write-off USD Amount *</label>
                          <input 
                            type="number" 
                            required 
                            min="0.1" 
                            step="0.01" 
                            max={outstandingAr}
                            className="p-2 border border-red-300 rounded bg-white text-xs w-[120px]"
                            placeholder={`Max ${outstandingAr.toFixed(2)}`}
                            value={writeOffAmount}
                            onChange={(e) => setWriteOffAmount(e.target.value)}
                          />
                        </div>
                        <div className="text-xs flex-1 min-w-[200px]">
                          <label className="text-[10px] text-red-900 block mb-1 font-semibold">Authorized Legal Reason *</label>
                          <input 
                            type="text" 
                            required
                            className="p-2 border border-red-300 rounded bg-white text-xs w-full"
                            placeholder="E.g. Involuntarily Liquidated / Bankruptcy confirmed"
                            value={writeOffReason}
                            onChange={(e) => setWriteOffReason(e.target.value)}
                          />
                        </div>
                        <button 
                          id="btn-bad-debt-writeoff-submit"
                          type="submit" 
                          className="px-4 py-2 bg-red-700 text-white rounded font-bold hover:bg-red-800 cursor-pointer"
                        >
                          Execute Write-off
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
