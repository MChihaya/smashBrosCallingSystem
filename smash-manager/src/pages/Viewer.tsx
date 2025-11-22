import { useEffect, useRef, useState } from "react";
import { useSmashState } from "../hooks/useSmashState";

export const Viewer = () => {
  const {
    tickets,
    currentCalled,
    voiceVolume, setVoiceVolume,
    beepVolume, setBeepVolume,
    speak, beep
  } = useSmashState();

  // ★追加: 音声再生許可フラグ
  const [isAudioAllowed, setIsAudioAllowed] = useState(false);
  const prevCalledRef = useRef<number | null>(null);

  // 呼び出し番号が変わったときに音を鳴らす
  useEffect(() => {
    // まだ許可されていない、または初回ロード時(null)は鳴らさない
    if (!isAudioAllowed) {
        prevCalledRef.current = currentCalled;
        return;
    }

    if (currentCalled && currentCalled !== prevCalledRef.current) {
      setTimeout(() => {
        speak(`次は番号、${currentCalled}番です`);
        beep();
      }, 500);
    }
    prevCalledRef.current = currentCalled;
  }, [currentCalled, isAudioAllowed, speak, beep]);

  const calledTickets = tickets.filter(t => t.status === "called");
  const waitingTickets = tickets.filter(t => ["waiting", "returned", "skipped"].includes(t.status));

  // ★追加: 開始ボタンを押して音声を有効化する関数
  const handleStart = () => {
    setIsAudioAllowed(true);
    beep(); // 一度鳴らしてブラウザの制限を解除する
    // 初回のアナウンスが必要ならここで行う
    if (currentCalled) speak(`現在の呼び出しは、${currentCalled}番です`);
  };

  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex flex-col overflow-hidden font-sans relative">
      
      {/* ★追加: 音声有効化のためのスタートオーバーレイ */}
      {!isAudioAllowed && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center text-center p-4">
          <h1 className="text-4xl font-bold mb-8 tracking-widest">Smash Monitor</h1>
          <p className="text-slate-400 mb-8">ブラウザの制限により、音声再生には操作が必要です。</p>
          <button 
            onClick={handleStart}
            className="bg-emerald-500 hover:bg-emerald-400 text-white text-xl font-bold py-6 px-12 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all active:scale-95 animate-pulse"
          >
            タップしてモニタリング開始 🔊
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-slate-800 shadow-md z-10">
        <h1 className="text-xl font-bold tracking-wider">Smash 呼び出しモニター</h1>
        
        <div className="flex items-center gap-4 opacity-50 hover:opacity-100 transition-opacity bg-slate-700 p-2 rounded-full px-6">
          <div className="flex flex-col items-center w-24">
            <span className="text-[10px] uppercase tracking-widest mb-1">Voice</span>
            <input type="range" min="0" max="1" step="0.1" value={voiceVolume} onChange={e=>setVoiceVolume(Number(e.target.value))} className="w-full h-1 bg-slate-500 rounded-lg appearance-none cursor-pointer accent-sky-400" />
          </div>
          <div className="flex flex-col items-center w-24">
            <span className="text-[10px] uppercase tracking-widest mb-1">Beep</span>
            <input type="range" min="0" max="1" step="0.1" value={beepVolume} onChange={e=>setBeepVolume(Number(e.target.value))} className="w-full h-1 bg-slate-500 rounded-lg appearance-none cursor-pointer accent-yellow-400" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* メインエリア */}
        <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center p-8 relative border-r border-slate-700">
          <div className="absolute top-6 left-6 text-slate-400 font-bold text-2xl tracking-widest">現在の呼び出し</div>
          
          {calledTickets.length > 0 ? (
            <div className="flex flex-col gap-8 w-full items-center">
              {calledTickets.slice().reverse().map((t, index) => {
                const isMain = index === 0;
                return (
                  <div key={t.num} className={`
                    flex flex-col items-center justify-center w-full max-w-3xl text-center
                    ${isMain ? 'bg-yellow-400 text-slate-900 p-12 rounded-3xl shadow-2xl scale-105' : 'bg-slate-800 text-slate-200 p-6 rounded-xl opacity-60 scale-90'}
                    transition-all duration-500
                  `}>
                    <span className={`font-bold mb-2 ${isMain ? 'text-3xl opacity-80' : 'text-xl opacity-50'}`}>
                      Ticket No.
                    </span>
                    <span className={`font-mono font-bold ${isMain ? 'text-9xl md:text-[12rem] tracking-tighter leading-none' : 'text-6xl'}`}>
                      #{t.num}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-slate-600 text-4xl md:text-5xl font-bold animate-pulse">
              呼び出し待機中...
            </div>
          )}
        </div>

        {/* 右側: 待機リスト */}
        <div className="h-1/3 md:h-full md:w-96 bg-slate-800 flex flex-col border-t md:border-t-0 border-slate-700 shadow-2xl z-10">
          <div className="p-4 bg-slate-700 shadow-sm flex justify-between items-center border-b border-slate-600">
            <span className="font-bold text-slate-200 text-2xl tracking-widest">待機リスト</span>
            <span className="bg-slate-600 px-3 py-1 rounded-full text-lg font-bold text-white">{waitingTickets.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {waitingTickets.length === 0 && <div className="text-slate-500 text-center mt-10 text-xl">待ちなし</div>}
            {waitingTickets.map(t => (
              <div key={t.num} className="flex justify-between items-center p-4 bg-slate-700/50 rounded border border-slate-600 text-slate-200">
                <span className="font-mono text-2xl font-bold">#{t.num}</span>
                <div className="flex gap-1">
                  {t.dlc && <span className="text-xs bg-pink-900 text-pink-200 px-2 py-1 rounded border border-pink-700 font-bold">DLC</span>}
                  {t.nominatedTable > 0 && <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded border border-blue-700 font-bold">卓{t.nominatedTable}</span>}
                  {t.status === 'skipped' && <span className="text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded border border-purple-700 font-bold">SKIP</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
};