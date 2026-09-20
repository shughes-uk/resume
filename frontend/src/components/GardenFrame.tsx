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
  /** The floating GitHub button, which the garden keeps clear of. */
  button: React.RefObject<HTMLElement | null>;
};

// One simulated pixel, in CSS pixels. Small screens get a finer grain so the
// plants stay in proportion to the page.
const getCellSize = (width: number) => (width < 600 ? 3 : 4);
// The garden is redrawn at most this often. Pixels this coarse gain nothing
// from a faster redraw.
const FRAME_INTERVAL_MS = 30;
// requestAnimationFrame stops in a hidden tab. Capping the step means the
// garden picks up where it left off instead of lurching forwards.
const MAX_FRAME_STEP_MS = 50;
// Long enough for everything to have grown and opened, for visitors who have
// asked for no motion and get the finished garden at once.
const FULLY_GROWN_TICKS = 1500;
// Above the GitHub button, so petals drift in front of everything.
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
  // One garden per page load: resizes regrow this seed rather than a new one.
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
      // Whole cells only, anchored to the bottom right where the garden
      // grows; any sliver of overhang is lost off the top and left.
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
      // Resizing the canvases cleared them. Regrow the same garden on the new
      // grid up to the age it had reached.
      created.grow(prefersReducedMotion ? FULLY_GROWN_TICKS : age);

      let lastPetals: PixelBox | null = null;
      draw = () => {
        const petals = created.render();
        // Only the band of border along the bottom and the strip of jasmine
        // up the right side ever change, so only those are uploaded.
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
    // The observer reports on the next rendering opportunity, which a
    // background tab may not get for a while; build now so the garden exists.
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
