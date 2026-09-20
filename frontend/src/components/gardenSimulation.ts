// A pixel-art garden along the bottom and right edges of a grid: a flower
// border that rises towards the corner and jasmine climbing the right side,
// both keeping clear of the floating GitHub button.
//
// The module knows nothing about canvases or clocks. The caller owns two pixel
// buffers (behind and in front of the page), steps growth in ticks and wind in
// seconds, and asks for a redraw. Growth is seeded and tick-based, so a resize
// can rebuild the grid and fast-forward the same garden to the age it had.

export const TICKS_PER_SECOND = 12;

export type GardenOptions = {
  cols: number;
  rows: number;
  seed: number;
  /** Centre of the GitHub button, in cells. */
  button: { x: number; y: number };
  /** No wind and no petals, for prefers-reduced-motion. */
  still: boolean;
  /** Pixels behind the page, as little-endian ABGR. */
  back: Uint32Array;
  /** Pixels in front of the page and the button. */
  front: Uint32Array;
};

export type Garden = {
  /** Grow by whole ticks. */
  grow: (ticks: number) => void;
  /** Advance wind, stems and petals by `dt` seconds. */
  step: (dt: number) => void;
  /**
   * Repaint both buffers. Returns the box of `front` that holds petals, and the
   * box of `back` that holds wind wisps, which can be anywhere.
   */
  render: () => { petals: Box | null; wisps: Box | null };
  /** The pointer moved to (x, y), in cells, at `time` milliseconds. Its motion steers the wind. */
  pointerMove: (x: number, y: number, time: number) => void;
  pointerLeave: () => void;
  /** A puff of air outwards from the button. */
  puff: () => void;
  age: () => number;
  /** Everything in `back` that moves stays below this row or right of this column. */
  bandTop: number;
  stripLeft: number;
};

export type Box = { x: number; y: number; width: number; height: number };

const abgr = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | (n >>> 16)) >>> 0;
};

type Palette = { d: number; p: number; l: number; y: number };
const palette = (d: string, p: string, l: string, y: string): Palette => ({
  d: abgr(d),
  p: abgr(p),
  l: abgr(l),
  y: abgr(y),
});

const Palettes = {
  white: palette("#b9b2d6", "#f4f0ff", "#ffffff", "#ffeb68"),
  red: palette("#7d1f3f", "#e0446e", "#ff8fa8", "#ffeb68"),
  peach: palette("#d9773f", "#ffb25f", "#ffe0a8", "#c2457e"),
  gold: palette("#c98a1a", "#ffd24a", "#fff0a8", "#a8641a"),
  sun: palette("#6b3f1d", "#ffc93c", "#ffe58a", "#6b3f1d"),
};
type PaletteName = keyof typeof Palettes;

const Colors = {
  stem: abgr("#3f8f5a"),
  shadow: abgr("#24603f"),
  leaf: abgr("#58b368"),
  leafLight: abgr("#8fd67e"),
  bladeDark: abgr("#2f7a4a"),
  jasmine: abgr("#2f7a4a"),
  jasmineLeaf: abgr("#1f5c3a"),
  jasmineLeafLight: abgr("#2f8a52"),
  tan: abgr("#d9c58a"),
  cream: abgr("#f0e2b0"),
};
const BladeColors = [
  Colors.bladeDark,
  Colors.leaf,
  Colors.stem,
  Colors.leafLight,
];

// Flower heads open through these frames. d: dark, p: petal, l: light, y: centre
const Shapes = {
  daisy: [
    ["d"],
    [".p.", "pyp", ".p."],
    ["p.p.p", ".ppp.", "ppypp", ".ppp.", "p.p.p"],
  ],
  tulip: [["d"], ["p", "p"], ["p.p", "ppp", "lpl", ".d."]],
  poppy: [["d"], [".p.", "pdp"], [".ppp.", "ppppp", "ppdpp", ".ppp."]],
  sun: [
    ["d"],
    [".p.", "pdp", ".p."],
    [".ppp.", "ppdpp", "pdddp", "ppdpp", ".ppp."],
    [
      "..ppp..",
      ".plplp.",
      "ppdddpp",
      "pldddlp",
      "ppdddpp",
      ".plplp.",
      "..ppp..",
    ],
  ],
};
type ShapeName = keyof typeof Shapes;

type Species =
  | {
      kind: "head";
      shape: ShapeName;
      palettes: PaletteName[];
      height: [number, number];
    }
  | { kind: "spike"; palettes: PaletteName[]; height: [number, number] }
  | { kind: "plume"; height: [number, number] };

