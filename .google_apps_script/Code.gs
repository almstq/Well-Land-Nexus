// =========================================================================
//                   WELL LAND OPS v3.0 - CLOUD MIDDLEWARE
// =========================================================================
//
// Deploy as a Google Apps Script web app:
// - Execute as: Me
// - Access: Anyone
// - Frontend env: VITE_GOOGLE_APPS_SCRIPT_URL=<deployment /exec URL>
//
// =========================================================================

var DRIVE_FOLDER_ID = "";
var GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
var ANTRAC_FINANCE_EMAIL = "accounts@antrac.mv";

var SHEET_HEADERS = {
  Sheet_User_Registry: ["email", "display_name", "role", "status"],
  Sheet_Assets_Fleet: ["asset_id", "asset_name", "type", "location", "live_status", "current_operator", "meter_hours", "maps_coordinates"],
  Sheet_Purchase_Requests: ["pr_id", "item_generic_name", "category", "quantity", "justification", "target_use", "requested_by_email", "assigned_officer", "target_drive_folder_id", "status", "maintenance_trigger_type"],
  Sheet_Item_Supplier_Matrix: ["generic_item_id", "supplier_name", "extracted_sku_name", "quoted_price_mvr", "quote_date", "price_variance_percentage", "po_reference"],
  Sheet_Finance_Ledger: ["transaction_id", "reference_id", "reference_type", "ledger_type", "counterparty_name", "total_amount_mvr", "antrac_submission_timestamp", "payment_clearance_status", "bank_reference_number", "cleared_by_finance_email"],
  Sheet_Asset_History_Log: ["log_id", "timestamp", "event_type", "asset_id", "location", "triggered_by_email", "notes"],
  Sheet_Audit_Log: ["audit_id", "timestamp", "entity_type", "entity_id", "action", "old_value_json", "new_value_json", "effective_date", "corrected_by_email", "correction_reason", "affected_records_json"],
  Sheet_Locations: ["location_id", "location_name", "location_type", "status", "maps_coordinates"],
  Sheet_Issue_Tickets: ["ticket_id", "raised_by_email", "reported_by_id", "location_id", "asset_id", "items_required_json", "status", "severity", "description", "created_at", "updated_at", "resolved_at"],
  Sheet_CRM_Agreements: ["agreement_id", "client_name", "asset_ids_array", "rate_structure", "billing_cycle", "start_date", "current_logged_hours", "status", "project_scope", "total_contract_value_mvr", "agreement_status", "billing_milestones"],
  Sheet_Inventory_Ledger: ["generic_item_id", "item_name", "quantity", "location_base"]
};

function doPost(e) {
  try {
    ensureAllSheets();
    var requestData = JSON.parse(e.postData.contents || "{}");
    var action = requestData.action;
    var routes = {
      getDatabase: handleGetDatabase,
      updateRecord: handleUpdateRecord,
      uploadQuote: handleUploadQuote,
      approveQuote: handleApproveQuote,
      receiveItems: handleReceiveItems,
      submitPoToAntracFinance: handleSubmitPoToAntracFinance,
      clearPaymentHandshake: handleClearPaymentHandshake,
      seedDefaults: handleSeedDefaults,
      entityUpdateCurrent: handleEntityUpdateCurrent,
      entityCorrectHistorical: handleEntityCorrectHistorical,
      entitySoftDelete: handleEntitySoftDelete,
      entityRestore: handleEntityRestore,
      notifyHighSeverityIssue: handleNotifyHighSeverityIssue,
      submitSourcingPackage: handleSubmitSourcingPackage,
      logHistoryEntry: handleLogHistoryEntry,
      backfillRetroactivePR: handleBackfillRetroactivePR,
      triggerMilestoneInvoice: handleTriggerMilestoneInvoice
    };
    if (!routes[action]) return jsonResponse({ error: "Unknown action requested: " + action });
    return routes[action](requestData);
  } catch (err) {
    return jsonResponse({ error: err.toString(), stack: err.stack });
  }
}

