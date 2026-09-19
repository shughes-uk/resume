// A tick-based simulation of vines creeping around the edge of a pixel grid.
// It knows nothing about canvases or clocks: the caller steps it and is handed
// each newly grown pixel. Everything random comes from seeded generators, so
// the same seed regrows the same plant — which is what lets a resize rebuild
// the grid and fast-forward back to where it was.

type Vec = { x: number; y: number };

export type Paint = (x: number, y: number, color: string) => void;

export type VineSimulation = {
  /** Grow by one tick. Returns false once nothing is left to grow. */
  step: (paint: Paint) => boolean;
};

const Greens = {
  stem: "#3f8f5a",
  stemShadow: "#24603f",
  shoot: "#4fa466",
  tendril: "#6cc070",
  leaf: "#58b368",
  leafLight: "#8fd67e",
  leafDark: "#2f7a4a",
};

// d: dark outline, p: petal, l: petal highlight, y: centre
const FlowerPalettes = [
  { d: "#8f5fc4", p: "#d8acff", l: "#f1e0ff", y: "#ffeb68" },
  { d: "#c2457e", p: "#ff7eb6", l: "#ffc4dd", y: "#ffeb68" },
  { d: "#d9773f", p: "#ffb25f", l: "#ffe0a8", y: "#c2457e" },
  { d: "#b9b2d6", p: "#f4f0ff", l: "#ffffff", y: "#ffeb68" },
];

const BUD_FRAMES = [["d"], [".d.", "dpd", ".d."], [".p.", "pyp", ".p."]];
const BLOOM_FRAMES = [
  ...BUD_FRAMES,
  [".ppp.", "plplp", "ppypp", "plplp", ".ppp."],
];

// Leaves are drawn in stem space: `a` runs along the direction of growth and
// `p` away from the stem, so one sprite serves every edge and both sides.
// d: dark, m: mid, h: highlight
type LeafCell = [a: number, p: number, shade: "d" | "m" | "h"];
const LEAF_FRAMES: LeafCell[][][] = [
  [
    [[0, 1, "d"]],
    [
      [0, 1, "d"],
      [1, 1, "m"],
      [1, 2, "m"],
    ],
    [
      [0, 1, "d"],
      [1, 1, "m"],
      [0, 2, "m"],
      [1, 2, "h"],
      [2, 2, "m"],
      [1, 3, "m"],
      [2, 3, "d"],
    ],
  ],
  [
    [[0, 1, "d"]],
    [
      [0, 1, "d"],
      [0, 2, "m"],
      [1, 2, "m"],
      [1, 3, "h"],
    ],
  ],
];
const LeafShades = {
  d: Greens.leafDark,
  m: Greens.leaf,
  h: Greens.leafLight,
};

// Later layers paint over earlier ones and are never painted over by them, so
// a shoot that wanders across a flower passes behind it.
const Layer = { stemShadow: 1, stem: 2, tendril: 3, leaf: 4, flower: 5 };

const TICKS_PER_SECOND = 12;
export const TICK_MS = 1000 / TICKS_PER_SECOND;

const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Random = ReturnType<typeof mulberry32>;

const between = (random: Random, min: number, max: number) =>
  min + random() * (max - min);
const intBetween = (random: Random, min: number, max: number) =>
  Math.floor(between(random, min, max + 1));
const pick = <T>(random: Random, options: readonly T[]) =>
  options[Math.floor(random() * options.length)];

type Vine = {
  random: Random;
  x: number;
  y: number;
  along: Vec;
  // 1 turns clockwise around the viewport at a corner, -1 anticlockwise
  turn: 1 | -1;
  thick: boolean;
  startTick: number;
  // Shoots grow at half speed
  stepEvery: number;
  remaining: number;
  minDepth: number;
  maxDepth: number;
  targetDepth: number;
  untilRetarget: number;
  sinceShift: number;
  untilLeaf: number;
  leafSide: 1 | -1;
  untilTendril: number;
  untilBud: number;
};

type Tendril = {
  random: Random;
  x: number;
  y: number;
  angle: number;
  curl: number;
  remaining: number;
  blooms: boolean;
};

type Sprite = {
  frames: { x: number; y: number; color: string }[][];
  layer: number;
  frame: number;
  nextFrameTick: number;
  ticksPerFrame: number;
};