// A warm border: sunflowers, poppies and golds, with feathery grasses, which
// show the wind best.
const Border: Species[] = [
  { kind: "head", shape: "sun", palettes: ["sun"], height: [11, 18] },
  { kind: "head", shape: "sun", palettes: ["sun"], height: [9, 14] },
  { kind: "head", shape: "poppy", palettes: ["red", "peach"], height: [6, 12] },
  {
    kind: "head",
    shape: "daisy",
    palettes: ["gold", "white"],
    height: [6, 12],
  },
  { kind: "spike", palettes: ["peach", "red"], height: [11, 18] },
  { kind: "head", shape: "tulip", palettes: ["red", "peach"], height: [6, 10] },
  { kind: "plume", height: [10, 16] },
];
// How many times taller the border stands at its crest than in the open meadow.
const BORDER_RISE = 3.4;
const MAX_HEIGHT_FRACTION = 0.64;
// Where up its stem a spike's florets or a plume's feathers begin.
const SPIKE_FROM = 0.45;
const PLUME_FROM = 0.62;

const Climbers = [
  { reach: 0.98, maxDepth: 9, delay: 0, color: Colors.jasmine },
  { reach: 0.9, maxDepth: 13, delay: 3, color: Colors.jasmine },
  { reach: 0.7, maxDepth: 17, delay: 7, color: Colors.stem },
];
// Nothing taller than short grass grows within this many cells of the centre
// of the button.
const BUTTON_CLEARING = 7;

// A gusty breeze: light air most of the time, with strong gusts rolling
// through. Petals are a trickle: never more than MAX_PETALS in the air, and no
// more than MAX_FALLEN lying in the grass.
const Wind = { base: 0.3, gust: 1.55, turbulence: 0.4 };
// How much wind a moving pointer steers: per cell a second of pointer speed, up
// to a limit, spread over this many cells either side of it.
const STEER_GAIN = 0.016;
const STEER_LIMIT = 2.5;
const STEER_WIDTH = 70;
const PETAL_RATE = 0.6;
const MAX_PETALS = 4;
const MAX_FALLEN = 36;

// Wisps are short streaks that ride the wind and curl up as they fade, so a
// gust can be seen coming. They only appear in wind at least this strong.
const WISP_THRESHOLD = 0.75;
const WISP_RATE = 1.6;
const MAX_WISPS = 7;
// Cells a second of travel for each unit of wind.
const WISP_SPEED = 26;
// 0xe6dcff, a pale lilac, as little-endian ABGR without its alpha.
const WISP_COLOR = 0xffdce6;

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

const hash = (i: number, seed: number) => {
  let n = Math.imul((i * 374761393 + seed * 668265263) | 0, 1274126177);
  n ^= n >>> 13;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
// Smooth one-dimensional noise in [0, 1].
const noise = (u: number, seed: number) => {
  const i = Math.floor(u);
  const f = u - i;
  const k = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - k) + hash(i + 1, seed) * k;
};
const smoothstep = (value: number) => {
  const v = Math.min(1, Math.max(0, value));
  return v * v * (3 - 2 * v);
};

type Cell = [dx: number, dy: number, color: number];

type Plant = {
  kind: "blade" | "head" | "spike" | "plume";
  x: number;
  height: number;
  grown: number;
  startTick: number;
  doneTick: number;
  // Tall plants grow a pixel a tick, the rest every other tick.
  quick: boolean;
  color: number;
  petals: [number, number];
  // The stem as a spring: a slow bend, and a faster one that whips the tip.
  lean: number;
  gain: number;
  damping: number;
  bend: number;
  bendSpeed: number;
  whip: number;
  whipSpeed: number;
  windAverage: number;
  tipX: number;
  tipY: number;
  leaves: Map<number, number>;
  head?: { frames: Cell[][]; delay: number; ticksPerFrame: number };
  spike?: {
    from: number;
    count: number;
    open: number;
    lights: boolean[];
    palette: Palette;
  };
  sheds: boolean;
};

type Bloom = {
  x: number;
  tipX: number;
  tipY: number;
  petals: [number, number];
};

type Wisp = {
  x: number;
  y: number;
  age: number;
  life: number;
  // The streak it leaves behind, newest first, as x and y pairs.
  trail: number[];
  length: number;
  phase: number;
  // Which way it curls at the end of its life.
  curl: number;
  heading: number;
};

