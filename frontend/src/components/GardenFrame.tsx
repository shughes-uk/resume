import { Box, useMediaQuery } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import {
  createGarden,
  TICKS_PER_SECOND,
  type Box as PixelBox,
  type Garden,
} from "./gardenSimulation";

type GardenFrameProps = {
  children?: React.ReactNode;
  /** The floating GitHub button. The garden leaves a clearing around it. */
  button: React.RefObject<HTMLElement | null>;
};

// Size of one garden pixel, in CSS pixels. Narrow screens use a smaller size so
// the plants stay in proportion to the page.
const getCellSize = (width: number) => (width < 600 ? 3 : 4);
// Minimum time between redraws, which works out at about 30 a second. The art
// is too coarse to look any smoother at a higher rate.
const FRAME_INTERVAL_MS = 30;
// The most time a single frame may advance the simulation. Browsers pause
// animation frames while a tab is hidden; without this cap the garden would
// jump ahead when the tab is shown again.
const MAX_FRAME_STEP_MS = 50;
// Ticks to grow straight away when the visitor prefers reduced motion. It is
// enough for every plant to finish, so they get the finished garden with no
// animation.
const FULLY_GROWN_TICKS = 1500;
// The front canvas must be above the GitHub button (z-index 9999 in App.tsx) so
// that petals pass in front of everything.
const FRONT_Z_INDEX = 10000;

const makeSurface = (canvas: HTMLCanvasElement, cols: number, rows: number) => {
  canvas.width = cols;
  canvas.height = rows;
  const buffer = new ArrayBuffer(cols * rows * 4);
  return {
    context: canvas.getContext("2d"),
    pixels: new Uint32Array(buffer),
    image: new ImageData(new Uint8ClampedArray(buffer), cols, rows),
  };
};

const union = (a: PixelBox | null, b: PixelBox | null) => {
  if (!a || !b) {
    return a ?? b;
  }
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
};

export const GardenFrame = ({
  children,
  button: buttonRef,
}: GardenFrameProps) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  // Random seed for this page load. It is kept in state so that a resize
  // regrows the same garden rather than a different one.
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );

  useEffect(() => {
    const layer = layerRef.current;
    const backCanvas = backRef.current;
    const frontCanvas = frontRef.current;
    const button = buttonRef.current;
    if (!layer || !backCanvas || !frontCanvas || !button) {
      return;
    }

    let garden: Garden | null = null;
    let draw = () => {};
    let cell = 4;
    let originX = 0;
    let originY = 0;
    let frame = 0;
    let lastFrame = 0;
    let pendingTicks = 0;
    let builtWidth = 0;
    let builtHeight = 0;

    const rebuild = (width: number, height: number) => {
      if (width <= 0 || height <= 0) {
        return;
      }
      if (width === builtWidth && height === builtHeight) {
        return;
      }
      builtWidth = width;
      builtHeight = height;
      const age = garden?.age() ?? 0;
      cell = getCellSize(width);
      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      // The canvases are a whole number of cells and are pinned to the bottom
      // right, where the plants are. If the viewport is not an exact multiple
      // of the cell size, the extra hangs off the top and left, out of sight.
      originX = width - cols * cell;
      originY = height - rows * cell;
      for (const canvas of [backCanvas, frontCanvas]) {
        canvas.style.width = `${cols * cell}px`;
        canvas.style.height = `${rows * cell}px`;
      }
      const back = makeSurface(backCanvas, cols, rows);
      const front = makeSurface(frontCanvas, cols, rows);

      const rect = button.getBoundingClientRect();
      const created = createGarden({
        cols,
        rows,
        seed,
        still: prefersReducedMotion,
        back: back.pixels,
        front: front.pixels,
        button: {
          x: (rect.left + rect.width / 2 - originX) / cell,
          y: (rect.top + rect.height / 2 - originY) / cell,
        },
      });
      garden = created;
      // Setting a canvas size clears it, so grow the new garden to the age the
      // old one had reached. The seed is the same, so it looks the same.
      created.grow(prefersReducedMotion ? FULLY_GROWN_TICKS : age);

      let lastPetals: PixelBox | null = null;
      draw = () => {
        const petals = created.render();
        // Upload only the parts of the back canvas that can change: the band
        // along the bottom where the border sways, and the strip up the right
        // side where the jasmine grows.
        const { bandTop, stripLeft } = created;
        back.context?.putImageData(
          back.image,
          0,
          0,
          0,
          bandTop,
          cols,
          rows - bandTop,
        );
        back.context?.putImageData(
          back.image,
          0,
          0,
          stripLeft,
          0,
          cols - stripLeft,
          bandTop,
        );
        // On the front canvas, upload the area covering the petals now and
        // where they were last frame, so their old positions are erased.
        const dirty = union(petals, lastPetals);
        if (dirty) {
          front.context?.putImageData(
            front.image,
            0,
            0,
            dirty.x,
            dirty.y,
            dirty.width,
            dirty.height,
          );
        }
        lastPetals = petals;
      };
      draw();
    };

    const onFrame = (now: number) => {
      frame = requestAnimationFrame(onFrame);
      const elapsed = now - lastFrame;
      if (!garden || elapsed < FRAME_INTERVAL_MS) {
        return;
      }
      lastFrame = now;
      const seconds = Math.min(elapsed, MAX_FRAME_STEP_MS) / 1000;
      pendingTicks += seconds * TICKS_PER_SECOND;
      const due = Math.floor(pendingTicks);
      pendingTicks -= due;
      garden.grow(due);
      garden.step(seconds);
      draw();
    };

    const onPointerMove = (event: PointerEvent) => {
      garden?.pointerMove(
        (event.clientX - originX) / cell,
        (event.clientY - originY) / cell,
        event.timeStamp,
      );
    };
    const onPointerLeave = () => garden?.pointerLeave();
    const onButtonEnter = () => garden?.puff();

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      rebuild(width, height);
    });
    observer.observe(layer);
    // Build once now. The observer takes care of later size changes.
    rebuild(layer.clientWidth, layer.clientHeight);

    if (!prefersReducedMotion) {
      lastFrame = performance.now();
      frame = requestAnimationFrame(onFrame);
      window.addEventListener("pointermove", onPointerMove);
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
      button.addEventListener("pointerenter", onButtonEnter);
    }

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener(
        "pointerleave",
        onPointerLeave,
      );
      button.removeEventListener("pointerenter", onButtonEnter);
    };
  }, [seed, prefersReducedMotion, buttonRef]);

  const layerStyles = {
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
  } as const;
  const canvasStyles = {
    position: "absolute",
    right: 0,
    bottom: 0,
    imageRendering: "pixelated",
  } as const;

  return (
    <Box sx={{ position: "relative", minHeight: "100dvh" }}>
      <Box ref={layerRef} aria-hidden sx={{ ...layerStyles, zIndex: 0 }}>
        <canvas ref={backRef} style={canvasStyles} />
      </Box>
      <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
      <Box aria-hidden sx={{ ...layerStyles, zIndex: FRONT_Z_INDEX }}>
        <canvas ref={frontRef} style={canvasStyles} />
      </Box>
    </Box>
  );
};
