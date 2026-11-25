import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "./ui";

export interface GuideStep { title: string; body: string; action?: { label: string; run: () => void } }

/** Uncle Ravi's walkthrough: a small card that sits below the town and never blocks it. */
export const Guide: React.FC<{ steps: GuideStep[]; onClose: () => void }> = ({ steps, onClose }) => {
  const [i, setI] = useState(0);
  const step = steps[i], last = i === steps.length - 1;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside aria-label="Guide" className="panel pointer-events-auto relative w-[440px] max-w-[calc(100vw-2rem)] animate-pop p-4 pl-5">
      <Badge icon="ravi" size={76} className="absolute -top-9 left-4 drop-shadow-lg" />
      <button onClick={onClose} aria-label="Close guide" className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/10">
        <X className="h-4 w-4" aria-hidden />
      </button>
      <p className="ml-[88px] text-xs font-extrabold uppercase tracking-wide text-soft">Uncle Ravi · {i + 1} of {steps.length}</p>
      <div aria-live="polite" className="min-h-[92px] pt-3">
        <h2 className="font-display text-lg font-semibold leading-tight">{step.title}</h2>
        <p className="mt-1 text-sm font-semibold leading-snug">{step.body}</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {steps.map((_, k) => <span key={k} className={`h-2 rounded-full border border-ink transition-[width] ${k === i ? "w-6 bg-gold" : "w-2 bg-parchment"}`} />)}
        </div>
        {i > 0 && <button className="btn" onClick={() => setI(i - 1)}>Back</button>}
        {step.action && <button className="btn btn-gold" onClick={step.action.run}>{step.action.label}</button>}
        <button className="btn btn-leaf" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? "Done" : "Next"}</button>
      </div>
    </aside>
  );
};
