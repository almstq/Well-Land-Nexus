// =========================================================================
//                   WELL LAND OPS v3.0 - API GATEWAY SERVICE
// =========================================================================

import { ENTITY_CONFIG, getEntityConfig } from '../entities/entityConfig';
import schemasAndSeeds from '../db_schemas/schemas_and_seeds.json';

// Utility to get the Google Apps Script Web App URL from environment
export const getAppsScriptUrl = () => {
  return import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '';
};

// --- AUTHENTICATION & PERSISTENCE ---

export const getSessionUser = () => {
  const user = sessionStorage.getItem('wlOpsv3_user');
  return user ? JSON.parse(user) : null;
};

export const setSessionUser = (user) => {
  if (user) {
    sessionStorage.setItem('wlOpsv3_user', JSON.stringify(user));
    sessionStorage.setItem('wlOpsv3_email', user.email);
  } else {
    sessionStorage.removeItem('wlOpsv3_user');
    sessionStorage.removeItem('wlOpsv3_email');
  }
};

export const getSessionEmail = () => {
  return sessionStorage.getItem('wlOpsv3_email') || '';
};

// --- CENTRAL NETWORK TRANSPORT WRAPPER ---

export const callAppsScript = async (action, data = {}) => {
  const url = getAppsScriptUrl();
  if (!url) {
    console.warn("VITE_GOOGLE_APPS_SCRIPT_URL is not defined. Falling back to local mock storage.");
    return handleMockRequest(action, data);
  }

  // Auto-inject the active user's email into EVERY transaction payload
  const userEmail = getSessionEmail();
  const payload = {
    action,
    userEmail,
    ...data
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // standard CORS workaround for Apps Script Web Apps
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  } catch (err) {
    console.error(`Apps Script transaction [${action}] failed:`, err.message);
    throw err;
  }
};

// --- API ACTIONS LAYER ---

// 1. Relational database retrieval
export const fetchDatabase = async () => {
  try {
    const res = await callAppsScript('getDatabase');
    return res;
  } catch (err) {
    console.warn("Fetch database failed, loading local storage mock database:", err.message);
    return getLocalMockDb();
  }
};

// 2. Generic row creation and editing
export const updateRecord = async (tableName, pkName, pkValue, record) => {
  const res = await callAppsScript('updateRecord', {
    tableName,
    pkName,
    pkValue,
    record
  });
  
  // If running in local mock fallback mode, update mock storage too
  if (!getAppsScriptUrl()) {
    updateMockRecordLocal(tableName, pkName, pkValue, record);
  }
  return res;
};

// 3. Purchase Requisitions - upload quote and extract with Gemini
export const uploadQuote = async (prId, fileBase64, fileName) => {
  return await callAppsScript('uploadQuote', {
    pr_id: prId,
    fileBase64,
    fileName
  });
};

// 4. Quote Approval - raises PO and sets finance status to Payable
export const approveQuote = async (prId, supplierName, priceMvr) => {
  return await callAppsScript('approveQuote', {
    pr_id: prId,
    supplierName,
    priceMvr
  });
};

// 5. Submit PO to Antrac accounts department (Antrac Finance payment dispatch)
export const submitPoToAntracFinance = async (prId) => {
  return await callAppsScript('submitPoToAntracFinance', {
    pr_id: prId
  });
};

// 6. Clear payment & release stock handshake
export const clearPaymentHandshake = async (prId, bankRef) => {
  return await callAppsScript('clearPaymentHandshake', {
    pr_id: prId,
    bankRef
  });
};

// 7. Receive items - increments inventory atomically
export const receiveItems = async (prId, receivedQty, targetLocation) => {
  return await callAppsScript('receiveItems', {
    pr_id: prId,
    receivedQty,
    targetLocation
  });
};

// 8. Reset database default seeds
export const seedDefaults = async () => {
  return await callAppsScript('seedDefaults');
};

// 9. Submit sourcing package to GM for executive bid selection
export const submitSourcingPackage = async (prId) => {
  return await callAppsScript('submitSourcingPackage', { pr_id: prId });
};

// 10. Log an asset/fleet history event
export const logHistoryEntry = async (eventType, assetId, location, notes, backdatedTimestamp) => {
  return await callAppsScript('logHistoryEntry', {
    event_type: eventType,
    asset_id: assetId,
    location,
    notes,
    timestamp: backdatedTimestamp || new Date().toISOString(),
    triggered_by_email: getSessionEmail()
  });
};

// 11. Retroactive backdated PR — atomic 4-sheet seed handshake, bypasses all stage-gates
export const backfillRetroactivePR = async (payload) => {
  return await callAppsScript('backfillRetroactivePR', payload);
};

// 12. Trigger a billing milestone invoice on an active CRM agreement
export const triggerMilestoneInvoice = async (agreementId, milestoneIndex) => {
  return await callAppsScript('triggerMilestoneInvoice', { agreement_id: agreementId, milestone_index: milestoneIndex });
};

