import React, { useMemo, useState } from 'react';
import { AlertOctagon, ChevronDown, ChevronUp, Edit2, Link2, Trash2 } from 'lucide-react';

const cardClass = 'bg-white border border-slate-200 rounded-lg shadow-sm p-5';

const statusTone = (status = '') => {
  const s = status.toLowerCase();
  if (s.includes('active') || s === 'open' || s === 'running') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (s.includes('progress') || s.includes('standby') || s.includes('pending')) return 'bg-amber-50 text-amber-800 border-amber-200';
  if (s.includes('resolved') || s.includes('paid')) return 'bg-blue-50 text-blue-800 border-blue-200';
  if (s.includes('grounded') || s.includes('inactive') || s.includes('high')) return 'bg-red-50 text-red-800 border-red-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const getTitle = (type, data) => {
  if (type === 'fleet' || type === 'asset') return data.asset_name || data.asset_id;
  if (type === 'issue_ticket') return data.ticket_id;
  return data.display_name || data.item_name || data.supplier_name || data.client_name || data.id || 'Entity';
};

const getSubtitle = (type, data) => {
  if (type === 'fleet' || type === 'asset') return `${data.type || 'Asset'} / ${data.asset_id}`;
  if (type === 'issue_ticket') return `${data.severity || 'Normal'} severity / ${data.asset_id || 'No asset linked'}`;
  return data.email || data.location || data.generic_item_id || '';
};

export default function EntityCard({ data, type, db = {}, onEdit, onDelete }) {
  const [showAssociations, setShowAssociations] = useState(false);
  const status = data.status || data.live_status || data.payment_clearance_status || 'Active';

  const activeTickets = useMemo(() => {
    if (type !== 'fleet' && type !== 'asset') return [];
    return (db.issueTickets || []).filter(ticket =>
      ticket.asset_id === data.asset_id && ticket.status !== 'Resolved'
    );
  }, [data.asset_id, db.issueTickets, type]);

  const linkedHistory = useMemo(() => {
    if (type !== 'fleet' && type !== 'asset') return [];
    return (db.assetHistoryLog || []).filter(entry => entry.asset_id === data.asset_id).slice(0, 3);
  }, [data.asset_id, db.assetHistoryLog, type]);

  const linkedFinance = useMemo(() => {
    if (type !== 'fleet' && type !== 'asset') return [];
    const prIds = (db.purchaseRequests || [])
      .filter(pr => pr.target_use === data.asset_id)
      .map(pr => pr.pr_id);
    return (db.financeLedger || []).filter(row => prIds.includes(row.reference_id));
  }, [data.asset_id, db.financeLedger, db.purchaseRequests, type]);

  return (
    <article className={`${cardClass} space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">{type.replace('_', ' ')}</p>
          <h4 className="text-sm font-extrabold text-slate-950 mt-1 truncate">{getTitle(type, data)}</h4>
          <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">{getSubtitle(type, data)}</p>
        </div>
        <span className={`px-2 py-1 rounded-full border text-[10px] font-extrabold shrink-0 ${statusTone(status)}`}>
          {status}
        </span>
      </div>

      {(type === 'fleet' || type === 'asset') && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[10px] uppercase font-black text-slate-500">Active Tickets</span>
            <p className={`text-lg font-extrabold mt-1 ${activeTickets.length ? 'text-red-700' : 'text-emerald-700'}`}>
              {activeTickets.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[10px] uppercase font-black text-slate-500">Meter Hours</span>
            <p className="text-lg font-extrabold text-slate-950 mt-1">{Number(data.meter_hours || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {activeTickets.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-red-800 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          Issue badge active on this asset card
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowAssociations(value => !value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-extrabold text-slate-700 flex items-center gap-1.5"
        >
          <Link2 className="w-3.5 h-3.5" /> Associations {showAssociations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {onEdit && (
          <button type="button" onClick={() => onEdit(data)} className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={() => onDelete(data)} className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-extrabold flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        )}
      </div>

      {showAssociations && (
        <div className="border-t border-dashed border-slate-200 pt-3 space-y-2 text-xs">
          {(type === 'fleet' || type === 'asset') && (
            <>
              <div>
                <span className="font-extrabold text-slate-700">Active Tickets</span>
                {activeTickets.length ? activeTickets.map(ticket => (
                  <p key={ticket.ticket_id} className="mt-1 text-slate-600">
                    {ticket.ticket_id}: {ticket.severity} / {ticket.status}
                  </p>
                )) : <p className="mt-1 text-slate-500 italic">No open tickets.</p>}
              </div>
              <div>
                <span className="font-extrabold text-slate-700">Recent History</span>
                {linkedHistory.length ? linkedHistory.map(entry => (
                  <p key={entry.log_id} className="mt-1 text-slate-600 truncate">{entry.event_type}: {entry.notes}</p>
                )) : <p className="mt-1 text-slate-500 italic">No linked history.</p>}
              </div>
              <div>
                <span className="font-extrabold text-slate-700">Financial Records</span>
                {linkedFinance.length ? linkedFinance.map(row => (
                  <p key={row.transaction_id} className="mt-1 text-slate-600">{row.transaction_id}: MVR {Number(row.total_amount_mvr || 0).toLocaleString()}</p>
                )) : <p className="mt-1 text-slate-500 italic">No linked finance rows.</p>}
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}