function doGet() {
  ensureAllSheets();
  return handleGetDatabase({});
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ensureAllSheets() {
  Object.keys(SHEET_HEADERS).forEach(function(name) {
    getOrCreateSheet(name);
  });
}

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  var targetHeaders = SHEET_HEADERS[name] || [];
  if (!targetHeaders.length) return sheet;

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(targetHeaders);
    return sheet;
  }

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].filter(String);
  if (existingHeaders.length === 0) {
    sheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
    return sheet;
  }

  var merged = existingHeaders.slice();
  targetHeaders.forEach(function(header) {
    if (merged.indexOf(header) === -1) merged.push(header);
  });
  if (merged.length !== existingHeaders.length) {
    sheet.getRange(1, 1, 1, merged.length).setValues([merged]);
  }
  return sheet;
}

function getSheetData(sheet) {
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    var hasValue = false;
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[i][j];
      if (values[i][j] !== "") hasValue = true;
    }
    if (hasValue) list.push(obj);
  }
  return list;
}

function appendObject(sheetName, obj) {
  var sheet = getOrCreateSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function(header) {
    return obj[header] === undefined ? "" : obj[header];
  }));
}

function updateObject(sheetName, pkName, pkValue, record) {
  var sheet = getOrCreateSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var pkIndex = headers.indexOf(pkName);
  if (pkIndex === -1) throw new Error("Primary key not found in " + sheetName + ": " + pkName);

  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][pkIndex]) === String(pkValue)) {
      headers.forEach(function(header, idx) {
        if (record[header] !== undefined) sheet.getRange(i + 1, idx + 1).setValue(record[header]);
      });
      return { status: "Success", action: "Update", row: i + 1 };
    }
  }
  appendObject(sheetName, record);
  return { status: "Success", action: "Insert", row: sheet.getLastRow() };
}

function findRow(sheetName, pkName, pkValue) {
  var list = getSheetData(getOrCreateSheet(sheetName));
  for (var i = 0; i < list.length; i++) {
    if (String(list[i][pkName]) === String(pkValue)) return list[i];
  }
  return null;
}

function patchRow(sheetName, pkName, pkValue, patch) {
  var row = findRow(sheetName, pkName, pkValue) || {};
  var next = Object.assign({}, row, patch);
  updateObject(sheetName, pkName, pkValue, next);
  return next;
}

function makeId(prefix) {
  return prefix + "-" + Math.floor(100000 + Math.random() * 900000);
}

function getDriveFolder() {
  if (DRIVE_FOLDER_ID) return DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var folders = DriveApp.getFoldersByName("WL_Ops_v3_Documents");
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder("WL_Ops_v3_Documents");
}

function handleGetDatabase() {
  return jsonResponse({
    userRegistry: getSheetData(getOrCreateSheet("Sheet_User_Registry")),
    assetsFleet: getSheetData(getOrCreateSheet("Sheet_Assets_Fleet")),
    purchaseRequests: getSheetData(getOrCreateSheet("Sheet_Purchase_Requests")),
    itemSupplierMatrix: getSheetData(getOrCreateSheet("Sheet_Item_Supplier_Matrix")),
    inventoryLedger: getSheetData(getOrCreateSheet("Sheet_Inventory_Ledger")),
    crmAgreements: getSheetData(getOrCreateSheet("Sheet_CRM_Agreements")),
    financeLedger: getSheetData(getOrCreateSheet("Sheet_Finance_Ledger")),
    assetHistoryLog: getSheetData(getOrCreateSheet("Sheet_Asset_History_Log")),
    auditLog: getSheetData(getOrCreateSheet("Sheet_Audit_Log")),
    locations: getSheetData(getOrCreateSheet("Sheet_Locations")),
    issueTickets: getSheetData(getOrCreateSheet("Sheet_Issue_Tickets"))
  });
}

function handleUpdateRecord(requestData) {
  return jsonResponse(updateObject(requestData.tableName, requestData.pkName, requestData.pkValue, requestData.record || {}));
}

function handleEntityUpdateCurrent(requestData) {
  var result = updateObject(requestData.tableName, requestData.pkName, requestData.pkValue, requestData.record || {});
  return jsonResponse(result);
}

