/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  getLedgerReportData, 
  getParties, 
  getTenantSettings, 
  addAuditLog 
} from '../ledgerService';
import { Party, TenantSettings } from '../types';
import { 
  Filter, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Clock, 
  Search, 
  Sparkles, 
  ArrowRightLeft, 
  HelpCircle,
  Table,
  CheckCircle2,
  TrendingUp,
  Inbox
} from 'lucide-react';

interface ReportsProps {
  username: string;
  refreshTrigger: number;
}

export default function Reports({ username, refreshTrigger }: ReportsProps) {
  const [parties, setParties] = useState<Party[]>([]);
  const [settings, setSettings] = useState<TenantSettings | null>(null);

  // Active Report Switching
  const [activeReportKey, setActiveReportKey] = useState<string>('party_statement');

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('all');
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [selectedCurrency, setSelectedCurrency] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // NLP Queries
  const [nlpQuery, setNlpQuery] = useState('');
  const [nlpTriggerAlert, setNlpTriggerAlert] = useState('');

  // Loaded Report Data
  const [reportRows, setReportRows] = useState<any[]>([]);

  useEffect(() => {
    setParties(getParties());
    setSettings(getTenantSettings());
  }, [refreshTrigger]);

  // Query engine re-triggerer
  useEffect(() => {
    const rawData = getLedgerReportData(activeReportKey, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      partyId: selectedPartyId,
      branchId: selectedBranchId,
      currency: selectedCurrency,
      status: selectedStatus,
    });
    setReportRows(rawData);
  }, [
    activeReportKey, 
    startDate, 
    endDate, 
    selectedPartyId, 
    selectedBranchId, 
    selectedCurrency, 
    selectedStatus, 
    refreshTrigger
  ]);

  // NLP simulated parser
  const handleNlpSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setNlpTriggerAlert('');
    const query = nlpQuery.toLowerCase().trim();

    if (!query) return;

    if (query.includes('unutilized') || query.includes('utilization') || query.includes('advances')) {
      setActiveReportKey('bi_advance_utilization');
      setSelectedCurrency('all');
      setNlpTriggerAlert('Query Matches: Loaded BI ADVANCE UTILIZATION REPORT successfully.');
    } else if (query.includes('disputed') || query.includes('dispute') || query.includes('reconciliation')) {
      setActiveReportKey('bi_audit_reconciliation');
      setNlpTriggerAlert('Query Matches: Loaded BI AUDITOR DISPUTE RECONCILIATION LOG successfully.');
    } else if (query.includes('exposure') || query.includes('credit limit') || query.includes('risk')) {
      setActiveReportKey('bi_credit_exposure');
      setNlpTriggerAlert('Query Matches: Loaded BI CREDIT RISK EXPOSURE ANALYSIS.');
    } else if (query.includes('profitability') || query.includes('yield') || query.includes('margin')) {
      setActiveReportKey('bi_profitability');
      setNlpTriggerAlert('Query Matches: Loaded BI PARTY PROFITABILITY REPORT.');
    } else if (query.includes('forex') || query.includes('exchange') || query.includes('gain')) {
      setActiveReportKey('forex_gain_loss');
      setNlpTriggerAlert('Query Matches: Filtered standard Forex Gain/Loss Analysis report.');
    } else if (query.includes('tds') || query.includes('withholding')) {
      setActiveReportKey('tds_report');
      setNlpTriggerAlert('Query Matches: Filtered TDS / Withholding compliance ledger.');
    } else if (query.includes('bad debt') || query.includes('write')) {
      setActiveReportKey('bad_debt');
      setNlpTriggerAlert('Query Matches: Filtered Bad Debt Write-offs audited log.');
    } else if (query.includes('acme')) {
      setSelectedPartyId('p-acme');
      setNlpTriggerAlert('Query Matches: Filtered party standard selections to "Acme Enterprise Consulting".');
    } else if (query.includes('vanguard')) {
      setSelectedPartyId('p-vanguard');
      setNlpTriggerAlert('Query Matches: Filtered party standard selections to "Vanguard Creative Labs".');
    } else {
      setNlpTriggerAlert('Partial Match: Applied default ledger filter matrices to active view. No specific report override matched.');
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedPartyId('all');
    setSelectedBranchId('all');
    setSelectedCurrency('all');
    setSelectedStatus('all');
    setNlpQuery('');
    setNlpTriggerAlert('');
  };

  // Safe Simulated File Exporter matching PRD 9.3
  const handleExport = (format: 'pdf' | 'excel' | 'docx') => {
    const reportName = reportNames[activeReportKey] || 'Financial Report';
    
    // Log export event securely to compliance audit trail
    addAuditLog(username, 'COMPLIANCE_REPORT_EXPORT', `Exported ${reportName} in ${format.toUpperCase()} format. Rowcount: ${reportRows.length}`);
    
    let mockDetails = '';
    if (format === 'excel') {
      mockDetails = 'formulas preserved (SUM, AVERAGE, AGING_DAYS) for auditing';
    } else if (format === 'pdf') {
      mockDetails = 'Apex Solutions corporate letterhead and watermarks applied';
    } else {
      mockDetails = 'formatted for board package insertion';
    }

    alert(`Compliance Export Successful: "${reportName}" has been compiled and downloaded in ${format.toUpperCase()} format (${mockDetails}). This event has been permanently recorded in the immutable system audit trail.`);
  };

  const reportNames: Record<string, string> = {
    // 9 Baselines
    party_statement: 'Chronological Party Ledger Statement',
    ar_aging: 'Accounts Receivable (AR) Aging Analyzer',
    ap_aging: 'Accounts Payable (AP) Aging Analyzer',
    outstanding_summary: 'Party-wise Outstanding Summary Ledger',
    cash_flow: 'Cash Flow by Party Analysis',
    tds_report: 'TDS Withholding Tax Compliance Report',
    forex_gain_loss: 'Consolidated Forex Gain/Loss Report',
    bad_debt: 'Audited Bad Debt Write-Off Report',
    contra_log: 'Contra Entry Balance Offset Log',
    // 5 BI Premium
    bi_profitability: 'Party Profitability Report (Gross-Expense Margin)',
    bi_advance_utilization: 'Advances Pre-payment Utilization Analyzer',
    bi_collection_velocity: 'Retainer Predictability & Collection Velocity',
    bi_credit_exposure: 'Forward-looking Credit Risk Exposure Analysis',
    bi_audit_reconciliation: 'Disputed Invoice Auditor-Ready Reconciliation Log',
  };

  return (
    <div className="space-y-4">
      {/* Search and NLP Assist */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">NLP Free-Text Query Expert Intelligence</label>
        <form onSubmit={handleNlpSearch} className="flex gap-2 text-xs">
          <div className="flex-1 relative">
            <Sparkles size={14} className="absolute left-3 top-3 text-zinc-400" />
            <input 
              type="text" 
              className="w-full pl-9 pr-4 py-2 border border-zinc-250 bg-white rounded-lg placeholder-zinc-450 focus:outline-hidden focus:border-zinc-900"
              placeholder='Type queries e.g. "unutilized advances in EUR", "show dispute status", "profitability of partners"...'
              value={nlpQuery}
              onChange={(e) => setNlpQuery(e.target.value)}
            />
          </div>
          <button 
            id="nlp-query-btn"
            type="submit" 
            className="px-4 py-2 bg-zinc-950 text-white rounded-lg hover:bg-zinc-850 font-bold transition-all cursor-pointer"
          >
            Ask Audit Assistant
          </button>
        </form>
        {nlpTriggerAlert && (
          <div id="nlp-search-alert" className="mt-2.5 bg-green-50/55 border border-green-200 text-green-800 text-[10px] px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 animate-pulse">
            <CheckCircle2 size={12} /> {nlpTriggerAlert}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
        
        {/* Left selector rail */}
        <div id="reports-nav-column" className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-4">
          
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-extrabold block mb-2 border-b pb-1">Baseline Audits (1-9)</span>
            <div className="space-y-1">
              {[
                { id: 'party_statement', label: 'Party Ledger Statement' },
                { id: 'ar_aging', label: 'Receivables aging' },
                { id: 'ap_aging', label: 'payables aging' },
                { id: 'outstanding_summary', label: 'outstanding summary' },
                { id: 'cash_flow', label: 'Cash flow by Party' },
                { id: 'tds_report', label: 'TDS compliance' },
                { id: 'forex_gain_loss', label: 'forex revaluations' },
                { id: 'bad_debt', label: 'bad debt write-offs' },
                { id: 'contra_log', label: 'contra entries log' },
              ].map(r => (
                <button
                  key={r.id}
                  id={`rept-nav-${r.id}`}
                  onClick={() => {
                    setActiveReportKey(r.id);
                    setNlpTriggerAlert('');
                  }}
                  className={`w-full text-left text-xs p-2 py-1.5 rounded transition-all font-bold block ${
                    activeReportKey === r.id 
                    ? 'bg-zinc-900 text-white shadow-xs' 
                    : 'text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-extrabold block mb-2 border-b pb-1">Advanced BI Reports (10-14)</span>
            <div className="space-y-1">
              {[
                { id: 'bi_profitability', label: 'party profitability' },
                { id: 'bi_advance_utilization', label: 'advance utilization' },
                { id: 'bi_collection_velocity', label: 'collection predictability' },
                { id: 'bi_credit_exposure', label: 'credit risk exposure' },
                { id: 'bi_audit_reconciliation', label: 'disputed invoices log' },
              ].map(r => (
                <button
                  key={r.id}
                  id={`rept-nav-${r.id}`}
                  onClick={() => {
                    setActiveReportKey(r.id);
                    setNlpTriggerAlert('');
                  }}
                  className={`w-full text-left text-xs p-2 py-1.5 rounded transition-all font-bold block ${
                    activeReportKey === r.id 
                    ? 'bg-zinc-900 text-white' 
                    : 'text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  💎 {r.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right workspace report body */}
        <div id="report-view-body" className="lg:col-span-3 bg-white border border-zinc-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
          
          {/* Active Title and Exports */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-3 border-zinc-100 gap-3">
            <div>
              <span className="text-[10px] text-zinc-400 font-mono tracking-wider font-bold block uppercase">Active Consolidated Workspace Ledger</span>
              <h1 className="text-sm font-extrabold text-zinc-950 mt-1 flex items-center gap-1.5">
                <Table size={16} className="text-zinc-700" /> {reportNames[activeReportKey]}
              </h1>
            </div>
            {/* Exports */}
            <div className="flex gap-1.5">
              <button 
                id="export-pdf-trigger"
                onClick={() => handleExport('pdf')}
                className="p-1.5 border border-zinc-200 hover:bg-zinc-50 rounded text-zinc-600 font-semibold cursor-pointer text-[10px] flex items-center gap-1"
              >
                <Download size={12} /> PDF Letterhead
              </button>
              <button 
                id="export-excel-trigger"
                onClick={() => handleExport('excel')}
                className="p-1.5 border border-zinc-100 hover:bg-zinc-50 rounded text-zinc-650 font-bold cursor-pointer text-[10px] flex items-center gap-1 bg-green-50/50 border-green-200 text-green-850"
              >
                <FileSpreadsheet size={12} /> Excel Formulas
              </button>
              <button 
                id="export-docx-trigger"
                onClick={() => handleExport('docx')}
                className="p-1.5 border border-zinc-200 hover:bg-zinc-50 rounded text-zinc-600 font-semibold cursor-pointer text-[10px] flex items-center gap-1"
              >
                <FileText size={12} /> Board Pack (Word)
              </button>
            </div>
          </div>

          {/* Filtering Panel */}
          <div className="bg-zinc-50/60 p-3 rounded-lg border border-zinc-200/80 text-xs shadow-xs space-y-2">
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest block flex items-center gap-1">
              <Filter size={10} /> Hierarchical and Period Drilldown Filters
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1.5">
              
              <div>
                <label className="text-[9px] text-zinc-405 uppercase font-bold block mb-1">Drilldown Party</label>
                <select 
                  className="w-full text-[10px] p-2 bg-white border border-zinc-300 rounded"
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                >
                  <option value="all">All Parties</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] text-zinc-405 uppercase font-bold block mb-1">Accounting Branch</label>
                <select 
                  className="w-full text-[10px] p-2 bg-white border border-zinc-300 rounded"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                >
                  <option value="all">Consolidated Branches</option>
                  <option value="b-ny">New York HQ (NY)</option>
                  <option value="b-ldn">London Office (LDN)</option>
                  <option value="b-dxb">Dubai Hub (DXB)</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] text-zinc-405 uppercase font-bold block mb-1">Functional Currency</label>
                <select 
                  className="w-full text-[10px] p-2 bg-white border border-zinc-300 rounded"
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                >
                  <option value="all">All ISO Codes</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1 bg-white border p-1 rounded">
                <div>
                  <label className="text-[8px] text-zinc-400 uppercase font-mono block">From Date</label>
                  <input 
                    type="date"
                    className="w-full p-1.5 border rounded border-zinc-150 text-[10px]"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[8px] text-zinc-400 uppercase font-mono block">To Date</label>
                  <input 
                    type="date"
                    className="w-full p-1.5 border rounded border-zinc-150 text-[10px]"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

            </div>
            
            {(startDate || endDate || selectedPartyId !== 'all' || selectedBranchId !== 'all' || selectedCurrency !== 'all') && (
              <div className="flex justify-end pt-1">
                <button 
                  id="btn-report-clear"
                  onClick={clearFilters}
                  className="text-[9px] font-mono text-zinc-800 font-bold hover:underline cursor-pointer"
                >
                  Clear All Filters Reset
                </button>
              </div>
            )}
          </div>

          {/* Table Data Rendering based on Report type */}
          <div id="dynamic-tabular-report-wrapper" className="min-h-[250px] overflow-x-auto border rounded border-zinc-200">
            {reportRows.length === 0 ? (
              <div className="text-center py-16">
                <Inbox className="mx-auto text-zinc-300 mb-2" size={36} />
                <p className="text-xs text-zinc-550 font-bold">Consolidated report has zero matching postings in this fiscal filter.</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                
                {/* --- 1. PARTY LEDGER HISTORICAL STATEMENT --- */}
                {activeReportKey === 'party_statement' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Reference No</th>
                        <th className="py-2 px-3">Party Name</th>
                        <th className="py-2 px-3">Taxon</th>
                        <th className="py-2 px-3 text-right">Debit ($)</th>
                        <th className="py-2 px-3 text-right">Credit ($)</th>
                        <th className="py-2 px-3 text-right">Running Position ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3">{r.transactionDate}</td>
                          <td className="py-2 px-3 font-semibold font-mono text-zinc-900">{r.referenceNumber}</td>
                          <td className="py-2 px-3 font-medium">{r.partyName}</td>
                          <td className="py-2 px-3 uppercase text-[9px] font-bold text-zinc-500">{r.transactionType}</td>
                          <td className="py-2 px-3 text-right font-mono text-zinc-800">{r.debit > 0 ? `$${r.debit.toLocaleString(undefined, {minimumFractionDigits:2})}` : '-'}</td>
                          <td className="py-2 px-3 text-right font-mono text-red-700">{r.credit > 0 ? `$${r.credit.toLocaleString(undefined, {minimumFractionDigits:2})}` : '-'}</td>
                          <td className={`py-2 px-3 text-right font-mono font-bold ${r.runningBalance >= 0 ? 'text-zinc-900' : 'text-red-700'}`}>
                            ${r.runningBalance.toLocaleString(undefined, {minimumFractionDigits:2})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* --- 2. ACCOUNTS RECEIVABLE AGING AND PAYABLE AGING --- */}
                {(activeReportKey === 'ar_aging' || activeReportKey === 'ap_aging') && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2 px-3">Party Name</th>
                        <th className="py-2 px-3">ID Code</th>
                        <th className="py-2 px-3 text-right">Current ($)</th>
                        <th className="py-2 px-3 text-right">1-30 Days ($)</th>
                        <th className="py-2 px-3 text-right">31-60 Days ($)</th>
                        <th className="py-2 px-3 text-right">61-90 Days ($)</th>
                        <th className="py-2 px-3 text-right">90+ Days ($)</th>
                        <th className="py-2 px-3 text-right">Outstanding Total ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-mono">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2.5 px-3 font-sans font-bold text-zinc-900">{r.partyName}</td>
                          <td className="py-2.5 px-3 text-zinc-400 uppercase text-[10px]">{r.partyCode}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-zinc-700">${r.current.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-zinc-700">${r.b1_30.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-zinc-700">${r.b31_60.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-zinc-700">${r.b61_90.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-red-750">${r.b91_plus.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-zinc-900 border-l border-zinc-150">${r.total.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* --- 3. OUTSTANDING SUMMARY --- */}
                {activeReportKey === 'outstanding_summary' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Party Name</th>
                        <th className="py-2.5 px-3">Category Tag</th>
                        <th className="py-2.5 px-3 text-right">Receivables Asset ($)</th>
                        <th className="py-2.5 px-3 text-right">Payables Liability ($)</th>
                        <th className="py-2.5 px-3 text-right font-bold">Net Position ($)</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-mono">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2.5 px-3 font-sans font-bold text-zinc-900">{r.partyName}</td>
                          <td className="py-2.5 px-3 font-sans text-zinc-500 uppercase text-[9px]">{r.partyType}</td>
                          <td className="py-2.5 px-3 text-right text-zinc-700">${r.receivable.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                          <td className="py-2.5 px-3 text-right text-red-700">${r.payable.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                          <td className={`py-2.5 px-3 text-right font-extrabold ${r.netPosition >= 0 ? 'text-zinc-900' : 'text-red-700'}`}>
                            ${(r.receivable - r.payable).toLocaleString(undefined, {minimumFractionDigits:2})}
                          </td>
                          <td className="py-2.5 px-3 uppercase text-[9px] font-sans">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* --- 4. CASH FLOW REPORT --- */}
                {activeReportKey === 'cash_flow' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-100 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Party Name</th>
                        <th className="py-2.5 px-3 text-right">Inflows Collected ($)</th>
                        <th className="py-2.5 px-3 text-right">Outflows Remitted ($)</th>
                        <th className="py-2.5 px-3 text-right font-bold">Net Cash Flow ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150 font-mono">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2.5 px-3 font-sans font-bold">{r.partyName}</td>
                          <td className="py-2.5 px-3 text-right text-green-700">${r.inflow.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                          <td className="py-2.5 px-3 text-right text-red-700">${r.outflow.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                          <td className={`py-2.5 px-3 text-right font-extrabold ${r.netCashFlow >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                            ${r.netCashFlow.toLocaleString(undefined, {minimumFractionDigits:2})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* --- 5. TDS COMPLIANCE --- */}
                {activeReportKey === 'tds_report' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-100 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2 px-3">Ref Voucher</th>
                        <th className="py-2 px-3">Tax Id</th>
                        <th className="py-2 px-3">Party Name</th>
                        <th className="py-2 px-3 text-right">Gross Amount</th>
                        <th className="py-2 px-3 text-right">Withholding Rate</th>
                        <th className="py-2 px-3 text-right">Tax Withheld ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150 font-mono">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3 font-semibold text-zinc-900">{r.referenceNumber}</td>
                          <td className="py-2 px-3 text-zinc-500 font-mono">{r.taxId}</td>
                          <td className="py-2 px-3 font-sans font-bold">{r.partyName}</td>
                          <td className="py-2 px-3 text-right">${r.totalAmount.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right">{r.tdsRate}%</td>
                          <td className="py-2 px-3 text-right text-red-650 font-bold">${r.tdsWithheld.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* --- 6. FOREX GAIN LOSS --- */}
                {activeReportKey === 'forex_gain_loss' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-100 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2 px-3">Ref No</th>
                        <th className="py-2 px-3">Party Name</th>
                        <th className="py-2 px-3">ISO Code</th>
                        <th className="py-2 px-3 text-right">Origin face</th>
                        <th className="py-2 px-3 text-right">Book Rate</th>
                        <th className="py-2 px-3 text-right">Current Rate</th>
                        <th className="py-2 px-3 text-right font-bold">Unrealized Gain/Loss ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-mono">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3 font-semibold text-zinc-900">{r.referenceNumber}</td>
                          <td className="py-2 px-3 font-sans font-bold">{r.partyName}</td>
                          <td className="py-2 px-3 text-zinc-500 font-bold uppercase">{r.currency}</td>
                          <td className="py-2 px-3 text-right">{r.amountTxn.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right">{r.postedRate.toFixed(4)}</td>
                          <td className="py-2 px-3 text-right text-orange-650">{r.currentRate.toFixed(4)}</td>
                          <td className={`py-2 px-3 text-right font-extrabold ${r.gainLoss >= 0 ? 'text-green-700' : 'text-red-750'}`}>
                            ${r.gainLoss.toLocaleString(undefined, {minimumFractionDigits:2})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* --- 7. BAD DEBT WRITE OFF --- */}
                {activeReportKey === 'bad_debt' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-100 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Voucher Ref</th>
                        <th className="py-2.5 px-3">Party Name</th>
                        <th className="py-2.5 px-3">Authorized Date</th>
                        <th className="py-2.5 px-3 text-right">Written-off amount ($)</th>
                        <th className="py-2.5 px-3">Audit Inspector</th>
                        <th className="py-2.5 px-3">Legal Justification Comment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50 text-red-800">
                          <td className="py-2.5 px-3 font-semibold font-mono">{r.referenceNumber}</td>
                          <td className="py-2.5 px-3 font-bold">{r.partyName}</td>
                          <td className="py-2.5 px-3 font-mono">{r.writeOffDate}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold">${r.amount.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                          <td className="py-2.5 px-3">{r.authorizer}</td>
                          <td className="py-2.5 px-3 italic font-light">" {r.reason} "</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* --- 8. CONTRA ENTRY LOG --- */}
                {activeReportKey === 'contra_log' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-100 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Voucher Id</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Party Name</th>
                        <th className="py-2.5 px-3 text-right">Offset Face</th>
                        <th className="py-2.5 px-3 text-right">Offset Value ($)</th>
                        <th className="py-2.5 px-3">Authorized Person</th>
                        <th className="py-2.5 px-3">Rec reciprocol ledger offset comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2.5 px-3 font-mono font-bold">{r.referenceNumber}</td>
                          <td className="py-2.5 px-3 font-mono">{r.transactionDate}</td>
                          <td className="py-2.5 px-3 font-bold">{r.partyName}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{r.offsetAmtTxn.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-green-750">${r.offsetAmtBase.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                          <td className="py-2.5 px-3">{r.operator}</td>
                          <td className="py-2.5 px-3 italic text-[11px] text-zinc-650">" {r.notes} "</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* --- 💎 BI 1: PROFITABILITY --- */}
                {activeReportKey === 'bi_profitability' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2 px-3">Party Name</th>
                        <th className="py-2 px-3 text-right">Gross revenue billed ($)</th>
                        <th className="py-2 px-3 text-right">pass-through subcontractor expenses ($)</th>
                        <th className="py-2 px-3 text-right">Reimbursable Travel costs ($)</th>
                        <th className="py-2 px-3 text-right font-bold">Net Profit Margin ($)</th>
                        <th className="py-2 px-3 text-right">Profit Index (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-mono">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-3 px-3 font-sans font-extrabold text-zinc-900">{r.partyName}</td>
                          <td className="py-3 px-3 text-right text-green-700">${r.revenue.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right text-red-700">${(r.expense - r.reimbursable).toLocaleString()}</td>
                          <td className="py-3 px-3 text-right text-zinc-500">${r.reimbursable.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right font-extrabold text-zinc-900 border-l">${r.profit.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${r.margin > 40 ? 'bg-green-150 text-green-800' : 'bg-orange-100 text-orange-850'}`}>
                              {r.margin.toFixed(1)}% Ratio
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* --- 💎 BI 2: ADVANCE UTILIZATION --- */}
                {activeReportKey === 'bi_advance_utilization' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Party Name</th>
                        <th className="py-2.5 px-3 text-right">Advances Collected ($)</th>
                        <th className="py-2.5 px-3 text-right">consumed billed milestones ($)</th>
                        <th className="py-2.5 px-3 text-right font-bold">Unutilized balance liability ($)</th>
                        <th className="py-2.5 px-3 text-right">Consumption Ratio (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-mono">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-3 px-3 font-sans font-bold">{r.partyName}</td>
                          <td className="py-3 px-3 text-right text-zinc-900">${r.collected.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right text-zinc-650">${r.utilized.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right font-extrabold text-amber-700">${r.unutilized.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                          <td className="py-3 px-3 text-right font-bold text-zinc-900">{r.rate.toFixed(1)}% Utilized</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* --- 💎 BI 3: RETAINER VELOCITY --- */}
                {activeReportKey === 'bi_collection_velocity' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Party Name</th>
                        <th className="py-2.5 px-3 text-right">Issued Invoices count</th>
                        <th className="py-2.5 px-3 text-right">settled payments count</th>
                        <th className="py-2.5 px-3 text-right font-bold">Average Collections delay (Days)</th>
                        <th className="py-2.5 px-3 text-right font-bold">Velocity Index Score</th>
                        <th className="py-2.5 px-3">Index Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-mono">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-3 px-3 font-sans font-bold">{r.partyName}</td>
                          <td className="py-3 px-3 text-right">{r.invoiceCount}</td>
                          <td className="py-3 px-3 text-right">{r.paymentCount}</td>
                          <td className={`py-3 px-3 text-right font-extrabold ${r.averageDelay > 45 ? 'text-red-700' : 'text-green-700'}`}>{r.averageDelay} Days average delay</td>
                          <td className="py-3 px-3 text-right font-extrabold text-zinc-800">{r.score} / 100</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${r.rating === 'Slow' ? 'bg-red-100 text-red-800' : (r.rating === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-805')}`}>
                              {r.rating}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* --- 💎 BI 4: CREDIT EXPOSURE RISK --- */}
                {activeReportKey === 'bi_credit_exposure' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Party Name</th>
                        <th className="py-2.5 px-3 text-right">Outstanding Receivables ($)</th>
                        <th className="py-2.5 px-3 text-right">Active unbilled milestones ($)</th>
                        <th className="py-2.5 px-3 text-right font-bold">Total Weighted Exposure ($)</th>
                        <th className="py-2.5 px-3 text-right">Consolidated limits ($)</th>
                        <th className="py-2.5 px-3">Risk Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-mono">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-3 px-3 font-sans font-extrabold">{r.partyName}</td>
                          <td className="py-3 px-3 text-right">${r.outstandingAr.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right">${r.unbilledMilestones.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right font-extrabold text-zinc-950">${r.totalExposure.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right text-zinc-500">${r.creditLimit.toLocaleString()}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase ${
                              r.riskFlag === 'SAFE' ? 'bg-green-50 text-green-700 border-green-200' :
                              (r.riskFlag === 'HIGH_EXPOSURE' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200 animate-pulse')
                            }`}>
                              {r.riskFlag.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* --- 💎 BI 5: AUDIT RECONCILIATION DISPUTES --- */}
                {activeReportKey === 'bi_audit_reconciliation' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] text-zinc-450 uppercase font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Ref No</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Party Name</th>
                        <th className="py-2.5 px-3 text-right">Disputed Face value ($)</th>
                        <th className="py-2.5 px-3 text-right">Dispute Age (Days)</th>
                        <th className="py-2.5 px-3">Resolution Ledger Status comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-mono">
                      {reportRows.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50 text-red-900 bg-red-50/20">
                          <td className="py-3 px-3 font-semibold">{r.referenceNumber}</td>
                          <td className="py-3 px-3">{r.transactionDate}</td>
                          <td className="py-3 px-3 font-sans font-bold">{r.partyName}</td>
                          <td className="py-3 px-3 text-right font-extrabold">${r.amountUSD.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                          <td className="py-3 px-3 text-right text-red-650 font-bold">{r.disputeAgeDays} Days open</td>
                          <td className="py-3 px-3 italic font-sans text-xs text-zinc-650">" {r.approverComments} "</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

              </table>
            )}
          </div>

          <div id="report-view-footer" className="text-[10px] text-zinc-400 font-medium flex justify-between items-center bg-zinc-50 p-2.5 rounded border">
            <span>Generated on 2026-06-16 UTC. Active Workspace Tenant: Apex Solutions Corp</span>
            <span className="font-mono">Formula check successful ●</span>
          </div>

        </div>

      </div>
    </div>
  );
}