const getSchemaFields = (tableName) => {
  const rows = schemasAndSeeds[tableName] || [];
  if (rows.length > 0) {
    return Object.keys(rows[0]);
  }
  if (tableName === 'Sheet_Audit_Log') {
    return ['audit_id', 'timestamp', 'entity_type', 'entity_id', 'action', 'old_value_json', 'new_value_json', 'effective_date', 'corrected_by_email', 'correction_reason', 'affected_records_json'];
  }
  if (tableName === 'Sheet_Locations') {
    return ['location_id', 'location_name', 'location_type', 'status', 'maps_coordinates'];
  }
  if (tableName === 'Sheet_Issue_Tickets') {
    return ['ticket_id', 'raised_by_email', 'reported_by_id', 'location_id', 'asset_id', 'items_required_json', 'status', 'severity', 'description', 'created_at', 'updated_at', 'resolved_at'];
  }
  return [];
};

const validateEntityPatch = (type, patch) => {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('Patch must be an object.');
  }
  const { tableName } = getEntityConfig(type);
  const allowed = getSchemaFields(tableName);
  const invalid = Object.keys(patch).filter(key => !allowed.includes(key));
  if (invalid.length > 0) {
    throw new Error(`Invalid field(s) for ${type}: ${invalid.join(', ')}`);
  }
};

const createAuditRecord = ({ type, id, action, oldValue, newValue, correctionMeta = {} }) => ({
  audit_id: 'AUD-' + Math.floor(100000 + Math.random() * 900000),
  timestamp: new Date().toISOString(),
  entity_type: type,
  entity_id: id,
  action,
  old_value_json: JSON.stringify(oldValue || {}),
  new_value_json: JSON.stringify(newValue || {}),
  effective_date: correctionMeta.effective_date || new Date().toISOString().split('T')[0],
  corrected_by_email: getSessionEmail(),
  correction_reason: correctionMeta.correction_reason || '',
  affected_records_json: JSON.stringify(correctionMeta.affected_records || [])
});

export const entityCrud = {
  updateCurrent: async (type, id, patch) => {
    validateEntityPatch(type, patch);
    const config = getEntityConfig(type);
    const db = await fetchDatabase();
    const current = (db[config.collectionKey] || []).find(row => row[config.pkName]?.toString() === id?.toString());
    const record = { ...(current || {}), ...patch, [config.pkName]: id };
    const result = await callAppsScript('entityUpdateCurrent', {
      entityType: type,
      tableName: config.tableName,
      pkName: config.pkName,
      pkValue: id,
      record
    });

    if (type === 'issue_ticket') {
      const auditRecord = createAuditRecord({
        type,
        id,
        action: current ? 'Ticket Current Update' : 'Ticket Created',
        oldValue: current || {},
        newValue: record,
        correctionMeta: {
          effective_date: new Date().toISOString().split('T')[0],
          correction_reason: current ? 'Issue ticket current-state update.' : 'Issue ticket created from operational form.',
          affected_records: [id, record.asset_id].filter(Boolean)
        }
      });
      await updateRecord('Sheet_Audit_Log', 'audit_id', auditRecord.audit_id, auditRecord);
    }

    return result;
  },

  correctHistorical: async (type, id, patch, correctionMeta) => {
    validateEntityPatch(type, patch);
    if (!correctionMeta?.correction_reason || !correctionMeta?.effective_date) {
      throw new Error('Historical correction requires correction_reason and effective_date.');
    }
    const config = getEntityConfig(type);
    return await callAppsScript('entityCorrectHistorical', {
      entityType: type,
      tableName: config.tableName,
      pkName: config.pkName,
      pkValue: id,
      patch,
      correctionMeta: {
        correction_reason: correctionMeta.correction_reason,
        effective_date: correctionMeta.effective_date,
        affected_records: correctionMeta.affected_records || []
      }
    });
  },

  softDelete: async (type, id, reason = 'Soft delete requested') => {
    const config = getEntityConfig(type);
    return await callAppsScript('entitySoftDelete', {
      entityType: type,
      tableName: config.tableName,
      pkName: config.pkName,
      pkValue: id,
      reason
    });
  },

  restore: async (type, id) => {
    const config = getEntityConfig(type);
    return await callAppsScript('entityRestore', {
      entityType: type,
      tableName: config.tableName,
      pkName: config.pkName,
      pkValue: id
    });
  }
};

export const raiseIssueTicket = async (ticket) => {
  const result = await entityCrud.updateCurrent('issue_ticket', ticket.ticket_id, ticket);
  const db = await fetchDatabase();
  const location = (db.locations || []).find(row => row.location_id === ticket.location_id);
  await logHistoryEntry(
    'Issue Ticket Raised',
    ticket.asset_id,
    location?.location_name || ticket.location_id,
    `${ticket.ticket_id} / ${ticket.severity}: ${ticket.description}`,
    ticket.created_at
  );

  if (ticket.severity === 'High') {
    await callAppsScript('notifyHighSeverityIssue', { ticket });
  }

  return {
    ...result,
    ticketId: ticket.ticket_id,
    notificationTriggered: ticket.severity === 'High'
  };
};