function handleNotifyHighSeverityIssue(requestData) {
  var ticket = requestData.ticket || {};
  if (ticket.severity !== "High") return jsonResponse({ status: "Skipped", reason: "Ticket severity is not High" });
  var subject = "High Severity Well Land Ticket: " + (ticket.ticket_id || "New Ticket");
  var body = [
    "High severity issue ticket raised.",
    "",
    "Ticket: " + (ticket.ticket_id || ""),
    "Asset: " + (ticket.asset_id || ""),
    "Location: " + (ticket.location_id || ""),
    "Reported by: " + (ticket.reported_by_id || ticket.raised_by_email || ""),
    "Description: " + (ticket.description || "")
  ].join("\n");
  MailApp.sendEmail("alie.mustarq@gmail.com", subject, body);
  return jsonResponse({ status: "Success", action: "High Severity Ticket Notification", ticketId: ticket.ticket_id });
}

function handleEntityCorrectHistorical(requestData) {
  var tableName = requestData.tableName;
  var pkName = requestData.pkName;
  var pkValue = requestData.pkValue;
  var entityType = requestData.entityType;
  var patch = requestData.patch || {};
  var correctionMeta = requestData.correctionMeta || {};
  if (!correctionMeta.correction_reason || !correctionMeta.effective_date) {
    throw new Error("Historical correction requires correction_reason and effective_date.");
  }

  var oldValue = findRow(tableName, pkName, pkValue);
  if (!oldValue) throw new Error("Entity not found for correction: " + entityType + " " + pkValue);
  var newValue = Object.assign({}, oldValue, patch);
  var auditId = makeId("AUD");

  appendObject("Sheet_Audit_Log", {
    audit_id: auditId,
    timestamp: new Date(),
    entity_type: entityType,
    entity_id: pkValue,
    action: "Historical Correction",
    old_value_json: JSON.stringify(oldValue),
    new_value_json: JSON.stringify(newValue),
    effective_date: correctionMeta.effective_date,
    corrected_by_email: requestData.userEmail || correctionMeta.corrected_by_email || "",
    correction_reason: correctionMeta.correction_reason,
    affected_records_json: JSON.stringify(correctionMeta.affected_records || [])
  });

  updateObject(tableName, pkName, pkValue, newValue);
  return jsonResponse({ status: "Success", action: "Historical Correction", auditId: auditId, entityType: entityType, entityId: pkValue });
}

function handleEntitySoftDelete(requestData) {
  var oldValue = findRow(requestData.tableName, requestData.pkName, requestData.pkValue);
  if (!oldValue) throw new Error("Entity not found for soft delete: " + requestData.pkValue);
  var patch = {};
  if (oldValue.status !== undefined) patch.status = "Inactive";
  else if (oldValue.live_status !== undefined) patch.live_status = "Inactive";
  else if (oldValue.payment_clearance_status !== undefined) patch.payment_clearance_status = "Inactive";
  else patch.status = "Inactive";
  patch.deactivation_reason = requestData.reason || "Soft delete requested";
  var next = Object.assign({}, oldValue, patch);
  updateObject(requestData.tableName, requestData.pkName, requestData.pkValue, next);
  return jsonResponse({ status: "Success", action: "Soft Delete", entityType: requestData.entityType, entityId: requestData.pkValue });
}

function handleEntityRestore(requestData) {
  var oldValue = findRow(requestData.tableName, requestData.pkName, requestData.pkValue);
  if (!oldValue) throw new Error("Entity not found for restore: " + requestData.pkValue);
  var patch = {};
  if (oldValue.status !== undefined) patch.status = "Active";
  else if (oldValue.live_status !== undefined) patch.live_status = "Active";
  else if (oldValue.payment_clearance_status !== undefined) patch.payment_clearance_status = "Awaiting Action";
  else patch.status = "Active";
  var next = Object.assign({}, oldValue, patch);
  updateObject(requestData.tableName, requestData.pkName, requestData.pkValue, next);
  return jsonResponse({ status: "Success", action: "Restore", entityType: requestData.entityType, entityId: requestData.pkValue });
}

