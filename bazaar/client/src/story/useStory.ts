import { create } from "zustand";
import { BEATS, type World } from "./script";

interface Saved { at: number; furthest: number; done: boolean }
const key = (who: string) => `bazaar_story_v1:${who}`;
const read = (who: string): Saved | null => {
  try {
    const s = JSON.parse(localStorage.getItem(key(who)) ?? "null");
    return s && typeof s.at === "number" ? { at: Math.min(s.at, BEATS.length - 1), furthest: s.furthest ?? s.at, done: !!s.done } : null;
  } catch { return null; }
};

interface Story extends Saved {
  who: string;
  /** the dialog is on screen (the player can put it away and come back from the journal) */
  playing: boolean;
  marks: World["marks"];
  /** pick up this wallet's story, starting it if it is new */
  load: (who: string) => void;
  go: (beat: number) => void;
  next: () => void;
  finish: () => void;
  setPlaying: (playing: boolean) => void;
  mark: (what: keyof World["marks"]) => void;
}

export const useStory = create<Story>((set, get) => {
  const save = (change: Partial<Saved>) => {
    set(change as Partial<Story>);
    const { who, at, furthest, done } = get();
    try { if (who) localStorage.setItem(key(who), JSON.stringify({ at, furthest, done })); } catch { /* private window */ }
  };
  return {
    who: "", at: 0, furthest: 0, done: false, playing: false, marks: { auction: 0, rent: 0, settle: 0, bank: 0 },
    load: (who) => {
      const s = read(who) ?? { at: 0, furthest: 0, done: false };
      set({ who, ...s, playing: !s.done, marks: { auction: 0, rent: 0, settle: 0, bank: 0 } });
    },
    go: (beat) => { save({ at: beat, furthest: Math.max(get().furthest, beat) }); set({ playing: true }); },
    next: () => {
      const at = get().at;
      if (at >= BEATS.length - 1) get().finish();
      else save({ at: at + 1, furthest: Math.max(get().furthest, at + 1) });
    },
    finish: () => { save({ done: true, furthest: BEATS.length - 1 }); set({ playing: false }); },
    setPlaying: (playing) => set({ playing }),
    mark: (what) => set((s) => ({ marks: { ...s.marks, [what]: s.marks[what] + 1 } })),
  };
});
