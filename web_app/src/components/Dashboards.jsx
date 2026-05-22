import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Wrench, ShoppingBag, Send, AlertTriangle, CheckCircle,
  Clock, MapPin, User, ChevronRight, FileText, Upload, Plus,
  DollarSign, Percent, Settings, Database, RefreshCw, BarChart2, Eye, Info, Check, XCircle,
  Activity, TrendingUp, Terminal, Edit2, Save, Calendar, Package, Users, Truck,
  Briefcase, ArrowRight, ChevronDown, ChevronUp, ExternalLink, AlertOctagon
} from 'lucide-react';
import * as api from '../services/api';

// MD3 Badge Utilities
const getInventoryBadge = (qty) => {
  if (qty === 0) return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">Deficit (0)</span>;
  if (qty <= 5) return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">Low ({qty})</span>;
  return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">Adequate ({qty})</span>;
};

const getStatusBadge = (status) => {
  const s = status.toLowerCase();
  if (s === 'completed' || s.includes('active') || s.includes('running') || s === 'paid') {
    return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">● {status}</span>;
  }
  if (s === 'checked' || s === 'pr_approved' || s.includes('rfq') || s.includes('standby') || s.includes('pending')) {
    return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">● {status}</span>;
  }
  if (s === 'request received') {
    return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">● {status}</span>;
  }
  if (s.includes('grounded') || s.includes('drydocked') || s.includes('deficit') || s === 'inactive') {
    return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">● {status}</span>;
  }
  return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200">● {status}</span>;
};

const normalizeFinanceEntry = (entry) => {
  const referenceId = entry.reference_id || entry.pr_id || '';
  const referenceType = entry.reference_type || (referenceId.startsWith('RA') ? 'CRM' : 'PR');
  const ledgerType = entry.ledger_type || (entry.type?.toLowerCase() === 'receivable' || referenceType === 'CRM' ? 'CRM_REVENUE' : 'PROCUREMENT_EXPENSE');

  return {
    ...entry,
    reference_id: referenceId,
    reference_type: referenceType,
    ledger_type: ledgerType,
    counterparty_name: entry.counterparty_name || entry.supplier_name || '',
    payment_clearance_status: entry.payment_clearance_status || entry.parent_finance_status || 'Awaiting Action'
  };
};