function handleUploadQuote(requestData) {
  var pr = findRow("Sheet_Purchase_Requests", "pr_id", requestData.pr_id);
  if (!pr) throw new Error("PR not found: " + requestData.pr_id);

  var bytes = Utilities.base64Decode(requestData.fileBase64 || "");
  var safeName = "QUOTE_" + requestData.pr_id + "_" + (requestData.fileName || "supplier_quote.pdf");
  var file = getDriveFolder().createFile(Utilities.newBlob(bytes, "application/pdf", safeName));

  var supplierName = "Supplier Pending Review";
  var quotedPrice = 0;
  var skuName = "MANUAL-REVIEW";
  var variance = 0;

  if (GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE") {
    var extracted = callGeminiQuoteExtractor(requestData.fileBase64);
    supplierName = extracted.supplier_name || supplierName;
    quotedPrice = Number(extracted.quoted_price_mvr || 0);
    skuName = extracted.extracted_sku_name || skuName;
  }

  appendObject("Sheet_Item_Supplier_Matrix", {
    generic_item_id: pr.item_generic_name,
    supplier_name: supplierName,
    extracted_sku_name: skuName,
    quoted_price_mvr: quotedPrice,
    quote_date: new Date(),
    price_variance_percentage: variance,
    po_reference: ""
  });
  patchRow("Sheet_Purchase_Requests", "pr_id", requestData.pr_id, { target_drive_folder_id: file.getId() });
  writeHistory("Quote Uploaded", pr.target_use, pr.target_use, requestData.userEmail, "Quote uploaded for " + requestData.pr_id);

  return jsonResponse({
    status: "Success",
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    supplierName: supplierName,
    supplierSku: skuName,
    quotedPriceMvr: quotedPrice,
    variancePercentage: variance
  });
}

function callGeminiQuoteExtractor(base64Data) {
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;
  var payload = {
    contents: [{
      parts: [
        { text: "Extract supplier_name, extracted_sku_name, quoted_price_mvr from this quote. Return only JSON." },
        { inline_data: { mime_type: "application/pdf", data: base64Data } }
      ]
    }]
  };
  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var parsed = JSON.parse(response.getContentText());
  var text = parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content.parts[0].text;
  if (!text) return {};
  text = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(text);
  } catch (err) {
    return {};
  }
}

function handleSubmitSourcingPackage(requestData) {
  patchRow("Sheet_Purchase_Requests", "pr_id", requestData.pr_id, { status: "Sourcing_Completed" });
  writeHistory("Sourcing Package Submitted", requestData.pr_id, "", requestData.userEmail, "Sourcing package submitted to GM for " + requestData.pr_id);
  return jsonResponse({ status: "Success", prId: requestData.pr_id, newStatus: "Sourcing_Completed" });
}

function handleApproveQuote(requestData) {
  var pr = findRow("Sheet_Purchase_Requests", "pr_id", requestData.pr_id);
  if (!pr) throw new Error("PR not found: " + requestData.pr_id);

  var qty = Number(pr.quantity || 1);
  var unitPrice = Number(requestData.priceMvr || 0);
  var totalCost = qty * unitPrice;
  var poRef = "PO-" + requestData.pr_id + "-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
  var txId = makeId("TX-PO");

  patchRow("Sheet_Purchase_Requests", "pr_id", requestData.pr_id, { status: "PO_Raised" });
  patchSupplierMatrixPo(pr.item_generic_name, requestData.supplierName, poRef);
  appendObject("Sheet_Finance_Ledger", {
    transaction_id: txId,
    reference_id: requestData.pr_id,
    reference_type: "PR",
    ledger_type: "PROCUREMENT_EXPENSE",
    counterparty_name: requestData.supplierName,
    total_amount_mvr: totalCost,
    antrac_submission_timestamp: "",
    payment_clearance_status: "Awaiting Action",
    bank_reference_number: "",
    cleared_by_finance_email: ""
  });
  writeHistory("PO Raised", pr.target_use, pr.target_use, requestData.userEmail, poRef + " raised for " + requestData.supplierName);

  return jsonResponse({ status: "Success", poReference: poRef, transactionId: txId, totalCostMvr: totalCost });
}

