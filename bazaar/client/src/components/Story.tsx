import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, X, Lock, BookOpen } from "lucide-react";
import { BEATS, CAST, CHAPTERS, chapterStart, taskOf, type Action, type World } from "../story/script";
import { useStory } from "../story/useStory";
import { sfx } from "../audio/sfx";
import { Badge, Modal, PanelHead } from "./ui";

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Types the line out; clicking it shows the whole thing. */
const Line: React.FC<{ text: string }> = ({ text }) => {
  const [n, setN] = useState(calm() ? text.length : 0);
  useEffect(() => {
    if (calm()) return;
    const id = setInterval(() => setN((v) => { if (v >= text.length) clearInterval(id); return v + 2; }), 22);
    return () => clearInterval(id);
  }, [text]);
  return (
    <p onClick={() => setN(text.length)} className="mt-1 min-h-[4.2em] cursor-default text-[15px] font-bold leading-snug">
      <span aria-hidden>{text.slice(0, n)}<span className="text-transparent">{text.slice(n)}</span></span>
      <span className="sr-only" aria-live="polite">{text}</span>
    </p>
  );
};

/** A pulsing ring around the part of the interface being explained. */
const Spotlight: React.FC<{ name: string }> = ({ name }) => {
  const [box, setBox] = useState<DOMRect | null>(null);
  useEffect(() => {
    let seen: Element | null = null;
    const find = () => {
      const el = document.querySelector(`[data-tour="${name}"]`);
      if (el && el !== seen) { seen = el; el.scrollIntoView({ block: "nearest" }); }
      const r = el?.getBoundingClientRect();
      setBox(r && r.width ? r : null);
    };
    find();
    const id = setInterval(find, 200);
    return () => clearInterval(id);
  }, [name]);
  if (!box) return null;
  return <div aria-hidden className="pointer-events-none fixed z-[65] animate-pulse rounded-2xl border-4 border-gold shadow-[0_0_0_3px_#2a1c15,0_0_24px_6px_rgba(255,201,74,.7)]" style={{ left: box.left - 6, top: box.top - 6, width: box.width + 12, height: box.height + 12 }} />;
};

interface Props {
  world: World;
  /** a panel or window is covering the middle of the screen */
  busy: boolean;
  onAction: (a: Action) => void;
  onLook: (where: number | string | null) => void;
}

export const StoryGuide: React.FC<Props> = ({ world, busy, onAction, onLook }) => {
  const { at, playing, next, setPlaying } = useStory();
  const beat = BEATS[at], chapter = CHAPTERS[beat.chapter], who = CAST[beat.who];
  const task = taskOf(beat, world);
  const start = useRef(world);
  const [done, setDone] = useState(false);
  const [stamp, setStamp] = useState<string | null>(null);
  const lastChapter = useRef(beat.chapter);

  // entering a beat: remember how things stood, move the camera
  useEffect(() => {
    if (!playing) { onLook(null); return; }
    start.current = world;
    setDone(false);
    onLook(beat.look ?? null);
    // show what is being talked about; otherwise get windows out of the way of anything on the map
    if (beat.open) onAction(beat.open);
    else if (beat.look !== undefined) onAction("dismiss");
    if (beat.chapter > lastChapter.current) {
      setStamp(CHAPTERS[beat.chapter - 1].reward);
      sfx.playWin();
      setTimeout(() => setStamp(null), 2800);
    }
    lastChapter.current = beat.chapter;
  }, [at, playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // finishing the task moves the story on by itself
  useEffect(() => {
    if (playing && task && !done && task.done(world, start.current)) { setDone(true); sfx.playChing(); }
  }, [playing, task, done, world]);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(next, 1400);
    return () => clearTimeout(id);
  }, [done, next]);

  const waiting = !!task && !done;
  const inChapter = at - chapterStart(beat.chapter);
  const checkbox = (
    <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink ${done ? "bg-leaf text-paper" : "bg-paper"}`}>{done && <Check className="h-4 w-4" />}</span>
  );

  return (
    <>
      {stamp && (
        <div role="status" className="pointer-events-none fixed inset-x-0 top-[22%] z-[66] flex justify-center">
          <div className="panel animate-pop !bg-gold px-8 py-4 text-center">
            <p className="text-xs font-extrabold uppercase tracking-widest">Chapter complete</p>
            <p className="font-display text-3xl font-bold">{stamp}</p>
          </div>
        </div>
      )}
      {!playing ? null : (
        <>
          {beat.spot && <Spotlight name={beat.spot} />}
          {busy ? (
            // a window is open: a small card beside it on wide screens, above it otherwise
            <aside aria-label="Story" className="pointer-events-none fixed inset-x-3 top-2 z-[67] flex justify-center xl:inset-x-auto xl:bottom-3 xl:left-3 xl:top-auto">
              <div className="panel pointer-events-auto w-full max-w-[560px] space-y-2 !bg-paper p-3 xl:w-[290px] 2xl:w-[370px]">
                <div className="flex items-center gap-2">
                  <Badge icon={beat.who} size={40} />
                  <p className="font-display text-sm font-semibold">{who.name}</p>
                </div>
                <p aria-live="polite" className="text-xs font-bold leading-snug max-xl:line-clamp-2">{beat.say}</p>
                <div className="flex items-center gap-2">
                  {task ? (<>{checkbox}<span className="min-w-0 flex-1 font-display text-sm font-semibold">{done ? "Done!" : task.text}</span></>) : <span className="flex-1" />}
                  {waiting && task.show && <button className="btn !px-3" onClick={() => onAction(task.show!)}>Show me</button>}
                  <button className={`btn !px-3 ${waiting ? "" : "btn-leaf"}`} onClick={next}>{waiting ? "Skip" : "Next"}</button>
                </div>
              </div>
            </aside>
          ) : (
            <aside aria-label="Story" className={`pointer-events-none fixed inset-x-3 z-[55] flex justify-center max-sm:bottom-[96px] ${beat.spot === "activity" ? "bottom-[84px]" : "bottom-3"}`}>
              <div className="panel pointer-events-auto relative w-full max-w-[600px] animate-pop p-4 pt-3">
                <Badge key={beat.who} icon={beat.who} size={104} className="absolute -top-[70px] left-3 animate-pop drop-shadow-xl max-sm:!h-20 max-sm:!w-20 max-sm:-top-[54px]" />
                <div className="ml-[118px] flex items-start justify-between gap-2 max-sm:ml-[88px]">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold leading-tight">{who.name}</p>
                    <p className="truncate text-xs font-extrabold text-soft">{who.role}</p>
                  </div>
                  <button onClick={() => setPlaying(false)} aria-label="Put the story away (resume from Story)" title="Put the story away" className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-ink/10"><X className="h-4 w-4" aria-hidden /></button>
                </div>
                <div className="mt-2"><Line key={at} text={beat.say} /></div>
                {task && (
                  <div className={`mt-2 flex items-center gap-3 rounded-xl border-2 border-ink p-2 ${done ? "bg-leaf/20" : "bg-gold/60"}`}>
                    {checkbox}
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-semibold">{done ? "Done!" : task.text}</p>
                      {!done && task.hint && <p className="text-xs font-bold text-soft">{task.hint}</p>}
                    </div>
                    {!done && task.show && <button className="btn" onClick={() => onAction(task.show!)}>Show me</button>}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold uppercase tracking-wide text-soft">Chapter {beat.chapter + 1} of {CHAPTERS.length} · {chapter.title}</p>
                    <div className="mt-1 flex gap-1" aria-hidden>
                      {chapter.beats.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= inChapter ? "bg-wood" : "bg-ink/15"}`} />)}
                    </div>
                  </div>
                  {at > 0 && <button className="btn" onClick={() => useStory.getState().go(at - 1)}>Back</button>}
                  {waiting ? (
                    <button className="btn" onClick={next}>Skip task</button>
                  ) : (
                    <button className="btn btn-leaf" onClick={next}>{at === BEATS.length - 1 ? "Take the keys" : "Next"} <ChevronRight className="h-4 w-4" aria-hidden /></button>
                  )}
                </div>
              </div>
            </aside>
          )}
        </>
      )}
    </>
  );
};

