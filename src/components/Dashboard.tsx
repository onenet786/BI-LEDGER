/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  getTransactions, 
  getParties, 
  handleMakerCheckerApproval, 
  getLedgerReportData, 
  getPartyRunningBalances,
  calculateAgingOffsetInDays,
  getCurrencySymbol
} from '../ledgerService';
import { Transaction, Party } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XSquare, 
  User, 
  Search, 
  RefreshCw,
  Sliders,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  LayoutGrid
} from 'lucide-react';

interface DashboardProps {
  activeRole: string;
  username: string;
  onNavigateToParty: (partyId: string) => void;
  onNavigateToReports: (reportKey: string) => void;
  onNavigateToNewTx: () => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

export default function Dashboard({
  activeRole,
  username,
  onNavigateToParty,
  onNavigateToReports,
  onNavigateToNewTx,
  refreshTrigger,
  triggerRefresh,
}: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionComments, setActionComments] = useState<Record<string, string>>({});
  
  // Custom layout order for widgets (Draggable simulation switcher)
  const [widgetOrder, setWidgetOrder] = useState<string[]>([
    'kpis',
    'approvals',
    'aging_ar',
    'exposure_pie',
    'disputes'
  ]);

  useEffect(() => {
    setTransactions(getTransactions());
    setParties(getParties());
  }, [refreshTrigger]);

  const loadData = () => {
    setTransactions(getTransactions());
    setParties(getParties());
  };

  const handleApproval = (txId: string, approved: boolean) => {
    try {
      const comment = actionComments[txId] || (approved ? 'Approved via Dashboard Quick Action' : 'Rejected via Dashboard Quick Action');
      handleMakerCheckerApproval(txId, approved, username, comment);
      
      // Clean comments input
      setActionComments(prev => {
        const copy = { ...prev };
        delete copy[txId];
        return copy;
      });
      
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Drag and drop widget simulation switcher
  const moveWidget = (direction: 'up' | 'down', index: number) => {
    const newOrder = [...widgetOrder];
    if (direction === 'up' && index > 0) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[index - 1];
      newOrder[index - 1] = temp;
    } else if (direction === 'down' && index < newOrder.length - 1) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[index + 1];
      newOrder[index + 1] = temp;
    }
    setWidgetOrder(newOrder);
  };

  // Financial aggregates calculated on-demand
  const postedTxns = transactions.filter(t => t.status === 'posted');
  
  // Outstanding Computations
  let totalAR = 0;
  let totalAP = 0;
  parties.forEach(p => {
    const { runningReceivables, runningPayables } = getPartyRunningBalances(p.id);
    totalAR += runningReceivables;
    totalAP += runningPayables;
  });

  const pendingApprovals = transactions.filter(t => t.status === 'pending_approval');
  const openDisputes = transactions.filter(t => t.isDisputed && t.status === 'posted');

  // AR Aging data for rendering custom micro charts
  const agingArData = getLedgerReportData('ar_aging', {}) as any[];
  const ageTotals = {
    current: agingArData.reduce((acc, r) => acc + (r.current || 0), 0),
    b1_30: agingArData.reduce((acc, r) => acc + (r.b1_30 || 0), 0),
    b31_60: agingArData.reduce((acc, r) => acc + (r.b31_60 || 0), 0),
    b61_90: agingArData.reduce((acc, r) => acc + (r.b61_90 || 0), 0),
    b91_plus: agingArData.reduce((acc, r) => acc + (r.b91_plus || 0), 0),
  };

  const grandAgeTotal = ageTotals.current + ageTotals.b1_30 + ageTotals.b31_60 + ageTotals.b61_90 + ageTotals.b91_plus || 1;

