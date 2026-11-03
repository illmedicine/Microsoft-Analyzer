import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft24Regular, ChevronRight24Regular } from "@fluentui/react-icons";
import { Art, artBg, type ArtKind } from "./Art";

export interface SlideDef { art: ArtKind; kicker: string; title: string; body?: string; stat?: { value: string; label: string }; cta?: ReactNode; photo?: string }

/** Full-bleed, scroll-snap slider. Keyboard + swipe friendly, pauses on hover/focus, honours reduced-motion. */
export function Slider({ slides, label, autoplayMs = 7000, tall = false }: { slides: SlideDef[]; label: string; autoplayMs?: number; tall?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((n: number) => {
    const el = track.current; if (!el) return;
    const k = (n + slides.length) % slides.length;
    el.scrollTo({ left: k * el.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [slides.length]);
  useEffect(() => {
    const el = track.current; if (!el) return;
    const on = () => setI(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", on, { passive: true }); return () => el.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (paused || autoplayMs <= 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => go(i + 1), autoplayMs); return () => clearInterval(t);
  }, [i, paused, autoplayMs, go]);

  return (
    <section className={`slider ${tall ? "tall" : ""}`} aria-roledescription="carousel" aria-label={label}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onKeyDown={(e) => { if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); }}>
      <div className="slider-track" ref={track} tabIndex={0}>
        {slides.map((s, k) => (
          <article className="slide" key={k} aria-roledescription="slide" aria-label={`${k + 1} of ${slides.length}`} style={{ background: artBg[s.art] }}>
            <div className="slide-art"><Art kind={s.art} />{s.photo && <img src={s.photo} alt="" loading="lazy" />}</div>
            <div className="slide-copy">
              <div className="kicker">{s.kicker}</div>
              <h2>{s.title}</h2>
              {s.body && <p>{s.body}</p>}
              {s.stat && <div className="slide-stat"><b>{s.stat.value}</b><span>{s.stat.label}</span></div>}
              {s.cta}
            </div>
          </article>
        ))}
      </div>
      <div className="slider-ctl">
        <button aria-label="Previous slide" onClick={() => go(i - 1)}><ChevronLeft24Regular /></button>
        <div className="dots" role="tablist" aria-label="Slides">
          {slides.map((_, k) => <button key={k} role="tab" aria-selected={k === i} aria-label={`Slide ${k + 1}`} className={k === i ? "on" : ""} onClick={() => go(k)} />)}
        </div>
        <button aria-label="Next slide" onClick={() => go(i + 1)}><ChevronRight24Regular /></button>
      </div>
    </section>
  );
}
