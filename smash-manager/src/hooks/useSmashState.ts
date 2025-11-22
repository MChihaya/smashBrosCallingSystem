import { useState, useEffect, useCallback, useRef } from "react";
import type { Ticket, Table, HistoryItem, TicketStatus } from "../types";
// ヘルパー関数とカスタムフックをインポート
import { isTableOccupied, findNextIndex, analyzeBlockReason } from "../utils/smashLogic";
import { useAudio } from "./useAudio";

export function useSmashState() {
  // --- State ---
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tables, setTables] = useState<Table[]>(
    Array.from({ length: 3 }, (_, i) => ({ id: i + 1, occupiedBy: null, hasDlc: false }))
  );
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [uiSettings, setUiSettings] = useState({ fontsize: "medium", columns: 8 });
  const [currentCalled, setCurrentCalled] = useState<number | null>(null);

  // --- Hooks (Audio) ---
  // ★修正: useAudio から機能を受け取る (これでエラー解消)
  const { 
    voiceVolume, setVoiceVolume, 
    beepVolume, setBeepVolume, 
    speak, beep 
  } = useAudio();

  // 自動呼出設定
  const [autoCallEnabled, setAutoCallEnabled] = useState(true);

  const isOperating = useRef(false);
  const isSaving = useRef(false);

  const getApiUrl = () => import.meta.env.DEV ? "http://localhost:8000/api.php" : "./api.php";

  // --- API ---
  const loadState = useCallback(async () => {
    if (isOperating.current || isSaving.current) return;
    try {
      const res = await fetch(getApiUrl());
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      setTickets(data.tickets || []);
      if (data.tables && data.tables.length > 0) {
        setTables(data.tables.map((t: any) => ({ ...t, hasDlc: !!t.hasDlc })));
      }
      setHistory(data.history || []);
      if (data.uiSettings) setUiSettings(data.uiSettings);
      const called = (data.tickets || []).find((t: Ticket) => t.status === "called");
      setCurrentCalled(called ? called.num : null);
    } catch (e) { console.warn("API load failed", e); }
  }, []);

  const saveState = async (newTickets: Ticket[], newTables: Table[], newHistory: HistoryItem[]) => {
    setTickets(newTickets);
    setTables(newTables);
    setHistory(newHistory);
    const called = newTickets.find((t) => t.status === "called");
    setCurrentCalled(called ? called.num : null);
    
    isSaving.current = true;
    try {
      await fetch(getApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickets: newTickets, tables: newTables, history: newHistory, uiSettings }),
      });
    } catch (e) { 
      console.error("Save failed:", e); 
    } finally {
      isSaving.current = false;
    }
  };

  useEffect(() => {
    loadState();
    const interval = setInterval(loadState, 2000);
    return () => clearInterval(interval);
  }, [loadState]);

  // --- Helpers ---
  const pushHistory = (desc: string, currHist: HistoryItem[]) => {
    const snapshot: HistoryItem = { 
      desc, ts: Date.now(),
      tickets: JSON.parse(JSON.stringify(tickets)),
      tables: JSON.parse(JSON.stringify(tables))
    };
    const newHist = [...currHist, snapshot];
    if (newHist.length > 300) newHist.shift();
    return newHist;
  };

  // --- Actions ---

  const callNext = (manualTickets?: Ticket[], manualTables?: Table[], manualHistory?: HistoryItem[], silent: boolean = false) => {
    const targetTickets = manualTickets || tickets;
    const targetTables = manualTables || tables;
    const targetHistory = manualHistory || history;

    if (targetTickets.some(t => t.status === "called")) return alert("既に呼び出し中の整理券があります");
    
    const idx = findNextIndex(targetTickets, targetTables);
    
    if (idx === -1) {
       if (!silent) {
           const hasWaiting = targetTickets.some(t => t.status === "waiting" || t.status === "returned");
           if (hasWaiting) alert(`次を呼べません。\n理由: ${analyzeBlockReason(targetTickets, targetTables)}`);
       }
       if (manualTickets) saveState(manualTickets, targetTables, targetHistory);
       return;
    }
    
    const t = targetTickets[idx];
    const newTickets = [...targetTickets];
    newTickets[idx] = { ...t, status: "called" };
    
    let finalHistory = targetHistory;
    if (!manualHistory) finalHistory = pushHistory(`呼出 #${t.num}`, history); 
    else {
       const last = finalHistory[finalHistory.length - 1];
       if(last) last.desc += ` → 呼出 #${t.num}`;
    }
    
    // 外部フックの関数を使用
    speak(`次は番号、${t.num}番です`);
    beep();
    saveState(newTickets, targetTables, finalHistory);
  };

  const tryCallTicket = (num: number) => {
    if (tickets.some(t => t.status === "called")) return alert("既に呼び出し中の整理券があります");
    const ticket = tickets.find(t => t.num === num);
    if (!ticket) return;

    const emptyTables = tables.filter(tb => !tb.occupiedBy);
    if (ticket.nominatedTable > 0) {
      const table = tables.find(tb => tb.id === ticket.nominatedTable);
      if (!table) return alert(`指定卓${ticket.nominatedTable}なし`);
      if (isTableOccupied(ticket.nominatedTable, tables)) return alert(`卓${ticket.nominatedTable}は埋まっています`);
      if (ticket.dlc && !table.hasDlc) return alert(`卓${ticket.nominatedTable}はDLC非対応のため呼べません`);
    } else {
      if (ticket.dlc) {
         if (!emptyTables.some(tb => tb.hasDlc)) return alert("DLC対応の空き卓がありません");
      }
    }

    const newHistory = pushHistory(`呼出 #${num}`, history);
    const newTickets = [...tickets];
    const idx = newTickets.findIndex(t => t.num === num);
    newTickets[idx] = { ...newTickets[idx], status: "called" };
    
    speak(`次は番号、${num}番です`);
    beep();
    saveState(newTickets, tables, newHistory);
  };

  const updateStatus = (num: number, status: TicketStatus) => {
    const idx = tickets.findIndex(t => t.num === num);
    if (idx === -1) return;
    let desc = `状態変更 #${num} -> ${status}`;
    if (status === "waiting") desc = `戻り #${num}`;
    if (status === "absent") desc = `不在 #${num}`;
    if (status === "skipped") desc = `スルー #${num}`;
    
    const newHistory = pushHistory(desc, history);
    const newTickets = [...tickets];
    newTickets[idx] = { ...newTickets[idx], status };
    
    if (status === "skipped" && autoCallEnabled) {
        callNext(newTickets, tables, newHistory, true);
    } else {
        saveState(newTickets, tables, newHistory);
    }
  };

  const assignToTable = (num: number, tableId: number) => {
    const tIdx = tickets.findIndex(t => t.num === num);
    const tbIdx = tables.findIndex(tb => tb.id === tableId);
    if (tIdx === -1 || tbIdx === -1) return;

    if (isTableOccupied(tableId, tables)) return alert(`卓${tableId}は既に埋まっています`);

    const newHistory = pushHistory(`Assign #${num} -> 卓${tableId}`, history);
    const newTickets = [...tickets];
    const newTables = [...tables];

    if (newTickets[tIdx].table) {
      const prevTb = newTables.find(tb => tb.id === newTickets[tIdx].table);
      if (prevTb) prevTb.occupiedBy = null;
    }
    
    newTables[tbIdx] = { ...newTables[tbIdx], occupiedBy: num };
    newTickets[tIdx] = { ...newTickets[tIdx], status: "playing", table: tableId };

    const hasEmpty = newTables.some(t => !t.occupiedBy);
    if (hasEmpty && autoCallEnabled) {
        callNext(newTickets, newTables, newHistory, true);
    } else {
        saveState(newTickets, newTables, newHistory);
    }
  };

  const clearTableOrEndMatch = (tableId: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    if (table.occupiedBy) {
      const num = table.occupiedBy;
      const tIdx = tickets.findIndex(t => t.num === num);
      const newHistory = pushHistory(`対戦終了 #${num} 卓${tableId}`, history);
      const newTickets = [...tickets];
      const newTables = [...tables];
      if (tIdx !== -1) newTickets[tIdx] = { ...newTickets[tIdx], status: "completed", table: null };
      const tbIdx = newTables.findIndex(t => t.id === tableId);
      newTables[tbIdx] = { ...newTables[tbIdx], occupiedBy: null };
      
      saveState(newTickets, newTables, newHistory);

    } else {
      const called = tickets.find(t => t.status === "called");
      if (!called) return alert("呼び出し中の整理券がありません");

      if (called.dlc && !table.hasDlc) return alert(`整理券 #${called.num} はDLC希望ですが、\n卓${tableId} はDLC非対応のため着席できません。`);
      if (called.nominatedTable > 0 && called.nominatedTable !== tableId) {
        if (!confirm(`整理券 #${called.num} は「卓${called.nominatedTable}」を指名しています。\n\n指名と異なる「卓${tableId}」に着席させますか？`)) return;
      }

      assignToTable(called.num, tableId);
    }
  };

  const addTickets = (count: number, dlc: boolean, nom: number) => {
    const lastNum = tickets.length > 0 ? tickets[tickets.length - 1].num : 0;
    
    let finalDlc = dlc;
    if (nom > 0) {
      const targetTable = tables.find(tb => tb.id === nom);
      if (targetTable) finalDlc = targetTable.hasDlc;
    }

    let desc = `整理券追加 x${count}`;
    if (finalDlc) desc += " (DLC)";
    if (nom > 0) desc += ` (指名:卓${nom})`;
    const newHistory = pushHistory(desc, history);

    const newItems: Ticket[] = Array.from({length: count}, (_, i) => ({
      num: lastNum + i + 1, status: "waiting", dlc: finalDlc, nominatedTable: nom, table: null
    }));
    const newTickets = [...tickets, ...newItems];
    
    saveState(newTickets, tables, newHistory);
  };

  const toggleTableDlc = (tableId: number) => {
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx === -1) return;
    const newTables = [...tables];
    newTables[idx] = { ...newTables[idx], hasDlc: !newTables[idx].hasDlc };
    saveState(tickets, newTables, history);
  };
  
  const updateTableCount = (n: number) => {
    if(n<1) return;
    const newHistory = pushHistory(`卓数変更 -> ${n}`, history);
    const newTables = [];
    for(let i=1; i<=n; i++) {
       const exist = tables.find(t=>t.id===i);
       newTables.push(exist ? exist : {id:i, occupiedBy:null, hasDlc:false});
    }
    saveState(tickets, newTables, newHistory);
  };

  const resetAll = () => {
    if(!confirm("現在の状況をリセットしますか？（履歴は残るためUndo可能です）")) return;
    const newHistory = pushHistory("リセット", history);
    saveState([], Array.from({length:3},(_,i)=>({id:i+1,occupiedBy:null,hasDlc:false})), newHistory);
  };

  const completeReset = () => {
    if(!confirm("こうかいしませんね？")) return;
    saveState([], Array.from({length:3},(_,i)=>({id:i+1,occupiedBy:null,hasDlc:false})), []);
  };

  const undo = () => {
    if (history.length === 0) return alert("履歴がありません");
    const newHistory = [...history];
    const lastState = newHistory.pop(); 
    if (lastState) {
      saveState(lastState.tickets, lastState.tables, newHistory);
      alert(`Undo: ${lastState.desc} を取り消しました`);
    }
  };

  const updateTicket = (num: number, updates: Partial<Ticket>) => {
    const idx = tickets.findIndex(t=>t.num===num);
    if(idx===-1) return;
    const newTickets = [...tickets];
    const updatedTicket = { ...newTickets[idx], ...updates };
    if (updates.nominatedTable !== undefined && updates.nominatedTable > 0) {
        const targetTable = tables.find(tb => tb.id === updates.nominatedTable);
        if (targetTable) updatedTicket.dlc = targetTable.hasDlc;
    }
    newTickets[idx] = updatedTicket;
    saveState(newTickets, tables, history);
  };

  return {
    tickets, tables, history, currentCalled, uiSettings,
    voiceVolume, setVoiceVolume, beepVolume, setBeepVolume, 
    autoCallEnabled, setAutoCallEnabled,
    callNext, assignToTable, clearTableOrEndMatch, updateStatus, 
    addTickets, toggleTableDlc, updateTableCount,
    speak, beep,undo, resetAll, completeReset, tryCallTicket, updateTicket
  };
}