export const createVineSimulation = (
  cols: number,
  rows: number,
  seed: number,
): VineSimulation => {
  const layers = new Uint8Array(cols * rows);
  let tick = 0;
  let vines: Vine[] = [];
  let tendrils: Tendril[] = [];
  let sprites: Sprite[] = [];

  // Narrow screens have little margin to spare, so the vines hug the edge.
  const reach = cols < 220 ? 5 : 10;

  const inwardOf = ({ along, turn }: Vine): Vec =>
    turn === 1 ? { x: -along.y, y: along.x } : { x: along.y, y: -along.x };

  // How far (x, y) is from the edge whose inward normal is `inward`.
  const depthFrom = (x: number, y: number, inward: Vec) => {
    if (inward.x !== 0) {
      return inward.x > 0 ? x : cols - 1 - x;
    }
    return inward.y > 0 ? y : rows - 1 - y;
  };

  const paintCell = (
    paint: Paint,
    x: number,
    y: number,
    color: string,
    layer: number,
  ) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) {
      return;
    }
    const index = y * cols + x;
    if (layers[index] > layer) {
      return;
    }
    layers[index] = layer;
    paint(x, y, color);
  };

  const addFlower = (random: Random, x: number, y: number, full: boolean) => {
    const palette = pick(random, FlowerPalettes);
    const frames = (full ? BLOOM_FRAMES : BUD_FRAMES).map((rowsOfFrame) => {
      const offset = (rowsOfFrame.length - 1) / 2;
      return rowsOfFrame.flatMap((row, rowIndex) =>
        [...row].flatMap((key, colIndex) =>
          key === "."
            ? []
            : {
                x: x + colIndex - offset,
                y: y + rowIndex - offset,
                color: palette[key as keyof typeof palette],
              },
        ),
      );
    });
    // Most flowers open soon after their stem arrives; a few hold out so the
    // frame keeps changing for a while after the vines have stopped.
    const delaySeconds =
      random() < 0.25 ? between(random, 12, 45) : between(random, 0.5, 6);
    sprites.push({
      frames,
      layer: Layer.flower,
      frame: 0,
      nextFrameTick: tick + Math.round(delaySeconds * TICKS_PER_SECOND),
      ticksPerFrame: intBetween(random, 10, 22),
    });
  };

  const addLeaf = (vine: Vine, side: 1 | -1) => {
    const inward = inwardOf(vine);
    // The thick stem's shadow sits on its outer side; start outer leaves
    // beyond it.
    const clearance = vine.thick && side === -1 ? 1 : 0;
    const frames = pick(vine.random, LEAF_FRAMES).map((cells) =>
      cells.map(([a, p, shade]) => ({
        x: vine.x + vine.along.x * a + inward.x * side * (p + clearance),
        y: vine.y + vine.along.y * a + inward.y * side * (p + clearance),
        color: LeafShades[shade],
      })),
    );
    sprites.push({
      frames,
      layer: Layer.leaf,
      frame: 0,
      nextFrameTick: tick + intBetween(vine.random, 2, 8),
      ticksPerFrame: intBetween(vine.random, 5, 9),
    });
  };

  const addTendril = (vine: Vine) => {
    const inward = inwardOf(vine);
    // Mostly reach into the page; the odd one escapes off the edge.
    const side = vine.random() < 0.8 ? 1 : -1;
    const lean = between(vine.random, 0.2, 1);
    const angle = Math.atan2(
      inward.y * side + vine.along.y * lean,
      inward.x * side + vine.along.x * lean,
    );
    tendrils.push({
      random: vine.random,
      x: vine.x,
      y: vine.y,
      angle,
      curl: between(vine.random, 0.1, 0.24) * (vine.random() < 0.5 ? 1 : -1),
      remaining: intBetween(vine.random, 8, 18),
      blooms: vine.random() < 0.75,
    });
  };

  const growVine = (vine: Vine, paint: Paint) => {
    let inward = inwardOf(vine);

    // Turn the corner once the next edge is as close as this one should be.
    const ahead = depthFrom(vine.x, vine.y, {
      x: -vine.along.x,
      y: -vine.along.y,
    });
    if (ahead <= vine.targetDepth) {
      vine.along = inward;
      inward = inwardOf(vine);
    }

    vine.untilRetarget -= 1;
    if (vine.untilRetarget <= 0) {
      vine.targetDepth = intBetween(vine.random, vine.minDepth, vine.maxDepth);
      vine.untilRetarget = intBetween(vine.random, 8, 26);
    }

    // Drift towards the target depth, but never two sideways steps in a row:
    // that is what keeps the line reading as a stem rather than a staircase.
    const depth = depthFrom(vine.x, vine.y, inward);
    let shift = 0;
    vine.sinceShift += 1;
    if (
      depth !== vine.targetDepth &&
      vine.sinceShift >= 2 &&
      vine.random() < 0.6
    ) {
      shift = depth < vine.targetDepth ? 1 : -1;
      vine.sinceShift = 0;
    }
    vine.x += vine.along.x + inward.x * shift;
    vine.y += vine.along.y + inward.y * shift;
    vine.remaining -= 1;

    if (vine.thick) {
      paintCell(
        paint,
        vine.x - inward.x,
        vine.y - inward.y,
        Greens.stemShadow,
        Layer.stemShadow,
      );
    }
    paintCell(
      paint,
      vine.x,
      vine.y,
      vine.thick ? Greens.stem : Greens.shoot,
      Layer.stem,
    );

    vine.untilLeaf -= 1;
    if (vine.untilLeaf <= 0) {
      addLeaf(vine, vine.leafSide);
      vine.leafSide = vine.random() < 0.8 ? (-vine.leafSide as 1 | -1) : 1;
      vine.untilLeaf = intBetween(vine.random, 3, 7);
    }

    vine.untilTendril -= 1;
    if (vine.untilTendril <= 0 || vine.remaining === 0) {
      addTendril(vine);
      vine.untilTendril = intBetween(vine.random, 14, 34);
    }

    vine.untilBud -= 1;
    if (vine.untilBud <= 0) {
      const side = vine.random() < 0.7 ? 1 : -1;
      addFlower(
        vine.random,
        vine.x + inward.x * side * 2,
        vine.y + inward.y * side * 2,
        false,
      );
      vine.untilBud = intBetween(vine.random, 18, 46);
    }
  };

  const growTendril = (tendril: Tendril, paint: Paint) => {
    tendril.x += Math.cos(tendril.angle);
    tendril.y += Math.sin(tendril.angle);
    tendril.angle += tendril.curl;
    // Tightening the curl as it goes winds the tip into a spiral.
    tendril.curl *= 1.07;
    tendril.remaining -= 1;
    const x = Math.round(tendril.x);
    const y = Math.round(tendril.y);
    paintCell(paint, x, y, Greens.tendril, Layer.tendril);
    if (tendril.remaining === 0 && tendril.blooms) {
      addFlower(tendril.random, x, y, true);
    }
  };

  const addVine = (
    index: number,
    start: Vec,
    along: Vec,
    turn: 1 | -1,
    length: number,
    thick: boolean,
    startSeconds: number,
  ) => {
    // A generator per vine, so one vine's growth never reshuffles another's
    // when the grid changes size.
    const random = mulberry32(seed + index * 7919);
    const minDepth = thick ? 1 : 2;
    const maxDepth = thick ? reach : Math.round(reach * 1.6);
    vines.push({
      random,
      ...start,
      along,
      turn,
      thick,
      startTick: Math.round(startSeconds * TICKS_PER_SECOND),
      stepEvery: thick ? 1 : 2,
      remaining: Math.round(length),
      minDepth,
      maxDepth,
      targetDepth: intBetween(random, minDepth, maxDepth),
      untilRetarget: intBetween(random, 8, 26),
      sinceShift: 0,
      untilLeaf: intBetween(random, 2, 5),
      leafSide: 1,
      untilTendril: intBetween(random, 8, 20),
      untilBud: intBetween(random, 10, 30),
    });
  };

  const layout = mulberry32(seed);
  const up = { x: 0, y: -1 };
  const left = { x: -1, y: 0 };
  const right = { x: 1, y: 0 };
  const bottom = rows - 1;
  const farRight = cols - 1;
  // Where along the top edge the two climbing vines meet.
  const meeting = cols * between(layout, 0.35, 0.65);

  // Thick vines climb each side from below the viewport and meet along the
  // top, while two more creep in along the bottom edge.
  addVine(0, { x: 3, y: rows }, up, 1, rows + meeting, true, 0);
  addVine(
    1,
    { x: farRight - 3, y: rows },
    up,
    -1,
    rows + cols - meeting,
    true,
    1.5,
  );
  addVine(
    2,
    { x: -1, y: bottom - 2 },
    right,
    -1,
    cols * between(layout, 0.15, 0.35),
    true,
    3,
  );
  addVine(
    3,
    { x: cols, y: bottom - 2 },
    left,
    1,
    cols * between(layout, 0.15, 0.35),
    true,
    5,
  );
  // Thin shoots follow later and wander further in, weaving over the first.
  addVine(
    4,
    { x: 6, y: rows },
    up,
    1,
    rows * between(layout, 0.5, 0.9),
    false,
    10,
  );
  addVine(
    5,
    { x: farRight - 6, y: rows },
    up,
    -1,
    rows * between(layout, 0.5, 0.9),
    false,
    14,
  );
  addVine(
    6,
    { x: -1, y: 4 },
    right,
    1,
    cols * between(layout, 0.3, 0.6),
    false,
    22,
  );
  addVine(
    7,
    { x: cols, y: 5 },
    left,
    -1,
    cols * between(layout, 0.2, 0.5),
    false,
    26,
  );

  const step = (paint: Paint) => {
    tick += 1;

    for (const vine of vines) {
      if (tick >= vine.startTick && tick % vine.stepEvery === 0) {
        growVine(vine, paint);
      }
    }
    vines = vines.filter((vine) => vine.remaining > 0);

    for (const tendril of tendrils) {
      growTendril(tendril, paint);
    }
    tendrils = tendrils.filter((tendril) => tendril.remaining > 0);

    for (const sprite of sprites) {
      if (tick < sprite.nextFrameTick) {
        continue;
      }
      for (const cell of sprite.frames[sprite.frame]) {
        paintCell(paint, cell.x, cell.y, cell.color, sprite.layer);
      }
      sprite.frame += 1;
      sprite.nextFrameTick = tick + sprite.ticksPerFrame;
    }
    sprites = sprites.filter((sprite) => sprite.frame < sprite.frames.length);

    return vines.length + tendrils.length + sprites.length > 0;
  };

  return { step };
};
