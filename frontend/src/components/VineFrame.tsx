import { Box, useMediaQuery } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { createVineSimulation, TICK_MS } from "./vineSimulation";

type VineFrameProps = {
  children?: React.ReactNode;
};

// One simulated pixel, in CSS pixels. Small screens get a finer grain so the
// plants stay in proportion to the page.
const getCellSize = (width: number) => (width < 600 ? 3 : 4);
// requestAnimationFrame stops in a hidden tab. Capping the step means the
// vines pick up where they left off instead of bursting into full growth.
const MAX_FRAME_STEP_MS = 1000;
// Far more than any viewport needs; only a guard against looping forever.
const MAX_TICKS = 20000;

export const VineFrame = ({ children }: VineFrameProps) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // One plant per page load: resizes regrow this seed rather than a new one.
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!layer || !canvas || !context) {
      return;
    }

    const paint = (x: number, y: number, color: string) => {
      context.fillStyle = color;
      context.fillRect(x, y, 1, 1);
    };

    let simulation = createVineSimulation(0, 0, seed);
    let ticks = 0;
    let growing = false;
    let frame = 0;
    let lastFrame = 0;
    let pending = 0;

    const advance = (count: number) => {
      for (let i = 0; i < count && growing && ticks < MAX_TICKS; i++) {
        growing = simulation.step(paint);
        ticks += 1;
      }
    };

    const onFrame = (now: number) => {
      pending += Math.min(now - lastFrame, MAX_FRAME_STEP_MS);
      lastFrame = now;
      const due = Math.floor(pending / TICK_MS);
      pending -= due * TICK_MS;
      advance(due);
      // Once everything has bloomed there is nothing left to draw, so the
      // loop ends rather than idling.
      frame = growing ? requestAnimationFrame(onFrame) : 0;
    };

    const rebuild = (width: number, height: number) => {
      const cell = getCellSize(width);
      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      // Whole cells only, so every simulated pixel is the same size on
      // screen; the sliver of overhang is split between opposite edges.
      canvas.width = cols;
      canvas.height = rows;
      canvas.style.width = `${cols * cell}px`;
      canvas.style.height = `${rows * cell}px`;
      canvas.style.left = `${(width - cols * cell) / 2}px`;
      canvas.style.top = `${(height - rows * cell) / 2}px`;

      // Resizing the canvas cleared it. Regrow the same plant on the new grid
      // up to the age it had reached.
      simulation = createVineSimulation(cols, rows, seed);
      const age = prefersReducedMotion ? MAX_TICKS : ticks;
      ticks = 0;
      growing = true;
      advance(age);

      if (growing && !prefersReducedMotion && frame === 0) {
        lastFrame = performance.now();
        frame = requestAnimationFrame(onFrame);
      }
    };

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        rebuild(width, height);
      }
    });
    observer.observe(layer);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [seed, prefersReducedMotion]);

  return (
    <Box sx={{ position: "relative", minHeight: "100dvh" }}>
      <Box
        ref={layerRef}
        aria-hidden
        sx={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", imageRendering: "pixelated" }}
        />
      </Box>
      <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
    </Box>
  );
};
