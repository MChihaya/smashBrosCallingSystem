import type { Ticket, Table } from "../types";

// 卓が埋まっているか判定
export const isTableOccupied = (tableId: number, currentTables: Table[]) => {
  const t = currentTables.find(tb => tb.id === tableId);
  return t ? t.occupiedBy !== null : false;
};

// 次に呼ぶべき人を探す (順番厳守)
export const findNextIndex = (currentTickets: Ticket[], currentTables: Table[]) => {
  const emptyTables = currentTables.filter(tb => !tb.occupiedBy);

  for (let i = 0; i < currentTickets.length; i++) {
    const t = currentTickets[i];
    if (t.status !== "waiting" && t.status !== "returned") continue;

    // 1. 指名卓あり
    if (t.nominatedTable > 0) {
      const targetTable = currentTables.find(tb => tb.id === t.nominatedTable);
      // 卓がない、または埋まっている場合はスキップ
      if (!targetTable || targetTable.occupiedBy !== null) continue;
      return i;
    }

    // 2. 指名なし
    if (t.dlc) {
      // DLC希望なら、DLC卓が空いていないと呼べない
      if (emptyTables.some(tb => tb.hasDlc)) return i;
      continue;
    }
    
    // DLC希望なしなら、空き卓があればどこでもOK
    if (emptyTables.length > 0) return i;
  }

  return -1;
};

// 呼べない理由を解析
export const analyzeBlockReason = (currentTickets: Ticket[], currentTables: Table[]): string => {
  const waiting = currentTickets.filter(t => t.status === "waiting" || t.status === "returned");
  if (waiting.length === 0) return "待ち状態の整理券がありません。";

  const t = waiting[0]; // 先頭の人
  const emptyTables = currentTables.filter(tb => !tb.occupiedBy);

  if (t.nominatedTable > 0) {
    const table = currentTables.find(tb => tb.id === t.nominatedTable);
    if (!table) return `整理券 #${t.num} の指名卓${t.nominatedTable}が存在しません。`;
    if (table.occupiedBy !== null) return `整理券 #${t.num} は卓${t.nominatedTable}を指名していますが、埋まっています。`;
    // DLC不整合は同期処理で防いでいる前提だが念のため
    if (t.dlc && !table.hasDlc) return `整理券 #${t.num} (DLC) は卓${t.nominatedTable}を指名していますが、DLC非対応です。`;
  } 
  else if (t.dlc) {
    if (!emptyTables.some(tb => tb.hasDlc)) {
      return `整理券 #${t.num} (DLC) を案内できる空き卓（DLC対応）がありません。`;
    }
  }
  else {
    if (emptyTables.length === 0) return "空き卓がありません。";
  }

  return `整理券 #${t.num} 以降も含め、条件（指名やDLC）に合う空き卓がありません。`;
};