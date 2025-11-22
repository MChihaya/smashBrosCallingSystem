import { useState } from "react";

interface Props {
  onLogin: () => void;
}

export const LoginModal = ({ onLogin }: Props) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  // ★ここでパスワードを設定 (例: "admin123")
  const PASSCODE = "admin123";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSCODE) {
      onLogin();
    } else {
      setError("パスワードが違います");
      setInput("");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-sm">
        <h2 className="text-xl font-bold text-slate-700 mb-4 text-center">管理者ログイン</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="パスワードを入力"
            className="border p-3 rounded text-lg text-center tracking-widest"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
          <button
            type="submit"
            className="bg-emerald-600 text-white py-3 rounded font-bold hover:bg-emerald-700 transition-colors"
          >
            ロック解除
          </button>
        </form>
      </div>
    </div>
  );
};