// 9. Dynamic User Authentication matching Sheet_User_Registry
export const authenticateUser = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  const db = await fetchDatabase();
  const registry = db.userRegistry || [];
  
  let user = registry.find(
    u => u.email.toLowerCase().trim() === normalizedEmail
  );
  
  // 1. Master admin seed check
  if (normalizedEmail === 'alie.mustarq@gmail.com') {
    if (!user) {
      user = {
        email: 'alie.mustarq@gmail.com',
        display_name: 'Master Admin',
        role: 'Admin',
        status: 'Active'
      };
      await updateRecord('Sheet_User_Registry', 'email', 'alie.mustarq@gmail.com', user);
    }
  }
  // 1b. Corporate GM seed check
  else if (normalizedEmail === 'gm@welllandinvestment.com') {
    if (!user) {
      user = {
        email: 'gm@welllandinvestment.com',
        display_name: 'Corporate GM',
        role: 'Admin',
        status: 'Active'
      };
      await updateRecord('Sheet_User_Registry', 'email', 'gm@welllandinvestment.com', user);
    }
  }
  // 2. Self-registration for any unregistered email address
  else if (!user) {
    const parts = normalizedEmail.split('@')[0].split('.');
    const displayName = parts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
      
    user = {
      email: normalizedEmail,
      display_name: displayName || 'Field Staff',
      role: 'Requestee',
      status: 'Active'
    };
    // Save to the registry sheet
    await updateRecord('Sheet_User_Registry', 'email', normalizedEmail, user);
  }
  
  if (user.status.toLowerCase() !== 'active') {
    throw new Error("Access Denied: Your account is currently suspended or inactive.");
  }
  
  setSessionUser(user);
  return user;
};


// --- LOCAL BROWSER MOCK SYSTEM (FALLBACK MECHANISM) ---
// Enables complete frontend operations even if the Google Sheets Web App is not yet deployed.

