import React from "react";
import type { HistoryItem } from "../types";

export const HistoryList: React.FC<{ history: HistoryItem[] }> = ({ history }) => (
  <div className="bg-white p-4 rounded shadow-sm flex-1">
    <h3 className="font-bold mb-2">履歴</h3>
    <ul className="text-xs text-slate-500 list-decimal pl-4 space-y-1">
      {history.slice().reverse().slice(0, 10).map((h, i) => (
        <li key={i}>{new Date(h.ts).toLocaleTimeString()} {h.desc}</li>
      ))}
    </ul>
  </div>
);