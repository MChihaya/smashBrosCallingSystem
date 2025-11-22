import { useState, useCallback, useEffect } from "react";

export function useAudio() {
  // 音量設定 (0.0 ～ 1.0)
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [beepVolume, setBeepVolume] = useState(0.1);
  
  // 選択された音声ボイス
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // ブラウザの音声ロード時に高品質な日本語音声を探す
  useEffect(() => {
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // 優先順: Google日本語 -> Microsoft系以外 -> デフォルト
      const jpVoice = voices.find(v => v.name.includes("Google") && v.lang.includes("ja")) 
                   || voices.find(v => v.lang.includes("ja") && !v.name.includes("Microsoft")) 
                   || voices.find(v => v.lang.includes("ja"));
      
      if (jpVoice) setSelectedVoice(jpVoice);
    };

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }
    setVoice();
  }, []);

  // 読み上げ実行
  const speak = useCallback((text: string) => {
    if (voiceVolume <= 0 || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.volume = voiceVolume; // 音量を適用
    
    if (selectedVoice) u.voice = selectedVoice; // 高品質音声を適用
    
    u.rate = 1.0; // 少しゆっくり
    u.pitch = 1.0; 

    window.speechSynthesis.speak(u);
  }, [voiceVolume, selectedVoice]);

  // ビープ音実行
  const beep = useCallback(() => {
    if (beepVolume <= 0) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = beepVolume; // 音量を適用
      o.connect(g); g.connect(ctx.destination);
      o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 120);
    } catch (e) {}
  }, [beepVolume]);

  return {
    voiceVolume, setVoiceVolume,
    beepVolume, setBeepVolume,
    speak, beep
  };
}