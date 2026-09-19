import { Box, Paper, useMediaQuery } from "@mui/material";
import { memo, useEffect, useMemo, useState } from "react";
import { getTimes } from "suncalc";

const SunGradientColors = {
  sunrise: {
    "0%": "rgb(242,248,247)",
    "3%": "rgb(249,249,28)",
    "8%": "rgb(247,214,46)",
    "12%": "rgb(248,200,95)",
    "30%": "rgb(201,165,132)",
    "51%": "rgb(115,130,133)",
    "85%": "rgb(46,97,122)",
    "100%": "rgb(24,75,106)",
  },
  solarNoon: {
    "0%": "rgba(242,248,247,1)",
    "30%": "rgba(253,250,219,0.2)",
    "70%": "rgba(226,219,197,0.1)",
    "71%": "rgba(226,219,197,0)",
    "100%": "rgba(201,165,132,0)",
  },
  sunset: {
    "0%": "rgb(242,248,247)",
    "3%": "rgb(236,255,0)",
    "8%": "rgb(248,200,95)",
    "12%": "rgb(248,200,95)",
    "30%": "rgb(201,165,132)",
    "51%": "rgb(115,130,133)",
    "85%": "rgb(46,97,122)",
    "100%": "rgb(24,75,106)",
  },
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const getCelestialXY = (
  time: Date,
  width: number,
  height: number,
  celestialRise: Date,
  celestialSet: Date,
) => {
  const timeAboveHorizon = celestialSet.getTime() - celestialRise.getTime();
  const elapsedTimeAboveHorizon = time.getTime() - celestialRise.getTime();
  const elapsedPercentage = elapsedTimeAboveHorizon / timeAboveHorizon;
  // 0 at sunrise (left edge), 1 at sunset (right edge). y is measured down the
  // page, so the arc is subtracted from the horizon to lift the sun into view.
  const angle = Math.PI * elapsedPercentage;
  const radius = width / 2;
  return {
    x: width / 2 - radius * Math.cos(angle),
    y: height - radius * Math.sin(angle),
  };
};

const HOUR_MS = 60 * 60 * 1000;
// How long before and after a peak that peak's gradient stays on screen.
const GRADIENT_FADE_MS = 6 * HOUR_MS;

const getCelestialPositions = (time: Date, width: number, height: number) => {
  const latitude = 0;
  // getTimezoneOffset() is minutes *behind* UTC, so a positive offset means a
  // western (negative) longitude. 4 minutes of offset is one degree.
  const longitude = -time.getTimezoneOffset() / 4;
  const sunTimes = getTimes(time, latitude, longitude);
  // suncalc 2 returns null for events that don't happen on a given day. At the
  // equator the sun always rises and sets, but fall back to solar noon +/- 6h
  // to keep the types honest.
  const sunrise =
    sunTimes.sunrise ?? new Date(sunTimes.solarNoon.getTime() - 6 * HOUR_MS);
  const sunset =
    sunTimes.sunset ?? new Date(sunTimes.solarNoon.getTime() + 6 * HOUR_MS);
  const { x: sunX, y: sunY } = getCelestialXY(
    time,
    width,
    height,
    sunrise,
    sunset,
  );
  const peakTimes = {
    sunrise,
    solarNoon: sunTimes.solarNoon,
    sunset,
  } satisfies Record<keyof typeof SunGradientColors, Date>;

  const sunRadialGradients = Object.entries(SunGradientColors)
    .map(([key, gradient]) => {
      const peakTime = peakTimes[key as keyof typeof peakTimes];
      const diff = Math.abs(time.getTime() - peakTime.getTime());
      const opacity = clamp01(1 - diff / GRADIENT_FADE_MS);
      const gradientColors = Object.entries(gradient)
        .map(([stop, color]) => `${color} ${stop}`)
        .join(", ");
      return {
        name: key,
        gradient: `radial-gradient(circle at ${sunX}px ${sunY}px, ${gradientColors})`,
        opacity,
      };
    })
    // A fully transparent layer still costs a full-viewport composite, and at
    // any given moment at most two of the three are visible.
    .filter(({ opacity }) => opacity > 0);

  return {
    x: sunX,
    y: sunY,
    gradient: sunRadialGradients,
  };
};

type SkyBoxProps = {
  children?: React.ReactNode;
};

// The sky is redrawn at most this often. Anything faster just repaints
// full-viewport gradients that have barely moved.
const FRAME_INTERVAL_MS = 100;
// requestAnimationFrame stops in a hidden tab. Capping the step means we resume
// where we left off instead of fast-forwarding hours of sky in a single frame.
const MAX_FRAME_STEP_MS = 1000;

const useDateTime = (timeMultiplier = 1) => {
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );
  const [dateTime, setDateTime] = useState(() => new Date());

  useEffect(() => {
    if (prefersReducedMotion) {
      // Leave the sky on whatever time it is showing; a decoration is not
      // worth animating for someone who has asked motion to stop.
      return;
    }

    let frame = 0;
    let lastRender = performance.now();

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const elapsed = now - lastRender;
      if (elapsed < FRAME_INTERVAL_MS) {
        return;
      }
      lastRender = now;
      // Advance by the time that actually elapsed rather than by the frame
      // interval, so the sky keeps pace with the clock instead of drifting.
      const step = Math.min(elapsed, MAX_FRAME_STEP_MS) * timeMultiplier;
      setDateTime((previous) => new Date(previous.getTime() + step));
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [timeMultiplier, prefersReducedMotion]);

  return dateTime;
};

const useElementSize = (element: HTMLElement | null) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element]);

  return size;
};