export default function Dashboards({ role, userEmail, onLogout }) {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const reloadData = async () => {
    setLoading(true);
    try {
      const data = await api.fetchDatabase();
      setDb(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-textMuted font-medium">Syncing relational layout structures from Google Sheets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-red-200 p-6 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />
        <h3 className="text-lg font-bold text-red-800">System Connection Error</h3>
        <p className="text-sm text-red-700 font-medium">{error}</p>
        <button onClick={reloadData} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold shadow-sm">
          Retry Sync
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {toast.type === 'success' ? <Check className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary-container text-on-primary-container">
              {role === 'Admin' && <Shield className="w-5 h-5" />}
              {role === 'Supervisor' && <Wrench className="w-5 h-5" />}
              {role === 'Procurement' && <ShoppingBag className="w-5 h-5" />}
              {role === 'Finance' && <DollarSign className="w-5 h-5" />}
              {role === 'Requestee' && <Send className="w-5 h-5" />}
            </span>
            Welcome back, <span className="text-primary font-bold">{userEmail}</span>
          </h2>
          <p className="text-xs text-textMuted mt-1.5 font-medium">Logged in as {role} (Well Land Ops v3.0 Core Portal)</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={reloadData} 
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gray-50 hover:bg-gray-50-high border border-gray-100 transition active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Synchronize Sheets
          </button>
          <button 
            onClick={onLogout} 
            className="px-3.5 py-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition active:scale-95"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Conditional Dashboard Rendering */}
      <AnimatePresence mode="wait">
        <motion.div
          key={role}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {role === 'Admin' && <AdminDashboard db={db} onRefresh={reloadData} showToast={showToast} userEmail={userEmail} />}
          {role === 'Supervisor' && <SupervisorDashboard db={db} onRefresh={reloadData} showToast={showToast} />}
          {role === 'Procurement' && <ProcurementDashboard db={db} onRefresh={reloadData} showToast={showToast} />}
          {role === 'Finance' && <FinanceDashboard db={db} onRefresh={reloadData} showToast={showToast} />}
          {role === 'Requestee' && <RequesteeDashboard db={db} onRefresh={reloadData} showToast={showToast} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── 1. ADMIN EXECUTIVE DASHBOARD ─────────────────────────────────────────────

function AdminDashboard({ db, onRefresh, showToast, userEmail }) {
  const [users, setUsers] = useState(db.userRegistry || []);
  const [agreements, setAgreements] = useState(db.crmAgreements || []);
  const [prRequests, setPrRequests] = useState(db.purchaseRequests || []);
  const [matrix, setMatrix] = useState(db.itemSupplierMatrix || []);
  const [finance, setFinance] = useState(db.financeLedger || []);
  const [assetHistoryLog] = useState(db.assetHistoryLog || []);
  const [fleetAssets] = useState(db.assetsFleet || []);
  const [activeTab, setActiveTab] = useState('fleet');

  // Inline edit — fleet assets
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [assetEditBuffer, setAssetEditBuffer] = useState({});

  // Inline edit — user registry
  const [editingUserEmail, setEditingUserEmail] = useState(null);
  const [userEditBuffer, setUserEditBuffer] = useState({});

  // Retroactive Backdated PR Tool fields
  const [retroDate, setRetroDate] = useState('');
  const [retroItem, setRetroItem] = useState('');
  const [retroCategory, setRetroCategory] = useState('Consumables / General');
  const [retroAssetBase, setRetroAssetBase] = useState('');
  const [retroSupplier, setRetroSupplier] = useState('');
  const [retroPrice, setRetroPrice] = useState('');
  const [retroSubmitting, setRetroSubmitting] = useState(false);

  // CRM Sales Desk — expanded contract for milestone detail
  const [expandedContractId, setExpandedContractId] = useState(null);

  // CRM addition fields
  const [showAddRA, setShowAddRA] = useState(false);
  const [newClient, setNewClient] = useState('');
  const [newAssets, setNewAssets] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newCycle, setNewCycle] = useState('Project-based');

  const handleUserRoleChange = async (email, newRole) => {
    const userRecord = users.find(u => u.email === email);
    if (!userRecord) return;
    try {
      const updated = { ...userRecord, role: newRole };
      await api.updateRecord('Sheet_User_Registry', 'email', email, updated);
      showToast(`User ${email} role elevated to ${newRole}`);
      onRefresh();
    } catch (err) {
      showToast("Error updating role: " + err.message, "error");
    }
  };

  const handleUserStatusChange = async (email, newStatus) => {
    const userRecord = users.find(u => u.email === email);
    if (!userRecord) return;
    try {
      const updated = { ...userRecord, status: newStatus };
      await api.updateRecord('Sheet_User_Registry', 'email', email, updated);
      showToast(`User ${email} status changed to ${newStatus}`);
      onRefresh();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // Gate 1: GM Checked Requisitions -> PR_Approved
  const handleAuthorizeRFQ = async (prId) => {
    const pr = prRequests.find(p => p.pr_id === prId);
    if (!pr) return;
    try {
      const updatedPr = { ...pr, status: 'PR_Approved' };
      await api.updateRecord('Sheet_Purchase_Requests', 'pr_id', prId, updatedPr);
      showToast(`RFQ Authorized for Requisition: ${prId}. Moved to Procurement workspace.`);
      onRefresh();
    } catch (err) {
      showToast("Error authorizing RFQ: " + err.message, "error");
    }
  };

  // Gate 2: parallel Sourcing Quote release
  const handleAuthorizePO = async (prId, supplierName, priceMvr) => {
    try {
      const res = await api.approveQuote(prId, supplierName, priceMvr);
      showToast(`Purchase Order Released! raised reference: ${res.poReference}`);
      onRefresh();
    } catch (err) {
      showToast("Error raising PO: " + err.message, "error");
    }
  };

  // Log CRM Agreement
  const handleCreateAgreement = async () => {
    if (!newClient || !newAssets || !newRate) {
      showToast("Please populate all fields", "error");
      return;
    }
    const newId = "RA" + Math.floor(1000 + Math.random() * 9000);
    try {
      const parsedAssets = newAssets.split(',').map(a => a.trim());
      const record = {
        agreement_id: newId,
        client_name: newClient,
        asset_ids_array: JSON.stringify(parsedAssets),
        rate_structure: newRate,
        billing_cycle: newCycle,
        start_date: new Date().toISOString().split('T')[0],
        current_logged_hours: 0,
        status: 'Active',
        project_scope: newRate,
        total_contract_value_mvr: 0,
        agreement_status: 'Lead',
        billing_milestones: JSON.stringify([])
      };
      await api.updateRecord('Sheet_CRM_Agreements', 'agreement_id', newId, record);
      setShowAddRA(false);
      setNewClient('');
      setNewAssets('');
      setNewRate('');
      showToast(`CRM Contract Agreement registered: ${newId}`);
      onRefresh();
    } catch (err) {
      showToast("Error creating contract: " + err.message, "error");
    }
  };

  const handleSaveAssetEdit = async (assetId) => {
    try {
      await api.updateRecord('Sheet_Assets_Fleet', 'asset_id', assetId, assetEditBuffer);
      showToast(`Asset ${assetId} updated.`);
      setEditingAssetId(null);
      onRefresh();
    } catch (err) {
      showToast('Error saving asset: ' + err.message, 'error');
    }
  };

  const handleSaveUserEdit = async (email) => {
    try {
      await api.updateRecord('Sheet_User_Registry', 'email', email, userEditBuffer);
      showToast(`User ${email} record updated.`);
      setEditingUserEmail(null);
      onRefresh();
    } catch (err) {
      showToast('Error saving user: ' + err.message, 'error');
    }
  };

  const handleBackfillRetroactivePR = async (e) => {
    e.preventDefault();
    if (!retroDate || !retroItem || !retroAssetBase || !retroSupplier || !retroPrice) {
      showToast('All fields are required for atomic backfill.', 'error');
      return;
    }
    setRetroSubmitting(true);
    try {
      const res = await api.backfillRetroactivePR({
        backdated_datetime: new Date(retroDate).toISOString(),
        item_name: retroItem,
        category: retroCategory,
        asset_base: retroAssetBase,
        supplier_name: retroSupplier,
        price_mvr: Number(retroPrice)
      });
      showToast(`Atomic Handshake Complete. PR: ${res.prId} | TX: ${res.txId} written to 4 sheets.`);
      setRetroDate(''); setRetroItem(''); setRetroAssetBase(''); setRetroSupplier(''); setRetroPrice('');
      onRefresh();
    } catch (err) {
      showToast('Backfill failed: ' + err.message, 'error');
    } finally {
      setRetroSubmitting(false);
    }
  };

  const handleTriggerMilestoneInvoice = async (agreementId, milestoneIndex) => {
    try {
      const res = await api.triggerMilestoneInvoice(agreementId, milestoneIndex);
      showToast(`Milestone Invoiced: "${res.milestoneName}" — MVR ${Number(res.amountMvr).toLocaleString()} | TX: ${res.transactionId}`);
      onRefresh();
    } catch (err) {
      showToast('Milestone trigger failed: ' + err.message, 'error');
    }
  };

  // Gemini AI Recommendation Panel Simulator
  const getGeminiRecommendation = (prItem) => {
    const historicalQuotes = matrix.filter(
      m => m.generic_item_id.toLowerCase().trim() === prItem.toLowerCase().trim()
    );

    if (historicalQuotes.length === 0) {
      return {
        prompt: `No previous supplier data available in Sheet_Item_Supplier_Matrix for this item. Proceed to issue RFQ to obtain new baseline pricing.`,
        supplier: null,
        price: null,
        range: "TBD"
      };
    }

    // Sort by quote_date or select lowest
    const sortedByPrice = [...historicalQuotes].sort((a, b) => Number(a.quoted_price_mvr) - Number(b.quoted_price_mvr));
    const lowestQuote = sortedByPrice[0];
    
    const prices = historicalQuotes.map(q => Number(q.quoted_price_mvr));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return {
      prompt: `Gemini Analysis: This item was last sourced from ${lowestQuote.supplier_name} on ${lowestQuote.quote_date || 'N/A'} for MVR ${Number(lowestQuote.quoted_price_mvr).toLocaleString()}. Historical baseline variance for this item class across Thilafushi/Muthaafushi operations is ±12%. Recommending progression to multi-vendor RFQ.`,
      supplier: lowestQuote.supplier_name,
      price: lowestQuote.quoted_price_mvr,
      range: `MVR ${minPrice.toLocaleString()} - MVR ${maxPrice.toLocaleString()}`
    };
  };

  const isCRMUser = userEmail === 'alie.mustarq@gmail.com' || userEmail === 'gm@welllandinvestment.com';

  // Reporting suite computed metrics (Phase 3 enhanced)
  const normalizedFinance = finance.map(normalizeFinanceEntry);
  const procurementFinance = normalizedFinance.filter(f => f.ledger_type === 'PROCUREMENT_EXPENSE');
  const totalSpend = procurementFinance.reduce((sum, f) => sum + Number(f.total_amount_mvr || 0), 0);
  const gstBreakdown = Math.round(totalSpend * 0.08 * 100) / 100;
  const completedPRs = prRequests.filter(p => p.status === 'Completed').length;
  const vendorCounts = matrix.reduce((acc, m) => { acc[m.supplier_name] = (acc[m.supplier_name] || 0) + 1; return acc; }, {});
  const vendorList = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1]);
  const sortedHistoryLog = [...assetHistoryLog].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Phase 3: Net Profit & CRM Revenue Analytics
  const crmRevenue = agreements.reduce((sum, a) => {
    const isActive = a.agreement_status === 'Active Contract' || a.agreement_status === 'Invoiced & Collected' || (!a.agreement_status && a.status === 'Active');
    return isActive ? sum + Number(a.total_contract_value_mvr || 0) : sum;
  }, 0);
  const netProfit = crmRevenue - totalSpend;
  const maintenancePct = crmRevenue > 0 ? Math.round((totalSpend / crmRevenue) * 1000) / 10 : 0;
  const showFinancialAlert = crmRevenue > 0 && totalSpend / crmRevenue > 0.40;
  const assetSpendMap = {};
  prRequests.forEach(pr => {
    const finEntry = procurementFinance.find(f => f.reference_id === pr.pr_id);
    if (finEntry && pr.target_use) {
      assetSpendMap[pr.target_use] = (assetSpendMap[pr.target_use] || 0) + Number(finEntry.total_amount_mvr || 0);
    }
  });
  const top3BleedingAssets = Object.entries(assetSpendMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
  let oemSpend = 0, mroSpend = 0;
  prRequests.forEach(pr => {
    const finEntry = procurementFinance.find(f => f.reference_id === pr.pr_id);
    if (finEntry) {
      const amt = Number(finEntry.total_amount_mvr || 0);
      if (pr.category && (pr.category.toLowerCase().includes('heavy') || pr.category.toLowerCase().includes('marine') || pr.category.toLowerCase().includes('electrical'))) {
        oemSpend += amt;
      } else {
        mroSpend += amt;
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-100 space-x-2 md:space-x-4 overflow-x-auto pb-1">
        {[
          { id: 'fleet', label: 'Fleet Map & Shifts', icon: MapPin },
          { id: 'approvals', label: 'Double-Gate Console', icon: CheckCircle },
          { id: 'finance', label: 'Finance & CRM Matrix', icon: DollarSign },
          { id: 'users', label: 'Permissions Matrix', icon: Settings },
          { id: 'reports', label: 'Reporting Suite', icon: BarChart2 },
          ...(isCRMUser ? [{ id: 'crm', label: 'CRM Sales Desk', icon: Briefcase }] : []),
          ...(userEmail === 'alie.mustarq@gmail.com' ? [{ id: 'masterdata', label: 'Master Data [IT]', icon: Terminal }] : [])
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === t.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-textMuted hover:text-on-surface'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          
          {/* TAB 1: OPERATIONS & FLEET MAP */}
          {activeTab === 'fleet' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base md:text-lg font-extrabold text-on-surface">Fleet Real-Time Operations Map</h3>
                <span className="text-xs bg-primary/10 text-primary font-bold px-3 py-1 rounded-full border border-primary/20">4 Vessels | 20 Machinery</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(db.assetsFleet || []).map(a => {
                  const isGrounded = a.live_status.toLowerCase().includes('grounded');
                  return (
                    <div 
                      key={a.asset_id}
                      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition relative overflow-hidden ${
                        isGrounded 
                          ? 'bg-red-50/70 border-red-200' 
                          : 'bg-white/80 border-gray-100 shadow-sm'
                      } hover:shadow-md`}
                    >
                      {isGrounded && (
                        <div className="absolute top-0 right-0 bg-red-600 text-white font-extrabold text-[9px] uppercase px-3 py-0.5 rounded-bl">Grounded Warning</div>
                      )}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-textMuted tracking-wider">{a.type}</span>
                          <h4 className="text-base font-extrabold text-on-surface mt-0.5">{a.asset_name}</h4>
                          <span className="text-xs font-bold text-primary">{a.asset_id}</span>
                        </div>
                        {getStatusBadge(a.live_status)}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-dashed border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-textMuted font-medium">Site Location:</span>
                          <p className="font-extrabold text-on-surface flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-red-500" /> {a.location}
                          </p>
                        </div>
                        <div>
                          <span className="text-textMuted font-medium">Meter Hours:</span>
                          <p className="font-extrabold text-on-surface mt-0.5 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-primary" /> {a.meter_hours} hrs
                          </p>
                        </div>
                        <div className="col-span-2 mt-1">
                          <span className="text-textMuted font-medium">Active Operator Profile:</span>
                          <p className="font-extrabold text-on-surface mt-0.5 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-secondary" /> {a.current_operator || '—'}
                          </p>
                        </div>
                      </div>
                      {a.maps_coordinates && (
                        <a
                          href={`http://maps.google.com/?q=${a.maps_coordinates}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary-dark border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-lg px-3 py-1.5 transition w-fit"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" /> View on Google Maps
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DOUBLE-GATE PROCUREMENT CONTROL */}
          {activeTab === 'approvals' && (
            <div className="space-y-6">
              
              {/* Gate 1: Requisitions to RFQ Authorizations */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4 border-b pb-4 border-dashed border-gray-100">
                  <div>
                    <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                      Gate 1: Executive PR Authorization (RFQ Release)
                    </h3>
                    <p className="text-xs text-textMuted mt-1">Review supervisor checked maintenance tickets. Gemini runs historical matching to prompt budget checks.</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-900 border border-blue-200">Double-Gate Phase #1</span>
                </div>

                <div className="space-y-4">
                  {prRequests.filter(p => p.status === 'Checked').map(pr => {
                    const aiRec = getGeminiRecommendation(pr.item_generic_name);
                    return (
                      <div key={pr.pr_id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b pb-1.5 border-dashed border-gray-100">
                            <div>
                              <span className="font-bold text-primary block text-sm">{pr.pr_id}</span>
                              <h4 className="text-sm font-extrabold text-on-surface mt-0.5">{pr.item_generic_name}</h4>
                            </div>
                            {getStatusBadge(pr.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                            <div>
                              <span className="text-textMuted block">Target Asset Link:</span>
                              <span className="font-bold text-on-surface">{pr.target_use}</span>
                            </div>
                            <div>
                              <span className="text-textMuted block">Required Quantity:</span>
                              <span className="font-extrabold text-secondary">{pr.quantity}</span>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                              <span className="text-textMuted block">Requesting Profile:</span>
                              <span className="font-semibold text-on-surface italic">{pr.requested_by_email}</span>
                            </div>
                          </div>
                          <div className="p-2 rounded bg-gray-50 border text-textMuted italic mt-1">
                            Justification: "{pr.justification}"
                          </div>
                        </div>

                        {/* Gemini Recommendation Box */}
                        <div className="p-4 rounded-xl bg-primary-container/20 border border-primary/20 flex flex-col justify-between space-y-3">
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase font-extrabold text-primary flex items-center gap-1">
                              <Info className="w-3.5 h-3.5" /> Gemini Recommendation Panel
                            </span>
                            <p className="text-xs font-semibold text-on-primary-container leading-relaxed">
                              {aiRec.prompt}
                            </p>
                          </div>
                          
                          <button 
                            onClick={() => handleAuthorizeRFQ(pr.pr_id)}
                            className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center justify-center gap-1 active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" /> Authorize RFQ & Advance
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {prRequests.filter(p => p.status === 'Checked').length === 0 && (
                    <p className="text-xs text-center text-textMuted py-4 italic">No pending checked requisitions waiting in Gate 1.</p>
                  )}
                </div>
              </div>

              {/* Gate 2: Executive Sourcing Selection */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4 border-b pb-4 border-dashed border-gray-100">
                  <div>
                    <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      Gate 2: Executive Sourcing Selection
                    </h3>
                    <p className="text-xs text-textMuted mt-1">Procurement compliance verified. Review the certified bid matrices and select the winning supplier to raise the Purchase Order.</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">Sourcing Complete</span>
                </div>

                <div className="space-y-6">
                  {prRequests.filter(p => p.status === 'Sourcing_Completed').map(pr => {
                    const quotes = matrix.filter(m => m.generic_item_id === pr.item_generic_name);
                    const prices = quotes.map(q => Number(q.quoted_price_mvr));
                    const historicalBaseline = prices.length > 0 ? Math.min(...prices) : 0;

                    return (
                      <div key={pr.pr_id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-4">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start border-b border-dashed border-gray-100 pb-3 gap-2">
                          <div>
                            <span className="text-xs font-extrabold text-primary">{pr.pr_id}</span>
                            <h4 className="text-sm font-extrabold text-on-surface mt-0.5">{pr.item_generic_name}</h4>
                            <span className="text-xs text-textMuted font-medium block">Asset: <span className="font-bold text-on-surface">{pr.target_use}</span> | Qty: <span className="font-bold text-on-surface">{pr.quantity}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 bg-green-50 border-green-200 text-green-800">
                              <CheckCircle className="w-3.5 h-3.5" /> {quotes.length} Certified Quotes
                            </span>
                            {getStatusBadge(pr.status)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {quotes.map((q, idx) => {
                            const newPrice = Number(q.quoted_price_mvr);
                            const variance = historicalBaseline > 0
                              ? Math.round(((newPrice - historicalBaseline) / historicalBaseline) * 100 * 10) / 10
                              : 0;
                            const totalVal = newPrice * Number(pr.quantity);
                            const isBestPrice = newPrice === historicalBaseline;

                            return (
                              <div
                                key={idx}
                                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 relative overflow-hidden transition hover:shadow-md ${
                                  isBestPrice
                                    ? 'bg-green-50/80 border-green-300 shadow-sm'
                                    : 'bg-white border-gray-100'
                                }`}
                              >
                                {isBestPrice && (
                                  <div className="absolute top-0 right-0 bg-green-600 text-white text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-bl tracking-widest">
                                    Lowest Bid
                                  </div>
                                )}
                                <div className="space-y-1 text-xs">
                                  <span className="font-extrabold text-on-surface block text-sm">{q.supplier_name}</span>
                                  <span className="text-textMuted italic block text-[10px]">{q.extracted_sku_name}</span>
                                  <span className="text-textMuted block text-[10px]">Quote date: {q.quote_date}</span>
                                </div>
                                <div className="space-y-1.5 text-xs border-t border-dashed border-gray-100 pt-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-textMuted font-medium">Unit Price:</span>
                                    <span className="font-extrabold text-on-surface">MVR {newPrice.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-textMuted font-medium">Total (×{pr.quantity}):</span>
                                    <span className="font-extrabold text-primary">MVR {totalVal.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-textMuted font-medium">Price Variance:</span>
                                    {variance <= 0 ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-green-50 border border-green-200 text-green-700">
                                        {variance === 0 ? '0% Baseline' : `${variance}% ↘ Saving`}
                                      </span>
                                    ) : variance <= 15 ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 border border-amber-200 text-amber-700">
                                        +{variance}% ↗ Above
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-50 border border-red-200 text-red-700">
                                        +{variance}% ↗ Inflated
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleAuthorizePO(pr.pr_id, q.supplier_name, q.quoted_price_mvr)}
                                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center justify-center gap-1 active:scale-95"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Select & Raise PO
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        {quotes.length === 0 && (
                          <p className="text-xs text-textMuted italic p-2 text-center">No quotes found in supplier matrix for this item.</p>
                        )}
                      </div>
                    );
                  })}
                  {prRequests.filter(p => p.status === 'Sourcing_Completed').length === 0 && (
                    <p className="text-xs text-center text-textMuted py-4 italic">No sourcing packages awaiting executive selection.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: FINANCE & CRM RENTAL MATRIX */}
          {activeTab === 'finance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* CRM lease logs */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-4 border-dashed border-gray-100">
                  <div>
                    <h3 className="text-base font-extrabold text-on-surface">CRM Sales & Multi-Asset Rental Ledger</h3>
                    <p className="text-xs text-textMuted mt-1">Logs contract agreements, active asset bindings, billing meter cycles, and GST calculations.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddRA(!showAddRA)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-dark text-white transition shadow-sm active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Contract
                  </button>
                </div>

                {showAddRA && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="col-span-2 font-bold border-b pb-1 text-primary">Log CRM Client Agreement</div>
                    <div>
                      <label className="font-semibold block mb-1">Client Business Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Hilton Maldives Amingiri" 
                        value={newClient}
                        onChange={e => setNewClient(e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Assigned Fleet Asset IDs (comma-separated)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. WL-HV-0010, WL-MV-0001" 
                        value={newAssets}
                        onChange={e => setNewAssets(e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-white outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="font-semibold block mb-1">Pricing / Rate Structure Description</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Tadano Crane Rental @ MVR 2,500/hr + operators" 
                        value={newRate}
                        onChange={e => setNewRate(e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Billing Interval</label>
                      <select 
                        value={newCycle}
                        onChange={e => setNewCycle(e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-white outline-none"
                      >
                        <option value="Project-based">Project-based</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Retainer">Retainer</option>
                      </select>
                    </div>
                    <div className="flex items-end justify-end space-x-2 mt-2 md:col-span-1">
                      <button 
                        onClick={() => setShowAddRA(false)}
                        className="px-3.5 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleCreateAgreement}
                        className="px-3.5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold shadow-sm"
                      >
                        Save Contract
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {agreements.map(ra => {
                    const hours = Number(ra.current_logged_hours) || 0;
                    const rateStr = ra.rate_structure;
                    let rateVal = 0;
                    
                    // Regex extractor for unit price
                    const parsedMatch = rateStr.match(/(?:MVR|USD|@)\s*([\d,]+)/i);
                    if (parsedMatch) {
                      rateVal = parseFloat(parsedMatch[1].replace(/,/g, ''));
                    }
                    const subtotal = rateVal * (hours || 1);
                    const gstAmount = subtotal * 0.08; // Maldives GST 8%
                    const grandTotal = subtotal + gstAmount;

                    return (
                      <div key={ra.agreement_id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-primary block">{ra.agreement_id}</span>
                            <h4 className="text-base font-extrabold text-on-surface">{ra.client_name}</h4>
                          </div>
                          {getStatusBadge(ra.status)}
                        </div>
                        <p className="text-xs text-textMuted font-medium">{ra.rate_structure}</p>
                        
                        <div className="pt-3 border-t border-dashed border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs mt-2">
                          <div>
                            <span className="text-textMuted block font-medium">Bound Fleet Assets:</span>
                            <span className="font-extrabold text-primary">{ra.asset_ids_array}</span>
                          </div>
                          <div>
                            <span className="text-textMuted block font-medium">Meter Logged Hours:</span>
                            <span className="font-extrabold flex items-center gap-0.5"><Clock className="w-3.5 h-3.5 text-secondary" /> {hours} hrs</span>
                          </div>
                          <div>
                            <span className="text-textMuted block font-medium">Contract Date:</span>
                            <span className="font-bold">{ra.start_date}</span>
                          </div>
                        </div>

                        {rateVal > 0 && (
                          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 mt-3 flex flex-col md:flex-row md:justify-between text-xs space-y-2 md:space-y-0">
                            <div>
                              <span className="text-textMuted font-medium">Subtotal Billed:</span>
                              <span className="font-bold text-on-surface ml-1">MVR {subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1 text-secondary font-bold">
                              <Percent className="w-3.5 h-3.5" /> Maldives GST (8%):
                              <span>MVR {gstAmount.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-textMuted font-medium">Total Billed Due:</span>
                              <span className="font-extrabold text-primary ml-1">MVR {grandTotal.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Finance Ledger */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="border-b pb-4 border-dashed border-gray-100">
                  <h3 className="text-base font-extrabold text-on-surface">Accounts Payable & Receivables</h3>
                  <p className="text-xs text-textMuted mt-1">Monitors payment pipelines and active corporate billing receipts.</p>
                </div>

                <div className="space-y-3">
                  {normalizedFinance.map(f => {
                    const isPayable = f.ledger_type === 'PROCUREMENT_EXPENSE';
                    return (
                      <div key={f.transaction_id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50 flex justify-between items-center text-xs shadow-sm">
                        <div className="space-y-1">
                          <span className="font-extrabold text-primary block">{f.transaction_id}</span>
                          <span className="text-textMuted font-medium block">Reference: {f.reference_id}</span>
                          <span className="text-textMuted font-medium block">Counterparty: {f.counterparty_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-block border ${
                            isPayable ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                          }`}>{f.ledger_type}</span>
                        </div>
                        <div className="text-right space-y-1.5">
                          <span className="font-extrabold text-on-surface block">MVR {Number(f.total_amount_mvr).toLocaleString()}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-block border ${
                            f.payment_clearance_status?.toLowerCase().includes('paid') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                          }`}>{f.payment_clearance_status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: GM EXECUTIVE REPORTING SUITE */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* 4 Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-extrabold text-textMuted tracking-wider">Total Corporate Spend</span>
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-2xl font-extrabold text-on-surface">MVR {totalSpend.toLocaleString()}</p>
                  <p className="text-[10px] text-textMuted font-medium">{finance.length} ledger transactions</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-extrabold text-textMuted tracking-wider">GST 8% Breakdown</span>
                    <Percent className="w-4 h-4 text-secondary" />
                  </div>
                  <p className="text-2xl font-extrabold text-on-surface">MVR {gstBreakdown.toLocaleString()}</p>
                  <p className="text-[10px] text-textMuted font-medium">Maldives GST rate across portfolio</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-extrabold text-textMuted tracking-wider">Completed Requisitions</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-on-surface">{completedPRs}</p>
                  <p className="text-[10px] text-textMuted font-medium">Fully processed PR tickets this cycle</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-extrabold text-textMuted tracking-wider">Active Vendor Pool</span>
                    <BarChart2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-on-surface">{vendorList.length}</p>
                  <p className="text-[10px] text-textMuted font-medium">Unique suppliers in procurement matrix</p>
                </div>
              </div>

              {/* Financial Alert Banner */}
              {showFinancialAlert && (
                <div className="p-4 rounded-xl bg-red-900 border border-red-600 text-white flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-300 block">FINANCIAL OPERATIONAL ALERT</span>
                    <p className="text-xs text-red-100 mt-1 font-medium">Fleet maintenance leaks are currently consuming <span className="font-extrabold text-white">{maintenancePct}%</span> of active contract revenues. Recommend grounding high-bleeding assets for overhaul before pursuing further sales expansion.</p>
                  </div>
                </div>
              )}

              {/* Net Profit Dashboard + Top Bleeding Assets */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                  <div className="border-b pb-3 border-dashed border-gray-100">
                    <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" /> Net Profit Dashboard
                    </h3>
                    <p className="text-xs text-textMuted mt-0.5">True P&amp;L: Total Active CRM Revenues − Fleet Maintenance Spend</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-center">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] uppercase font-extrabold text-textMuted tracking-wider block">CRM Revenue</span>
                      <p className="text-xl font-extrabold text-emerald-700 mt-1">MVR {crmRevenue.toLocaleString()}</p>
                      <p className="text-[10px] text-textMuted mt-0.5">Active + Completed contracts</p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <span className="text-[10px] uppercase font-extrabold text-textMuted tracking-wider block">Maintenance Spend</span>
                      <p className="text-xl font-extrabold text-red-700 mt-1">MVR {totalSpend.toLocaleString()}</p>
                      <p className="text-[10px] text-textMuted mt-0.5">{maintenancePct}% of CRM revenue</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-300'}`}>
                      <span className="text-[10px] uppercase font-extrabold text-textMuted tracking-wider block">Net Profit</span>
                      <p className={`text-xl font-extrabold mt-1 ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {netProfit >= 0 ? '+' : ''}MVR {Math.abs(netProfit).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-textMuted mt-0.5">{netProfit >= 0 ? 'Net positive' : 'Net deficit'}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-on-surface">
                      <span>OEM (Unplanned Breakdown): MVR {oemSpend.toLocaleString()}</span>
                      <span>MRO (Preventative): MVR {mroSpend.toLocaleString()}</span>
                    </div>
                    {(oemSpend + mroSpend) > 0 && (
                      <div className="w-full h-2.5 bg-gray-50 rounded-full flex overflow-hidden">
                        <div className="bg-red-500 h-full transition-all" style={{ width: `${Math.round((oemSpend / (oemSpend + mroSpend)) * 100)}%` }} />
                        <div className="bg-blue-400 h-full transition-all" style={{ width: `${Math.round((mroSpend / (oemSpend + mroSpend)) * 100)}%` }} />
                      </div>
                    )}
                    <div className="flex gap-4 text-[10px] text-textMuted">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> OEM Breakdown</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" /> MRO Preventative</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                  <div className="border-b pb-3 border-dashed border-gray-100">
                    <h3 className="text-base font-extrabold text-on-surface">Top Bleeding Assets</h3>
                    <p className="text-xs text-textMuted mt-0.5">Machinery with highest repair expenditure.</p>
                  </div>
                  <div className="space-y-3">
                    {top3BleedingAssets.length === 0 ? (
                      <p className="text-xs text-textMuted italic text-center py-4">No asset-linked expenditure data yet.</p>
                    ) : top3BleedingAssets.map(([assetId, spend], idx) => (
                      <div key={assetId} className="flex justify-between items-center text-xs p-2.5 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white ${idx === 0 ? 'bg-red-600' : idx === 1 ? 'bg-orange-500' : 'bg-amber-500'}`}>{idx + 1}</span>
                          <span className="font-extrabold text-on-surface">{assetId}</span>
                        </div>
                        <span className="font-extrabold text-red-700">MVR {spend.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Event Stream Timeline */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                  <div className="border-b pb-4 border-dashed border-gray-100">
                    <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Asset History Event Stream
                    </h3>
                    <p className="text-xs text-textMuted mt-1">Real-time audit trail from Sheet_Asset_History_Log. Sorted most recent first.</p>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto pr-2">
                    {sortedHistoryLog.length === 0 ? (
                      <p className="text-xs text-center text-textMuted py-8 italic">No history events recorded yet.</p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-outline-variant" />
                        <div className="space-y-4 pl-10">
                          {sortedHistoryLog.map((entry, idx) => {
                            const ts = new Date(entry.timestamp);
                            const dateStr = ts.toLocaleDateString('en-MV', { day: '2-digit', month: 'short', year: 'numeric' });
                            const timeStr = ts.toLocaleTimeString('en-MV', { hour: '2-digit', minute: '2-digit' });
                            const isRetro = entry.event_type === 'Retroactive PR Backfill';
                            const dotColor = isRetro ? 'bg-purple-600' : entry.event_type.includes('PO') ? 'bg-emerald-500' : entry.event_type.includes('Quote') ? 'bg-blue-500' : entry.event_type.includes('Fleet') ? 'bg-red-500' : entry.event_type.includes('Inventory') ? 'bg-amber-500' : 'bg-primary';
                            const badgeColor = isRetro ? 'bg-purple-100 text-purple-800' : entry.event_type.includes('PO') ? 'bg-emerald-100 text-emerald-800' : entry.event_type.includes('Quote') ? 'bg-blue-100 text-blue-800' : entry.event_type.includes('Fleet') ? 'bg-red-100 text-red-800' : entry.event_type.includes('Inventory') ? 'bg-amber-100 text-amber-800' : 'bg-primary/10 text-primary';
                            return (
                              <div key={entry.log_id || idx} className="relative">
                                <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-white shadow ${dotColor}`} />
                                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-1.5">
                                  <div className="flex justify-between items-start gap-2">
                                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${badgeColor}`}>{entry.event_type}</span>
                                    <span className="text-[10px] text-textMuted font-medium whitespace-nowrap">{dateStr} · {timeStr}</span>
                                  </div>
                                  <p className="text-xs font-medium text-on-surface">{entry.notes}</p>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-textMuted font-medium">
                                    <span className="flex items-center gap-0.5"><Truck className="w-3 h-3" /> {entry.asset_id || '—'}</span>
                                    <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3 text-red-500" /> {entry.location || '—'}</span>
                                    <span className="flex items-center gap-0.5"><User className="w-3 h-3" /> {entry.triggered_by_email}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vendor Volume Matrix */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                  <div className="border-b pb-4 border-dashed border-gray-100">
                    <h3 className="text-base font-extrabold text-on-surface">Vendor Volume Matrix</h3>
                    <p className="text-xs text-textMuted mt-1">Quote frequency per supplier across all procurement cycles.</p>
                  </div>
                  <div className="space-y-3">
                    {vendorList.map(([supplier, count]) => {
                      const maxCount = vendorList[0][1];
                      const pct = Math.round((count / maxCount) * 100);
                      return (
                        <div key={supplier} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-on-surface truncate max-w-[70%]">{supplier}</span>
                            <span className="font-extrabold text-primary shrink-0">{count} quote{count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="w-full bg-gray-50 rounded-full h-1.5">
                            <div className="bg-primary rounded-full h-1.5 transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {vendorList.length === 0 && (
                      <p className="text-xs text-textMuted italic text-center py-4">No vendor data in supplier matrix.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: COMMERCIAL CRM SALES DESK */}
          {activeTab === 'crm' && isCRMUser && (() => {
            const stages = [
              { stage: 'Lead', bg: 'bg-gray-50 border-gray-200', header: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' },
              { stage: 'Proposal Drafted', bg: 'bg-blue-50 border-blue-200', header: 'bg-blue-100 text-blue-900', dot: 'bg-blue-500' },
              { stage: 'Active Contract', bg: 'bg-emerald-50 border-emerald-200', header: 'bg-emerald-100 text-emerald-900', dot: 'bg-emerald-500' },
              { stage: 'Invoiced & Collected', bg: 'bg-purple-50 border-purple-200', header: 'bg-purple-100 text-purple-900', dot: 'bg-purple-500' }
            ];
            const totalPipeline = agreements.reduce((s, a) => s + Number(a.total_contract_value_mvr || 0), 0);

            return (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /> Commercial CRM Sales Pipeline</h3>
                    <p className="text-xs text-textMuted mt-0.5">Revenue opportunity tracker across all charter and contract agreements.</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-textMuted uppercase font-extrabold tracking-wider block">Total Pipeline Value</span>
                    <p className="text-lg font-extrabold text-primary">MVR {totalPipeline.toLocaleString()}</p>
                  </div>
                </div>

                {/* Kanban Pipeline — 4 stage columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stages.map(({ stage, bg, header, dot }) => {
                    const stageAgreements = agreements.filter(a => {
                      const s = a.agreement_status || (a.status === 'Active' ? 'Active Contract' : a.status === 'Pending' ? 'Lead' : 'Lead');
                      return s === stage;
                    });
                    const stageValue = stageAgreements.reduce((sum, a) => sum + Number(a.total_contract_value_mvr || 0), 0);
                    return (
                      <div key={stage} className={`rounded-xl border ${bg} flex flex-col`}>
                        <div className={`p-3 rounded-t-2xl ${header} flex justify-between items-center`}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                            <span className="text-xs font-extrabold uppercase tracking-wide">{stage}</span>
                          </div>
                          <span className="text-xs font-extrabold opacity-70">{stageAgreements.length}</span>
                        </div>
                        {stageValue > 0 && (
                          <div className="px-3 py-1 text-[10px] font-bold text-textMuted border-b border-current/10">
                            MVR {stageValue.toLocaleString()} pipeline
                          </div>
                        )}
                        <div className="flex-1 p-2 space-y-2 min-h-[200px]">
                          {stageAgreements.map(agr => {
                            const isExpanded = expandedContractId === agr.agreement_id;
                            let milestones = [];
                            try { milestones = JSON.parse(agr.billing_milestones || '[]'); } catch(e) {}
                            const paidCount = milestones.filter(m => m.status === 'Paid').length;
                            return (
                              <div key={agr.agreement_id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-3 cursor-pointer hover:bg-gray-50 transition" onClick={() => setExpandedContractId(isExpanded ? null : agr.agreement_id)}>
                                  <div className="flex justify-between items-start">
                                    <span className="text-[9px] font-extrabold text-textMuted uppercase">{agr.agreement_id}</span>
                                    {milestones.length > 0 && <span className="text-[9px] text-textMuted font-bold">{paidCount}/{milestones.length} paid</span>}
                                  </div>
                                  <h4 className="text-xs font-extrabold text-on-surface mt-0.5 leading-snug">{agr.client_name}</h4>
                                  <p className="text-[10px] text-textMuted font-medium mt-0.5 leading-snug line-clamp-2">{agr.project_scope || agr.rate_structure}</p>
                                  {agr.total_contract_value_mvr && (
                                    <div className="mt-1.5 flex justify-between items-center">
                                      <span className="text-[10px] text-textMuted">Value:</span>
                                      <span className="text-xs font-extrabold text-primary">MVR {Number(agr.total_contract_value_mvr).toLocaleString()}</span>
                                    </div>
                                  )}
                                  {milestones.length > 0 && (
                                    <div className="mt-1.5 w-full bg-gray-50 rounded-full h-1">
                                      <div className="bg-emerald-500 rounded-full h-1 transition-all" style={{ width: `${Math.round((paidCount / milestones.length) * 100)}%` }} />
                                    </div>
                                  )}
                                  <div className="mt-1.5 flex justify-end">
                                    {isExpanded ? <ChevronUp className="w-3 h-3 text-textMuted" /> : <ChevronDown className="w-3 h-3 text-textMuted" />}
                                  </div>
                                </div>
                                {isExpanded && (
                                  <div className="border-t border-dashed border-gray-100 bg-gray-50 p-3 space-y-2">
                                    <span className="text-[9px] uppercase font-extrabold text-textMuted tracking-wider block">Billing Milestones</span>
                                    {milestones.length === 0 ? (
                                      <p className="text-[10px] text-textMuted italic">No milestones defined.</p>
                                    ) : milestones.map((m, mIdx) => (
                                      <div key={mIdx} className="flex justify-between items-center text-[10px] py-1.5 border-b border-gray-100 last:border-0 gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-bold text-on-surface truncate">{m.milestone}</p>
                                          <p className="text-primary font-extrabold">MVR {Number(m.amount_mvr).toLocaleString()}</p>
                                        </div>
                                        {m.status === 'Paid' && <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[9px] font-extrabold shrink-0">Paid</span>}
                                        {m.status === 'Invoiced' && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[9px] font-extrabold shrink-0">Invoiced</span>}
                                        {m.status === 'Pending' && (
                                          <button
                                            onClick={e => { e.stopPropagation(); handleTriggerMilestoneInvoice(agr.agreement_id, mIdx); }}
                                            className="px-2 py-1 bg-primary text-white rounded text-[9px] font-extrabold shrink-0 hover:bg-primary-dark transition active:scale-95"
                                          >
                                            Trigger Invoice
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {stageAgreements.length === 0 && (
                            <p className="text-[10px] text-textMuted italic text-center py-6">No agreements in this stage.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* TAB 6: UNIVERSAL MASTER DATA MANAGER — IT ADMIN ONLY */}
          {activeTab === 'masterdata' && userEmail === 'alie.mustarq@gmail.com' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-red-950/90 border border-red-700 text-white flex items-start gap-3">
                <Terminal className="w-5 h-5 shrink-0 text-red-300 mt-0.5" />
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-300 block">[SYSTEM DEVELOPER MODE] — Universal Master Data Manager</span>
                  <p className="text-xs text-red-200 mt-1 font-medium">Direct atomic write access to Sheet_User_Registry and Sheet_Assets_Fleet. The Retroactive Backdated PR Tool simultaneously writes to 4 sheets and bypasses all stage-gate screens.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Registry Inline Edit */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                  <div className="border-b pb-3 border-dashed border-gray-100">
                    <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> User Registry Editor
                    </h3>
                    <p className="text-[10px] text-textMuted mt-1">Inline edit display names, roles, and status in Sheet_User_Registry.</p>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {users.map(u => {
                      const isEditing = editingUserEmail === u.email;
                      return (
                        <div key={u.email} className={`p-3 rounded-xl border text-xs transition ${isEditing ? 'border-primary bg-primary-container/10' : 'border-gray-100 bg-gray-50'}`}>
                          {isEditing ? (
                            <div className="space-y-2">
                              <input className="w-full p-2 border rounded-lg bg-white outline-none text-xs" value={userEditBuffer.display_name || ''} onChange={e => setUserEditBuffer(b => ({ ...b, display_name: e.target.value }))} placeholder="Display Name" />
                              <select className="w-full p-2 border rounded-lg bg-white outline-none text-xs font-bold" value={userEditBuffer.role || 'Requestee'} onChange={e => setUserEditBuffer(b => ({ ...b, role: e.target.value }))}>
                                {['Admin', 'Procurement', 'Finance', 'Supervisor', 'Requestee'].map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                              <select className="w-full p-2 border rounded-lg bg-white outline-none text-xs font-bold" value={userEditBuffer.status || 'Active'} onChange={e => setUserEditBuffer(b => ({ ...b, status: e.target.value }))}>
                                {['Active', 'Inactive', 'Pending'].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <div className="flex gap-2">
                                <button onClick={() => handleSaveUserEdit(u.email)} className="flex-1 py-1.5 bg-primary text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95"><Save className="w-3 h-3" /> Save</button>
                                <button onClick={() => setEditingUserEmail(null)} className="flex-1 py-1.5 bg-gray-200 rounded-lg font-bold text-[11px]">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-extrabold text-on-surface block">{u.display_name}</span>
                                <span className="text-textMuted text-[10px] italic block">{u.email}</span>
                                <div className="flex gap-1.5 mt-1">
                                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-bold">{u.role}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${u.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.status}</span>
                                </div>
                              </div>
                              <button onClick={() => { setEditingUserEmail(u.email); setUserEditBuffer({ ...u }); }} className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
                                <Edit2 className="w-3.5 h-3.5 text-textMuted" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Fleet Asset Inline Edit */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                  <div className="border-b pb-3 border-dashed border-gray-100">
                    <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" /> Fleet Asset Editor
                    </h3>
                    <p className="text-[10px] text-textMuted mt-1">Edit live status, location, and operator in Sheet_Assets_Fleet.</p>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {fleetAssets.map(a => {
                      const isEditing = editingAssetId === a.asset_id;
                      return (
                        <div key={a.asset_id} className={`p-3 rounded-xl border text-xs transition ${isEditing ? 'border-primary bg-primary-container/10' : 'border-gray-100 bg-gray-50'}`}>
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="text-[10px] font-extrabold text-primary">{a.asset_id} — {a.asset_name}</div>
                              <input className="w-full p-2 border rounded-lg bg-white outline-none text-xs" value={assetEditBuffer.live_status || ''} onChange={e => setAssetEditBuffer(b => ({ ...b, live_status: e.target.value }))} placeholder="Live Status" />
                              <input className="w-full p-2 border rounded-lg bg-white outline-none text-xs" value={assetEditBuffer.location || ''} onChange={e => setAssetEditBuffer(b => ({ ...b, location: e.target.value }))} placeholder="Location" />
                              <input className="w-full p-2 border rounded-lg bg-white outline-none text-xs" value={assetEditBuffer.current_operator || ''} onChange={e => setAssetEditBuffer(b => ({ ...b, current_operator: e.target.value }))} placeholder="Current Operator" />
                              <div className="flex gap-2">
                                <button onClick={() => handleSaveAssetEdit(a.asset_id)} className="flex-1 py-1.5 bg-primary text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95"><Save className="w-3 h-3" /> Save</button>
                                <button onClick={() => setEditingAssetId(null)} className="flex-1 py-1.5 bg-gray-200 rounded-lg font-bold text-[11px]">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-extrabold text-on-surface block">{a.asset_name}</span>
                                <span className="text-[10px] text-primary font-bold block">{a.asset_id}</span>
                                <span className="text-[10px] text-textMuted">{a.live_status} · {a.location}</span>
                              </div>
                              <button onClick={() => { setEditingAssetId(a.asset_id); setAssetEditBuffer({ ...a }); }} className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
                                <Edit2 className="w-3.5 h-3.5 text-textMuted" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Retroactive Backdated PR Tool */}
              <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 space-y-4">
                <div className="border-b pb-3 border-dashed border-red-200">
                  <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-600" />
                    Retroactive Backdated PR Tool
                  </h3>
                  <p className="text-xs text-textMuted mt-1">Atomic 4-sheet seed handshake: writes to Sheet_Purchase_Requests (Completed), Sheet_Item_Supplier_Matrix, Sheet_Finance_Ledger (Paid &amp; Cleared), and Sheet_Asset_History_Log simultaneously. Bypasses all stage-gate screens.</p>
                </div>
                <form onSubmit={handleBackfillRetroactivePR} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-bold block mb-1">Backdated Date &amp; Time</label>
                    <input type="datetime-local" value={retroDate} onChange={e => setRetroDate(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white outline-none shadow-sm" required />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Item / Spare Part Name</label>
                    <input type="text" value={retroItem} onChange={e => setRetroItem(e.target.value)} placeholder="e.g. Hydraulic Pump Assembly" className="w-full p-2.5 border rounded-xl bg-white outline-none shadow-sm" required />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Category</label>
                    <select value={retroCategory} onChange={e => setRetroCategory(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white outline-none shadow-sm font-semibold">
                      {['Consumables / General', 'MRO / General', 'Heavy Machinery Parts', 'Marine Parts', 'Electrical', 'Safety Equipment'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Target Asset / Base</label>
                    <input type="text" value={retroAssetBase} onChange={e => setRetroAssetBase(e.target.value)} placeholder="e.g. WL-HV-0008 or Thilafushi" className="w-full p-2.5 border rounded-xl bg-white outline-none shadow-sm" required />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Supplier Name</label>
                    <input type="text" value={retroSupplier} onChange={e => setRetroSupplier(e.target.value)} placeholder="e.g. Kashimaa Boat" className="w-full p-2.5 border rounded-xl bg-white outline-none shadow-sm" required />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Total Price (MVR)</label>
                    <input type="number" value={retroPrice} onChange={e => setRetroPrice(e.target.value)} placeholder="e.g. 15000" className="w-full p-2.5 border rounded-xl bg-white outline-none shadow-sm" required />
                  </div>
                  <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                    <button type="submit" disabled={retroSubmitting} className="px-6 py-3 bg-red-700 hover:bg-red-800 text-white rounded-xl font-extrabold text-xs transition shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-75 uppercase tracking-wider">
                      {retroSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                      Atomic Seed Handshake — Write to 4 Sheets
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: ACCESS RIGHTS CONTROL */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="border-b pb-4 border-dashed border-gray-100">
                <h3 className="text-base font-extrabold text-on-surface">Staff Access Authorization Panel</h3>
                <p className="text-xs text-textMuted mt-1">Elevate user roles instantly or suspend operational accounts to protect data privacy.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="p-3 text-xs font-extrabold uppercase text-textMuted tracking-wider">Staff Display Name</th>
                      <th className="p-3 text-xs font-extrabold uppercase text-textMuted tracking-wider">Email Profile ID</th>
                      <th className="p-3 text-xs font-extrabold uppercase text-textMuted tracking-wider">Assigned Role Authority</th>
                      <th className="p-3 text-xs font-extrabold uppercase text-textMuted tracking-wider">Platform Status</th>
                      <th className="p-3 text-xs font-extrabold uppercase text-textMuted tracking-wider text-right">Instant Handshake</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.email} className="border-b border-gray-100 odd:bg-white even:bg-gray-50/50 hover:bg-emerald-50/40 transition">
                        <td className="p-3 font-extrabold text-on-surface">{u.display_name}</td>
                        <td className="p-3 text-primary font-semibold italic">{u.email}</td>
                        <td className="p-3 font-semibold">
                          <select 
                            value={u.role}
                            onChange={e => handleUserRoleChange(u.email, e.target.value)}
                            className="p-2 border border-gray-100 rounded-lg bg-white text-xs font-bold outline-none"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Procurement">Procurement</option>
                            <option value="Finance">Finance</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Requestee">Requestee</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select 
                            value={u.status}
                            onChange={e => handleUserStatusChange(u.email, e.target.value)}
                            className="p-2 border border-gray-100 rounded-lg bg-white text-xs font-bold outline-none"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => handleUserStatusChange(u.email, u.status === 'Active' ? 'Inactive' : 'Active')}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition border shadow-sm active:scale-95 ${
                              u.status === 'Active' 
                                ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200' 
                                : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                            }`}
                          >
                            {u.status === 'Active' ? 'Suspend Access' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── 2. PROCUREMENT OFFICER PORTAL ────────────────────────────────────────────

function ProcurementDashboard({ db, onRefresh, showToast }) {
  const [prRequests, setPrRequests] = useState(db.purchaseRequests || []);
  const [inventory, setInventory] = useState(db.inventoryLedger || []);
  const [matrix, setMatrix] = useState(db.itemSupplierMatrix || []);
  
  const [activePrId, setActivePrId] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('verification');

  // Verify and Mark Checked
  const handleMarkChecked = async (prId) => {
    const pr = prRequests.find(p => p.pr_id === prId);
    if (!pr) return;
    try {
      const updated = { ...pr, status: 'Checked' };
      await api.updateRecord('Sheet_Purchase_Requests', 'pr_id', prId, updated);
      showToast(`Verification Successful. Request ticket marked as Checked.`);
      onRefresh();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // Quote counter tracker
  const getQuotesCount = (itemGenericName) => {
    return matrix.filter(m => m.generic_item_id === itemGenericName).length;
  };

  // Drag and Drop Logic
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!activePrId) {
      showToast("Please select a pending Purchase Request from the left deck first!", "error");
      return;
    }

    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    const file = files[0];
    if (file.type !== 'application/pdf') {
      showToast("Please upload standard quotation PDF documents only.", "error");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        showToast("Gemini AI analyzing quote. Renaming and uploading to Drive...");
        
        const result = await api.uploadQuote(activePrId, base64Data, file.name);
        showToast(`Quotation Mapped Successfully!\nSupplier: ${result.supplierName}\nPrice: MVR ${result.quotedPriceMvr.toLocaleString()}`);
        onRefresh();
      } catch (err) {
        showToast("AI Extraction Failed: " + err.message, "error");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    if (!activePrId) {
      showToast("Please select a pending Purchase Request first!", "error");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        showToast("Gemini Quote extraction pipeline running...");
        const result = await api.uploadQuote(activePrId, base64Data, file.name);
        showToast(`Quotation Parsed!\nSupplier: ${result.supplierName}\nRate: MVR ${result.quotedPriceMvr.toLocaleString()}`);
        onRefresh();
      } catch (err) {
        showToast("AI Parsing Exception: " + err.message, "error");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit sourcing package to GM once 3+ quotes are collected
  const handleSubmitSourcingPackage = async (prId) => {
    try {
      await api.submitSourcingPackage(prId);
      showToast(`Sourcing package for ${prId} submitted to GM. Compliance lock cleared.`);
      onRefresh();
    } catch (err) {
      showToast('Package submission failed: ' + err.message, 'error');
    }
  };

  // Atomic Item delivery receipt
  const handleDeliveryReceipt = async (prId) => {
    const qtyStr = prompt("Enter physical quantity received to update inventory atomically:", "1");
    if (!qtyStr) return;
    const qty = parseInt(qtyStr);
    if (isNaN(qty) || qty <= 0) {
      showToast("Invalid quantity value.", "error");
      return;
    }
    const loc = prompt("Confirm destination storage site (Thilafushi / Muthaafushi / Bodufinolhu):", "Thilafushi");
    if (!loc) return;

    try {
      await api.receiveItems(prId, qty, loc);
      showToast("Inventory atomically incremented! Requisition ticket completed.");
      onRefresh();
    } catch (err) {
      showToast("Error updating items: " + err.message, "error");
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex border-b border-gray-100 space-x-4">
        <button
          onClick={() => setActiveSubTab('verification')}
          className={`flex items-center gap-1.5 pb-2.5 text-xs md:text-sm font-bold border-b-2 transition ${
            activeSubTab === 'verification' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-on-surface'
          }`}
        >
          <Wrench className="w-4 h-4" /> Requisition Verification Box
        </button>
        <button
          onClick={() => setActiveSubTab('sourcing')}
          className={`flex items-center gap-1.5 pb-2.5 text-xs md:text-sm font-bold border-b-2 transition ${
            activeSubTab === 'sourcing' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-on-surface'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> RFQ Sourcing & Quote Upload
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'verification' ? (
          <motion.div 
            key="verification"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* PR Inbox */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-on-surface">Requisitions Verification Queue</h3>
                <p className="text-xs text-textMuted mt-1">Audit raw field maintenance tickets. Analyze current stock balances across Thilafushi, Muthaafushi, and Bodufinolhu.</p>
              </div>

              <div className="space-y-4">
                {prRequests.filter(p => p.status === 'Request Received').map(pr => {
                  const stocks = inventory.filter(i => i.generic_item_id.toLowerCase().trim() === pr.item_generic_name.toLowerCase().trim());
                  
                  return (
                    <div key={pr.pr_id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-4">
                      <div className="flex justify-between items-start border-b border-dashed pb-2 border-gray-100">
                        <div>
                          <span className="text-xs font-bold text-primary">{pr.pr_id}</span>
                          <h4 className="text-sm font-extrabold text-on-surface mt-0.5">{pr.item_generic_name}</h4>
                          <span className="text-[10px] text-textMuted font-bold mt-1 block">Linkage Target: <span className="text-on-surface">{pr.target_use}</span></span>
                        </div>
                        {getStatusBadge(pr.status)}
                      </div>

                      <div className="text-xs space-y-3.5">
                        <p className="bg-gray-50 p-2.5 rounded-lg border italic text-textMuted">
                          Justification: "{pr.justification}"
                        </p>
                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <span className="text-textMuted font-bold">Requested Quantity: </span>
                          <span className="font-extrabold text-primary text-sm">{pr.quantity} units</span>
                        </div>

                        {/* Inventory Site Lookup */}
                        <div className="p-3 rounded-xl border border-gray-100 bg-white/60 space-y-2">
                          <span className="font-extrabold text-on-surface text-[10px] uppercase tracking-wider block">Relational Multi-Site stock checking</span>
                          {stocks.length === 0 ? (
                            <span className="text-red-600 font-extrabold block text-xs bg-red-50 p-2 rounded border border-red-100 flex items-center gap-1">
                              <XCircle className="w-4 h-4" /> Inventory Deficit: 0 items in stock across base and active project sites
                            </span>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {stocks.map((stk, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[11px] p-2 bg-gray-50 border rounded-lg">
                                  <span className="font-bold text-on-surface">{stk.location_base}:</span>
                                  {getInventoryBadge(stk.quantity)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button 
                          onClick={() => handleMarkChecked(pr.pr_id)}
                          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-sm hover:bg-primary-dark transition active:scale-95 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Verify & Mark "Checked"
                        </button>
                      </div>
                    </div>
                  );
                })}
                {prRequests.filter(p => p.status === 'Request Received').length === 0 && (
                  <p className="text-xs text-center text-textMuted py-8 italic">No raw requisitions waiting for verification.</p>
                )}
              </div>
            </div>

            {/* Live Inventory Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-on-surface">Unified Stock Ledger</h3>
                <p className="text-xs text-textMuted mt-1">Audited real-time balances across Base depot and Outer project sites.</p>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {inventory.map((inv, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50 space-y-1.5 shadow-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-on-surface">{inv.item_name}</span>
                      {getInventoryBadge(inv.quantity)}
                    </div>
                    <span className="text-[10px] text-textMuted font-bold block flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500" /> {inv.location_base}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="sourcing"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* RFQ Sourcing Deck */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-on-surface">RFQ Sourcing & Sourcing Receipt</h3>
                <p className="text-xs text-textMuted mt-1">Upload supplier quotes for approved requests. Perform delivery receipts on orders where POs have been issued.</p>
              </div>

              <div className="space-y-4">
                {prRequests.filter(p => p.status === 'PR_Approved' || p.status === 'PO_Raised').map(pr => {
                  const isActive = activePrId === pr.pr_id;
                  const quotesCount = getQuotesCount(pr.item_generic_name);
                  const remainingQuotes = 3 - quotesCount;

                  return (
                    <div
                      key={pr.pr_id}
                      onClick={() => pr.status === 'PR_Approved' && setActivePrId(pr.pr_id)}
                      className={`p-4 rounded-xl border transition relative overflow-hidden ${
                        pr.status === 'PR_Approved' ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        isActive
                          ? 'border-primary bg-primary-container/10 shadow-sm'
                          : 'border-gray-100 bg-gray-50 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-primary block">{pr.pr_id}</span>
                          <h4 className="text-sm font-extrabold text-on-surface mt-0.5">{pr.item_generic_name}</h4>
                          <span className="text-[10px] text-textMuted font-bold block mt-1">Asset link: {pr.target_use}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border uppercase ${
                            quotesCount >= 3 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-700'
                          }`}>Quotes: {quotesCount}</span>
                          {getStatusBadge(pr.status)}
                        </div>
                      </div>

                      <div className="mt-3 flex justify-between items-center text-xs pt-2 border-t border-dashed border-gray-100">
                        <span className="font-medium text-textMuted">Requested by: <span className="font-bold text-on-surface">{pr.requested_by_email}</span></span>
                        <span className="font-extrabold text-secondary">Qty: {pr.quantity}</span>
                      </div>

                      {pr.status === 'PR_Approved' && (
                        <div className="mt-3 pt-3 border-t border-dashed border-gray-100 space-y-2">
                          {quotesCount < 3 ? (
                            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                              <div className="text-xs font-medium text-orange-950">
                                <p className="font-black text-[10px] uppercase tracking-wider text-orange-800 mb-0.5">
                                  Compliance Block: {remainingQuotes} more quote{remainingQuotes !== 1 ? 's' : ''} required
                                </p>
                                Minimum of 3 competitive supplier quotes required to satisfy procurement audit rules.
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubmitSourcingPackage(pr.pr_id);
                              }}
                              className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                            >
                              <Send className="w-3.5 h-3.5" /> Submit Sourcing Package to GM
                            </button>
                          )}
                        </div>
                      )}

                      {pr.status === 'PO_Raised' && (
                        <div className="mt-3 pt-3 border-t border-dashed border-gray-100 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeliveryReceipt(pr.pr_id);
                            }}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1 active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" /> Acknowledge Atomic Receipt & Delivered
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {prRequests.filter(p => p.status === 'PR_Approved' || p.status === 'PO_Raised').length === 0 && (
                  <p className="text-xs text-center text-textMuted py-8 italic">No purchase requests waiting in procurement RFQ/Sourcing pipeline.</p>
                )}
              </div>
            </div>

            {/* Quote Uploader Dropzone */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-on-surface">Gemini Pricing Extraction Desk</h3>
                <p className="text-xs text-textMuted mt-1">Upload incoming PDF supplier quotes. The system automatically structures pricing details and updates historical matrices.</p>
              </div>

              {activePrId ? (
                <div className="p-4 rounded-xl bg-primary-container/10 border border-primary border-dashed text-center space-y-4">
                  <div className="space-y-0.5">
                    <span className="text-xs text-primary font-bold block">Active Request: {activePrId}</span>
                    <span className="text-[10px] text-textMuted block font-medium">Binds quotes for item: "{prRequests.find(p => p.pr_id === activePrId)?.item_generic_name}"</span>
                  </div>
                  
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleFileDrop}
                    className={`p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center space-y-3 transition cursor-pointer ${
                      isDragging 
                        ? 'border-primary bg-primary-container/30' 
                        : 'border-outline hover:bg-gray-50'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-xs text-textMuted font-bold">Extracting PDF with Gemini API...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-outline" />
                        <span className="text-xs font-bold text-on-surface block">Upload Supplier Quotes Here</span>
                        <span className="text-[10px] text-textMuted font-medium">Drop quotation PDF file here or click below</span>
                        <input 
                          type="file" 
                          accept="application/pdf"
                          onChange={handleFileSelect}
                          className="hidden" 
                          id="quote-file-uploader" 
                        />
                        <label 
                          htmlFor="quote-file-uploader"
                          className="px-3.5 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-[11px] font-bold cursor-pointer transition inline-block shadow-sm"
                        >
                          Choose PDF
                        </label>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-gray-50/40 text-center border border-gray-100 text-xs text-textMuted italic font-medium">
                  Select an active Sourcing Request on the left workspace to display the Gemini quote uploader.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── 3. FINANCE DISBURSEMENT PORTAL ──────────────────────────────────────────

function FinanceDashboard({ db, onRefresh, showToast }) {
  const finance = (db.financeLedger || []).map(normalizeFinanceEntry);
  const prRequests = db.purchaseRequests || [];
  const procurementLedger = finance.filter(f => f.ledger_type === 'PROCUREMENT_EXPENSE');
  const revenueLedger = finance.filter(f => f.ledger_type === 'CRM_REVENUE');
  const disbursementQueue = procurementLedger.filter(f => ['Awaiting Action', 'Submitted to Antrac'].includes(f.payment_clearance_status));
  const payableTotal = procurementLedger.reduce((sum, f) => sum + Number(f.total_amount_mvr || 0), 0);
  const revenueTotal = revenueLedger.reduce((sum, f) => sum + Number(f.total_amount_mvr || 0), 0);

  const handleSendToAntrac = async (referenceId) => {
    try {
      await api.submitPoToAntracFinance(referenceId);
      showToast(`PO ${referenceId} sent to Antrac finance.`);
      onRefresh();
    } catch (err) {
      showToast('Antrac dispatch failed: ' + err.message, 'error');
    }
  };

  const handleClearAndRelease = async (referenceId) => {
    const bankRef = prompt('Enter bank reference number for payment clearance:', '');
    if (!bankRef) return;
    try {
      await api.clearPaymentHandshake(referenceId, bankRef);
      showToast(`Payment cleared for ${referenceId}. Stock release unlocked.`);
      onRefresh();
    } catch (err) {
      showToast('Clearance failed: ' + err.message, 'error');
    }
  };

  const getPr = (referenceId) => prRequests.find(pr => pr.pr_id === referenceId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6 space-y-2">
          <span className="text-[10px] uppercase font-extrabold text-amber-700 tracking-wider">Immediate Queue</span>
          <p className="text-2xl font-extrabold text-amber-900">{disbursementQueue.length}</p>
          <p className="text-[10px] text-amber-800/80 font-medium">Procurement payments awaiting finance action</p>
        </div>
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6 space-y-2">
          <span className="text-[10px] uppercase font-extrabold text-red-700 tracking-wider">Procurement Exposure</span>
          <p className="text-2xl font-extrabold text-red-700">MVR {payableTotal.toLocaleString()}</p>
          <p className="text-[10px] text-red-900/70 font-medium">Tagged as PROCUREMENT_EXPENSE</p>
        </div>
        <div className="bg-emerald-50 rounded-xl shadow-sm border border-emerald-100 p-6 space-y-2">
          <span className="text-[10px] uppercase font-extrabold text-emerald-700 tracking-wider">CRM Revenue Ledger</span>
          <p className="text-2xl font-extrabold text-emerald-700">MVR {revenueTotal.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-900/70 font-medium">Tagged as CRM_REVENUE</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-4 border-dashed border-gray-100">
          <div>
            <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Immediate Disbursement Queue
            </h3>
            <p className="text-xs text-textMuted mt-1">Finance-only control desk for payable POs, Antrac submission, and bank clearance release.</p>
          </div>
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">Finance Gate</span>
        </div>

        <div className="space-y-3">
          {disbursementQueue.map(entry => {
            const pr = getPr(entry.reference_id);
            const submitted = entry.payment_clearance_status === 'Submitted to Antrac';
            return (
              <div key={entry.transaction_id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="lg:col-span-2 space-y-1">
                  <span className="font-extrabold text-primary block">{entry.transaction_id}</span>
                  <h4 className="text-sm font-extrabold text-on-surface">{pr?.item_generic_name || entry.reference_id}</h4>
                  <p className="text-textMuted font-semibold">Supplier: <span className="text-on-surface">{entry.counterparty_name}</span></p>
                  <p className="text-textMuted font-semibold">Reference: <span className="text-on-surface">{entry.reference_id}</span> | Type: <span className="text-on-surface">{entry.reference_type}</span></p>
                </div>
                <div className="space-y-1">
                  <span className="text-textMuted font-bold block">Amount Due</span>
                  <p className="text-lg font-extrabold text-on-surface">MVR {Number(entry.total_amount_mvr || 0).toLocaleString()}</p>
                  {getStatusBadge(entry.payment_clearance_status)}
                </div>
                <div className="flex flex-col justify-center gap-2">
                  <button
                    onClick={() => handleSendToAntrac(entry.reference_id)}
                    disabled={submitted}
                    className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> Send to Antrac
                  </button>
                  <button
                    onClick={() => handleClearAndRelease(entry.reference_id)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Clear & Release Stock
                  </button>
                </div>
              </div>
            );
          })}
          {disbursementQueue.length === 0 && (
            <p className="text-xs text-center text-textMuted py-8 italic">No procurement expenses are waiting for finance action.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="border-b pb-4 border-dashed border-gray-100">
          <h3 className="text-base font-extrabold text-on-surface">Unified Ledger Separation</h3>
          <p className="text-xs text-textMuted mt-1">All finance rows remain in one sheet while reporting is separated by ledger type and reference type.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="p-3 font-extrabold uppercase text-textMuted">Transaction</th>
                <th className="p-3 font-extrabold uppercase text-textMuted">Ledger Type</th>
                <th className="p-3 font-extrabold uppercase text-textMuted">Reference</th>
                <th className="p-3 font-extrabold uppercase text-textMuted">Counterparty</th>
                <th className="p-3 font-extrabold uppercase text-textMuted text-right">Amount</th>
                <th className="p-3 font-extrabold uppercase text-textMuted text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {finance.map(entry => (
                <tr key={entry.transaction_id} className="border-b border-gray-100 odd:bg-white even:bg-gray-50/50 hover:bg-emerald-50/40 transition">
                  <td className="p-3 font-extrabold text-primary">{entry.transaction_id}</td>
                  <td className="p-3 font-bold">{entry.ledger_type}</td>
                  <td className="p-3 font-semibold">{entry.reference_id}</td>
                  <td className="p-3 font-semibold">{entry.counterparty_name}</td>
                  <td className="p-3 font-extrabold text-right">MVR {Number(entry.total_amount_mvr || 0).toLocaleString()}</td>
                  <td className="p-3 text-right">{getStatusBadge(entry.payment_clearance_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 4. FIELD REQUESTEE PORTAL ────────────────────────────────────────────────

function RequesteeDashboard({ db, onRefresh, showToast }) {
  const [inventory, setInventory] = useState(db.inventoryLedger || []);
  const [filterSite, setFilterSite] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Part requisition fields
  const [itemGenericName, setItemGenericName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [justification, setJustification] = useState('');
  const [linkageType, setLinkageType] = useState('asset'); // 'asset' or 'location'
  const [targetLinkage, setTargetLinkage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Submit Requisition
  const handleRequisitionSubmit = async (e) => {
    e.preventDefault();
    if (!itemGenericName || !quantity || !justification || !targetLinkage) {
      showToast("All fields are mandatory for audit compliance.", "error");
      return;
    }

    setSubmitting(true);
    const prId = "PR-" + Math.floor(1000 + Math.random() * 9000);
    try {
      const record = {
        pr_id: prId,
        item_generic_name: itemGenericName,
        category: "Consumables / General",
        quantity: parseInt(quantity),
        justification: justification,
        target_use: targetLinkage, // bound explicitly to asset ID or base location
        requested_by_email: api.getSessionEmail(),
        assigned_officer: "Pending Assignment",
        target_drive_folder_id: "",
        status: "Request Received",
        maintenance_trigger_type: linkageType === 'asset' ? 'Corrective Maintenance' : 'Scheduled Consumable'
      };
      
      await api.updateRecord('Sheet_Purchase_Requests', 'pr_id', prId, record);
      showToast(`Requisition Ticket Raised: ${prId}`);
      setItemGenericName('');
      setQuantity('');
      setJustification('');
      setTargetLinkage('');
      onRefresh();
    } catch (err) {
      showToast("Ticket submission failed: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter(i => {
    const matchesSite = filterSite === 'All' || i.location_base.toLowerCase() === filterSite.toLowerCase();
    const matchesSearch = i.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSite && matchesSearch;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      
      {/* Real-time material inventory lookup */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h3 className="text-base font-extrabold text-on-surface">Material Stock Balance Lookup</h3>
            <p className="text-xs text-textMuted mt-1">Live read-only inventory index search across Base depot and Outer project sites.</p>
          </div>
          
          {/* Site Filter Tabs */}
          <div className="flex bg-gray-50 rounded-xl p-0.5 text-[11px] font-bold border shrink-0">
            {['All', 'Thilafushi', 'Muthaafushi', 'Bodufinolhu'].map(site => (
              <button
                key={site}
                onClick={() => setFilterSite(site)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterSite === site 
                    ? 'bg-white text-primary shadow-sm' 
                    : 'text-textMuted hover:text-on-surface'
                }`}
              >
                {site}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <input 
          type="text" 
          placeholder="Search materials catalog..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full p-3 text-xs border border-gray-100 rounded-xl bg-gray-50est/80 focus:border-primary transition outline-none shadow-sm"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredInventory.map((item, idx) => (
            <div key={idx} className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl flex justify-between items-center text-xs shadow-sm hover:bg-gray-50/45 transition">
              <div>
                <span className="font-extrabold text-on-surface block">{item.item_name}</span>
                <span className="text-[10px] text-textMuted font-bold mt-1.5 block flex items-center gap-0.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500" /> {item.location_base}
                </span>
              </div>
              {getInventoryBadge(item.quantity)}
            </div>
          ))}
        </div>
      </div>

      {/* Requisition creation form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-on-surface">Raise Material Requisition</h3>
          <p className="text-xs text-textMuted mt-1">Binds maintenance requirements strictly to Asset IDs (for OEM parts) or Base Locations (for MRO consumables).</p>
        </div>

        <form onSubmit={handleRequisitionSubmit} className="space-y-4 text-xs text-left">
          <div>
            <label className="font-bold block mb-1">Generic Item / Spare Part Name</label>
            <input 
              type="text" 
              placeholder="e.g. Excavator PC350 Bucket Teeth"
              value={itemGenericName}
              onChange={e => setItemGenericName(e.target.value)}
              className="w-full p-3 border rounded-xl bg-white outline-none shadow-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="font-bold block">Audit compliance link</label>
            <div className="flex bg-gray-50 rounded-xl p-0.5 border">
              <button 
                type="button" 
                onClick={() => { setLinkageType('asset'); setTargetLinkage(''); }}
                className={`flex-1 py-1.5 rounded-lg text-center font-bold transition ${
                  linkageType === 'asset' ? 'bg-white text-primary shadow' : 'text-textMuted'
                }`}
              >
                Fleet Asset Link (OEM)
              </button>
              <button 
                type="button" 
                onClick={() => { setLinkageType('location'); setTargetLinkage(''); }}
                className={`flex-1 py-1.5 rounded-lg text-center font-bold transition ${
                  linkageType === 'location' ? 'bg-white text-primary shadow' : 'text-textMuted'
                }`}
              >
                Base Site Link (MRO)
              </button>
            </div>

            <div>
              <label className="font-semibold block mb-1 text-textMuted">
                {linkageType === 'asset' ? 'Target Fleet Asset ID (Mandatory)' : 'Bound Location Base Site (Mandatory)'}
              </label>
              {linkageType === 'asset' ? (
                <input 
                  type="text" 
                  placeholder="e.g. WL-HV-0008 (Volvo A40G / PC350)"
                  value={targetLinkage}
                  onChange={e => setTargetLinkage(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-white outline-none shadow-sm"
                  required
                />
              ) : (
                <select 
                  value={targetLinkage}
                  onChange={e => setTargetLinkage(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-white outline-none shadow-sm font-semibold"
                  required
                >
                  <option value="">Select Base Linkage...</option>
                  <option value="Thilafushi Base">Thilafushi Depot</option>
                  <option value="Muthaafushi Site">Muthaafushi Project</option>
                  <option value="Bodufinolhu Site">Bodufinolhu Project</option>
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="font-bold block mb-1">Requisition Qty</label>
            <input 
              type="number" 
              placeholder="e.g. 5"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full p-3 border rounded-xl bg-white outline-none shadow-sm"
              required
            />
          </div>

          <div>
            <label className="font-bold block mb-1">Audit Justification Narrative</label>
            <textarea 
              placeholder="Explain the maintenance failure context or consumption baseline requirements for this request..."
              value={justification}
              onChange={e => setJustification(e.target.value)}
              className="w-full p-3 border rounded-xl bg-white h-24 outline-none shadow-sm resize-none"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary hover:bg-primary-dark font-bold text-white rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-75"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" /> Raise Maintenance Requisition
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  );
}

// ── 4. SUPERVISOR PORTAL BACKWARD COMPAT LAYER ───────────────────────────────

function SupervisorDashboard({ db, onRefresh, showToast }) {
  // Map Supervisor dashboard to Procurement Verification Queue (they share this logic for audit review!)
  return (
    <div className="space-y-4">
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-950 flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-yellow-800" />
        <div>
          <span className="font-bold block uppercase text-[10px] tracking-wider text-yellow-900">Site Supervisor Operations Mode</span>
          Inspect incoming tickets for active projects. Perform stock audit checks and push verified rows to Gate 1.
        </div>
      </div>
      <ProcurementDashboard db={db} onRefresh={onRefresh} showToast={showToast} />
    </div>
  );
}
