import { useEffect, useRef } from 'react';

const MIN_STEP_SECONDS = 0.001;
const MAX_STEP_SECONDS = 0.2;

/** Keeps the render tree independent of the fixed, guarded simulation clock. */
export const usePhysicsClock = (
  isPlaying: boolean,
  tick: (deltaRealSeconds: number) => void,
) => {
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let animationFrameId: number;

    const loop = (timestamp: number) => {
      const previousTimestamp = lastTimeRef.current ?? timestamp;
      lastTimeRef.current = timestamp;
      const deltaSeconds = Math.min(
        MAX_STEP_SECONDS,
        Math.max(MIN_STEP_SECONDS, (timestamp - previousTimestamp) / 1000),
      );

      if (isPlaying) tick(deltaSeconds);
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationFrameId);
      // Do not carry a background-tab time gap into a newly enabled loop.
      lastTimeRef.current = null;
    };
  }, [isPlaying, tick]);
};