function patchSupplierMatrixPo(itemName, supplierName, poRef) {
  var sheet = getOrCreateSheet("Sheet_Item_Supplier_Matrix");
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var itemIdx = headers.indexOf("generic_item_id");
  var supplierIdx = headers.indexOf("supplier_name");
  var poIdx = headers.indexOf("po_reference");
  for (var i = 1; i < values.length; i++) {
    if (values[i][itemIdx] === itemName && values[i][supplierIdx] === supplierName) {
      sheet.getRange(i + 1, poIdx + 1).setValue(poRef);
    }
  }
}

function handleSubmitPoToAntracFinance(requestData) {
  var pr = findRow("Sheet_Purchase_Requests", "pr_id", requestData.pr_id);
  if (!pr) throw new Error("PR not found: " + requestData.pr_id);
  patchFinanceByReference(requestData.pr_id, {
    antrac_submission_timestamp: new Date(),
    payment_clearance_status: "Submitted to Antrac"
  });
  patchRow("Sheet_Purchase_Requests", "pr_id", requestData.pr_id, { status: "Submitted to Antrac" });
  MailApp.sendEmail({
    to: ANTRAC_FINANCE_EMAIL,
    subject: "Well Land PO Ready for Disbursement: " + requestData.pr_id,
    body: "PO " + requestData.pr_id + " is ready for Antrac finance processing.\n\nItem: " + pr.item_generic_name + "\nTarget: " + pr.target_use
  });
  writeHistory("PO Submitted to Antrac", pr.target_use, pr.target_use, requestData.userEmail, "Finance dispatch sent for " + requestData.pr_id);
  return jsonResponse({ status: "Success", prId: requestData.pr_id, paymentClearanceStatus: "Submitted to Antrac" });
}

function handleClearPaymentHandshake(requestData) {
  var pr = findRow("Sheet_Purchase_Requests", "pr_id", requestData.pr_id);
  if (!pr) throw new Error("PR not found: " + requestData.pr_id);
  patchFinanceByReference(requestData.pr_id, {
    payment_clearance_status: "Paid & Cleared",
    bank_reference_number: requestData.bankRef || "",
    cleared_by_finance_email: requestData.userEmail || ""
  });
  patchRow("Sheet_Purchase_Requests", "pr_id", requestData.pr_id, { status: "Paid" });
  writeHistory("Payment Cleared", pr.target_use, pr.target_use, requestData.userEmail, "Payment cleared for " + requestData.pr_id);
  return jsonResponse({ status: "Success", prId: requestData.pr_id, paymentClearanceStatus: "Paid & Cleared" });
}

function patchFinanceByReference(referenceId, patch) {
  var sheet = getOrCreateSheet("Sheet_Finance_Ledger");
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var refIdx = headers.indexOf("reference_id");
  if (refIdx === -1) throw new Error("Finance reference_id column missing.");
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][refIdx]) === String(referenceId)) {
      headers.forEach(function(header, idx) {
        if (patch[header] !== undefined) sheet.getRange(i + 1, idx + 1).setValue(patch[header]);
      });
      return;
    }
  }
  throw new Error("Finance ledger row not found for reference: " + referenceId);
}

function handleReceiveItems(requestData) {
  var pr = findRow("Sheet_Purchase_Requests", "pr_id", requestData.pr_id);
  if (!pr) throw new Error("PR not found: " + requestData.pr_id);
  var ledger = getSheetData(getOrCreateSheet("Sheet_Inventory_Ledger"));
  var match = null;
  for (var i = 0; i < ledger.length; i++) {
    if (ledger[i].generic_item_id === pr.item_generic_name && String(ledger[i].location_base).toLowerCase() === String(requestData.targetLocation).toLowerCase()) {
      match = ledger[i];
      break;
    }
  }
  if (match) {
    updateObject("Sheet_Inventory_Ledger", "generic_item_id", match.generic_item_id, {
      generic_item_id: match.generic_item_id,
      item_name: match.item_name,
      quantity: Number(match.quantity || 0) + Number(requestData.receivedQty || 0),
      location_base: match.location_base
    });
  } else {
    appendObject("Sheet_Inventory_Ledger", {
      generic_item_id: pr.item_generic_name,
      item_name: pr.item_generic_name,
      quantity: Number(requestData.receivedQty || 0),
      location_base: requestData.targetLocation
    });
  }
  patchRow("Sheet_Purchase_Requests", "pr_id", requestData.pr_id, { status: "Completed" });
  writeHistory("Inventory Receipt", pr.target_use, requestData.targetLocation, requestData.userEmail, "Received " + requestData.receivedQty + " units for " + requestData.pr_id);
  return jsonResponse({ status: "Success", prId: requestData.pr_id });
}

