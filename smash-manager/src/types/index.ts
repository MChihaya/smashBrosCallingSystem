export type TicketStatus = "waiting" | "called" | "playing" | "completed" | "absent" | "skipped" | "returned";

export interface Ticket {
  num: number;
  status: TicketStatus;
  dlc: boolean;
  nominatedTable: number; // 0 = 指定なし
  table: number | null;
  note?: string;
}

export interface Table {
  id: number;
  occupiedBy: number | null;
  hasDlc: boolean;
}

export interface HistoryItem {
  desc: string;
  ts: number;
  // Undo用にその時点の全データを保存する
  tickets: Ticket[];
  tables: Table[];
}

export interface AppState {
  tickets: Ticket[];
  tables: Table[];
  history: HistoryItem[];
  uiSettings: {
    fontsize: string;
    columns: number;
  };
}