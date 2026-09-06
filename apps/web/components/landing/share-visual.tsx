'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { WhatsappPreview } from './product-visuals';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function ShareVisual() {
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

      setProgress((currentProgress) => (Math.abs(currentProgress - nextProgress) > 0.003 ? nextProgress : currentProgress));
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

  const messageProgress = [
    clamp((progress - 0.02) / 0.3),
    clamp((progress - 0.26) / 0.3),
    clamp((progress - 0.5) / 0.3),
  ];
  const motionStyle = (isScrollLinked
    ? {
        '--cotali-share-request-progress': messageProgress[0],
        '--cotali-share-response-progress': messageProgress[1],
        '--cotali-share-pdf-progress': messageProgress[2],
      }
    : undefined) as CSSProperties | undefined;

  return (
    <div
      ref={visualRef}
      style={motionStyle}
      className={`cotali-share-scene order-1 mx-auto w-full max-w-[420px] rotate-[-3deg] max-tablet:order-2 max-tablet:mt-[20px] max-phone:mt-0 ${isScrollLinked ? 'cotali-share-scene--scroll-linked' : ''}`}
    >
      <WhatsappPreview />
    </div>
  );
}