function handleLogHistoryEntry(requestData) {
  writeHistory(requestData.event_type, requestData.asset_id, requestData.location, requestData.triggered_by_email || requestData.userEmail, requestData.notes, requestData.timestamp);
  return jsonResponse({ status: "Success" });
}

function writeHistory(eventType, assetId, location, email, notes, timestamp) {
  appendObject("Sheet_Asset_History_Log", {
    log_id: makeId("LOG"),
    timestamp: timestamp || new Date(),
    event_type: eventType || "System Event",
    asset_id: assetId || "",
    location: location || "",
    triggered_by_email: email || "",
    notes: notes || ""
  });
}

function handleBackfillRetroactivePR(requestData) {
  var prId = "PR-RETRO-" + Math.floor(10000 + Math.random() * 90000);
  var txId = makeId("TX-RETRO");
  var when = requestData.backdated_datetime ? new Date(requestData.backdated_datetime) : new Date();
  var dateStr = Utilities.formatDate(when, Session.getScriptTimeZone(), "yyyy-MM-dd");

  appendObject("Sheet_Purchase_Requests", {
    pr_id: prId,
    item_generic_name: requestData.item_name,
    category: requestData.category,
    quantity: 1,
    justification: "[RETROACTIVE BACKFILL] Seeded by system administrator.",
    target_use: requestData.asset_base,
    requested_by_email: requestData.userEmail || "",
    assigned_officer: requestData.userEmail || "",
    target_drive_folder_id: "",
    status: "Completed",
    maintenance_trigger_type: requestData.maintenance_trigger_type || "Retroactive Backfill"
  });
  appendObject("Sheet_Item_Supplier_Matrix", {
    generic_item_id: requestData.item_name,
    supplier_name: requestData.supplier_name,
    extracted_sku_name: String(requestData.supplier_name || "SUP").split(" ")[0].toUpperCase() + "-" + String(requestData.item_name || "ITEM").toUpperCase().replace(/\s+/g, "-").slice(0, 15),
    quoted_price_mvr: Number(requestData.price_mvr || 0),
    quote_date: dateStr,
    price_variance_percentage: 0,
    po_reference: prId
  });
  appendObject("Sheet_Finance_Ledger", {
    transaction_id: txId,
    reference_id: prId,
    reference_type: "PR",
    ledger_type: "PROCUREMENT_EXPENSE",
    counterparty_name: requestData.supplier_name,
    total_amount_mvr: Number(requestData.price_mvr || 0),
    antrac_submission_timestamp: when,
    payment_clearance_status: "Paid & Cleared",
    bank_reference_number: "RETRO-BACKFILL",
    cleared_by_finance_email: requestData.userEmail || ""
  });
  writeHistory("Retroactive PR Backfill", requestData.asset_base, requestData.asset_base, requestData.userEmail, "Retroactive entry: " + requestData.item_name + " from " + requestData.supplier_name, when);
  if (requestData.crm_agreement_id) {
    patchRow("Sheet_CRM_Agreements", "agreement_id", requestData.crm_agreement_id, { agreement_status: "Active Contract" });
  }
  return jsonResponse({ status: "Success", prId: prId, txId: txId });
}

