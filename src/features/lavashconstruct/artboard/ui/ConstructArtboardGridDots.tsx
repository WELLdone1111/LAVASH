import { useEffect, useRef, type MutableRefObject } from "react";
import { computeArtboardGridPitch } from "@/features/lavashconstruct/artboard/model/artboardGridPitch";
import { ARTBOARD_GRID_REVISION } from "@/features/lavashconstruct/shared/model/constants";

export type ConstructArtboardGridPointer = {
  x: number;
  y: number;
  active: boolean;
};

type ConstructArtboardGridDotsProps = {
  artboardZoom: number;
  panX: number;
  panY: number;
  pointerRef: MutableRefObject<ConstructArtboardGridPointer>;
  themeRootRef: MutableRefObject<HTMLElement | null>;
};

/** Однакова видимість крапок на будь-якому зумі (екранні px). */
const MINOR_ALPHA = 0.44;
const MAJOR_ALPHA = 0.64;
const MINOR_RADIUS_PX = 1.22;
const MAJOR_RADIUS_PX = 1.52;
const FLEE_RADIUS_PX = 92;
const MAX_PUSH_PX = 11;
const HIGHLIGHT_DOT_COUNT = 12;

type DotDraw = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  highlight: number;
  pointerDist: number;
};

function parseAccentRgb(raw: string): [number, number, number] {
  const v = raw.trim();
  if (!v) return [255, 184, 0];
  if (v.startsWith("#")) {
    const hex = v.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex.padEnd(6, "0").slice(0, 6);
    const n = Number.parseInt(full, 16);
    if (Number.isNaN(n)) return [255, 184, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = v.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return [255, 184, 0];
}

function isMajorDot(x: number, y: number, majorPitch: number, majorOffsetX: number, majorOffsetY: number): boolean {
  const tx = ((x - majorOffsetX) % majorPitch + majorPitch) % majorPitch;
  const ty = ((y - majorOffsetY) % majorPitch + majorPitch) % majorPitch;
  return tx < 0.75 && ty < 0.75;
}

function mixChannel(base: number, target: number, t: number): number {
  return Math.round(base + (target - base) * t);
}

function drawDotBase(ctx: CanvasRenderingContext2D, dot: DotDraw, ar: number, ag: number, ab: number) {
  ctx.beginPath();
  ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, ${dot.alpha})`;
  ctx.fill();
}

function drawDotHighlight(ctx: CanvasRenderingContext2D, dot: DotDraw, ar: number, ag: number, ab: number) {
  const h = dot.highlight;
  const hr = mixChannel(ar, 255, 0.72 * h);
  const hg = mixChannel(ag, 248, 0.65 * h);
  const hb = mixChannel(ab, 210, 0.45 * h);
  const coreR = dot.radius + 0.18 + h * 0.58;
  const haloR = coreR + 1.1 + h * 2.25;

  ctx.beginPath();
  ctx.arc(dot.x, dot.y, haloR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${hr}, ${hg}, ${hb}, ${0.22 + h * 0.38})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(dot.x, dot.y, coreR + 0.55 + h * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${hr}, ${hg}, ${hb}, ${0.42 + h * 0.48})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(dot.x, dot.y, coreR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${hr}, ${hg}, ${hb}, ${0.92 + h * 0.08})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(dot.x, dot.y, Math.max(0.85, coreR * 0.55), 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 252, 235, ${0.72 + h * 0.28})`;
  ctx.fill();
}

export default function ConstructArtboardGridDots({
  artboardZoom,
  panX,
  panY,
  pointerRef,
  themeRootRef,
}: ConstructArtboardGridDotsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef({ w: 0, h: 0, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rafId = 0;
    let accentRgb: [number, number, number] = [255, 184, 0];

    const resize = (w: number, h: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(1, Math.ceil(w));
      const cssH = Math.max(1, Math.ceil(h));
      const cw = Math.max(1, Math.ceil(cssW * dpr));
      const ch = Math.max(1, Math.ceil(cssH * dpr));
      if (layoutRef.current.w === cw && layoutRef.current.h === ch && layoutRef.current.dpr === dpr) return;
      layoutRef.current = { w: cw, h: ch, dpr };
      canvas.width = cw;
      canvas.height = ch;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    };

    const draw = () => {
      rafId = requestAnimationFrame(draw);
      if (document.documentElement.hasAttribute("data-lc-split-dragging")) return;
      if (document.documentElement.hasAttribute("data-window-resizing")) return;
      const rect = host.getBoundingClientRect();
      const w = Math.ceil(rect.width);
      const h = Math.ceil(rect.height);
      if (w < 1 || h < 1) return;

      resize(w, h);
      const { w: cw, h: ch, dpr } = layoutRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const themeEl = themeRootRef.current ?? host;
      accentRgb = parseAccentRgb(getComputedStyle(themeEl).getPropertyValue("--color-accent-primary"));

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const ptr = pointerRef.current;
      const [ar, ag, ab] = accentRgb;

      const {
        pitch,
        majorPitch,
        offsetX,
        offsetY,
        majorOffsetX,
        majorOffsetY,
      } = computeArtboardGridPitch(artboardZoom, panX, panY);
      const hitRadius = Math.max(9, pitch * 0.46);

      canvas.dataset.lavashGridPitch = String(pitch);
      canvas.dataset.lavashGridRev = String(ARTBOARD_GRID_REVISION);

      const startCol = Math.floor(-offsetX / pitch) - 1;
      const endCol = Math.ceil((w - offsetX) / pitch) + 1;
      const startRow = Math.floor(-offsetY / pitch) - 1;
      const endRow = Math.ceil((h - offsetY) / pitch) + 1;

      const dots: DotDraw[] = [];

      for (let row = startRow; row <= endRow; row += 1) {
        for (let col = startCol; col <= endCol; col += 1) {
          const baseX = offsetX + col * pitch;
          const baseY = offsetY + row * pitch;
          if (baseX < -pitch || baseY < -pitch || baseX > w + pitch || baseY > h + pitch) continue;

          const major = isMajorDot(baseX, baseY, majorPitch, majorOffsetX, majorOffsetY);
          const alpha = major ? MAJOR_ALPHA : MINOR_ALPHA;
          const radius = major ? MAJOR_RADIUS_PX : MINOR_RADIUS_PX;
          let drawX = baseX;
          let drawY = baseY;
          let highlight = 0;
          let pointerDist = Number.POSITIVE_INFINITY;

          if (!reducedMotion && ptr.active) {
            const dx = baseX - ptr.x;
            const dy = baseY - ptr.y;
            const dist = Math.hypot(dx, dy);
            pointerDist = dist;

            if (dist < FLEE_RADIUS_PX && dist > 0.001) {
              const fleeT = (1 - dist / FLEE_RADIUS_PX) ** 2.1;
              const push = fleeT * MAX_PUSH_PX;
              drawX += (dx / dist) * push;
              drawY += (dy / dist) * push;
            }
          }

          dots.push({ x: drawX, y: drawY, radius, alpha, highlight, pointerDist });
        }
      }

      if (!reducedMotion && ptr.active) {
        const nearest = dots
          .slice()
          .sort((a, b) => a.pointerDist - b.pointerDist)
          .slice(0, HIGHLIGHT_DOT_COUNT);
        const falloffScale = Math.max(hitRadius, nearest[nearest.length - 1]?.pointerDist ?? hitRadius);

        for (const dot of nearest) {
          const hoverT = 1 - Math.min(dot.pointerDist / falloffScale, 1);
          dot.highlight = hoverT * hoverT;
        }
      }

      for (const dot of dots) {
        drawDotBase(ctx, dot, ar, ag, ab);
      }

      for (const dot of dots) {
        if (dot.highlight <= 0.03) continue;
        drawDotHighlight(ctx, dot, ar, ag, ab);
      }
    };

    rafId = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => {
      layoutRef.current = { w: 0, h: 0, dpr: layoutRef.current.dpr };
    });
    ro.observe(host);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [artboardZoom, panX, panY, pointerRef, themeRootRef]);

  return <canvas ref={canvasRef} className="lavash-artboard-grid-canvas" aria-hidden />;
}