/** The story so far: chapters, earned titles, resume or replay. */
export const Journal: React.FC<{ onClose: () => void; onIntro: () => void; stats: [string, string][] }> = ({ onClose, onIntro, stats }) => {
  const { at, furthest, done, go, finish } = useStory();
  const current = BEATS[at].chapter, reached = BEATS[furthest].chapter;
  const resume = (beat: number) => { onClose(); go(beat); };
  return (
    <Modal label="Story journal" onClose={onClose} className="max-w-lg">
      <PanelHead icon="ravi" title="Ravi's journal" sub={done ? "The shop is yours" : `Chapter ${current + 1} of ${CHAPTERS.length}`} onClose={onClose} />
      <div className="space-y-3 overflow-y-auto p-4">
        <dl className="grid grid-cols-4 gap-2 text-center">
          {stats.map(([k, v]) => (
            <div key={k} className="well px-1 py-1.5"><dt className="text-[11px] font-extrabold text-soft">{k}</dt><dd className="font-display text-base font-semibold tabular-nums">{v}</dd></div>
          ))}
        </dl>
        <ol className="space-y-2">
          {CHAPTERS.map((c, i) => {
            const earned = done || i < reached, open = done || i <= reached;
            return (
              <li key={c.title}>
                <button disabled={!open} onClick={() => resume(chapterStart(i))} className="well flex w-full items-center gap-3 p-2 text-left enabled:hover:bg-gold/50 disabled:opacity-50">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink font-display font-semibold ${earned ? "bg-leaf text-paper" : "bg-paper"}`}>
                    {earned ? <Check className="h-4 w-4" aria-label="Complete" /> : open ? i + 1 : <Lock className="h-4 w-4" aria-label="Locked" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-semibold">{open ? c.title : "Not yet"}</span>
                    <span className="block text-xs font-bold text-soft">{earned ? `Title earned: ${c.reward}` : open ? "In progress" : "Keep playing"}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap justify-end gap-2">
          <button className="btn mr-auto" onClick={onIntro}>Watch the intro</button>
          {!done && <button className="btn" onClick={() => { finish(); onClose(); }}>Skip the story</button>}
          <button className="btn btn-leaf" onClick={() => resume(done ? 0 : at)}><BookOpen className="h-4 w-4" aria-hidden /> {done ? "Replay from the start" : "Continue"}</button>
        </div>
      </div>
    </Modal>
  );
};