function handleTriggerMilestoneInvoice(requestData) {
  var agreement = findRow("Sheet_CRM_Agreements", "agreement_id", requestData.agreement_id);
  if (!agreement) throw new Error("CRM agreement not found: " + requestData.agreement_id);
  var milestones = [];
  try {
    milestones = JSON.parse(agreement.billing_milestones || "[]");
  } catch (err) {
    milestones = [];
  }
  var idx = Number(requestData.milestone_index || 0);
  if (!milestones[idx] || milestones[idx].status !== "Pending") throw new Error("Milestone not found or already processed.");

  milestones[idx].status = "Invoiced";
  patchRow("Sheet_CRM_Agreements", "agreement_id", requestData.agreement_id, {
    billing_milestones: JSON.stringify(milestones),
    agreement_status: "Active Contract"
  });
  var txId = makeId("TX-CRM");
  appendObject("Sheet_Finance_Ledger", {
    transaction_id: txId,
    reference_id: requestData.agreement_id,
    reference_type: "CRM",
    ledger_type: "CRM_REVENUE",
    counterparty_name: agreement.client_name,
    total_amount_mvr: Number(milestones[idx].amount_mvr || 0),
    antrac_submission_timestamp: new Date(),
    payment_clearance_status: "Invoiced",
    bank_reference_number: "",
    cleared_by_finance_email: requestData.userEmail || ""
  });
  writeHistory("CRM Milestone Invoiced", requestData.agreement_id, "", requestData.userEmail, milestones[idx].milestone + " invoiced.");
  return jsonResponse({ status: "Success", agreementId: requestData.agreement_id, milestoneName: milestones[idx].milestone, amountMvr: milestones[idx].amount_mvr, transactionId: txId });
}