  // Render KPIs
  const renderKPIs = () => (
    <div key="kpis" id="dashboard-widget-kpis" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 transition-all duration-300">
      <div id="kpi-ar" className="bg-white p-4 border border-zinc-200 rounded-lg shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs text-zinc-500 font-medium block">Total Receivables (AR)</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block">{getCurrencySymbol()}{totalAR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-[10px] text-green-600 font-semibold mt-1 flex items-center">
            <TrendingUp size={10} className="mr-0.5" /> Credit Risk Evaluated
          </span>
        </div>
        <div className="bg-neutral-50 p-2.5 rounded-full text-zinc-800 border border-zinc-100">
          <TrendingUp size={20} />
        </div>
      </div>

      <div id="kpi-ap" className="bg-white p-4 border border-zinc-200 rounded-lg shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs text-zinc-500 font-medium block">Total Payables (AP)</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block">{getCurrencySymbol()}{totalAP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-[10px] text-zinc-500 block mt-1">3 subcontractor contracts synced</span>
        </div>
        <div className="bg-neutral-50 p-2.5 rounded-full text-zinc-500 border border-zinc-100">
          <TrendingDown size={20} />
        </div>
      </div>

      <div id="kpi-net-exp" className="bg-white p-4 border border-zinc-200 rounded-lg shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs text-zinc-500 font-medium block">Net Liquidity Inflow</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block">
            {getCurrencySymbol()}{(totalAR - totalAP).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-[10px] font-semibold mt-1 block ${(totalAR - totalAP) > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {(totalAR - totalAP) > 0 ? 'Surplus Cashflow Position' : 'Deficit Exposure Alert'}
          </span>
        </div>
        <div className="bg-neutral-50 p-2.5 rounded-full text-zinc-800 border border-zinc-100">
          <DollarSign size={20} />
        </div>
      </div>

      <div id="kpi-approvals-count" className="bg-white p-4 border border-zinc-200 rounded-lg shadow-xs flex items-center justify-between animate-pulse">
        <div>
          <span className="text-xs text-zinc-500 font-medium block">Awaiting Approval</span>
          <span className="text-xl font-semibold text-amber-600 mt-1 block">{pendingApprovals.length} Transactions</span>
          <span className="text-[10px] text-amber-500 font-medium block mt-1">Maker-Checker active</span>
        </div>
        <div className="bg-amber-50 p-2.5 rounded-full text-amber-600 border border-amber-100">
          <Clock size={20} />
        </div>
      </div>
    </div>
  );

  // Maker-Checker authorization panel widget
  const renderApprovals = () => {
    // Only Finance Managers or Super Admins can check. Readers or data entry see task count logs.
    const isVerifier = activeRole === 'Finance Manager' || activeRole === 'Super Admin';

    return (
      <div key="approvals" id="widget-approvals" className="bg-white border border-zinc-100 rounded-lg shadow-xs overflow-hidden mb-4">
        <div className="bg-zinc-50 border-b border-zinc-100 px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-zinc-800 flex items-center">
            <ShieldCheck size={16} className="text-amber-500 mr-2" />
            Maker-Checker Work Authorization Queue
          </h3>
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {pendingApprovals.length} awaiting authorization
          </span>
        </div>
        <div className="p-4">
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="mx-auto text-zinc-300 mb-2" size={32} />
              <p className="text-xs text-zinc-400 font-medium">Clear Queue. No pending transaction authorizations requested.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map(t => {
                const party = parties.find(p => p.id === t.partyId);
                return (
                  <div key={t.id} id={`approval-item-${t.id}`} className="p-3 bg-zinc-50 rounded border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-zinc-900">{t.referenceNumber}</span>
                        <span className="bg-neutral-200 text-neutral-800 font-mono text-[9px] px-1.5 py-0.2 rounded uppercase">
                          {t.transactionType.replace('_', ' ')}
                        </span>
                        <span className="text-zinc-400">by</span>
                        <span className="font-medium text-zinc-700 flex items-center gap-0.5">
                          <User size={10} /> {t.createdBy}
                        </span>
                      </div>
                      <p className="text-zinc-500 mt-1 font-medium">
                        Party: <span className="text-zinc-800 font-semibold">{party?.name || 'Unknown'}</span> | Date: {t.transactionDate}
                      </p>
                      {t.comments && (
                        <p className="text-[10px] bg-white p-1.5 rounded border border-zinc-200 text-zinc-500 mt-1 px-2 italic font-mono">
                          " {t.comments} "
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <div className="text-right">
                        <span className="text-xs text-zinc-400">Base Amount</span>
                        <p className="text-sm font-bold text-zinc-900">{getCurrencySymbol()}{t.amountInBaseCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                      {isVerifier ? (
                        <div className="space-y-1.5">
                          <input 
                            type="text" 
                            placeholder="Approval or rejection comments..."
                            className="w-full text-[10px] p-1.5 border border-zinc-300 rounded focus:outline-hidden focus:border-zinc-500"
                            value={actionComments[t.id] || ''}
                            onChange={(e) => setActionComments(prev => ({ ...prev, [t.id]: e.target.value }))}
                          />
                          <div className="flex gap-1 justify-end">
                            <button 
                              id={`approve-btn-${t.id}`}
                              onClick={() => handleApproval(t.id, true)}
                              className="px-2.5 py-1 text-[10px] bg-zinc-900 hover:bg-zinc-800 text-white rounded font-medium cursor-pointer transition-colors"
                            >
                              Approve Post
                            </button>
                            <button 
                              id={`reject-btn-${t.id}`}
                              onClick={() => handleApproval(t.id, false)}
                              className="px-2.5 py-1 text-[10px] bg-red-100 hover:bg-red-200 text-red-800 rounded font-medium cursor-pointer transition-colors"
                            >
                              Reject Draft
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded border border-amber-100 font-medium text-right shadow-2xs">
                          Approval restricted to Finance Managers or Super Admins.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Aging custom bars
  const renderAgingAR = () => (
    <div key="aging_ar" id="widget-aging-ar" className="bg-white border border-zinc-200 rounded-lg shadow-xs overflow-hidden mb-4">
      <div className="bg-zinc-50 border-b border-zinc-100 px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-zinc-800 flex items-center">
          <Clock size={16} className="text-zinc-600 mr-2" />
          Receivables Invoice Aging Buckets
        </h3>
        <button 
          id="btn-nav-ar-aging"
          onClick={() => onNavigateToReports('ar_aging')}
          className="text-xs text-zinc-900 hover:underline flex items-center gap-1 font-medium"
        >
          Detailed Aging <ChevronRight size={12} />
        </button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: 'Current', amount: ageTotals.current, color: 'bg-zinc-900' },
            { label: '1 - 30 Days', amount: ageTotals.b1_30, color: 'bg-zinc-700' },
            { label: '31 - 60 Days', amount: ageTotals.b31_60, color: 'bg-zinc-500' },
            { label: '61 - 90 Days', amount: ageTotals.b61_90, color: 'bg-zinc-400 font-semibold' },
            { label: '90+ Days', amount: ageTotals.b91_plus, color: 'bg-zinc-300' },
          ].map((bar, i) => {
            const percentage = (bar.amount / grandAgeTotal) * 100;
            return (
              <div key={i} className="flex flex-col justify-end bg-zinc-50 border border-zinc-100 p-3 rounded-lg min-h-[120px]">
                <div className="relative h-16 w-full bg-neutral-100 rounded-sm mb-2 overflow-hidden">
                  <div 
                    className={`absolute bottom-0 left-0 w-full rounded-sm transition-all duration-700 ${bar.color}`}
                    style={{ height: `${Math.max(4, percentage)}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 font-medium block">{bar.label}</span>
                <span className="text-xs font-bold text-zinc-900 mt-0.5 block">
                  {getCurrencySymbol()}{bar.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[9px] text-zinc-400 italic font-mono">
                  {percentage.toFixed(1)}% of AR
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Multi-currency Risk and Disputes summary
  const renderExposure = () => {
    // AED, EUR, USD percentages
    const eurEx = transactions.filter(t => t.currencyCode === 'EUR' && t.status === 'posted').reduce((sum, t) => sum + Math.abs(t.amountInBaseCurrency), 0);
    const aedEx = transactions.filter(t => t.currencyCode === 'AED' && t.status === 'posted').reduce((sum, t) => sum + Math.abs(t.amountInBaseCurrency), 0);
    const usdEx = transactions.filter(t => t.currencyCode === 'USD' && t.status === 'posted').reduce((sum, t) => sum + Math.abs(t.amountInBaseCurrency), 0);
    const sumEx = eurEx + aedEx + usdEx || 1;

    return (
      <div key="exposure_pie" id="widget-exposure" className="bg-white border border-zinc-200 rounded-lg shadow-xs overflow-hidden mb-4">
        <div className="bg-zinc-50 border-b border-zinc-100 px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-zinc-800 flex items-center">
            <LayoutGrid size={16} className="text-zinc-600 mr-2" />
            Base Currency Exposure by Transaction ISO Code
          </h3>
          <span className="text-[10px] text-zinc-400 italic">Static Consolidation rate applied</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-medium text-zinc-500">Forex Balance Spread</span>
            <div className="space-y-3 mt-3">
              {[
                { symbol: 'USD', value: usdEx, percent: (usdEx/sumEx)*100, color: 'bg-zinc-900', label: '$ US Dollar' },
                { symbol: 'EUR', value: eurEx, percent: (eurEx/sumEx)*100, color: 'bg-zinc-600', label: '€ Euro' },
                { symbol: 'AED', value: aedEx, percent: (aedEx/sumEx)*100, color: 'bg-zinc-300', label: 'د.إ UAE Dirham' },
              ].map((c, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex justify-between font-medium text-zinc-700 mb-1">
                    <span>{c.label} ({c.symbol})</span>
                    <span className="font-bold">{getCurrencySymbol()}{c.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({c.percent.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${c.color} rounded-full`} style={{ width: `${c.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center bg-zinc-50 border border-zinc-100 rounded-lg p-4">
            <span className="text-xs font-semibold text-zinc-600">Forex Asset Coverage Ratio</span>
            <p className="text-3xl font-bold text-zinc-900 mt-2">12.4% <span className="text-xs font-medium text-zinc-400">Total Yield Hedging</span></p>
            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
              Consolidated workspace ledger risk aggregates 2 active foreign transaction currencies pegged back to Base Functional Currency USD. Period-end reevaluations are configured.
            </p>
            <button 
              id="btn-nav-forex"
              onClick={() => onNavigateToReports('forex_gain_loss')}
              className="mt-3 text-xs text-zinc-850 hover:underline font-bold text-left flex items-center gap-1"
            >
              Analyze Exchange Variances <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDisputes = () => (
    <div key="disputes" id="widget-disputes" className="bg-white border border-zinc-200 rounded-lg shadow-xs overflow-hidden mb-4">
      <div className="bg-zinc-50 border-b border-zinc-100 px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-zinc-800 flex items-center">
          <AlertTriangle size={16} className="text-red-500 mr-2" />
          Reconciliation Disputed Invoice Auditing
        </h3>
        <span className="text-[10px] text-red-650 bg-red-100 font-bold px-2 py-0.5 rounded-full">
          {openDisputes.length} disputes open
        </span>
      </div>
      <div className="p-4">
        {openDisputes.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="mx-auto text-green-500 mb-1" size={24} />
            <p className="text-xs text-zinc-400">Perfect Reconciliation: No flagged client disputes detected.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {openDisputes.map(dis => {
              const party = parties.find(p => p.id === dis.partyId);
              return (
                <div key={dis.id} id={`dispute-item-${dis.id}`} className="p-2.5 bg-red-50 border border-red-200 rounded flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-red-950 font-mono">{dis.referenceNumber}</span>
                    <span className="text-zinc-600 block text-[10px]">
                      Party: <span className="font-bold text-zinc-800">{party?.name || 'Unknown'}</span> | Age: {calculateAgingOffsetInDays(dis.transactionDate)} Days
                    </span>
                    <span className="text-[10px] font-semibold text-red-700 italic block mt-0.5">
                      " {dis.comments || 'Disputed invoice' } "
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-red-950">{getCurrencySymbol()}{dis.amountInBaseCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <button 
                      id={`dispute-audit-btn-${dis.id}`}
                      onClick={() => onNavigateToParty(dis.partyId)}
                      className="text-[10px] text-zinc-800 block mt-1 hover:underline font-bold"
                    >
                      Audit Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pb-2">
        <div className="flex-1 max-w-lg relative">
          <Search size={16} className="absolute left-3 top-3 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Omni-Search parties e.g. Acme, Vanguard, blacklisted..."
            className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:border-zinc-500 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            id="btn-refresh-dashboard"
            onClick={loadData}
            className="p-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw size={14} /> Refresh Logs
          </button>
          <button 
            id="btn-direct-ledger-post"
            onClick={onNavigateToNewTx}
            className="px-4 py-2 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 cursor-pointer text-xs font-bold transition-all"
          >
            + Post Ledger Transaction
          </button>
        </div>
      </div>

      {/* NLP search matches */}
      {searchQuery && (
        <div id="search-matches-wrapper" className="bg-zinc-50 ring-1 ring-zinc-200 p-4 rounded-lg">
          <h4 className="text-xs font-semibold text-zinc-650 flex items-center justify-between mb-3 border-b border-zinc-200 pb-2">
            <span>Query Matches: "{searchQuery}"</span>
            <button id="btn-clear-q-match" onClick={() => setSearchQuery('')} className="text-[10px] text-zinc-800 font-bold hover:underline">Clear Search</button>
          </h4>
          
          {/* Party matches */}
          {parties.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase()) || p.status.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
            <div className="mb-4">
              <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider block mb-1">Parties Found ({parties.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase()) || p.status.toLowerCase().includes(searchQuery.toLowerCase())).length})</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {parties.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase()) || p.status.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                  <div key={p.id} className="p-2.5 bg-white border border-zinc-200 rounded-lg flex items-center justify-between text-xs shadow-32xs">
                    <div>
                      <span className="font-bold text-zinc-900 block">{p.name} <span className="text-[10px] font-mono text-zinc-400">({p.code})</span></span>
                      <span className="text-[10px] text-zinc-400 uppercase">Type: {p.type} | Status: {p.status}</span>
                    </div>
                    <button 
                      id={`ar-party-nav-${p.id}`}
                      onClick={() => {
                        setSearchQuery('');
                        onNavigateToParty(p.id);
                      }}
                      className="px-2.5 py-1 text-[10px] bg-zinc-900 text-white hover:bg-zinc-800 rounded font-semibold cursor-pointer"
                    >
                      360° Profile
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction matches */}
          {transactions.filter(t => t.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || t.transactionType.toLowerCase().includes(searchQuery.toLowerCase()) || t.comments?.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider block mb-1">Transactions Found ({transactions.filter(t => t.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || t.transactionType.toLowerCase().includes(searchQuery.toLowerCase()) || t.comments?.toLowerCase().includes(searchQuery.toLowerCase())).length})</span>
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {transactions.filter(t => t.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || t.transactionType.toLowerCase().includes(searchQuery.toLowerCase()) || t.comments?.toLowerCase().includes(searchQuery.toLowerCase())).map(t => {
                  const party = parties.find(p => p.id === t.partyId);
                  return (
                    <div key={t.id} className="p-2 bg-white border border-zinc-200 rounded flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-zinc-900">{t.referenceNumber}</span> | <span className="text-[10px] text-zinc-500 font-mono">{t.transactionType}</span>
                        <span className="text-[10px] text-zinc-400 block font-light">Client: {party?.name} | Date: {t.transactionDate} | Status: <span className="font-medium text-zinc-700">{t.status}</span></span>
                      </div>
                      <span className="font-bold text-zinc-950">{getCurrencySymbol()}{t.amountInBaseCurrency.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-zinc-400 mt-2 font-medium">No system transaction matches matching query.</p>
          )}
        </div>
      )}

      {/* Widget Grid Layout rendering draggable-simulations controls */}
      <div id="drag-sim-controller" className="bg-zinc-50 border border-zinc-200 p-2 py-1.5 rounded-lg text-xs flex flex-wrap gap-2 items-center text-zinc-500 justify-between">
        <span className="font-medium flex items-center gap-1">
          <Sliders size={12} /> Draggable Widget Hub Simulation Order Configurator:
        </span>
        <div className="flex gap-2 flex-wrap text-[10px]">
          {widgetOrder.map((widget, idx) => (
            <span key={widget} className="bg-white border border-zinc-300 rounded px-2 py-0.5 font-bold flex items-center gap-1 text-zinc-800">
              {widget.toUpperCase().replace('_', ' ')}
              <span className="flex gap-0.5">
                <button id={`widget-up-${widget}`} onClick={() => moveWidget('up', idx)} className="hover:text-black font-extrabold text-[9px]">▲</button>
                <button id={`widget-down-${widget}`} onClick={() => moveWidget('down', idx)} className="hover:text-black font-extrabold text-[9px]">▼</button>
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Render Widgets in ordered sequence */}
      <div className="space-y-4">
        {widgetOrder.map(widgetId => {
          if (widgetId === 'kpis') return renderKPIs();
          if (widgetId === 'approvals') return renderApprovals();
          if (widgetId === 'aging_ar') return renderAgingAR();
          if (widgetId === 'exposure_pie') return renderExposure();
          if (widgetId === 'disputes') return renderDisputes();
          return null;
        })}
      </div>
    </div>
  );
}
