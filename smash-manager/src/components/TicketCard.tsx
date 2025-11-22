import React from "react";
import type { Ticket, Table, TicketStatus } from "../types";

interface Props {
  ticket: Ticket;
  tables: Table[];
  onCall: (num: number) => void;
  onUpdateStatus: (num: number, status: TicketStatus) => void;
  onUpdateTicket: (num: number, updates: Partial<Ticket>) => void;
}

export const TicketCard: React.FC<Props> = ({ ticket, tables, onCall, onUpdateStatus, onUpdateTicket }) => {
  const isWaiting = ticket.status === "waiting" || ticket.status === "returned";
  const isSkipped = ticket.status === "skipped";
  const isCalled = ticket.status === "called";
  
  let statusText = "待ち";
  if (isSkipped) statusText = "スルー";
  else if (isCalled) statusText = "呼出中";
  else if (ticket.status === "playing") statusText = "対戦中";

  return (
    <div className={`p-2 rounded border bg-white flex flex-col justify-between min-h-[110px] 
      ${isCalled ? 'ring-2 ring-yellow-300' : ''} 
      ${ticket.status === 'playing' ? 'bg-emerald-50' : ''} 
      ${isSkipped ? 'bg-purple-50' : ''}`}>
      
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="font-mono text-lg font-bold">#{ticket.num}</div>
          <div className="text-xs text-slate-500">
            {statusText}{ticket.table ? ` · 卓${ticket.table}` : ''}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {ticket.dlc && <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold">DLC</span>}
          {ticket.nominatedTable > 0 && <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">卓{ticket.nominatedTable} 指名</span>}
        </div>
      </div>

      <div className="mt-2 flex gap-1">
        <button onClick={() => onCall(ticket.num)} disabled={!isWaiting && !isSkipped}
          className={`flex-1 px-2 py-1 text-xs border rounded transition ${isCalled ? 'bg-yellow-100' : 'bg-slate-50 hover:bg-slate-100'} ${(!isWaiting && !isSkipped) ? 'opacity-50 cursor-not-allowed' : ''}`}>
          呼び出す
        </button>
        {(isWaiting || isSkipped) && (
          <button onClick={() => onUpdateStatus(ticket.num, isSkipped ? "waiting" : "absent")}
            className={`flex-1 px-2 py-1 text-xs border rounded transition ${isSkipped ? 'bg-indigo-100 text-indigo-800' : 'bg-white hover:bg-slate-50'}`}>
            {isSkipped ? "戻す" : "不在"}
          </button>
        )}
      </div>

      <div className="mt-2 pt-1 border-t flex items-center justify-between text-xs">
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={ticket.dlc} onChange={(e) => onUpdateTicket(ticket.num, { dlc: e.target.checked })} /> DLC
        </label>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">指名</span>
          <select value={ticket.nominatedTable} onChange={(e) => onUpdateTicket(ticket.num, { nominatedTable: Number(e.target.value) })}
            className="border rounded p-0.5 w-16 text-center">
            <option value="0">なし</option>
            {tables.map(t => <option key={t.id} value={t.id}>卓{t.id}{t.hasDlc ? '(D)' : ''}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};