function handleSeedDefaults() {
  ensureAllSheets();
  Object.keys(SHEET_HEADERS).forEach(function(name) {
    var sheet = getOrCreateSheet(name);
    if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  });

  [
    ["alie.mustarq@gmail.com", "Ali Musthaq", "Admin", "Active"],
    ["gm@welllandinvestment.com", "Corporate GM", "Admin", "Active"],
    ["procurement@welllandops.com", "Procurement Officer", "Procurement", "Active"],
    ["finance@welllandops.com", "Finance Officer", "Finance", "Active"],
    ["supervisor@welllandops.com", "Site Supervisor", "Supervisor", "Active"],
    ["operator@welllandops.com", "Field Operator", "Requestee", "Active"]
  ].forEach(function(row) { getOrCreateSheet("Sheet_User_Registry").appendRow(row); });

  [
    ["WL-MV-0001", "LCT 1", "LCT", "Thilafushi", "Active", "Ali Shameem (WL-EMP-0001)", 0, "4.1734,73.4492"],
    ["WL-HV-0002", "Volvo A40G Dump Truck", "Hauler Dump Truck", "Muthaafushi", "Active - Site", "", 0, "4.2156,73.5031"],
    ["WL-HV-0008", "Komatsu PC350 Excavator", "High Bed Excavator", "Thilafushi", "Grounded", "", 0, "4.1734,73.4492"],
    ["WL-HV-0010", "Tadano TR300EX Crane", "Mobile Crane", "Thilafushi", "Standby", "", 0, "4.1734,73.4492"]
  ].forEach(function(row) { getOrCreateSheet("Sheet_Assets_Fleet").appendRow(row); });

  [
    ["LOC-THILAFUSHI", "Thilafushi", "Base Yard", "Active", "4.1734,73.4492"],
    ["LOC-MUTHAAFUSHI", "Muthaafushi", "Project Site", "Active", "4.2156,73.5031"],
    ["LOC-BODUFINOLHU", "Bodufinolhu", "Project Site", "Active", "3.8121,72.8456"]
  ].forEach(function(row) { getOrCreateSheet("Sheet_Locations").appendRow(row); });

  getOrCreateSheet("Sheet_Issue_Tickets").appendRow([
    "TKT-000001",
    "operator@welllandops.com",
    "operator@welllandops.com",
    "LOC-THILAFUSHI",
    "WL-HV-0008",
    "[\"Excavator Bucket Teeth\"]",
    "Open",
    "High",
    "Hydraulic leak reported during morning inspection; machine grounded until repair clearance.",
    "2026-05-22T08:30:00.000Z",
    "2026-05-22T08:30:00.000Z",
    ""
  ]);

  [
    ["PR-0001", "Hydraulic control valve + hose - Hauler Dump Truck VOLVO A40G", "MRO / General", 1, "Required due to leakage on VOLVO A40G at Muthaafushi", "WL-HV-0002", "operator@welllandops.com", "Procurement Officer", "", "Request Received", "Corrective Maintenance"],
    ["PR-0002", "Excavator Bucket Teeth", "Heavy Machinery Parts", 6, "Replace worn out teeth on PC350 excavators at base", "WL-HV-0008", "operator@welllandops.com", "Procurement Officer", "", "PR_Approved", "Corrective Maintenance"],
    ["PR-0003", "Engine Oil 15W40 (20L)", "Consumables", 10, "Scheduled engine oil change for tugboat engines", "WL-MV-0001", "operator@welllandops.com", "Procurement Officer", "", "Completed", "Scheduled Consumable"]
  ].forEach(function(row) { getOrCreateSheet("Sheet_Purchase_Requests").appendRow(row); });

  [
    ["Engine Oil 15W40 (20L)", "Kashimaa Boat", "OIL-15W40-20L-K", 1250, "2026-05-15", 0, "PO-PR-0003-20260515"],
    ["Excavator Bucket Teeth", "Alia Investments Pvt Ltd", "KOMATSU-PC350-TEETH-X", 1800, "2026-05-12", 0, ""],
    ["Excavator Bucket Teeth", "United Diesel Supplies", "UDS-PC350-TEETH", 1950, "2026-05-13", 8.3, ""],
    ["Excavator Bucket Teeth", "Evosun Maldives Pvt Ltd", "EVO-PC350-TEETH", 2050, "2026-05-14", 13.9, ""]
  ].forEach(function(row) { getOrCreateSheet("Sheet_Item_Supplier_Matrix").appendRow(row); });

  [
    ["diesel", "Diesel Fuel", 3300, "Thilafushi"],
    ["water", "Fresh Water", 3000, "Thilafushi"],
    ["Engine Oil 15W40 (20L)", "Engine Oil 15W40 (20L)", 10, "Thilafushi"]
  ].forEach(function(row) { getOrCreateSheet("Sheet_Inventory_Ledger").appendRow(row); });

  getOrCreateSheet("Sheet_CRM_Agreements").appendRow(["RA0003", "Evosun Maldives Pvt Ltd", "[\"WL-MV-0001\"]", "HDPE Pipe Transportation", "Project-based", "2026-04-15", 15, "Active", "HDPE Pipe Transportation - LCT Full Charter", 123012, "Invoiced & Collected", JSON.stringify([{ milestone: "Full Voyage Completion", amount_mvr: 123012, status: "Paid" }])]);

  getOrCreateSheet("Sheet_Finance_Ledger").appendRow(["TX-0001", "RA0003", "CRM", "CRM_REVENUE", "Evosun Maldives Pvt Ltd", 123012, "2026-04-15T12:00:00Z", "Paid & Cleared", "CRM-PAID-RA0003", "finance@welllandops.com"]);
  getOrCreateSheet("Sheet_Finance_Ledger").appendRow(["TX-0002", "PR-0003", "PR", "PROCUREMENT_EXPENSE", "Kashimaa Boat", 12500, "2026-05-15T12:00:00Z", "Paid & Cleared", "REF-BANK-99823", "finance@welllandops.com"]);
  getOrCreateSheet("Sheet_Audit_Log").appendRow(["AUD-000001", new Date(), "system", "INITIAL_SCHEMA", "Schema Initialized", "{}", "{\"Sheet_Audit_Log\":\"enabled\"}", "2026-05-23", "alie.mustarq@gmail.com", "Initial audit ledger configuration for entity correction workflow.", "[]"]);
  writeHistory("Seed Defaults", "SYSTEM", "", "alie.mustarq@gmail.com", "Initial entity, ticketing, and audit configuration seeded.");

  return jsonResponse({ status: "Success", message: "All Well Land Ops v3 sheets seeded." });
}