type Petal = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  spin: number;
  colors: [number, number];
  // How many rows above the ground it comes to rest.
  rest: number;
};

type PaintEvent =
  | { tick: number; x: number; y: number; color: number; priority: number }
  | { tick: number; bloom: Bloom };

export const createGarden = (options: GardenOptions): Garden => {
  const { cols, rows, seed, still, back, front } = options;
  const buttonX = Math.round(options.button.x);
  const buttonY = Math.round(options.button.y);
  const random = mulberry32(seed);
  const between = (min: number, max: number) => min + random() * (max - min);
  const intBetween = (min: number, max: number) =>
    Math.floor(between(min, max + 1));
  const pick = <T>(list: readonly T[]) =>
    list[Math.floor(random() * list.length)];

  // The jasmine never moves once grown, so it lives on its own layer that is
  // copied under the swaying plants each frame.
  const climberLayer = new Uint32Array(cols * rows);
  const climberPriority = new Uint8Array(cols * rows);
  const events: PaintEvent[] = [];
  let nextEvent = 0;
  const jasmineLeaves: { x: number; y: number; side: number; tick: number }[] =
    [];

  const plants: Plant[] = [];
  const blooms: Bloom[] = [];
  let petals: Petal[] = [];
  let wisps: Wisp[] = [];
  const fallen: { x: number; y: number; color: number }[] = [];
  let tick = 0;
  let time = 0;
  const pointer = { x: 0, y: 0, vx: 0, lastX: 0, lastTime: 0, active: false };
  // The wind the pointer is steering: it builds as the pointer moves, wherever
  // on the page that is, and dies away after it stops.
  let steered = 0;

  const makePlant = (
    kind: Plant["kind"],
    x: number,
    height: number,
    startTick: number,
    overrides: Partial<Plant> = {},
  ): Plant => ({
    kind,
    x,
    height,
    grown: 0,
    startTick,
    doneTick: 0,
    quick: height > 26,
    color: Colors.stem,
    petals: [Colors.tan, Colors.cream],
    lean: between(-0.14, 0.14),
    gain: 0.26 * between(0.8, 1.2),
    damping: between(0.16, 0.3),
    bend: 0,
    bendSpeed: 0,
    whip: 0,
    whipSpeed: 0,
    windAverage: 0,
    tipX: x,
    tipY: rows,
    leaves: new Map(),
    sheds: false,
    ...overrides,
  });

  const headFrames = (shape: ShapeName, colors: Palette): Cell[][] =>
    Shapes[shape].map((frame) => {
      const offset = (frame[0].length - 1) / 2;
      // Anchored by its bottom row, so a head sits on its stalk as it opens.
      return frame.flatMap((row, j) =>
        [...row].flatMap((key, i): Cell[] =>
          key === "."
            ? []
            : [
                [
                  Math.round(i - offset),
                  j - frame.length,
                  colors[key as keyof Palette],
                ],
              ],
        ),
      );
    });

  const plantBorder = () => {
    // The button stands where the border would peak, so the crest sits just to
    // its left and the planting dips into short grass around it.
    const crest = buttonX - BUTTON_CLEARING - 7;
    let x = cols - 1;
    let untilFlower = intBetween(3, 8);
    while (x >= 0) {
      const fromButton = Math.abs(x - buttonX);
      const rise = x > buttonX ? BORDER_RISE * 0.25 : BORDER_RISE;
      const boost =
        1 + rise * Math.exp(-Math.max(0, crest - x) / (cols * 0.11));
      const clearing =
        fromButton <= BUTTON_CLEARING
          ? 0
          : smoothstep((fromButton - BUTTON_CLEARING) / 7);
      // Growth spreads outwards from the corner.
      const startTick = Math.round((cols - x) * 1.1 + between(0, 50));
      untilFlower -= 1;
      if (untilFlower <= 0 && clearing > 0.15) {
        const species = pick(Border);
        const height = Math.max(
          4,
          Math.min(
            Math.round(
              intBetween(species.height[0], species.height[1]) *
                boost *
                Math.max(clearing, 0.35),
            ),
            Math.floor(rows * MAX_HEIGHT_FRACTION),
          ),
        );
        const colors =
          species.kind === "plume"
            ? Palettes.white
            : Palettes[pick(species.palettes)];
        const plant = makePlant(species.kind, x, height, startTick, {
          petals:
            species.kind === "plume"
              ? [Colors.tan, Colors.cream]
              : [colors.p, colors.l],
          gain:
            (species.kind === "plume"
              ? 0.34
              : species.kind === "head"
                ? 0.27
                : 0.22) * between(0.8, 1.2),
        });
        const leavesBelow =
          species.kind === "head"
            ? height - 3
            : Math.floor(
                height * (species.kind === "plume" ? PLUME_FROM : SPIKE_FROM),
              );
        let side = random() < 0.5 ? 1 : -1;
        for (let h = intBetween(3, 5); h < leavesBelow; h += intBetween(3, 7)) {
          plant.leaves.set(h, side);
          side = -side;
        }
        if (species.kind === "head") {
          plant.head = {
            frames: headFrames(species.shape, colors),
            delay: intBetween(4, 60),
            ticksPerFrame: intBetween(10, 22),
          };
        }
        if (species.kind === "spike") {
          const from = Math.floor(height * SPIKE_FROM);
          plant.spike = {
            from,
            count: height - from + 1,
            open: 0,
            lights: Array.from({ length: height + 2 }, () => random() < 0.5),
            palette: colors,
          };
        }
        plants.push(plant);
        untilFlower = intBetween(4, 10);
      } else {
        const base = random() < 0.2 ? intBetween(6, 11) : intBetween(2, 6);
        const height =
          clearing === 0
            ? intBetween(1, 2)
            : Math.max(
                2,
                Math.round(
                  base * Math.min(boost, 1.7) * Math.max(clearing, 0.4),
                ),
              );
        plants.push(
          makePlant("blade", x, height, startTick, {
            color: pick(BladeColors),
            gain: 0.32 * between(0.7, 1.3),
            lean: between(-0.3, 0.3),
          }),
        );
      }
      x -= intBetween(1, 2);
    }
  };

  // Each climber is worked out up front as a list of timed pixels. Only the
  // leaves are kept live, so they can flutter.
  const plantClimber = ({
    reach,
    maxDepth,
    delay,
    color,
  }: (typeof Climbers)[number]) => {
    const paint = (
      at: number,
      x: number,
      y: number,
      c: number,
      priority: number,
    ) =>
      events.push({
        tick: Math.round(at),
        x: Math.round(x),
        y: Math.round(y),
        color: c,
        priority,
      });
    const flowerAt = (at: number, x: number, y: number, big: boolean) => {
      const colors = Palettes.white;
      const opens = at + intBetween(6, 70);
      paint(opens, x, y, colors.d, 5);
      for (const [dx, dy] of [
        [0, -1],
        [-1, 0],
        [1, 0],
        [0, 1],
      ]) {
        paint(opens + 14, x + dx, y + dy, colors.p, 5);
      }
      paint(opens + 14, x, y, colors.y, 5);
      if (big) {
        for (const [dx, dy] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
          [0, -2],
          [0, 2],
          [-2, 0],
          [2, 0],
        ]) {
          paint(opens + 30, x + dx, y + dy, colors.l, 5);
        }
      }
      events.push({
        tick: opens + 32,
        bloom: { x, tipX: x, tipY: y + 2, petals: [colors.p, colors.l] },
      });
    };

    // Beside the button there is only the gap between its clearing and the edge.
    const gap = Math.max(1, cols - 3 - (buttonX + BUTTON_CLEARING));
    let x = cols - 1 - intBetween(0, Math.min(2, gap));
    let y = rows;
    let at = delay * TICKS_PER_SECOND;
    let target = 1;
    let untilRetarget = 0;
    let sinceShift = 0;
    let untilLeaf = 2;
    let side = -1;
    let untilFlower = intBetween(3, 7);
    let untilTendril = intBetween(10, 20);
    const steps = Math.round(rows * reach);
    for (let i = 0; i < steps; i++) {
      const limit =
        y > buttonY - BUTTON_CLEARING - 1 ? Math.min(gap, maxDepth) : maxDepth;
      at += 1;
      y -= 1;
      untilRetarget -= 1;
      if (untilRetarget <= 0 || target > limit) {
        target = intBetween(limit > 1 ? 1 : 0, limit);
        untilRetarget = intBetween(8, 26);
      }
      // Drift towards the target depth, but never two sideways steps in a
      // row: that keeps the line reading as a stem rather than a staircase.
      const depth = cols - 1 - x;
      sinceShift += 1;
      if (depth !== target && sinceShift >= 2 && random() < 0.6) {
        x += depth < target ? -1 : 1;
        sinceShift = 0;
      }
      paint(at, x, y, color, 2);
      untilLeaf -= 1;
      if (untilLeaf <= 0) {
        jasmineLeaves.push({ x, y, side, tick: at + intBetween(2, 8) });
        side = random() < 0.8 ? -side : -1;
        untilLeaf = intBetween(2, 4);
      }
      untilFlower -= 1;
      if (untilFlower <= 0) {
        flowerAt(at, x + (random() < 0.75 ? -2 : 2), y, random() < 0.12);
        untilFlower = intBetween(4, 9);
      }
      untilTendril -= 1;
      if (untilTendril <= 0 && limit > 4) {
        let angle = Math.PI + between(-0.7, 0.7);
        // Tightening the curl as it goes winds the tip into a spiral.
        let curl = between(0.1, 0.24) * (random() < 0.5 ? 1 : -1);
        let tx = x;
        let ty = y;
        const length = intBetween(6, 12);
        for (let k = 1; k <= length; k++) {
          tx += Math.cos(angle);
          ty += Math.sin(angle);
          angle += curl;
          curl *= 1.07;
          paint(at + k, tx, ty, Colors.stem, 3);
        }
        flowerAt(at + length, Math.round(tx), Math.round(ty), false);
        untilTendril = intBetween(18, 34);
      }
    }
  };

  plantBorder();
  Climbers.forEach(plantClimber);
  events.sort((a, b) => a.tick - b.tick);

  const startShedding = (plant: Plant) => {
    if (!plant.sheds) {
      plant.sheds = true;
      blooms.push({
        x: plant.x,
        get tipX() {
          return plant.tipX;
        },
        get tipY() {
          return plant.tipY;
        },
        petals: plant.petals,
      });
    }
  };

  const growTick = () => {
    tick += 1;
    for (const plant of plants) {
      if (tick < plant.startTick) {
        continue;
      }
      if (plant.grown < plant.height) {
        if (plant.quick || tick % 2 === 0) {
          plant.grown += 1;
          if (plant.grown === plant.height) {
            plant.doneTick = tick;
          }
        }
      } else if (plant.spike && plant.spike.open < plant.spike.count) {
        // Florets open from the bottom of the spike upwards.
        if (tick % 3 === 0) {
          plant.spike.open += 1;
          if (plant.spike.open >= plant.spike.count) {
            startShedding(plant);
          }
        }
      }
    }
    while (nextEvent < events.length && events[nextEvent].tick <= tick) {
      const event = events[nextEvent++];
      if ("bloom" in event) {
        blooms.push(event.bloom);
        continue;
      }
      if (event.x < 0 || event.y < 0 || event.x >= cols || event.y >= rows) {
        continue;
      }
      // Flowers paint over stems and are never painted over by them.
      const index = event.y * cols + event.x;
      if (climberPriority[index] <= event.priority) {
        climberPriority[index] = event.priority;
        climberLayer[index] = event.color;
      }
    }
  };

  // Positive wind blows to the left. A light flutter, plus gust fronts that
  // roll in from the right with lulls between them.
  const windSeed = seed % 1000;
  const wind = (x: number) => {
    if (still) {
      return 0;
    }
    const lull = 0.35 + 0.65 * noise(time * 0.07, windSeed + 1);
    const front = smoothstep(
      (noise(x * 0.011 + time * 0.32, windSeed + 2) - 0.42) / 0.58,
    );
    const turbulence =
      noise(x * 0.085 + time * 1.6, windSeed + 3) -
      0.5 +
      0.5 * (noise(x * 0.3 + time * 3.1, windSeed + 4) - 0.5);
    // Steered wind is felt across the whole garden, most of all in the part
    // of it below the pointer.
    const below = Math.exp(-(((x - pointer.x) / STEER_WIDTH) ** 2));
    return (
      Wind.base * (0.8 + 0.4 * noise(time * 0.2, windSeed + 5)) +
      Wind.gust * front * lull +
      Wind.turbulence * turbulence +
      steered * (0.25 + 0.75 * below)
    );
  };

  const release = (x: number, y: number, colors: [number, number]) => {
    const petal: Petal = {
      x,
      y,
      vx: 0,
      vy: 0,
      phase: Math.random() * 6,
      spin: 3 + Math.random() * 4,
      colors,
      rest: Math.floor(Math.random() * 3),
    };
    petals.push(petal);
    return petal;
  };

  const step = (dt: number) => {
    time += dt;
    pointer.vx *= Math.pow(0.03, dt);
    // Air has inertia: the steered wind picks up quickly behind a moving
    // pointer and takes a moment to settle once it stops.
    const pushed = pointer.active
      ? Math.max(-STEER_LIMIT, Math.min(STEER_LIMIT, -pointer.vx * STEER_GAIN))
      : 0;
    const rate = Math.abs(pushed) > Math.abs(steered) ? 4 : 1.2;
    steered += (pushed - steered) * Math.min(1, dt * rate);
    for (const plant of plants) {
      if (plant.grown === 0) {
        continue;
      }
      const speed = wind(plant.x);
      // A cantilever in a drag flow. Stiffness falls with height, so grass
      // flutters while tall stems swing slowly; tall stems are also thicker,
      // so they catch less wind for their stiffness and cannot fold as far.
      const frequency = 17 / Math.sqrt(Math.max(3, plant.grown));
      const limit = 0.3 + 0.75 * Math.exp(-plant.height / 22);
      const exposure = plant.gain * (0.5 + 0.5 * Math.exp(-plant.height / 30));
      const rest =
        limit * Math.tanh((exposure * speed * Math.abs(speed)) / limit);
      plant.bendSpeed +=
        (frequency * frequency * (rest - plant.bend) -
          2 * plant.damping * frequency * plant.bendSpeed) *
        dt;
      plant.bend += plant.bendSpeed * dt;
      if (plant.height > 18) {
        // A faster second mode, driven by changes in the wind, lets the tip
        // whip and lag behind the base.
        plant.windAverage +=
          (speed - plant.windAverage) * Math.min(1, dt * 1.5);
        const whipFrequency = frequency * 2.9;
        const whipRest =
          plant.gain * 1.6 * (speed - plant.windAverage) -
          (0.35 * plant.bendSpeed) / frequency;
        plant.whipSpeed +=
          (whipFrequency * whipFrequency * (whipRest - plant.whip) -
            0.4 * whipFrequency * plant.whipSpeed) *
          dt;
        plant.whip += plant.whipSpeed * dt;
      }
    }
    if (still) {
      return;
    }

    // Wisps appear where the wind is strong: anywhere in a gust, and around
    // the pointer while it is steering.
    if (wisps.length < MAX_WISPS) {
      const nearPointer = Math.abs(steered) > 0.5 && Math.random() < 0.6;
      const x = nearPointer
        ? pointer.x + (Math.random() - 0.5) * 60
        : Math.random() * cols;
      const y = nearPointer
        ? pointer.y + (Math.random() - 0.5) * 30
        : rows * (0.15 + 0.78 * Math.random());
      const strength = Math.abs(wind(x)) - WISP_THRESHOLD;
      if (strength > 0 && Math.random() < dt * WISP_RATE * (1 + 3 * strength)) {
        wisps.push({
          x,
          y: Math.max(2, Math.min(rows - 6, y)),
          age: 0,
          life: 0.9 + Math.random() * 0.9,
          trail: [],
          length: 9 + Math.floor(Math.random() * 10),
          phase: Math.random() * 6,
          curl: Math.random() < 0.5 ? 1 : -1,
          heading: 0,
        });
      }
    }
    for (const wisp of wisps) {
      wisp.age += dt;
      const speed = wind(wisp.x) * WISP_SPEED;
      // It runs straight with a slight waver, then winds into a curl and slows
      // over the last third of its life.
      const late = Math.max(0, (wisp.age / wisp.life - 0.65) / 0.35);
      wisp.heading += wisp.curl * late * 9 * dt;
      const waver = 0.25 * Math.sin(wisp.phase + wisp.age * 7);
      const pace = Math.abs(speed) * (1 - 0.6 * late);
      const direction = speed >= 0 ? -1 : 1;
      wisp.x += direction * Math.cos(wisp.heading + waver) * pace * dt;
      wisp.y -= Math.sin(wisp.heading + waver) * pace * dt;
      wisp.trail.unshift(wisp.x, wisp.y);
      wisp.trail.length = Math.min(wisp.trail.length, wisp.length * 2);
    }
    wisps = wisps.filter((wisp) => wisp.age < wisp.life);

    // Petals are plucked more readily in a gust, from whichever of a few
    // candidates stands in the strongest wind.
    if (blooms.length > 0 && petals.length < MAX_PETALS) {
      let best = blooms[0];
      let strongest = -1;
      for (let i = 0; i < 3; i++) {
        const candidate = blooms[Math.floor(Math.random() * blooms.length)];
        const strength = Math.abs(wind(candidate.x));
        if (strength > strongest) {
          strongest = strength;
          best = candidate;
        }
      }
      if (
        Math.random() <
        dt * PETAL_RATE * (0.3 + Math.min(4, strongest * strongest))
      ) {
        release(best.tipX, best.tipY - 2, best.petals);
      }
    }
    // A strong gust picks fallen petals back up.
    if (fallen.length > 0 && petals.length < MAX_PETALS) {
      const index = Math.floor(Math.random() * fallen.length);
      const lying = fallen[index];
      if (wind(lying.x) > 1.5 && Math.random() < dt * 2.5) {
        fallen.splice(index, 1);
        release(lying.x, lying.y, [lying.color, lying.color]).vy = -4;
      }
    }
    for (const petal of petals) {
      const speed = wind(petal.x);
      const lift = (noise(petal.x * 0.05 + time * 0.9, 77) - 0.5) * speed * 5;
      petal.vx += (-speed * 12 - petal.vx) * 2.2 * dt;
      petal.vy += (3.4 - lift - petal.vy) * 2.2 * dt;
      petal.phase += petal.spin * dt;
      petal.x += (petal.vx + 2 * Math.cos(petal.phase)) * dt;
      petal.y += (petal.vy + 0.8 * Math.sin(2 * petal.phase)) * dt;
    }
    petals = petals.filter((petal) => {
      if (petal.y >= rows - 1 - petal.rest) {
        fallen.push({
          x: Math.floor(petal.x),
          y: Math.floor(petal.y),
          color: petal.colors[0],
        });
        if (fallen.length > MAX_FALLEN) {
          fallen.shift();
        }
        return false;
      }
      return petal.x > -3 && petal.x < cols + 3 && petal.y > -20;
    });
  };

  const put = (buffer: Uint32Array, x: number, y: number, color: number) => {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px >= 0 && py >= 0 && px < cols && py < rows) {
      buffer[py * cols + px] = color;
    }
  };

  // The smallest box on the grid around a list of x and y pairs.
  const boxOf = (points: number[]): Box | null => {
    let left = cols;
    let top = rows;
    let right = -1;
    let bottom = -1;
    for (let i = 0; i < points.length; i += 2) {
      left = Math.min(left, Math.floor(points[i]));
      top = Math.min(top, Math.floor(points[i + 1]));
      right = Math.max(right, Math.floor(points[i]));
      bottom = Math.max(bottom, Math.floor(points[i + 1]));
    }
    left = Math.max(0, left);
    top = Math.max(0, top);
    right = Math.min(cols - 1, right);
    bottom = Math.min(rows - 1, bottom);
    if (right < left || bottom < top) {
      return null;
    }
    return {
      x: left,
      y: top,
      width: right - left + 1,
      height: bottom - top + 1,
    };
  };

  const render = () => {
    back.set(climberLayer);
    front.fill(0);
    const wispBox = boxOf(
      wisps.flatMap((wisp) => {
        // Fades in, fades out, and thins towards the tail.
        const presence = Math.min(1, wisp.age * 6, (wisp.life - wisp.age) * 3);
        for (let i = 0; i + 3 < wisp.trail.length; i += 2) {
          const alpha = Math.round(
            190 * presence * (1 - i / (wisp.length * 2)),
          );
          if (alpha <= 0) {
            continue;
          }
          // A wisp can cover more than a pixel a frame, so each pair of
          // trail points is joined up rather than left as dots.
          const [x0, y0, x1, y1] = wisp.trail.slice(i, i + 4);
          const steps = Math.max(
            1,
            Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))),
          );
          for (let k = 0; k < steps; k++) {
            const px = Math.floor(x0 + ((x1 - x0) * k) / steps);
            const py = Math.floor(y0 + ((y1 - y0) * k) / steps);
            // Never over the jasmine, which is already in the buffer.
            if (
              px >= 0 &&
              py >= 0 &&
              px < cols &&
              py < rows &&
              back[py * cols + px] === 0
            ) {
              back[py * cols + px] = ((alpha << 24) | WISP_COLOR) >>> 0;
            }
          }
        }
        return wisp.trail;
      }),
    );
    for (const plant of plants) {
      if (plant.grown === 0) {
        continue;
      }
      let x = plant.x + 0.5;
      let y = rows;
      const spike = plant.spike;
      for (let s = 1; s <= plant.grown; s++) {
        // The bend accumulates along the stem and every step is one pixel
        // long, so stems curve over and keep their length.
        const u = s / plant.height;
        const angle =
          plant.lean * u +
          plant.bend * u * Math.sqrt(u) +
          plant.whip * u * u * u * u;
        x -= Math.sin(angle);
        y -= Math.cos(angle);
        put(back, x, y, plant.color);
        const side = plant.leaves.get(s);
        if (side) {
          put(back, x + side, y, Colors.leafLight);
          if (plant.height > 14) {
            put(back, x + side * 2, y - 1, Colors.leaf);
          }
        }
        if (spike && s >= spike.from && s - spike.from < spike.open) {
          const i = s - spike.from;
          const floretSide = i % 2 ? 1 : -1;
          const tip = s >= plant.height;
          put(back, x, y, tip ? spike.palette.d : spike.palette.p);
          if (!tip) {
            put(back, x + floretSide, y, spike.palette.p);
            if (spike.lights[i]) {
              put(back, x + floretSide * 2, y, spike.palette.l);
            }
          }
        }
        if (plant.kind === "plume" && s > plant.height * PLUME_FROM) {
          const featherSide = s % 2 ? 1 : -1;
          put(back, x, y, Colors.cream);
          put(back, x + featherSide, y, Colors.tan);
          if (s % 3 === 0) {
            put(back, x - featherSide, y + 1, Colors.tan);
          }
        }
      }
      plant.tipX = x;
      plant.tipY = y;
      if (plant.grown < plant.height) {
        continue;
      }
      if (plant.kind === "plume") {
        startShedding(plant);
      }
      if (plant.head) {
        const { frames, delay, ticksPerFrame } = plant.head;
        const frame = Math.floor(
          (tick - plant.doneTick - delay) / ticksPerFrame,
        );
        if (frame >= 0) {
          if (frame >= frames.length - 1) {
            startShedding(plant);
          }
          for (const [dx, dy, color] of frames[
            Math.min(frame, frames.length - 1)
          ]) {
            put(back, x + dx, y + dy, color);
          }
        }
      }
    }

    for (const leaf of jasmineLeaves) {
      if (leaf.tick > tick) {
        continue;
      }
      // Leaves lift in a breeze and are pushed back by a gust.
      const speed = wind(leaf.x + leaf.y * 0.4);
      const pushed = speed > 1.3 ? -1 : 0;
      const lifted = speed > 0.7 && leaf.side < 0 ? -1 : 0;
      put(back, leaf.x + leaf.side, leaf.y, Colors.jasmineLeaf);
      put(
        back,
        leaf.x + leaf.side * 2 + pushed,
        leaf.y - 1 + lifted,
        speed > 0.7 ? Colors.leafLight : Colors.jasmineLeafLight,
      );
    }
    for (const petal of fallen) {
      put(back, petal.x, petal.y, petal.color);
    }

    for (const petal of petals) {
      // A petal tumbles, showing its pale underside every half turn.
      put(
        front,
        petal.x,
        petal.y,
        petal.colors[Math.cos(petal.phase) > 0 ? 0 : 1],
      );
    }
    return {
      petals: boxOf(petals.flatMap((petal) => [petal.x, petal.y])),
      wisps: wispBox,
    };
  };

  const deepest = Math.max(...Climbers.map((climber) => climber.maxDepth));

  return {
    grow: (ticks) => {
      for (let i = 0; i < ticks; i++) {
        growTick();
      }
    },
    step,
    render,
    pointerMove: (x, y, now) => {
      if (pointer.active && now > pointer.lastTime) {
        const speed = (x - pointer.lastX) / ((now - pointer.lastTime) / 1000);
        pointer.vx = 0.6 * pointer.vx + 0.4 * speed;
      }
      Object.assign(pointer, { x, y, lastX: x, lastTime: now, active: true });
    },
    pointerLeave: () => {
      pointer.active = false;
    },
    puff: () => {
      for (const plant of plants) {
        const distance = plant.x - buttonX;
        if (Math.abs(distance) < 50) {
          plant.bendSpeed +=
            (distance < 0 ? 1 : -1) * 3.2 * Math.exp(-Math.abs(distance) / 16);
        }
      }
    },
    age: () => tick,
    // Stems cannot be longer than the height limit however they bend, heads
    // add a few rows, and the jasmine's tendrils and flowers reach a little
    // beyond its deepest stem.
    bandTop: Math.max(0, rows - Math.floor(rows * MAX_HEIGHT_FRACTION) - 10),
    stripLeft: Math.max(0, cols - deepest - 18),
  };
};
