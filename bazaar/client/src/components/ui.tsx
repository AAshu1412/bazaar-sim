/** Shared pieces of the HUD design system (classes live in index.css). */
import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { uiIcon } from "../engine/shopKinds";

export const Badge: React.FC<{ icon: string; size?: number; className?: string }> = ({ icon, size = 40, className = "" }) => (
  <img src={uiIcon(icon)} alt="" aria-hidden width={size} height={size} draggable={false} className={`shrink-0 ${className}`} />
);

export const PanelHead: React.FC<{ icon: string; title: string; sub?: string; onClose: () => void }> = ({ icon, title, sub, onClose }) => (
  <div className="panel-head">
    <Badge icon={icon} size={44} className="-my-1" />
    <div className="min-w-0 flex-1">
      <h2 className="truncate font-display text-lg font-semibold leading-tight">{title}</h2>
      {sub && <p className="truncate text-xs font-semibold text-paper/80">{sub}</p>}
    </div>
    <button onClick={onClose} aria-label="Close" className="btn btn-icon">
      <X className="h-4 w-4" aria-hidden />
    </button>
  </div>
);

/** Centred dialog: dims the town, closes on Escape or backdrop click, focuses itself when opened. */
export const Modal: React.FC<{ label: string; onClose: () => void; className?: string; children: React.ReactNode }> = ({ label, onClose, className = "max-w-lg", children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); before?.focus?.(); };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={`panel flex max-h-[92vh] w-full animate-pop flex-col outline-none ${className}`}>
        {children}
      </div>
    </div>
  );
};

export const Meter: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => {
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper">
      <div className={`h-full transition-[width] duration-300 ${ratio > 0.35 ? "bg-leaf" : ratio > 0.15 ? "bg-[#c9782a]" : "bg-berry"}`} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
};
