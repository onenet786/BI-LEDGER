/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getTenantSettings, saveTenantSettings, getDbInfo } from '../ledgerService';
import { TenantSettings, Branch, CustomFieldDefinition } from '../types';
import { 
  Settings, 
  Map, 
  Percent, 
  FileCode, 
  SlidersHorizontal, 
  CheckCircle, 
  Plus, 
  Trash2,
  Building,
  Wrench,
  Lock,
  DollarSign,
  Database
} from 'lucide-react';

interface TenantSettingsProps {
  username: string;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

export default function TenantSettingsComponent({
  username,
  refreshTrigger,
  triggerRefresh,
}: TenantSettingsProps) {
  const [settings, setSettings] = useState<TenantSettings | null>(null);

  // Sub-tabs in Settings
  const [subTab, setSubTab] = useState<'general' | 'numbering' | 'branches' | 'custom_fields'>('general');

  // Input States for additions
  const [newBranch, setNewBranch] = useState({ name: '', code: '' });
  
  // Custom Field Form
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'dropdown' | 'checkbox'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldTarget, setNewFieldTarget] = useState<'party' | 'transaction'>('party');

  useEffect(() => {
    setSettings(getTenantSettings());
  }, [refreshTrigger]);

  if (!settings) return null;

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    saveTenantSettings(settings);
    triggerRefresh();
    alert('Workspace General Settings saved successfully and recorded in audit log.');
  };

  // Append new Branch
  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.name || !newBranch.code) return;

    const updatedBranches: Branch[] = [
      ...settings.branches,
      {
        id: 'b-' + Date.now(),
        name: newBranch.name,
        code: newBranch.code.toUpperCase(),
      }
    ];

    const updated: TenantSettings = {
      ...settings,
      branches: updatedBranches,
    };

    setSettings(updated);
    saveTenantSettings(updated);
    setNewBranch({ name: '', code: '' });
    triggerRefresh();
    alert(`Success: Registered "${newBranch.name}" branch successfully.`);
  };

  const handleDeleteBranch = (id: string) => {
    if (settings.branches.length <= 1) {
      alert('Workspace setup must contain at least one primary branch sub-entity.');
      return;
    }
    const updatedBranches = settings.branches.filter(b => b.id !== id);
    const updated: TenantSettings = {
      ...settings,
      branches: updatedBranches,
    };
    setSettings(updated);
    saveTenantSettings(updated);
    triggerRefresh();
  };

  // Append Custom Fields Definitions
  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) return;

    const newField: CustomFieldDefinition = {
      id: 'cf-' + Date.now(),
      label: newFieldLabel.trim(),
      type: newFieldType,
      target: newFieldTarget,
      options: newFieldType === 'dropdown' ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined,
    };

    const updated: TenantSettings = {
      ...settings,
      customFields: [...settings.customFields, newField],
    };

    setSettings(updated);
    saveTenantSettings(updated);
    
    // reset field states
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
    triggerRefresh();
    alert(`Success: Extended Database Schema. Added custom field: "${newField.label}" targeting ${newField.target} entities.`);
  };

  const handleDeleteCustomField = (id: string) => {
    const updated = {
      ...settings,
      customFields: settings.customFields.filter(cf => cf.id !== id),
    };
    setSettings(updated);
    saveTenantSettings(updated);
    triggerRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-zinc-200 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
            <Settings className="text-zinc-700" size={18} /> Workplace Tenant Settings Panel
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Configure multi-branch structures, custom transaction prefixes, lock dates, and taxonomies.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
        
        {/* Sub Navigation Settings links */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-1 self-start">
          {[
            { id: 'general', label: 'General Configuration', icon: SlidersHorizontal },
            { id: 'numbering', label: 'Document Numbering series', icon: FileCode },
            { id: 'branches', label: 'Branches Setup Register', icon: Building },
            { id: 'custom_fields', label: 'Custom Field Builder Schema', icon: Wrench },
          ].map(sb => {
            const Icon = sb.icon;
            const isSel = subTab === sb.id;
            return (
              <button
                key={sb.id}
                id={`set-tab-btn-${sb.id}`}
                onClick={() => setSubTab(sb.id as any)}
                className={`w-full text-left text-xs p-2 py-1.5 rounded transition-all font-bold block flex items-center gap-1.5 ${
                  isSel 
                  ? 'bg-zinc-900 text-white' 
                  : 'text-zinc-650 hover:bg-zinc-100'
                }`}
              >
                <Icon size={12} /> {sb.label}
              </button>
            );
          })}
        </div>

        {/* Content Panel Area */}
        <div className="md:col-span-3 bg-white border border-zinc-200 rounded-lg p-5">
          
          {/* --- PANEL SUB-TAB: GENERAL --- */}
          {subTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              {username === 'Super Admin User' && (() => {
                const dbInfo = getDbInfo();
                return dbInfo ? (
                  <div className="mb-4 p-4 bg-zinc-900 text-zinc-100 rounded-lg border border-zinc-800 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-4 translate-y-4">
                      <Database size={120} />
                    </div>
                    <div className="flex items-center justify-between mb-3 border-b border-zinc-850 pb-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <Database className={dbInfo.connected ? "text-emerald-400 animate-pulse" : "text-rose-400"} size={14} /> 
                        Database Server Diagnostics (Super Admin)
                      </h4>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        dbInfo.connected 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dbInfo.connected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        {dbInfo.connected ? 'Connected (PostgreSQL)' : 'Fallback (In-Memory Mode)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono">
                      <div>
                        <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-tight">Database Host</span>
                        <span className="text-zinc-300 font-semibold">{dbInfo.host}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-tight">Database Port</span>
                        <span className="text-zinc-300 font-semibold">{dbInfo.port}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-tight">Database Name</span>
                        <span className="text-emerald-400 font-bold">{dbInfo.database}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-tight">Username</span>
                        <span className="text-zinc-300 font-semibold">{dbInfo.user}</span>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              <h3 className="font-semibold text-sm text-zinc-900 pb-2 border-b border-zinc-100">Tenant Localization Parameters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">Company legal Entity profile Name *</label>
                  <input 
                    type="text"
                    required
                    className="w-full p-2 border border-zinc-300 rounded"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">Base functional Currency *</label>
                  <select
                    className="w-full p-2 border border-zinc-300 rounded bg-white font-bold text-zinc-805"
                    value={settings.baseCurrency}
                    onChange={(e) => setSettings({ ...settings, baseCurrency: e.target.value })}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="PKR">PKR (Rs)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                  <span className="text-[10px] text-zinc-400 mt-1 block">Consolidation reports default currency</span>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">Start of Financial accounting Month *</label>
                  <select
                    className="w-full p-2 border border-zinc-300 rounded bg-white"
                    value={settings.fiscalYearStartMonth}
                    onChange={(e) => setSettings({ ...settings, fiscalYearStartMonth: parseInt(e.target.value) })}
                  >
                    <option value={1}>January (Default Calendar Year)</option>
                    <option value={7}>July (Standard Non-Profit/Gov Rate)</option>
                    <option value={10}>October (US Federal Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1 flex items-center gap-1">
                    <Lock size={12} className="text-zinc-500" />
                    Month Lock Date Restriction
                  </label>
                  <input 
                    type="date"
                    className="w-full p-1.5 border border-zinc-300 rounded"
                    value={settings.lockDate || ''}
                    onChange={(e) => setSettings({ ...settings, lockDate: e.target.value || undefined })}
                  />
                  <span className="text-[9px] text-red-500 mt-1 block">Block Operator document creations prior to date.</span>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1 flex items-center gap-1">
                    <DollarSign size={12} />
                    Maker-Checker Limit Threshold (Base Currency equivalent) *
                  </label>
                  <input 
                    type="number"
                    required
                    className="w-full p-2 border border-zinc-300 rounded"
                    value={settings.approvalThreshold}
                    onChange={(e) => setSettings({ ...settings, approvalThreshold: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="text-[9px] text-zinc-400 mt-1 block">Regular Data entry lines exceeding this value will map to pending checker.</span>
                </div>
              </div>

              <div className="border-t pt-4 flex justify-end">
                <button 
                  id="btn-settings-general-save"
                  type="submit" 
                  className="px-4 py-2 bg-zinc-950 text-white rounded font-bold hover:bg-zinc-800 text-xs cursor-pointer shadow-2xs transition-colors"
                >
                  Save Localization Parameters
                </button>
              </div>
            </form>
          )}

          {/* --- PANEL SUB-TAB: NUMBERING --- */}
          {subTab === 'numbering' && (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <h3 className="font-semibold text-sm text-zinc-900 pb-2 border-b border-zinc-100">Record Number prefix Series Configuration</h3>
              <p className="text-[10px] text-zinc-500">Provide document serial sequence prefixes to match business standards.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {Object.keys(settings.transactionNumbering).map((key) => {
                  const numValue = (settings.transactionNumbering as any)[key];
                  return (
                    <div key={key}>
                      <label className="text-[9px] text-zinc-405 block uppercase font-bold mb-1">{key.replace('_', ' ')} Prefix</label>
                      <input 
                        type="text" 
                        required
                        className="w-full p-2 border border-zinc-300 rounded uppercase font-mono font-bold"
                        value={numValue}
                        onChange={(e) => {
                          const childNum = { ...settings.transactionNumbering, [key]: e.target.value };
                          setSettings({
                            ...settings,
                            transactionNumbering: childNum
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-4 flex justify-end">
                <button 
                  id="btn-settings-numbering-save"
                  type="submit" 
                  className="px-4 py-2 bg-zinc-950 text-white rounded text-xs font-bold hover:bg-zinc-800 cursor-pointer"
                >
                  Save Serial Prefix Config
                </button>
              </div>
            </form>
          )}

          {/* --- PANEL SUB-TAB: BRANCHES --- */}
          {subTab === 'branches' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-semibold text-sm text-zinc-900 pb-2 border-b">Operational Branches setup Index ({settings.branches.length} branches)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Left Side branch form */}
                <form onSubmit={handleAddBranch} className="bg-zinc-50 border p-4 rounded-lg space-y-3">
                  <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Add Subsidiary Branch</span>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Branch Name *</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full p-2 bg-white border rounded text-xs"
                      placeholder="e.g. Dubai Trading Office"
                      value={newBranch.name}
                      onChange={(e) => setNewBranch(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Local Code (Voucher Prefix match) *</label>
                    <input 
                      type="text" 
                      required 
                      maxLength={4}
                      className="w-full p-2 bg-white border rounded text-xs uppercase font-mono font-bold"
                      placeholder="e.g. DXB"
                      value={newBranch.code}
                      onChange={(e) => setNewBranch(prev => ({ ...prev, code: e.target.value }))}
                    />
                  </div>
                  <button 
                    id="btn-settings-branch-add"
                    type="submit" 
                    className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs rounded transition-colors cursor-pointer"
                  >
                    Register Branch Location
                  </button>
                </form>

                {/* Right Lists index */}
                <div className="md:col-span-2 space-y-2 max-h-[300px] overflow-y-auto">
                  {settings.branches.map(b => (
                    <div key={b.id} className="p-3 bg-zinc-50 rounded border border-zinc-200 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-zinc-900 block">{b.name}</strong>
                        <span className="text-[9px] text-zinc-400 block font-mono">Consolidation Routing Code: {b.code}</span>
                      </div>
                      <button
                        id={`btn-branch-delete-${b.id}`}
                        onClick={() => handleDeleteBranch(b.id)}
                        className="p-1 px-1.5 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors cursor-pointer"
                        title="Delete branch"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* --- PANEL SUB-TAB: CUSTOM FIELD ENGINE --- */}
          {subTab === 'custom_fields' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-semibold text-sm text-zinc-900 pb-2 border-b">Active Database Extension Custom Field Builder</h3>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Inject custom fields into Party Profiles and ledger transactions dynamically. Custom inputs generate in live forms immediately without code alterations.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Custom field constructor form */}
                <form onSubmit={handleAddCustomField} className="bg-zinc-50 border p-4 rounded-lg space-y-3">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Field Creator form</span>
                  
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Field Label Name *</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full p-2 bg-white border border-zinc-200 rounded text-xs"
                      placeholder="e.g. Subcontract SLA No"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Target Entity Segment *</label>
                    <select
                      className="w-full p-2 bg-white border border-zinc-200 rounded text-xs"
                      value={newFieldTarget}
                      onChange={(e) => setNewFieldTarget(e.target.value as any)}
                    >
                      <option value="party">Party Profile 360° View</option>
                      <option value="transaction">Ledger Transaction entry form</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Input Data class *</label>
                    <select
                      className="w-full p-2 bg-white border border-zinc-200 rounded text-xs"
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as any)}
                    >
                      <option value="text">Text string value</option>
                      <option value="number">Numeric amount value</option>
                      <option value="date">Calendar Date selector</option>
                      <option value="dropdown">Predefined Dropdown options list</option>
                      <option value="checkbox">Boolean Checkbox flag</option>
                    </select>
                  </div>

                  {newFieldType === 'dropdown' && (
                    <div>
                      <label className="text-[10px] text-zinc-550 block mb-1 font-semibold">Comma-Separated Dropdown Option List *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full p-2 bg-white border rounded text-xs text-zinc-805"
                        placeholder="e.g. Critical, High, Low"
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                      />
                    </div>
                  )}

                  <button 
                    id="btn-add-custom-field-submit"
                    type="submit" 
                    className="w-full py-2 bg-zinc-950 text-white rounded text-xs font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Inject Custom field mapping
                  </button>
                </form>

                {/* Extended mapping lists */}
                <div className="md:col-span-2 space-y-2.5 max-h-[300px] overflow-y-auto">
                  {settings.customFields.length === 0 ? (
                    <p className="p-4 border text-center border-dashed rounded text-zinc-400">Zero custom field extensions registered.</p>
                  ) : (
                    settings.customFields.map(cf => (
                      <div key={cf.id} className="p-3 bg-zinc-50 rounded border border-zinc-200 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-zinc-900 block font-bold">{cf.label}</strong>
                          <span className="text-[9px] text-zinc-400 block font-mono">Target: {cf.target.toUpperCase()} | Type: {cf.type.toUpperCase()} {cf.options ? `(${cf.options.join(', ')})` : ''}</span>
                        </div>
                        <button
                          id={`btn-custom-field-delete-${cf.id}`}
                          onClick={() => handleDeleteCustomField(cf.id)}
                          className="p-1 px-1.5 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors cursor-pointer"
                          title="Delete Custom field"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
