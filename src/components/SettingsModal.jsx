import React, { useState, useEffect } from 'react';
import {
  Settings,
  Download,
  Share,
  PlusSquare,
  Smartphone,
  Copy,
  Check,
  X,
  User,
  Radio,
  ExternalLink,
  Sparkles
} from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  roomId = 'SING',
  nickname = 'Singer',
  onSaveNickname
}) {
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [tempNick, setTempNick] = useState(nickname);
  const [isStandalone, setIsStandalone] = useState(false);

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  useEffect(() => {
    // Check if running as installed standalone PWA
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://');
    setIsStandalone(Boolean(standaloneMode));

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    setTempNick(nickname);
  }, [nickname]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
  };

  const currentUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNick = () => {
    if (onSaveNickname && tempNick.trim()) {
      onSaveNickname(tempNick.trim());
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel p-5 sm:p-6 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto space-y-5 border border-white/15 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Settings & App Download</h3>
              <p className="text-[11px] text-gray-400">Install app on phone and manage session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: DOWNLOAD / INSTALL AS APP (PWA) */}
        <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-br from-rose-950/40 via-purple-950/30 to-black/60 border border-rose-500/25">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-rose-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Download / Install as App
              </h4>
            </div>
            {isStandalone && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ✓ Installed
              </span>
            )}
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            Install Party Karaoke directly on your phone's home screen to run in <strong>fullscreen standalone mode</strong> without browser address bars!
          </p>

          {/* 1-Tap install for Android/Chrome if prompt is active */}
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 font-semibold text-xs text-white shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Install App on this Phone Now (1-Tap)</span>
            </button>
          )}

          {/* Step-by-Step Instructions */}
          <div className="space-y-2 pt-1">
            {/* iOS Instructions */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs text-gray-300">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="text-base">🍏</span>
                <span>iPhone / iPad (Safari):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-300 pl-1">
                <li>
                  Tap the <strong className="text-white">Share button</strong> (square with arrow <Share className="w-3 h-3 inline text-cyan-400" />) at the bottom of Safari.
                </li>
                <li>
                  Scroll down and tap <strong className="text-rose-300">"Add to Home Screen"</strong> (<PlusSquare className="w-3 h-3 inline text-rose-400" />).
                </li>
                <li>
                  Tap <strong className="text-white">"Add"</strong> in the top-right corner.
                </li>
                <li>
                  Open the <strong className="text-white">Karaoke (🎤)</strong> app on your home screen!
                </li>
              </ol>
            </div>

            {/* Android Instructions */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs text-gray-300">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="text-base">🤖</span>
                <span>Android (Chrome / Edge):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-300 pl-1">
                <li>
                  Tap the <strong className="text-white">three dots (⋮)</strong> menu in the browser.
                </li>
                <li>
                  Tap <strong className="text-rose-300">"Install app"</strong> or <strong className="text-rose-300">"Add to Home screen"</strong>.
                </li>
                <li>
                  Confirm <strong className="text-white">"Install"</strong> when prompted.
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Section 2: SINGER PROFILE */}
        <div className="space-y-2.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>Singer Nickname</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tempNick}
              onChange={(e) => setTempNick(e.target.value)}
              placeholder="e.g. Singer 1"
              maxLength={20}
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <button
              onClick={handleSaveNick}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl active:scale-95 transition-all"
            >
              Save
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            This name appears when you reserve songs in the queue.
          </p>
        </div>

        {/* Section 3: ROOM & LINK SHARING */}
        <div className="space-y-2.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-300">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Room Code: <strong className="text-rose-400 font-mono">{roomId}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/50 p-2.5 rounded-xl border border-white/10">
            <span className="text-[11px] text-gray-300 truncate flex-1 font-mono">{currentUrl}</span>
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all text-white flex-shrink-0"
              title="Copy web link"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-300" />
                  <span className="text-[10px]">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-gray-200 active:scale-95 transition-all"
        >
          Close Settings
        </button>
      </div>
    </div>
  );
}