const getLocalMockDb = () => {
  const stored = localStorage.getItem('wlOpsv3_mock_db');
  let db;
  if (stored) {
    db = JSON.parse(stored);
  } else {
    db = { ...schemasAndSeeds };
    localStorage.setItem('wlOpsv3_mock_db', JSON.stringify(db));
  }
  
  // Ensure default roles are pre-seeded in Sheet_User_Registry for seamless multi-role demonstration
  if (db.Sheet_User_Registry) {
    const registry = db.Sheet_User_Registry;
    const defaultSeeds = [
      { email: 'alie.mustarq@gmail.com', display_name: 'Master Admin', role: 'Admin', status: 'Active' },
      { email: 'gm@welllandinvestment.com', display_name: 'Corporate GM', role: 'Admin', status: 'Active' },
      { email: 'procurement@welllandops.com', display_name: 'Procurement Officer', role: 'Procurement', status: 'Active' },
      { email: 'finance@welllandops.com', display_name: 'Finance Officer', role: 'Finance', status: 'Active' },
      { email: 'supervisor@welllandops.com', display_name: 'Site Supervisor', role: 'Supervisor', status: 'Active' },
      { email: 'operator@welllandops.com', display_name: 'Field Operator', role: 'Requestee', status: 'Active' }
    ];
    
    let updated = false;
    defaultSeeds.forEach(seed => {
      if (!registry.some(u => u.email.toLowerCase() === seed.email.toLowerCase())) {
        registry.push(seed);
        updated = true;
      }
    });
    
    if (updated) {
      localStorage.setItem('wlOpsv3_mock_db', JSON.stringify(db));
    }
  }

  if (!db.Sheet_Asset_History_Log || db.Sheet_Asset_History_Log.length === 0) {
    db.Sheet_Asset_History_Log = [
      { log_id: 'LOG-000001', timestamp: '2026-05-10T08:30:00.000Z', event_type: 'PR Raised', asset_id: 'WL-HV-0002', location: 'Muthaafushi', triggered_by_email: 'alie.mustarq@gmail.com', notes: 'Hydraulic valve replacement initiated on Volvo A40G' },
      { log_id: 'LOG-000002', timestamp: '2026-05-12T10:15:00.000Z', event_type: 'Quote Uploaded', asset_id: 'WL-HV-0008', location: 'Thilafushi', triggered_by_email: 'procurement@welllandops.com', notes: 'Komatsu PC350 bucket teeth — 3 supplier quotes received' },
      { log_id: 'LOG-000003', timestamp: '2026-05-15T14:00:00.000Z', event_type: 'PO Raised', asset_id: 'WL-MV-0001', location: 'Thilafushi', triggered_by_email: 'gm@welllandinvestment.com', notes: 'Engine Oil 15W40 purchase order approved and dispatched' },
      { log_id: 'LOG-000004', timestamp: '2026-05-18T09:00:00.000Z', event_type: 'Fleet Status Change', asset_id: 'WL-HV-0008', location: 'Thilafushi', triggered_by_email: 'supervisor@welllandops.com', notes: 'PC350 Excavator grounded — hydraulic failure reported' },
      { log_id: 'LOG-000005', timestamp: '2026-05-20T11:30:00.000Z', event_type: 'Inventory Receipt', asset_id: 'WL-MV-0001', location: 'Thilafushi', triggered_by_email: 'procurement@welllandops.com', notes: '10 units Engine Oil 15W40 received and logged to Thilafushi depot' }
    ];
    localStorage.setItem('wlOpsv3_mock_db', JSON.stringify(db));
  }

  if (!db.Sheet_Audit_Log || db.Sheet_Audit_Log.length === 0) {
    db.Sheet_Audit_Log = schemasAndSeeds.Sheet_Audit_Log || [];
    localStorage.setItem('wlOpsv3_mock_db', JSON.stringify(db));
  }

  if (!db.Sheet_Locations || db.Sheet_Locations.length === 0) {
    db.Sheet_Locations = schemasAndSeeds.Sheet_Locations || [];
    localStorage.setItem('wlOpsv3_mock_db', JSON.stringify(db));
  }

  if (!db.Sheet_Issue_Tickets || db.Sheet_Issue_Tickets.length === 0) {
    db.Sheet_Issue_Tickets = schemasAndSeeds.Sheet_Issue_Tickets || [];
    localStorage.setItem('wlOpsv3_mock_db', JSON.stringify(db));
  }

  // Backward compatibility for older localStorage snapshots; values come from the formal schema seed.
  if (db.Sheet_Assets_Fleet) {
    const schemaAssets = schemasAndSeeds.Sheet_Assets_Fleet || [];
    let fleetUpdated = false;
    db.Sheet_Assets_Fleet.forEach((a, idx) => {
      const schemaAsset = schemaAssets.find(seed => seed.asset_id === a.asset_id);
      if (!a.maps_coordinates && schemaAsset?.maps_coordinates) {
        db.Sheet_Assets_Fleet[idx] = { ...a, maps_coordinates: schemaAsset.maps_coordinates };
        fleetUpdated = true;
      }
    });
    if (fleetUpdated) localStorage.setItem('wlOpsv3_mock_db', JSON.stringify(db));
  }

  if (db.Sheet_Purchase_Requests) {
    let prUpdated = false;
    db.Sheet_Purchase_Requests.forEach((pr, idx) => {
      if (!pr.maintenance_trigger_type) {
        db.Sheet_Purchase_Requests[idx] = {
          ...pr,
          maintenance_trigger_type: String(pr.category || '').toLowerCase().includes('consumable')
            ? 'Scheduled Consumable'
            : 'Corrective Maintenance'
        };
        prUpdated = true;
      }
    });
    if (prUpdated) localStorage.setItem('wlOpsv3_mock_db', JSON.stringify(db));
  }

  if (db.Sheet_Finance_Ledger) {
    let financeUpdated = false;
    db.Sheet_Finance_Ledger = db.Sheet_Finance_Ledger.map(row => {
      const referenceId = row.reference_id || row.pr_id || '';
      const referenceType = row.reference_type || (referenceId.startsWith('RA') ? 'CRM' : 'PR');
      const ledgerType = row.ledger_type || (row.type === 'Receivable' || referenceType === 'CRM' ? 'CRM_REVENUE' : 'PROCUREMENT_EXPENSE');
      const next = {
        transaction_id: row.transaction_id,
        reference_id: referenceId,
        reference_type: referenceType,
        ledger_type: ledgerType,
        counterparty_name: row.counterparty_name || row.supplier_name || '',
        total_amount_mvr: row.total_amount_mvr,
        antrac_submission_timestamp: row.antrac_submission_timestamp || '',
        payment_clearance_status: row.payment_clearance_status || row.parent_finance_status || 'Awaiting Action',
        bank_reference_number: row.bank_reference_number || '',
        cleared_by_finance_email: row.cleared_by_finance_email || ''
      };
      if (JSON.stringify(next) !== JSON.stringify(row)) financeUpdated = true;
      return next;
    });
    if (financeUpdated) localStorage.setItem('wlOpsv3_mock_db', JSON.stringify(db));
  }

  // Enrich CRM agreements with Phase 3 revenue pipeline fields (agreement_status, milestones, contract value)
  if (db.Sheet_CRM_Agreements) {
    const crmPhase3 = {
      'RA0001': { project_scope: 'LCT Vessel & Tadano Crane Mobilization — Amingiri Lagoon Works', total_contract_value_mvr: 850000, agreement_status: 'Active Contract', billing_milestones: JSON.stringify([{ milestone: 'Mobilization & Setup', amount_mvr: 250000, status: 'Paid' }, { milestone: 'Operations Phase 1 (8 days)', amount_mvr: 350000, status: 'Invoiced' }, { milestone: 'Demobilization & Final Survey', amount_mvr: 250000, status: 'Pending' }]) },
      'RA0002': { project_scope: 'Tadano Crane — Antrac Internal Yard Operations', total_contract_value_mvr: 7400, agreement_status: 'Invoiced & Collected', billing_milestones: JSON.stringify([{ milestone: 'Full Day Service', amount_mvr: 7400, status: 'Paid' }]) },
      'RA0003': { project_scope: 'HDPE Pipe Transportation — LCT Full Charter', total_contract_value_mvr: 123012, agreement_status: 'Invoiced & Collected', billing_milestones: JSON.stringify([{ milestone: 'Full Voyage Completion', amount_mvr: 123012, status: 'Paid' }]) },
      'RA0004': { project_scope: 'Emergency Standby Equipment Retainer — Resort Coverage', total_contract_value_mvr: 500000, agreement_status: 'Lead', billing_milestones: JSON.stringify([{ milestone: 'Retainer Activation Fee', amount_mvr: 100000, status: 'Pending' }, { milestone: 'Q2 Standby Coverage', amount_mvr: 200000, status: 'Pending' }, { milestone: 'Q3 Standby Coverage', amount_mvr: 200000, status: 'Pending' }]) },
      'RA0005': { project_scope: 'Komatsu PC70-8 Excavator Rental — Island Earthworks', total_contract_value_mvr: 28800, agreement_status: 'Active Contract', billing_milestones: JSON.stringify([{ milestone: 'First 15 Hours Block', amount_mvr: 13500, status: 'Paid' }, { milestone: 'Final 17 Hours Block', amount_mvr: 15300, status: 'Invoiced' }]) }
    };
    let crmUpdated = false;
    db.Sheet_CRM_Agreements.forEach((agr, idx) => {
      const enrichment = crmPhase3[agr.agreement_id];
      if (enrichment && !agr.agreement_status) {
        db.Sheet_CRM_Agreements[idx] = { ...agr, ...enrichment };
        crmUpdated = true;
      }
    });
    if (crmUpdated) localStorage.setItem('wlOpsv3_mock_db', JSON.stringify(db));
  }

  return db;
};

