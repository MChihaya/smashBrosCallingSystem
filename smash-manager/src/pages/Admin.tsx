import { useState, useEffect } from "react";
import { useSmashState } from "../hooks/useSmashState";
import { TicketCard } from "../components/TicketCard";
import { TableManager } from "../components/TableManager";
import { HistoryList } from "../components/HistoryList";
import { LoginModal } from "../components/LoginModal"; // ★追加
import type { Table } from "../types";

// 整理券追加パネル
const AddTicketPanel = ({ 
  addDlc, setAddDlc, addNom, tables, onAdd, onNomChange 
}: {
  addDlc: boolean;
  setAddDlc: (v: boolean) => void;
  addNom: number;
  tables: Table[];
  onAdd: () => void;
  onNomChange: (id: number) => void;
}) => (
  <div className="bg-white p-4 rounded shadow-sm border-t-4 border-t-sky-500">
    <h3 className="font-bold mb-3 text-sky-700">整理券追加</h3>
    <div className="flex flex-col gap-3">
      <button 
        onClick={onAdd} 
        className="bg-sky-600 text-white py-3 rounded font-bold hover:bg-sky-700 shadow-md active:scale-95 transition-transform">
        追加 (+1)
      </button>
      <div className="flex justify-between items-center text-sm gap-2">
          <label className="flex-1 flex justify-center items-center gap-2 cursor-pointer bg-slate-50 px-2 py-2 rounded border hover:bg-slate-100">
            <input type="checkbox" checked={addDlc} onChange={e=>setAddDlc(e.target.checked)} className="w-4 h-4"/> 
            <span className="font-bold text-slate-700">DLC</span>
          </label>
          <div className="flex-1 flex items-center gap-1 bg-slate-50 px-2 py-2 rounded border">
            <span className="text-xs text-slate-500">指名</span>
            <select value={addNom} onChange={e=>onNomChange(Number(e.target.value))} className="bg-transparent font-bold w-full">
                <option value="0">なし</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>卓{t.id}{t.hasDlc ? '(D)' : ''}</option>
                ))}
            </select>
          </div>
      </div>
    </div>
  </div>
);

