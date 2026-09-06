'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { ReviewPreview } from './product-visuals';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function ReviewVisual() {
  const visualRef = useRef<HTMLDivElement>(null);
  const [isScrollLinked, setIsScrollLinked] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const visual = visualRef.current;

    if (!visual) {
      return;
    }

    let frameId: number | null = null;

    const updateProgress = () => {
      const { top } = visual.getBoundingClientRect();
      const start = window.innerHeight * 0.94;
      const end = window.innerHeight * 0.2;
      const nextProgress = clamp((start - top) / (start - end));

      setProgress((currentProgress) =>
        Math.abs(currentProgress - nextProgress) > 0.003
          ? nextProgress
          : currentProgress,
      );
    };

    const scheduleUpdate = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateProgress();
      });
    };

    updateProgress();
    setIsScrollLinked(true);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  const itemProgress = [
    clamp((progress - 0.02) / 0.3),
    clamp((progress - 0.24) / 0.3),
    clamp((progress - 0.46) / 0.3),
  ];
  const motionStyle = (
    isScrollLinked
      ? {
          '--cotali-review-client-progress': itemProgress[0],
          '--cotali-review-service-progress': itemProgress[1],
          '--cotali-review-pending-progress': itemProgress[2],
        }
      : undefined
  ) as CSSProperties | undefined;

  return (
    <div
      ref={visualRef}
      style={motionStyle}
      className={`cotali-review-scene relative mx-auto w-full max-w-[440px] rotate-[3deg] max-tablet:mt-[20px] max-phone:mt-0 ${isScrollLinked ? 'cotali-review-scene--scroll-linked' : ''}`}
    >
      <ReviewPreview />
    </div>
  );
}
