import React, { useState } from "react";
import {
  Users,
  Copy,
  Check,
  Globe2,
  Bot,
  Play,
  Share2,
  ShieldCheck,
  X,
  Server,
  Sparkles,
} from "lucide-react";
import { sfx } from "../audio/sfx";

interface MultiplayerLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldId: string;
  onJoinWorld: (id: string) => void;
  humanPlayersCount: number;
  botPlayersCount: number;
  isEphemeralRollupActive: boolean;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  isOpen,
  onClose,
  worldId,
  onJoinWorld,
  humanPlayersCount,
  botPlayersCount,
  isEphemeralRollupActive,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [inputWorldId, setInputWorldId] = useState<string>("");

  if (!isOpen) return null;

  const shareableUrl = `${window.location.origin}?world=${worldId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    sfx.playPriceClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputWorldId.trim()) {
      onJoinWorld(inputWorldId.trim());
      sfx.playChing();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#1c1815]/95 border-2 border-[#d4a359]/60 rounded-3xl p-6 shadow-2xl text-[#f7f0e3]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#d4a359]/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-2xl border border-indigo-500/40 text-indigo-400">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-base text-white">Multiplayer Season World</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                  EPHEMERAL ROLLUP
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono">Shared Persistent Solana Economy</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* World Status & Player Count */}
        <div className="py-4 space-y-4">
          <div className="bg-[#120f0d] p-4 rounded-2xl border border-[#d4a359]/25 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-sans flex items-center gap-1.5">
                <Server className="w-4 h-4 text-amber-400" /> Active Season World:
              </span>
              <span className="font-bold text-amber-300">world-season-01</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-sans flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" /> Human Players Online:
              </span>
              <span className="font-bold text-emerald-400">{humanPlayersCount} / 4 Players</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-sans flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-indigo-400" /> Autonomous Bot Backfill:
              </span>
              <span className="font-bold text-indigo-300">
                {botPlayersCount} Active ({4 - humanPlayersCount > 0 ? "Automated Rivals" : "Full Human"})
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-[#d4a359]/15">
              <span className="text-gray-400 font-sans flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400" /> Rollup Delegation:
              </span>
              <span className="font-bold text-purple-300">Sub-50ms MagicBlock ER</span>
            </div>
          </div>

          {/* Share with Friends */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-gray-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-amber-400" /> Invite Friends to Same World:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 bg-[#120f0d] border border-[#d4a359]/30 rounded-xl px-3 py-2 text-xs font-mono text-gray-300 outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-[#d4a359]/20 hover:bg-[#d4a359]/30 text-amber-300 border border-[#d4a359]/40 rounded-xl font-bold font-sans text-xs transition-all flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 font-mono">
              Anyone with this link enters the exact same 20-plot diorama and competes for identical pedestrian foot-traffic.
            </p>
          </div>

          {/* Join Another World Code */}
          <form onSubmit={handleJoinCustom} className="space-y-2 pt-2">
            <label className="text-xs font-mono font-bold text-gray-300">Join Another World Code:</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter World Code (e.g. guild-alpha-4)..."
                value={inputWorldId}
                onChange={(e) => setInputWorldId(e.target.value)}
                className="flex-1 bg-[#120f0d] border border-[#d4a359]/30 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-gray-600 outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-xs rounded-xl shadow-md transition-all hover:brightness-110"
              >
                Join
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
