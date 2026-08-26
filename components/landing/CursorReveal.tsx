"use client";

import { useEffect, useRef } from "react";

// Official Rialo glyph (symbol only) from rialo.io/brand-assets (rialo-logo.svg).
const GLYPH_PATH =
  "M13.8282 23.8508C13.3417 23.3724 12.4023 22.9037 11.723 22.8423C9.26765 22.6202 4.29761 23.3506 2.2706 22.4993C-1.27911 21.0087 -0.456801 15.4679 3.27944 15.1287C5.75258 14.9041 8.54438 15.2856 11.0548 15.1307C16.3182 14.8061 15.8286 8.27627 11.6524 7.9438C9.15239 7.74485 10.8843 7.88424 8.36429 7.71564C3.38359 7.38204 3.11556 0.803867 7.83755 0H19.2015C20.3716 0.140497 21.4965 0.906598 22.0624 1.94538C22.9615 3.5965 22.0855 5.18917 23.8313 6.65933C24.9221 7.57784 25.6307 7.3699 26.8783 7.58458C31.145 8.31854 31.1886 14.9361 26.0746 15.278C23.4536 15.4533 20.6736 15.1204 18.0365 15.3126C14.0722 16.1324 14.102 21.9339 18.1627 22.6038C18.5615 22.6697 19.0258 22.6441 19.404 22.7092C21.0149 22.9864 22.3988 24.4728 22.5278 26.1279C22.3431 28.8338 22.7663 29.9627 22.5238 32.631C22.1237 37.0363 15.2583 37.3342 14.8981 32.257C14.7145 29.6689 15.1837 28.5063 14.893 25.9877C14.8151 25.3119 14.3101 24.3244 13.8284 23.8508H13.8282Z";

/**
 * One shared cursor light for the whole page.
 * The same pointer drives:
 *   1. the torch glow (kisses the hero RialCard),
 *   2. the radial mask that reveals the buried Rialo glyph.
 * Idle 1.5s / pointer leaving the window collapses the reveal back to #07090D.
 * Touch: brief reveal at the tap point, then fades. Never chases scroll.
 */
export function CursorReveal() {
  const glyphRef = useRef<HTMLDivElement>(null);
  const torchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glyph = glyphRef.current;
    const torch = torchRef.current;
    if (!glyph || !torch) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fine = window.matchMedia("(pointer: fine)").matches;
    const radius = () => (fine ? 110 : 70);

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight * 0.35;
    let gx = tx;
    let gy = ty;
    let r = 0;
    let torchO = 0;
    let lastMove = 0;
    let touchUntil = 0;
    let raf = 0;
    let slowFrames = 0;
    let lastFrame = performance.now();
    let dead = false;

    const loop = (now: number) => {
      if (dead) return;
      raf = requestAnimationFrame(loop);

      // FPS guard: if we cannot keep a smooth page, retire the effect.
      const dt = now - lastFrame;
      lastFrame = now;
      if (dt > 34) {
        slowFrames += 1;
        if (slowFrames > 60) {
          dead = true;
          glyph.style.opacity = "0";
          torch.style.opacity = "0";
          return;
        }
      } else if (slowFrames > 0) {
        slowFrames -= 2;
      }

      const idle = now - Math.max(lastMove, touchUntil) > 1500;
      const targetR = idle ? 0 : radius();
      const targetO = idle ? 0 : 1;

      gx += (tx - gx) * 0.12; // ~60-80ms lag
      gy += (ty - gy) * 0.12;
      r += (targetR - r) * 0.1;
      torchO += (targetO - torchO) * 0.08;

      glyph.style.setProperty("--gx", `${gx}px`);
      glyph.style.setProperty("--gy", `${gy}px`);
      glyph.style.setProperty("--gr", `${r}px`);
      torch.style.transform = `translate(${gx}px, ${gy}px)`;
      torch.style.opacity = (torchO * 0.08).toFixed(3);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      lastMove = performance.now();
    };
    const onLeave = () => {
      lastMove = 0;
    };
    const onTap = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      touchUntil = performance.now() + 900;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onTap, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onTap);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Buried glyph, revealed only inside the cursor mask */}
      <div ref={glyphRef} className="glyph-reveal" aria-hidden>
        <svg viewBox="0 0 30 36" role="presentation">
          <path d={GLYPH_PATH} />
        </svg>
      </div>

      {/* Static whisper for reduced motion */}
      <div className="glyph-static" aria-hidden>
        <svg viewBox="0 0 30 36" role="presentation">
          <path d={GLYPH_PATH} />
        </svg>
      </div>

      {/* The torch: same light that reveals the glyph kisses the card */}
      <div ref={torchRef} className="cursor-torch" aria-hidden>
        <div className="torch-inner" />
      </div>
    </>
  );
}