const STAR_COUNT = 100;
const STAR_SIZE_PX = 2;

// Positions are fractions of the container so that a resize reflows the sky
// rather than shuffling every star to a new spot.
const stars = Array.from({ length: STAR_COUNT }, (_, id) => {
  const y = Math.random();
  return {
    id,
    x: Math.random(),
    y,
    opacity: 1 - y,
  };
});

// The star field never changes, so keep it out of the animation's render path.
const StarField = memo(function StarField() {
  return (
    <>
      {stars.map((star) => (
        <Box
          key={star.id}
          sx={{
            position: "absolute",
            top: `${star.y * 100}%`,
            left: `${star.x * 100}%`,
            width: STAR_SIZE_PX,
            height: STAR_SIZE_PX,
            backgroundColor: "white",
            borderRadius: "50%",
            opacity: star.opacity,
          }}
        />
      ))}
    </>
  );
});

// White text over the raw sky measures as low as 1.15:1 at solar noon, when
// the sun's near-white core passes directly behind the hero text. Multiplying
// the sky by a saturated blue deepens it overhead and clears toward the
// horizon, which is how a real sky looks anyway. Multiply keeps the colour
// vivid where a dark overlay would turn it grey, and it leaves the night sky
// alone because that is already darker than the layer.
const OVERHEAD_DEPTH =
  "linear-gradient(to bottom, rgb(52,92,190) 0%, rgb(66,108,200) 55%, rgb(150,180,228) 72%, rgb(255,255,255) 88%)";

const skyLayerStyles = {
  position: "absolute",
  inset: 0,
  backgroundRepeat: "no-repeat",
  pointerEvents: "none",
} as const;

export const SkyBox = ({ children }: SkyBoxProps) => {
  const [paperRef, setPaperRef] = useState<HTMLDivElement | null>(null);
  const { width, height } = useElementSize(paperRef);
  const now = useDateTime(1500);

  const sun = useMemo(
    () => getCelestialPositions(now, width, height),
    [now, width, height],
  );

  const daySkyOpacity = useMemo(() => {
    if (height === 0) {
      return 1;
    }
    return clamp01(0.5 + (height - sun.y) / height);
  }, [sun.y, height]);
  const nightSkyOpacity = 1 - daySkyOpacity;

  return (
    <Paper
      ref={setPaperRef}
      sx={{
        position: "relative",
        minHeight: "100dvh",
        backgroundColor: "transparent",
      }}
    >
      {sun.gradient.map((gradient) => (
        <Box
          key={gradient.name}
          sx={{
            ...skyLayerStyles,
            backgroundImage: gradient.gradient,
            opacity: gradient.opacity,
            zIndex: -1,
          }}
        />
      ))}
      <Box
        id="skyDepth"
        sx={{
          ...skyLayerStyles,
          backgroundImage: OVERHEAD_DEPTH,
          mixBlendMode: "multiply",
          zIndex: -1,
        }}
      />
      <Box
        id="daySky"
        sx={{
          ...skyLayerStyles,
          zIndex: -2,
          filter: "blur(2px)",
          backgroundImage:
            "linear-gradient(to top, rgba(249,251,240,1) 1%, rgba(215,253,254,1) 10%, rgba(167,222,253,1) 40%, rgba(110,175,255,1) 100%)",
          opacity: daySkyOpacity,
        }}
      />
      <Box
        id="nightSky"
        sx={{
          ...skyLayerStyles,
          zIndex: -2,
          backgroundImage:
            "linear-gradient(to bottom, #04090d 0%, #0a2342 99%, #283e51 100%)",
          opacity: nightSkyOpacity,
        }}
      >
        <StarField />
      </Box>
      {children}
    </Paper>
  );
};