export const Admin = () => {
  // ★追加: 認証状態の管理
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // セッションストレージを確認 (タブを閉じるとリセットされる)
    const auth = sessionStorage.getItem("smash_admin_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem("smash_admin_auth", "true");
    setIsAuthenticated(true);
  };

  // --- ここから既存のロジック ---
  const {
    tickets, tables, history, currentCalled, 
    voiceVolume, setVoiceVolume, beepVolume, setBeepVolume,
    autoCallEnabled, setAutoCallEnabled,
    callNext, assignToTable, clearTableOrEndMatch, updateStatus, updateTicket,
    addTickets, toggleTableDlc, updateTableCount, speak, 
    undo, resetAll, completeReset, 
    tryCallTicket 
  } = useSmashState();

  const [searchQuery, setSearchQuery] = useState("");
  const [tableCountInput, setTableCountInput] = useState(3);
  const [addDlc, setAddDlc] = useState(false);
  const [addNom, setAddNom] = useState(0);

  const getViewerUrl = () => {
    const path = window.location.pathname;
    return `${path}#/viewer`;
  };

  const filteredTickets = tickets.filter(t => {
    if (["completed", "playing", "absent"].includes(t.status)) return false;
    if (searchQuery && !String(t.num).includes(searchQuery)) return false;
    return true;
  });
  const calledTickets = tickets.filter(t => t.status === "called");
  const absentTickets = tickets.filter(t => t.status === "absent");
  const completedTickets = tickets.filter(t => t.status === "completed");

  useEffect(() => {
    // ログインしていない時はショートカット無効
    if (!isAuthenticated) return;

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'n') callNext();
      if (e.key === 'u') undo();
      if (e.key === ' ') { e.preventDefault(); if (currentCalled) speak(`番号、${currentCalled}番、呼び出し中です`); }
      if (e.key >= '1' && e.key <= '9') {
        const tableId = Number(e.key);
        if (tables.some(t => t.id === tableId)) clearTableOrEndMatch(tableId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAuthenticated, callNext, undo, currentCalled, speak, clearTableOrEndMatch, tables]);

  const handleAddNomChange = (tableId: number) => {
    setAddNom(tableId);
    if (tableId > 0) {
      const targetTable = tables.find(t => t.id === tableId);
      if (targetTable) {
        setAddDlc(targetTable.hasDlc);
      }
    }
  };

  const handleAddTicket = () => {
    addTickets(1, addDlc, addNom);
    setAddNom(0); 
    setAddDlc(false);
  };

  // ★追加: ログインしていない場合はモーダルを表示
  if (!isAuthenticated) {
    return <LoginModal onLogin={handleLogin} />;
  }

  return (
    <div className="max-w-7xl mx-auto p-2 md:p-4 bg-slate-100 min-h-screen text-slate-800 font-sans">
      <header className="flex flex-col md:flex-row md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Smash 整理券管理 v9.1</h1>
          <div className="text-xs md:text-sm text-slate-500 hidden md:block">Key: n=次, u=Undo, 1-9=卓操作, Space=読上</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm bg-white p-2 rounded shadow-sm md:bg-transparent md:shadow-none">
          <a href={getViewerUrl()} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mr-4 font-bold">閲覧ページへ ↗</a>
          <div className="font-bold text-slate-700">待ち: {tickets.filter(t => ["waiting","returned","skipped"].includes(t.status)).length}</div>
          <div>呼出: {calledTickets.length}</div>
          <div>対戦: {tickets.filter(t => t.status === "playing").length} / 総: {tickets.length}</div>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="block md:hidden">
          <AddTicketPanel 
            addDlc={addDlc} setAddDlc={setAddDlc} addNom={addNom} 
            tables={tables} onAdd={handleAddTicket} onNomChange={handleAddNomChange} 
          />
        </div>

        <section className="md:col-span-2 bg-white p-3 md:p-4 rounded-lg shadow-sm">
          <div className="flex flex-col md:flex-row md:justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => callNext()} className="flex-grow md:flex-grow-0 bg-emerald-500 text-white px-4 py-2 rounded font-bold hover:bg-emerald-600 shadow-sm">次を呼ぶ</button>
              <button onClick={() => currentCalled && speak(`次は番号、${currentCalled}番です`)} className="flex-grow md:flex-grow-0 bg-yellow-400 px-3 py-2 rounded font-bold hover:bg-yellow-500 text-sm">再アナウンス</button>
              <button onClick={undo} className="bg-gray-200 px-3 py-2 rounded font-bold hover:bg-gray-300 text-sm">Undo</button>
              <div className="ml-auto md:ml-2 flex gap-2">
                <button onClick={resetAll} className="bg-red-500 text-white px-2 py-1 rounded font-bold hover:bg-red-600 text-xs">リセット</button>
                <button onClick={completeReset} className="bg-slate-700 text-white px-2 py-1 rounded font-bold hover:bg-slate-800 text-xs">完全消去</button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm bg-slate-50 p-2 rounded md:bg-transparent md:p-0">
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="番号検索" className="border p-1.5 rounded w-20 md:w-24" />
              <div className="flex items-center gap-3 border-l pl-3 md:border-none md:pl-0">
                <div className="flex flex-col items-center w-16"><span className="text-[10px] text-slate-500">音声</span><input type="range" min="0" max="1" step="0.1" value={voiceVolume} onChange={e=>setVoiceVolume(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /></div>
                <div className="flex flex-col items-center w-16"><span className="text-[10px] text-slate-500">ビープ</span><input type="range" min="0" max="1" step="0.1" value={beepVolume} onChange={e=>setBeepVolume(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /></div>
                <label className="flex items-center gap-1 cursor-pointer select-none hover:opacity-70 font-bold text-slate-700"><input type="checkbox" checked={autoCallEnabled} onChange={e=>setAutoCallEnabled(e.target.checked)} /> 自動呼出</label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 bg-blue-50 p-3 rounded border border-blue-100 items-center">
            <div className="md:col-span-2 text-center md:text-left">
              <div className="text-xs text-slate-500 mb-1">現在の呼び出し</div>
              <div className="font-mono text-3xl md:text-4xl font-bold text-slate-800">{currentCalled ? `#${currentCalled}` : '—'}</div>
            </div>
            <div className="flex justify-center md:justify-end gap-2">
               {currentCalled && (<><button onClick={() => updateStatus(currentCalled, "absent")} className="text-xs border border-red-300 bg-white px-3 py-2 rounded text-red-700 font-bold shadow-sm">不在</button><button onClick={() => updateStatus(currentCalled, "completed")} className="text-xs border border-slate-300 bg-white px-3 py-2 rounded text-slate-700 font-bold shadow-sm">終了</button></>)}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-bold mb-2 text-sm text-slate-500 border-b pb-1">呼び出し中リスト</h3>
            {calledTickets.length === 0 && <div className="text-slate-400 text-sm text-center py-2">なし</div>}
            <div className="space-y-2">
              {calledTickets.map(t => (
                <div key={t.num} className="p-3 border-l-4 border-l-yellow-400 border-y border-r rounded bg-yellow-50 flex flex-wrap justify-between items-center gap-2">
                  <div className="font-mono font-bold text-xl">#{t.num} {t.nominatedTable > 0 && <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded ml-2 align-middle">卓{t.nominatedTable}</span>}</div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => { const empty = t.nominatedTable > 0 ? tables.find(tb=>tb.id===t.nominatedTable && !tb.occupiedBy) : tables.find(tb=>!tb.occupiedBy); if(empty) assignToTable(t.num, empty.id); else alert("空き卓がありません"); }} className="flex-1 md:flex-none text-sm px-4 py-1.5 bg-white border border-yellow-200 rounded hover:bg-yellow-100 shadow-sm font-bold text-yellow-800">着席</button>
                    <button onClick={() => updateStatus(t.num, "skipped")} className="flex-1 md:flex-none text-sm px-3 py-1.5 bg-red-100 text-red-800 rounded hover:bg-red-200 font-bold">スルー</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {absentTickets.length > 0 && <div className="mb-4 bg-red-50 p-2 rounded border border-red-100"><div className="text-xs text-red-800 mb-1 font-bold">不在リスト (タップで復帰)</div><div className="flex flex-wrap gap-2">{absentTickets.map(t => <button key={t.num} onClick={() => updateStatus(t.num, "waiting")} className="bg-white border border-red-200 text-red-800 px-3 py-1 rounded text-sm font-mono shadow-sm">#{t.num}</button>)}</div></div>}

          <h3 className="font-bold mb-2 text-sm text-slate-500 border-b pb-1">整理券一覧</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredTickets.map(t => <TicketCard key={t.num} ticket={t} tables={tables} onCall={(num) => tryCallTicket(num)} onUpdateStatus={updateStatus} onUpdateTicket={updateTicket} />)}
          </div>

          <div className="mt-8"><div className="text-xs font-bold text-slate-400 mb-1">対戦済み履歴 (最新順)</div>{completedTickets.length === 0 && <div className="text-slate-400 text-sm">なし</div>}<div className="flex flex-wrap gap-1 text-xs">{completedTickets.slice().reverse().map(t => <div key={t.num} className="px-2 py-1 border rounded bg-slate-100 text-slate-500">#{t.num}</div>)}</div></div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="hidden md:block">
            <AddTicketPanel addDlc={addDlc} setAddDlc={setAddDlc} addNom={addNom} tables={tables} onAdd={handleAddTicket} onNomChange={handleAddNomChange} />
          </div>
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex justify-between items-center mb-2 border-b pb-2"><h3 className="font-bold text-sm text-slate-600">卓の管理</h3><div className="flex items-center gap-1 text-sm"><input type="number" value={tableCountInput} onChange={e=>setTableCountInput(Number(e.target.value))} onBlur={() => updateTableCount(tableCountInput)} className="w-12 border p-1 rounded text-center bg-slate-50"/><span className="text-xs">卓</span></div></div>
            <TableManager tables={tables} calledTickets={calledTickets} onToggleDlc={toggleTableDlc} onTableAction={clearTableOrEndMatch} />
          </div>
          <HistoryList history={history} />
        </aside>
      </main>
    </div>
  );
};