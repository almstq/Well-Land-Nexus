import React, { useMemo, useState } from 'react';
import { AlertOctagon, Package, Send } from 'lucide-react';

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const parseItems = (itemsJson) => {
  try {
    const parsed = JSON.parse(itemsJson || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function EntityForm({ type, db = {}, userEmail = '', onSubmit }) {
  const [form, setForm] = useState({
    location_id: '',
    asset_id: '',
    reported_by_id: userEmail,
    severity: 'Medium',
    status: 'Open',
    description: '',
    items_required_json: '[]'
  });

  const locations = db.locations || [];
  const users = db.userRegistry || [];
  const inventory = db.inventoryLedger || [];

  const filteredAssets = useMemo(() => {
    const assets = db.assetsFleet || [];
    if (!form.location_id) return assets;
    const selectedLocation = locations.find(location => location.location_id === form.location_id);
    const locationName = selectedLocation?.location_name || form.location_id;
    return assets.filter(asset => asset.location === form.location_id || asset.location === locationName);
  }, [db.assetsFleet, form.location_id, locations]);

  if (type !== 'issue_ticket') {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-600">
        EntityForm is configured for issue_ticket in this sprint.
      </div>
    );
  }

  const selectedItems = parseItems(form.items_required_json);

  const toggleItem = (itemId) => {
    const next = selectedItems.includes(itemId)
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId];
    setForm(current => ({ ...current, items_required_json: JSON.stringify(next) }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const ticketId = `TKT-${Date.now()}`;
    onSubmit({
      ticket_id: ticketId,
      raised_by_email: userEmail,
      reported_by_id: form.reported_by_id,
      location_id: form.location_id,
      asset_id: form.asset_id,
      items_required_json: form.items_required_json,
      status: form.status,
      severity: form.severity,
      description: form.description,
      created_at: now,
      updated_at: now,
      resolved_at: ''
    });
    setForm({
      location_id: '',
      asset_id: '',
      reported_by_id: userEmail,
      severity: 'Medium',
      status: 'Open',
      description: '',
      items_required_json: '[]'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
        <div className="p-2 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <AlertOctagon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-950">Raise Issue Ticket</h3>
          <p className="text-xs text-slate-500 mt-1">Operator flow: location, asset, required items, then submit.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] uppercase font-black text-slate-500">Location</span>
          <select required className={inputClass} value={form.location_id} onChange={e => setForm(current => ({ ...current, location_id: e.target.value, asset_id: '' }))}>
            <option value="">Select location</option>
            {locations.map(location => (
              <option key={location.location_id} value={location.location_id}>{location.location_name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] uppercase font-black text-slate-500">Asset / Vessel / Equipment</span>
          <select required className={inputClass} value={form.asset_id} onChange={e => setForm(current => ({ ...current, asset_id: e.target.value }))}>
            <option value="">Select asset</option>
            {filteredAssets.map(asset => (
              <option key={asset.asset_id} value={asset.asset_id}>{asset.asset_name} / {asset.asset_id}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] uppercase font-black text-slate-500">Reported By</span>
          <select required className={inputClass} value={form.reported_by_id} onChange={e => setForm(current => ({ ...current, reported_by_id: e.target.value }))}>
            <option value="">Select staff</option>
            {users.map(user => (
              <option key={user.email} value={user.email}>{user.display_name} / {user.email}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] uppercase font-black text-slate-500">Severity</span>
          <select className={inputClass} value={form.severity} onChange={e => setForm(current => ({ ...current, severity: e.target.value }))}>
            {['Low', 'Medium', 'High'].map(severity => <option key={severity} value={severity}>{severity}</option>)}
          </select>
        </label>
      </div>

      <label className="space-y-1 block">
        <span className="text-[10px] uppercase font-black text-slate-500">Description</span>
        <textarea required rows={3} className={inputClass} value={form.description} onChange={e => setForm(current => ({ ...current, description: e.target.value }))} placeholder="Describe the fault, repair task, or operational issue." />
      </label>

      <div className="space-y-2">
        <span className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" /> Items Required
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
          {inventory.map(item => (
            <label key={item.generic_item_id} className={`rounded-lg border px-3 py-2 text-xs font-bold cursor-pointer transition ${selectedItems.includes(item.generic_item_id) ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
              <input type="checkbox" className="mr-2" checked={selectedItems.includes(item.generic_item_id)} onChange={() => toggleItem(item.generic_item_id)} />
              {item.item_name}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" className="w-full md:w-auto px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 active:scale-95">
        <Send className="w-4 h-4" /> Submit Ticket
      </button>
    </form>
  );
}
