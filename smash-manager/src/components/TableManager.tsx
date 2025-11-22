import React from "react";
import type { Table, Ticket } from "../types";

interface Props {
  tables: Table[];
  calledTickets: Ticket[];
  onToggleDlc: (id: number) => void;
  onTableAction: (id: number) => void;
}

export const TableManager: React.FC<Props> = ({ tables, calledTickets, onToggleDlc, onTableAction }) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {tables.map(tb => {
         const isNominated = calledTickets.some(t => t.nominatedTable === tb.id);
         return (
          <div key={tb.id} className={`p-2 border rounded flex flex-col items-center gap-2 ${isNominated ? 'ring-2 ring-blue-300' : ''}`}>
            <div className="w-full flex justify-between items-center text-sm">
               <span className="font-bold">卓{tb.id}</span>
               <label className="text-[10px] flex items-center gap-1 cursor-pointer">
                 <input type="checkbox" checked={tb.hasDlc} onChange={()=>onToggleDlc(tb.id)} /> DLC
               </label>
            </div>
            <div className="text-xl font-mono font-bold h-8 flex items-center">
              {tb.occupiedBy ? `#${tb.occupiedBy}` : <span className="text-slate-300 text-sm">空</span>}
            </div>
            <button onClick={() => onTableAction(tb.id)}
              className={`w-full text-xs py-1 rounded border font-bold ${tb.occupiedBy ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'}`}>
              {tb.occupiedBy ? "終了" : "着席"}
            </button>
          </div>
         );
      })}
    </div>
  );
};