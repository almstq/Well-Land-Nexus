export const ENTITY_CONFIG = {
  fleet: {
    tableName: 'Sheet_Assets_Fleet',
    pkName: 'asset_id',
    collectionKey: 'assetsFleet',
    label: 'Fleet Asset'
  },
  asset: {
    tableName: 'Sheet_Assets_Fleet',
    pkName: 'asset_id',
    collectionKey: 'assetsFleet',
    label: 'Asset'
  },
  staff: {
    tableName: 'Sheet_User_Registry',
    pkName: 'email',
    collectionKey: 'userRegistry',
    label: 'Staff'
  },
  user: {
    tableName: 'Sheet_User_Registry',
    pkName: 'email',
    collectionKey: 'userRegistry',
    label: 'User'
  },
  item: {
    tableName: 'Sheet_Inventory_Ledger',
    pkName: 'generic_item_id',
    collectionKey: 'inventoryLedger',
    label: 'Inventory Item'
  },
  inventory: {
    tableName: 'Sheet_Inventory_Ledger',
    pkName: 'generic_item_id',
    collectionKey: 'inventoryLedger',
    label: 'Inventory'
  },
  supplier: {
    tableName: 'Sheet_Item_Supplier_Matrix',
    pkName: 'supplier_name',
    collectionKey: 'itemSupplierMatrix',
    label: 'Supplier'
  },
  purchaseRequest: {
    tableName: 'Sheet_Purchase_Requests',
    pkName: 'pr_id',
    collectionKey: 'purchaseRequests',
    label: 'Purchase Request'
  },
  finance: {
    tableName: 'Sheet_Finance_Ledger',
    pkName: 'transaction_id',
    collectionKey: 'financeLedger',
    label: 'Finance Ledger'
  },
  crm: {
    tableName: 'Sheet_CRM_Agreements',
    pkName: 'agreement_id',
    collectionKey: 'crmAgreements',
    label: 'CRM Agreement'
  },
  customer: {
    tableName: 'Sheet_CRM_Agreements',
    pkName: 'agreement_id',
    collectionKey: 'crmAgreements',
    label: 'Customer Agreement'
  },
  history: {
    tableName: 'Sheet_Asset_History_Log',
    pkName: 'log_id',
    collectionKey: 'assetHistoryLog',
    label: 'History Log'
  },
  audit: {
    tableName: 'Sheet_Audit_Log',
    pkName: 'audit_id',
    collectionKey: 'auditLog',
    label: 'Audit Log'
  },
  location: {
    tableName: 'Sheet_Locations',
    pkName: 'location_id',
    collectionKey: 'locations',
    label: 'Location'
  },
  issue_ticket: {
    tableName: 'Sheet_Issue_Tickets',
    pkName: 'ticket_id',
    collectionKey: 'issueTickets',
    label: 'Issue Ticket',
    fields: [
      'ticket_id',
      'raised_by_email',
      'reported_by_id',
      'location_id',
      'asset_id',
      'items_required_json',
      'status',
      'severity',
      'description',
      'created_at',
      'updated_at',
      'resolved_at'
    ],
    lookups: {
      location_id: { type: 'location', collectionKey: 'locations', labelField: 'location_name', valueField: 'location_id' },
      asset_id: { type: 'fleet', collectionKey: 'assetsFleet', labelField: 'asset_name', valueField: 'asset_id' },
      reported_by_id: { type: 'user', collectionKey: 'userRegistry', labelField: 'display_name', valueField: 'email' },
      items_required_json: { type: 'inventory', collectionKey: 'inventoryLedger', labelField: 'item_name', valueField: 'generic_item_id', multiple: true }
    }
  }
};

export const getEntityConfig = (type) => {
  const config = ENTITY_CONFIG[type];
  if (!config) throw new Error(`Unknown entity type: ${type}`);
  return config;
};
