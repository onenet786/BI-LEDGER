/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  getParties, 
  getTransactions, 
  addParty, 
  getAuditLogs, 
  initializeDatabase,
  getTenantSettings,
  syncWithServer,
  getDbInfo
} from './ledgerService';
import { Party, Transaction, AuditLog, TenantSettings } from './types';
import Dashboard from './components/Dashboard';
import PartyProfile from './components/PartyProfile';
import TransactionForm from './components/TransactionForm';
import Reports from './components/Reports';
import TenantSettingsComponent from './components/TenantSettings';

import { 
  BookOpen, 
  Building2, 
  Database, 
  LayoutDashboard, 
  FolderSync, 
  FileSpreadsheet, 
  PlusCircle, 
  Sliders, 
  UserSquare2, 
  Bell, 
  Menu, 
  X,
  Plus,
  ShieldCheck,
  Briefcase,
  Layers,
  Search,
  CheckCircle,
  HelpCircle,
  UserCheck
} from 'lucide-react';

export default function App() {
  // Database Initializer
  useEffect(() => {
    async function init() {
      await syncWithServer();
      triggerRefresh();
    }
    init();
  }, []);

  // System States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'directory' | 'post-txn' | 'reports' | 'settings' | 'audit_logs'>('dashboard');
  const [activeRole, setActiveRole] = useState<string>('Super Admin'); 
  const [username, setUsername] = useState<string>('Super Admin User');
  
  // Drilldowns State
  const [drilldownPartyId, setDrilldownPartyId] = useState<string | null>(null);

  // Synchronization Refresh Flags
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Standard entities state
  const [parties, setParties] = useState<Party[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null);

  // New Party Creator Form Modal States
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [partyCode, setPartyCode] = useState('');
  const [partyType, setPartyType] = useState<'client' | 'vendor' | 'both'>('client');
  const [partyTaxId, setPartyTaxId] = useState('');
  const [partyCreditLimit, setPartyCreditLimit] = useState('50000');
  const [partyPaymentDays, setPartyPaymentDays] = useState('30');
  const [directorySearch, setDirectorySearch] = useState('');

  useEffect(() => {
    setParties(getParties());
    setTransactions(getTransactions());
    setAuditLogs(getAuditLogs());
    setTenantSettings(getTenantSettings());
  }, [refreshTrigger, activeTab]);

  const loadEntities = () => {
    setParties(getParties());
    setTransactions(getTransactions());
    setAuditLogs(getAuditLogs());
    setTenantSettings(getTenantSettings());
  };

  // Adjust Username based on role profiles
  const handleRoleChange = (role: string) => {
    setActiveRole(role);
    setDrilldownPartyId(null); // Reset drilldowns upon identity shifts
    
    if (role === 'Super Admin') setUsername('Super Admin User');
    else if (role === 'Finance Manager') setUsername('Finance Manager Accountant');
    else if (role === 'Data Entry Operator') setUsername('Data Entry Operator');
    else if (role === 'Auditor / Read-Only') setUsername('External Audit Inspector');
    else if (role === 'Client Portal User') setUsername('Acme Corporate Agent');
    else if (role === 'Executive / C-Suite') setUsername('Executive CFO');

    // Force client portal routing to specific party isolated
    if (role === 'Client Portal User') {
      setActiveTab('directory');
      setDrilldownPartyId('p-acme'); // Hardlock portal view strictly to Acme client profile
    } else {
      setActiveTab('dashboard');
    }
  };

  const clearDatabaseSim = () => {
    if (window.confirm('Are you absolutely sure you want to reset the entire database workspace? All manually posted ledger entries, custom branches, and fields will be cleared and replaced with fresh, mathematically aligned seed values.')) {
      initializeDatabase(true);
      setTimeout(() => {
        syncWithServer().then(() => triggerRefresh());
      }, 500);
      setActiveTab('dashboard');
      setDrilldownPartyId(null);
      alert('Workspace reset successfully.');
    }
  };

  const handleAddPartySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName || !partyCode) return;

    addParty({
      name: partyName,
      code: partyCode.toUpperCase(),
      type: partyType,
      status: 'active',
      baseCurrency: tenantSettings?.baseCurrency || 'USD',
      taxId: partyTaxId,
      creditLimit: parseFloat(partyCreditLimit) || 0,
      paymentTermsDays: parseInt(partyPaymentDays) || 0,
      contacts: [],
      projects: [],
      documents: [],
      auditNotes: [
        {
          id: 'note-init-' + Date.now(),
          timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
          user: username,
          message: 'Established new directory record.'
        }
      ],
      customFields: {}
    }, username);

    // reset fields
    setPartyName('');
    setPartyCode('');
    setPartyType('client');
    setPartyTaxId('');
    setPartyCreditLimit('50000');
    setPartyPaymentDays('30');
    setShowAddPartyModal(false);

    triggerRefresh();
  };

  // Compute stats for alert bell markers
  const pendingApprovalsCount = transactions.filter(t => t.status === 'pending_approval').length;

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col font-sans selection:bg-zinc-950 selection:text-white">
      
      {/* Top Main Navigation Header Bar */}
      <header className="bg-zinc-950 text-white border-b border-zinc-800 shrink-0 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded text-zinc-950 font-black tracking-tighter text-sm flex items-center gap-1 shadow-inner">
              <Database size={16} /> LEDGER
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Service Enterprise SaaS</span>
              <span className="text-xs font-semibold text-white tracking-tight leading-3">Party Ledger Intelligence Engine</span>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="hidden lg:flex items-center gap-4 text-xs select-none">
            <div className="border-l border-zinc-700 pl-4">
              <span className="text-[9px] text-zinc-500 uppercase block">Active Workspace</span>
              <span className="font-bold text-zinc-200">{tenantSettings?.name || 'Apex Solutions'}</span>
            </div>
            <div className="border-l border-zinc-700 pl-4">
              <span className="text-[9px] text-zinc-500 uppercase block">Consolidated Base</span>
              <span className="font-mono font-black text-zinc-200">{tenantSettings?.baseCurrency || 'USD'}</span>
            </div>
            {(() => {
              const dbInfo = getDbInfo();
              return dbInfo ? (
                <div className="border-l border-zinc-700 pl-4 flex items-center gap-1.5" title={`Connected to ${dbInfo.user}@${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`}>
                  <Database size={12} className={dbInfo.connected ? "text-emerald-400 animate-pulse" : "text-rose-400"} />
                  <div className="text-left font-sans">
                    <span className="text-[9px] text-zinc-500 uppercase block">Ledger Database</span>
                    <span className="font-bold text-zinc-200 flex items-center gap-1 text-[11px] font-mono leading-none">
                      {dbInfo.connected ? dbInfo.database : 'Fallback (In-Memory)'}
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${dbInfo.connected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                    </span>
                  </div>
                </div>
              ) : null;
            })()}
            {pendingApprovalsCount > 0 && (activeRole === 'Finance Manager' || activeRole === 'Super Admin') && (
              <div 
                onClick={() => {
                  setActiveTab('dashboard');
                  setDrilldownPartyId(null);
                }}
                className="bg-amber-900/40 hover:bg-amber-900/60 border border-amber-800 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1.5 cursor-pointer animate-pulse"
              >
                <Bell size={12} /> {pendingApprovalsCount} Auth Required
              </div>
            )}
          </div>

          {/* User Role Switcher - Critical PRD Requirement */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-900 border border-zinc-850 p-1 px-2.5 rounded-lg text-xs gap-1.5 shadow-2xs">
              <UserCheck size={14} className="text-zinc-400 font-semibold" />
              <div className="text-left leading-tight">
                <span className="text-[8px] text-zinc-500 uppercase block">Active persona</span>
                <select 
                  id="header-role-switcher"
                  className="bg-transparent text-white font-bold pr-1 py-0.5 max-w-[150px] outline-hidden cursor-pointer"
                  value={activeRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="Super Admin" className="text-zinc-950">Super Admin (Continuous control)</option>
                  <option value="Finance Manager" className="text-zinc-950">Finance Manager (Checker auth)</option>
                  <option value="Data Entry Operator" className="text-zinc-950">Data Entry Operator (Maker draft)</option>
                  <option value="Auditor / Read-Only" className="text-zinc-950">Auditor / Read-Only (Auditable locks)</option>
                  <option value="Client Portal User" className="text-zinc-950">Client Portal User (Isolated Acme)</option>
                  <option value="Executive / C-Suite" className="text-zinc-950">Executive / C-Suite (BI Widgets)</option>
                </select>
              </div>
            </div>

            <button 
              id="header-btn-reset-db"
              onClick={clearDatabaseSim}
              className="px-2.5 py-2 hover:bg-zinc-800 rounded border border-zinc-700 font-bold text-[10px] text-zinc-300 cursor-pointer transition text-center uppercase"
              title="Reset workspace demo database"
            >
              Reset Seed
            </button>
          </div>

        </div>
      </header>

      {/* Primary tab switcher */}
      {activeRole !== 'Client Portal User' && (
        <nav className="bg-white border-b border-zinc-200 shadow-3xs shrink-0 z-30">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap gap-1 text-xs">
            {[
              { id: 'dashboard', label: 'Dashboard Hub', icon: LayoutDashboard },
              { id: 'directory', label: 'Party Registry', icon: Briefcase },
              { id: 'post-txn', label: 'Post Transaction', icon: PlusCircle },
              { id: 'reports', label: 'Financial Intelligence', icon: FileSpreadsheet },
              { id: 'settings', label: 'workspace Settings', icon: Sliders },
              { id: 'audit_logs', label: 'system audit logs', icon: Layers },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              // Hide certain menus if user restricts
              if (activeRole === 'Executive / C-Suite' && (tab.id === 'post-txn' || tab.id === 'settings' || tab.id === 'audit_logs')) return null;
              if (activeRole === 'Auditor / Read-Only' && (tab.id === 'post-txn' || tab.id === 'settings')) return null;
              if (activeRole === 'Data Entry Operator' && (tab.id === 'settings' || tab.id === 'audit_logs')) return null;

              return (
                <button
                  key={tab.id}
                  id={`nav-tab-btn-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setDrilldownPartyId(null);
                  }}
                  className={`px-4 py-3 font-extrabold flex items-center gap-1.5 border-b-2 cursor-pointer transition-all ${
                    isActive 
                    ? 'border-zinc-950 text-zinc-950 bg-neutral-50' 
                    : 'border-transparent text-zinc-550 hover:text-zinc-900 hover:bg-neutral-50'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main Container Workspace */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto self-stretch">
        
        {/* --- ROUTING SHIFT A: PARTY 360° PROFILE DRILLDOWN --- */}
        {drilldownPartyId ? (
          <PartyProfile 
            partyId={drilldownPartyId}
            activeRole={activeRole}
            username={username}
            refreshTrigger={refreshTrigger}
            triggerRefresh={triggerRefresh}
            onBack={() => {
              if (activeRole === 'Client Portal User') return; // restrict exit
              setDrilldownPartyId(null);
              setActiveTab('directory');
            }}
          />
        ) : (
          <>
            
            {/* --- CORE TAB: DASHBOARD --- */}
            {activeTab === 'dashboard' && (
              <Dashboard 
                activeRole={activeRole}
                username={username}
                refreshTrigger={refreshTrigger}
                triggerRefresh={triggerRefresh}
                onNavigateToParty={(id) => {
                  setDrilldownPartyId(id);
                }}
                onNavigateToReports={(reportKey) => {
                  setActiveTab('reports');
                }}
                onNavigateToNewTx={() => {
                  setActiveTab('post-txn');
                }}
              />
            )}

            {/* --- CORE TAB: PARTY DIRECTORY REGISTRY --- */}
            {activeTab === 'directory' && (
              <div className="space-y-4">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-3 border-zinc-200 gap-3">
                  <div>
                    <h1 className="text-lg font-bold text-zinc-950">Registered Party Directory Ledger</h1>
                    <p className="text-xs text-zinc-500">Add, configure, and inspect individual client and subcontractor balance records.</p>
                  </div>
                  
                  {/* Register New Party Trigger */}
                  {(activeRole === 'Super Admin' || activeRole === 'Finance Manager') && (
                    <button 
                      id="btn-add-party-modal-trigger"
                      onClick={() => setShowAddPartyModal(true)}
                      className="px-4 py-2 bg-zinc-950 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 cursor-pointer transition-all flex items-center gap-1 object-cover"
                    >
                      <Plus size={14} /> Register New Party
                    </button>
                  )}
                </div>

                {/* Directory Search and Quick count */}
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pb-1">
                  <div className="flex-1 max-w-md relative">
                    <Search size={14} className="absolute left-3 top-3 text-zinc-400" />
                    <input 
                      type="text" 
                      placeholder="Filter directory list by name, code, or risk rating..."
                      className="w-full bg-white pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-hidden focus:border-zinc-500"
                      value={directorySearch}
                      onChange={(e) => setDirectorySearch(e.target.value)}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-bold">Consolidated Directory Count: {parties.length} parties</span>
                </div>

                {/* Grid List matching directorySearch */}
                <div id="parties-directories-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {parties
                    .filter(p => p.name.toLowerCase().includes(directorySearch.toLowerCase()) || p.code.toLowerCase().includes(directorySearch.toLowerCase()) || p.status.toLowerCase().includes(directorySearch.toLowerCase()))
                    .map(p => {
                      const riskRating = p.customFields['party-risk-rating'] || 'Low';
                      
                      return (
                        <div key={p.id} id={`party-dir-item-${p.id}`} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-32xs hover:shadow-xs transition duration-200 flex flex-col justify-between min-h-[170px]">
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] text-zinc-400 uppercase font-mono font-extrabold">{p.code}</span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                                riskRating === 'Low' ? 'bg-green-50 text-green-700 border-green-200':
                                (riskRating === 'Critical' ? 'bg-red-50 text-red-705 border-red-200 animate-pulse':'bg-zinc-50 text-zinc-650')
                              }`}>
                                {riskRating} Risk
                              </span>
                            </div>
                            <h3 className="font-bold text-zinc-950 text-sm mt-1.5 tracking-tight">{p.name}</h3>
                            <span className="text-[10px] text-zinc-400 uppercase block mt-1.5 font-medium">Type: {p.type} | Currency: {p.baseCurrency}</span>
                          </div>

                          <div className="border-t border-zinc-100 pt-3 mt-4 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[9px] text-zinc-400 block uppercase">Terms limit</span>
                              <span className="font-bold text-zinc-800">{p.paymentTermsDays} Days</span>
                            </div>
                            <button
                              id={`party-profile-nav-btn-${p.id}`}
                              onClick={() => {
                                setDrilldownPartyId(p.id);
                              }}
                              className="px-3.5 py-1.5 bg-zinc-950 text-white rounded hover:bg-zinc-800 font-extrabold text-[10px] cursor-pointer shadow-32xs flex items-center gap-1"
                            >
                              Inspect 360° Profile <ChevronRight size={10} className="w-1.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

              </div>
            )}

            {/* --- CORE TAB: POST TRANSACTION Taxonomy Form --- */}
            {activeTab === 'post-txn' && (
              <div className="max-w-3xl mx-auto">
                <TransactionForm 
                  username={username}
                  refreshTrigger={refreshTrigger}
                  triggerRefresh={triggerRefresh}
                  onSuccess={() => {
                    setActiveTab('dashboard');
                  }}
                  onCancel={() => {
                    setActiveTab('dashboard');
                  }}
                />
              </div>
            )}

            {/* --- CORE TAB: INTELLIGENCE REPORTS CENTER --- */}
            {activeTab === 'reports' && (
              <Reports 
                username={username}
                refreshTrigger={refreshTrigger}
              />
            )}

            {/* --- CORE TAB: WORKSPACE SETTINGS CONFIGURATION --- */}
            {activeTab === 'settings' && (
              <TenantSettingsComponent 
                username={username}
                refreshTrigger={refreshTrigger}
                triggerRefresh={triggerRefresh}
              />
            )}

            {/* --- CORE TAB: SECURE AUDIT LOG TIMELINE --- */}
            {activeTab === 'audit_logs' && (
              <div className="space-y-4">
                <div className="border-b pb-2 flex justify-between items-center">
                  <div>
                    <h1 className="text-lg font-bold text-zinc-950">Workspace Security Auditing trail</h1>
                    <p className="text-xs text-zinc-500">Immutable, comprehensive audit log trace database of compliance interventions.</p>
                  </div>
                  <span className="bg-zinc-900 border text-white font-mono text-[9px] px-2 py-0.5 rounded-full font-bold">System integrity Verified ●</span>
                </div>

                <div className="bg-white border rounded-lg overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 text-[10px] text-zinc-400 border-b font-mono uppercase">
                          <th className="p-3">Logged Date</th>
                          <th className="p-3">User</th>
                          <th className="p-3">System Intervention</th>
                          <th className="p-3">Audit Details</th>
                          <th className="p-3">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-zinc-50">
                            <td className="p-3 font-mono font-bold text-zinc-400">{log.timestamp}</td>
                            <td className="p-3 font-semibold text-zinc-900">{log.username}</td>
                            <td className="p-3">
                              <span className="bg-neutral-100 text-neutral-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3 text-zinc-500 font-light">{log.details}</td>
                            <td className="p-3 font-mono text-zinc-400">{log.ipAddress}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </>
        )}

      </main>

      {/* --- RENDER PARTY REGISTRATION MODAL FORM --- */}
      {showAddPartyModal && (
        <div id="add-party-modal" className="fixed inset-0 bg-zinc-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border rounded-xl max-w-md w-full shadow-lg p-5 text-xs">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-zinc-950 text-sm">Register Workspace Party Profile</h3>
              <button 
                id="btn-add-party-modal-close"
                onClick={() => setShowAddPartyModal(false)}
                className="p-1 text-zinc-450 hover:text-black hover:bg-neutral-100 rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddPartySubmit} className="space-y-3.5">
              
              <div>
                <label className="text-[10px] text-zinc-400 font-bold block mb-1">Party legal corporate Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Acme Enterprise"
                  className="w-full p-2 border border-zinc-300 rounded text-xs"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">Corporate Unified Code *</label>
                  <input 
                    type="text" 
                    required 
                    maxLength={10}
                    placeholder="e.g. CLI-ACME"
                    className="w-full p-2 border border-zinc-300 rounded text-xs uppercase font-mono font-bold"
                    value={partyCode}
                    onChange={(e) => setPartyCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">Vessel direction Type</label>
                  <select
                    className="w-full p-2 border border-zinc-300 rounded text-xs bg-white"
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value as any)}
                  >
                    <option value="client">Client Only (Receivable)</option>
                    <option value="vendor">Vendor Only (Payable)</option>
                    <option value="both">Both (Dual role contra eligible)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">Credit limit (Consolidated $) *</label>
                  <input 
                    type="number" 
                    required 
                    className="w-full p-2 border border-zinc-300 text-xs text-zinc-900 rounded"
                    value={partyCreditLimit}
                    onChange={(e) => setPartyCreditLimit(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">Payment grace Days *</label>
                  <input 
                    type="number" 
                    required 
                    className="w-full p-2 border border-zinc-300 text-xs text-zinc-900 rounded"
                    value={partyPaymentDays}
                    onChange={(e) => setPartyPaymentDays(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-bold block mb-1">Tax compliance Identifier ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. US-9910"
                  className="w-full p-2 border border-zinc-300 rounded text-xs"
                  value={partyTaxId}
                  onChange={(e) => setPartyTaxId(e.target.value)}
                />
              </div>

              <div className="border-t pt-3 flex gap-2 justify-end">
                <button 
                  id="btn-add-party-modal-cancel"
                  type="button" 
                  onClick={() => setShowAddPartyModal(false)}
                  className="px-3.5 py-1.5 border hover:bg-neutral-50 rounded text-xs font-bold cursor-pointer transition-all"
                >
                  Discard Profile
                </button>
                <button 
                  id="btn-add-party-modal-submit"
                  type="submit" 
                  className="px-4 py-1.5 bg-zinc-950 text-white rounded hover:bg-zinc-800 text-xs font-black cursor-pointer transition-all"
                >
                  Create Directory Record
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Corporate foot labels */}
      <footer className="bg-zinc-905 text-zinc-400/80 border-t border-zinc-805 mt-auto p-4 text-[10px] font-semibold text-center select-none shrink-0">
        Apex Solutions Enterprise SaaS Group ● Consolidated Ledger Architecture v1.0.0 (FINAL) ● Licensed for deep audit compliance
      </footer>

    </div>
  );
}

// Simple Mini components to helper layout
function ChevronRight({ size = 16, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
