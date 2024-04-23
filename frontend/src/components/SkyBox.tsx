import { Box, Paper } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { getTimes, GetTimesResult } from "suncalc";

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

const getCelestialXY = (
  time: Date,
  width: number,
  height: number,
  celestialSet: Date,
  celestialRise: Date,
) => {
  const timeAboveHorizon = celestialRise.getTime() - celestialSet.getTime();
  const elapsedTimeAboveHorizon = time.getTime() - celestialRise.getTime();
  const elapsedPercentage = elapsedTimeAboveHorizon / timeAboveHorizon;
  const angle = Math.PI * elapsedPercentage;
  const radius = width / 2;
  return {
    x: width / 2 + radius * -Math.cos(angle),
    y: height + radius * Math.sin(angle),
  };
};

const useCelestialPositions = (time: Date, width: number, height: number) => {
  const latitude = 0;
  const longitude = time.getTimezoneOffset() / 4;
  const sunTimes = getTimes(time, latitude, longitude);
  const { x: sunX, y: sunY } = getCelestialXY(
    time,
    width,
    height,
    sunTimes.sunset,
    sunTimes.sunrise,
  );

  const sunRadialGradients = Object.entries(SunGradientColors).map(
    ([key, gradient]) => {
      const gradientColors = Object.entries(gradient)
        .map(([stop, color]) => {
          return `${color} ${stop}`;
        })
        .join(", ");
      const peakTime = sunTimes[key as keyof GetTimesResult];
      const diff = Math.abs(time.getTime() - peakTime.getTime()) / 1000 / 60; // Difference in minutes
      const opacity = Math.max(0, 1 - Math.pow(diff / 360, 1));
      return {
        gradient: `radial-gradient(circle at ${sunX}px ${sunY}px, ${gradientColors})`,
        opacity: opacity,
      };
    },
  );
  return {
    x: sunX,
    y: sunY,
    gradient: sunRadialGradients,
  };
};

type SkyBoxProps = {
  children?: React.ReactNode;
};

const useDateTime = (timeMultiplier = 1) => {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDateTime((prevDateTime) => {
        const elapsedTime = 100 * timeMultiplier;
        return new Date(prevDateTime.getTime() + elapsedTime);
      });
    }, 100);

    return () => {
      clearInterval(intervalId);
    };
  }, [timeMultiplier]);

  return dateTime;
};

const createStars = (count: number, width: number, height: number) => {
  console.log(width, height);
  const stars = [];
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 2;
    stars.push({
      x,
      y,
      size,
    });
  }
  return stars;
};
export const SkyBox = ({ children }: SkyBoxProps) => {
  const [paperRef, setPaperRef] = useState<HTMLDivElement | null>(null);
  const now = useDateTime(1500);
  const sun = useCelestialPositions(
    now,
    paperRef?.clientWidth || 0,
    paperRef?.clientHeight || 0,
  );
  const calculateDaySkyOpacity = (sunY: number, height: number) => {
    const normalizedY = (height - sunY) / height;
    const opacity = Math.min(1, 0.5 + normalizedY);
    return opacity;
  };
  const daySkyOpacity = calculateDaySkyOpacity(
    sun.y,
    paperRef?.clientHeight || 0,
  );
  const nightSkyOpacity = 1 - daySkyOpacity;
  const stars = useMemo(() => {
    if (!paperRef) {
      return [];
    }
    return createStars(100, paperRef.clientWidth, paperRef.clientHeight);
  }, [paperRef]);
  return (
    <Paper
      ref={setPaperRef}
      sx={{
        minHeight: "100dvh",
        backgroundColor: "transparent",
      }}
    >
      {sun.gradient.map((gradient, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: paperRef?.clientWidth || 0,
            height: paperRef?.clientHeight || 0,
            backgroundImage: gradient.gradient,
            backgroundRepeat: "no-repeat",
            filter: "blur(1px)",
            opacity: sun.gradient[i].opacity,
            zIndex: -1,
          }}
        ></Box>
      ))}
      <Box
        id="daySky"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: paperRef?.clientWidth || 0,
          height: paperRef?.clientHeight || 0,
          backgroundRepeat: "no-repeat",
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
          position: "absolute",
          top: 0,
          left: 0,
          width: paperRef?.clientWidth || 0,
          height: paperRef?.clientHeight || 0,
          backgroundRepeat: "no-repeat",
          zIndex: -2,
          backgroundImage:
            "linear-gradient(to bottom, #04090d 0%, #0a2342 99%, #283e51 100%)",
          opacity: nightSkyOpacity,
        }}
      >
        {stars.map((star, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              top: star.y,
              left: star.x,
              width: star.size,
              height: star.size,
              backgroundColor: "white",
              borderRadius: "50%",
              opacity: 1 - star.y / (paperRef?.clientHeight || 0),
            }}
          />
        ))}
      </Box>
      {children}
    </Paper>
  );
};