const saveLocalMockDb = (db) => {
  localStorage.setItem('wlOpsv3_mock_db', JSON.stringify(db));
};

const updateMockRecordLocal = (tableName, pkName, pkValue, record) => {
  const db = getLocalMockDb();
  const list = db[tableName] || [];
  const idx = list.findIndex(r => r[pkName]?.toString() === pkValue?.toString());
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...record };
  } else {
    list.push(record);
  }
  db[tableName] = list;
  saveLocalMockDb(db);
};

const handleMockRequest = async (action, data) => {
  const db = getLocalMockDb();
  await new Promise(resolve => setTimeout(resolve, 600)); // simulate latency

  if (action === 'getDatabase') {
    return {
      userRegistry: db.Sheet_User_Registry || [],
      assetsFleet: db.Sheet_Assets_Fleet || [],
      purchaseRequests: db.Sheet_Purchase_Requests || [],
      itemSupplierMatrix: db.Sheet_Item_Supplier_Matrix || [],
      inventoryLedger: db.Sheet_Inventory_Ledger || [],
      crmAgreements: db.Sheet_CRM_Agreements || [],
      financeLedger: db.Sheet_Finance_Ledger || [],
      assetHistoryLog: db.Sheet_Asset_History_Log || [],
      auditLog: db.Sheet_Audit_Log || [],
      locations: db.Sheet_Locations || [],
      issueTickets: db.Sheet_Issue_Tickets || []
    };
  }
  
  if (action === 'updateRecord') {
    const { tableName, pkName, pkValue, record } = data;
    updateMockRecordLocal(tableName, pkName, pkValue, record);
    return { status: "Success", action: "Mocked Sync" };
  }

  if (action === 'entityUpdateCurrent') {
    const { tableName, pkName, pkValue, record } = data;
    updateMockRecordLocal(tableName, pkName, pkValue, record);
    return { status: 'Success', action: 'Entity Current Update', entityType: data.entityType, entityId: pkValue };
  }

  if (action === 'notifyHighSeverityIssue') {
    return {
      status: 'Success',
      action: 'High Severity Ticket Notification',
      ticketId: data.ticket?.ticket_id,
      mocked: true
    };
  }

  if (action === 'entityCorrectHistorical') {
    const { entityType, tableName, pkName, pkValue, patch, correctionMeta } = data;
    if (!correctionMeta?.correction_reason || !correctionMeta?.effective_date) {
      throw new Error('Historical correction requires correction_reason and effective_date.');
    }
    const list = db[tableName] || [];
    const idx = list.findIndex(row => row[pkName]?.toString() === pkValue?.toString());
    if (idx === -1) throw new Error(`Entity not found for correction: ${entityType} ${pkValue}`);
    const oldValue = { ...list[idx] };
    const newValue = { ...oldValue, ...patch };
    db.Sheet_Audit_Log = db.Sheet_Audit_Log || [];
    const auditRecord = createAuditRecord({
      type: entityType,
      id: pkValue,
      action: 'Historical Correction',
      oldValue,
      newValue,
      correctionMeta
    });
    db.Sheet_Audit_Log.push(auditRecord);
    list[idx] = newValue;
    db[tableName] = list;
    saveLocalMockDb(db);
    return { status: 'Success', action: 'Historical Correction', auditId: auditRecord.audit_id, entityType, entityId: pkValue };
  }

  if (action === 'entitySoftDelete') {
    const { entityType, tableName, pkName, pkValue, reason } = data;
    const list = db[tableName] || [];
    const idx = list.findIndex(row => row[pkName]?.toString() === pkValue?.toString());
    if (idx === -1) throw new Error(`Entity not found for soft delete: ${entityType} ${pkValue}`);
    const row = list[idx];
    if ('status' in row) row.status = 'Inactive';
    else if ('live_status' in row) row.live_status = 'Inactive';
    else if ('payment_clearance_status' in row) row.payment_clearance_status = 'Inactive';
    else row.status = 'Inactive';
    row.deactivation_reason = reason;
    saveLocalMockDb(db);
    return { status: 'Success', action: 'Soft Delete', entityType, entityId: pkValue };
  }

  if (action === 'entityRestore') {
    const { entityType, tableName, pkName, pkValue } = data;
    const list = db[tableName] || [];
    const idx = list.findIndex(row => row[pkName]?.toString() === pkValue?.toString());
    if (idx === -1) throw new Error(`Entity not found for restore: ${entityType} ${pkValue}`);
    const row = list[idx];
    if ('status' in row) row.status = 'Active';
    else if ('live_status' in row) row.live_status = 'Active';
    else if ('payment_clearance_status' in row) row.payment_clearance_status = 'Awaiting Action';
    else row.status = 'Active';
    saveLocalMockDb(db);
    return { status: 'Success', action: 'Restore', entityType, entityId: pkValue };
  }
  
  if (action === 'uploadQuote') {
    const { pr_id } = data;
    const prs = db.Sheet_Purchase_Requests || [];
    const pr = prs.find(p => p.pr_id === pr_id);
    const item = pr ? pr.item_generic_name : "General Spares";
    
    const suppliers = [
      "Alia Investments Pvt Ltd",
      "Kashimaa Boat",
      "Well Land Investment Pvt Ltd",
      "United Diesel Supplies",
      "Antrac Holding Pvt Ltd",
      "Evosun Maldives Pvt Ltd"
    ];
    
    const matrix = db.Sheet_Item_Supplier_Matrix || [];
    const uploadedForPr = matrix
      .filter(m => m.generic_item_id === item)
      .map(m => m.supplier_name);
      
    let supplierName = suppliers.find(s => !uploadedForPr.includes(s));
    if (!supplierName) {
      supplierName = suppliers[Math.floor(Math.random() * suppliers.length)];
    }
 
    const existingQuotes = matrix.filter(m => m.generic_item_id === item);
    let basePrice = 8500;
    if (existingQuotes.length > 0) {
      basePrice = existingQuotes[0].quoted_price_mvr;
    }
    
    const variancePercent = Math.round((-15 + Math.random() * 30) * 10) / 10;
    const quotedPrice = Math.round(basePrice * (1 + variancePercent / 100));

    const mockExtracted = {
      generic_item_id: item,
      supplier_name: supplierName,
      extracted_sku_name: supplierName.split(" ")[0].toUpperCase() + "-" + item.toUpperCase().replace(/\s+/g, '-').slice(0, 15) + "-SKU",
      quoted_price_mvr: quotedPrice,
      quote_date: new Date().toISOString().split('T')[0],
      price_variance_percentage: variancePercent,
      po_reference: ""
    };
    
    db.Sheet_Item_Supplier_Matrix = db.Sheet_Item_Supplier_Matrix || [];
    db.Sheet_Item_Supplier_Matrix.push(mockExtracted);
    
    const prIndex = prs.findIndex(p => p.pr_id === pr_id);
    if (prIndex !== -1) {
      db.Sheet_Purchase_Requests[prIndex].target_drive_folder_id = "mock-drive-folder-id";
    }
    
    saveLocalMockDb(db);
    return {
      status: "Success",
      fileId: "mock-file-" + Math.floor(1000 + Math.random() * 9000),
      fileUrl: "https://drive.google.com/mock-file",
      supplierName: mockExtracted.supplier_name,
      supplierSku: mockExtracted.extracted_sku_name,
      quotedPriceMvr: mockExtracted.quoted_price_mvr,
      variancePercentage: mockExtracted.price_variance_percentage
    };
  }
  
  if (action === 'approveQuote') {
    const { pr_id, supplierName, priceMvr } = data;
    const prs = db.Sheet_Purchase_Requests || [];
    const prIdx = prs.findIndex(p => p.pr_id === pr_id);
    if (prIdx !== -1) {
      db.Sheet_Purchase_Requests[prIdx].status = "PO_Raised";
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    const poRef = `PO-${pr_id}-${todayStr.replace(/-/g, "")}`;
    const txId = "TX-PO-" + Math.floor(100000 + Math.random() * 900000);
    const qty = prs[prIdx]?.quantity || 1;
    const totalCost = priceMvr * qty;
    
    // Update matrix PO reference
    const matrix = db.Sheet_Item_Supplier_Matrix || [];
    const matIdx = matrix.findIndex(m => m.supplier_name === supplierName);
    if (matIdx !== -1) {
      matrix[matIdx].po_reference = poRef;
    }
    
    // Add transaction to Finance Ledger using the extended schema
    db.Sheet_Finance_Ledger = db.Sheet_Finance_Ledger || [];
    db.Sheet_Finance_Ledger.push({
      transaction_id: txId,
      reference_id: pr_id,
      reference_type: 'PR',
      ledger_type: 'PROCUREMENT_EXPENSE',
      counterparty_name: supplierName,
      total_amount_mvr: totalCost,
      antrac_submission_timestamp: "",
      payment_clearance_status: "Awaiting Action",
      bank_reference_number: "",
      cleared_by_finance_email: ""
    });
    
    saveLocalMockDb(db);
    return {
      status: "Success",
      poReference: poRef,
      poFileUrl: "https://drive.google.com/mock-po",
      transactionId: txId,
      totalCostMvr: totalCost
    };
  }

  if (action === 'submitPoToAntracFinance') {
    const { pr_id } = data;
    const fin = db.Sheet_Finance_Ledger || [];
    const prs = db.Sheet_Purchase_Requests || [];
    
    const fIdx = fin.findIndex(f => (f.reference_id || f.pr_id) === pr_id);
    if (fIdx !== -1) {
      db.Sheet_Finance_Ledger[fIdx].payment_clearance_status = "Submitted to Antrac";
      db.Sheet_Finance_Ledger[fIdx].antrac_submission_timestamp = new Date().toISOString();
    }

    const prIdx = prs.findIndex(p => p.pr_id === pr_id);
    if (prIdx !== -1) {
      db.Sheet_Purchase_Requests[prIdx].status = "Submitted to Antrac";
    }

    saveLocalMockDb(db);
    return {
      status: "Success",
      prId: pr_id,
      paymentClearanceStatus: "Submitted to Antrac",
      timestamp: new Date().toISOString()
    };
  }

  if (action === 'clearPaymentHandshake') {
    const { pr_id, bankRef } = data;
    const fin = db.Sheet_Finance_Ledger || [];
    const prs = db.Sheet_Purchase_Requests || [];
    const userEmail = getSessionEmail() || "finance@welllandops.com";
    
    const fIdx = fin.findIndex(f => (f.reference_id || f.pr_id) === pr_id);
    if (fIdx !== -1) {
      db.Sheet_Finance_Ledger[fIdx].payment_clearance_status = "Paid & Cleared";
      db.Sheet_Finance_Ledger[fIdx].bank_reference_number = bankRef;
      db.Sheet_Finance_Ledger[fIdx].cleared_by_finance_email = userEmail;
    }

    const prIdx = prs.findIndex(p => p.pr_id === pr_id);
    if (prIdx !== -1) {
      db.Sheet_Purchase_Requests[prIdx].status = "Paid";
    }

    saveLocalMockDb(db);
    return {
      status: "Success",
      prId: pr_id,
      paymentClearanceStatus: "Paid & Cleared",
      bankReference: bankRef,
      clearedBy: userEmail
    };
  }
  
  if (action === 'receiveItems') {
    const { pr_id, receivedQty, targetLocation } = data;
    const prs = db.Sheet_Purchase_Requests || [];
    const pr = prs.find(p => p.pr_id === pr_id);
    if (!pr) throw new Error("PR not found");
    
    const prIdx = prs.findIndex(p => p.pr_id === pr_id);
    db.Sheet_Purchase_Requests[prIdx].status = "Completed";
    
    // Atomic inventory ledger increment
    const ledger = db.Sheet_Inventory_Ledger || [];
    const ledgerIdx = ledger.findIndex(l => l.generic_item_id === pr.item_generic_name && l.location_base.toLowerCase() === targetLocation.toLowerCase());
    
    let oldQty = 0;
    if (ledgerIdx !== -1) {
      oldQty = Number(ledger[ledgerIdx].quantity) || 0;
      db.Sheet_Inventory_Ledger[ledgerIdx].quantity = oldQty + receivedQty;
    } else {
      db.Sheet_Inventory_Ledger.push({
        generic_item_id: pr.item_generic_name,
        item_name: pr.item_generic_name,
        quantity: receivedQty,
        location_base: targetLocation
      });
    }
    
    saveLocalMockDb(db);
    return {
      status: "Success",
      prId: pr_id,
      genericItemId: pr.item_generic_name,
      location: targetLocation,
      oldQuantity: oldQty,
      newQuantity: oldQty + receivedQty
    };
  }
  
  if (action === 'seedDefaults') {
    localStorage.setItem('wlOpsv3_mock_db', JSON.stringify(schemasAndSeeds));
    return { status: "Success", message: "Mock seeded successfully!" };
  }

  if (action === 'submitSourcingPackage') {
    const { pr_id } = data;
    const prs = db.Sheet_Purchase_Requests || [];
    const prIdx = prs.findIndex(p => p.pr_id === pr_id);
    if (prIdx !== -1) {
      db.Sheet_Purchase_Requests[prIdx].status = 'Sourcing_Completed';
    }
    saveLocalMockDb(db);
    return {
      status: 'Success',
      prId: pr_id,
      newStatus: 'Sourcing_Completed'
    };
  }

  if (action === 'triggerMilestoneInvoice') {
    const { agreement_id, milestone_index } = data;
    const crm = db.Sheet_CRM_Agreements || [];
    const idx = crm.findIndex(a => a.agreement_id === agreement_id);
    if (idx !== -1) {
      let milestones = [];
      try { milestones = JSON.parse(crm[idx].billing_milestones || '[]'); } catch(e) {}
      if (milestones[milestone_index] && milestones[milestone_index].status === 'Pending') {
        milestones[milestone_index].status = 'Invoiced';
        db.Sheet_CRM_Agreements[idx].billing_milestones = JSON.stringify(milestones);
        const txId = 'TX-CRM-' + Math.floor(100000 + Math.random() * 900000);
        db.Sheet_Finance_Ledger = db.Sheet_Finance_Ledger || [];
        db.Sheet_Finance_Ledger.push({
          transaction_id: txId,
          reference_id: agreement_id,
          reference_type: 'CRM',
          ledger_type: 'CRM_REVENUE',
          counterparty_name: crm[idx].client_name,
          total_amount_mvr: milestones[milestone_index].amount_mvr,
          antrac_submission_timestamp: new Date().toISOString(),
          payment_clearance_status: 'Invoiced',
          bank_reference_number: '',
          cleared_by_finance_email: getSessionEmail()
        });
        saveLocalMockDb(db);
        return { status: 'Success', agreementId: agreement_id, milestoneName: milestones[milestone_index].milestone, amountMvr: milestones[milestone_index].amount_mvr, transactionId: txId };
      }
    }
    return { error: 'Milestone not found or already processed.' };
  }

  if (action === 'logHistoryEntry') {
    const { event_type, asset_id, location, triggered_by_email, notes, timestamp } = data;
    db.Sheet_Asset_History_Log = db.Sheet_Asset_History_Log || [];
    db.Sheet_Asset_History_Log.push({
      log_id: 'LOG-' + Math.floor(100000 + Math.random() * 900000),
      timestamp: timestamp || new Date().toISOString(),
      event_type: event_type || 'System Event',
      asset_id: asset_id || '',
      location: location || '',
      triggered_by_email: triggered_by_email || getSessionEmail(),
      notes: notes || ''
    });
    saveLocalMockDb(db);
    return { status: 'Success' };
  }

  if (action === 'backfillRetroactivePR') {
    const { backdated_datetime, item_name, category, asset_base, supplier_name, price_mvr } = data;
    const userEmail = getSessionEmail();
    const prId = 'PR-RETRO-' + Math.floor(10000 + Math.random() * 90000);
    const txId = 'TX-RETRO-' + Math.floor(100000 + Math.random() * 900000);
    const logId = 'LOG-RETRO-' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = backdated_datetime.split('T')[0];

    db.Sheet_Purchase_Requests = db.Sheet_Purchase_Requests || [];
    db.Sheet_Purchase_Requests.push({
      pr_id: prId,
      item_generic_name: item_name,
      category: category,
      quantity: 1,
      justification: '[RETROACTIVE BACKFILL] Seeded by system administrator.',
      target_use: asset_base,
      requested_by_email: userEmail,
      assigned_officer: userEmail,
      target_drive_folder_id: '',
      status: 'Completed',
      maintenance_trigger_type: data.maintenance_trigger_type || 'Retroactive Backfill'
    });

    db.Sheet_Item_Supplier_Matrix = db.Sheet_Item_Supplier_Matrix || [];
    db.Sheet_Item_Supplier_Matrix.push({
      generic_item_id: item_name,
      supplier_name: supplier_name,
      extracted_sku_name: supplier_name.split(' ')[0].toUpperCase() + '-' + item_name.toUpperCase().replace(/\s+/g, '-').slice(0, 15),
      quoted_price_mvr: Number(price_mvr),
      quote_date: dateStr,
      price_variance_percentage: 0,
      po_reference: prId
    });

    db.Sheet_Finance_Ledger = db.Sheet_Finance_Ledger || [];
    db.Sheet_Finance_Ledger.push({
      transaction_id: txId,
      reference_id: prId,
      reference_type: 'PR',
      ledger_type: 'PROCUREMENT_EXPENSE',
      counterparty_name: supplier_name,
      total_amount_mvr: Number(price_mvr),
      antrac_submission_timestamp: backdated_datetime,
      payment_clearance_status: 'Paid & Cleared',
      bank_reference_number: 'RETRO-BACKFILL',
      cleared_by_finance_email: userEmail
    });

    db.Sheet_Asset_History_Log = db.Sheet_Asset_History_Log || [];
    db.Sheet_Asset_History_Log.push({
      log_id: logId,
      timestamp: backdated_datetime,
      event_type: 'Retroactive PR Backfill',
      asset_id: asset_base,
      location: asset_base,
      triggered_by_email: userEmail,
      notes: `Retroactive entry: ${item_name} from ${supplier_name} @ MVR ${price_mvr}. Atomic 4-sheet handshake.`
    });

    if (data.crm_agreement_id) {
      const crm = db.Sheet_CRM_Agreements || [];
      const crmIdx = crm.findIndex(a => a.agreement_id === data.crm_agreement_id);
      if (crmIdx !== -1) {
        db.Sheet_CRM_Agreements[crmIdx].agreement_status = db.Sheet_CRM_Agreements[crmIdx].agreement_status || 'Active Contract';
      }
    }

    saveLocalMockDb(db);
    return { status: 'Success', prId, txId, logId };
  }

  return { error: "Unknown action inside local fallback mock." };
};
