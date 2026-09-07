'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { QuotePreview, VoiceCapture } from './product-visuals';

export function FlowVisual() {
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
      const end = window.innerHeight * 0.18;
      const nextProgress = Math.min(
        1,
        Math.max(0, (start - top) / (start - end)),
      );

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

  const quoteProgress = Math.min(1, Math.max(0, (progress - 0.24) / 0.76));
  const voiceOpacityProgress = Math.min(1, progress * 1.7);
  const quoteOpacityProgress = Math.min(1, quoteProgress * 1.7);
  const motionStyle = (
    isScrollLinked
      ? {
          '--cotali-flow-voice-progress': progress,
          '--cotali-flow-quote-progress': quoteProgress,
          '--cotali-flow-voice-opacity-progress': voiceOpacityProgress,
          '--cotali-flow-quote-opacity-progress': quoteOpacityProgress,
        }
      : undefined
  ) as CSSProperties | undefined;

  return (
    <div
      ref={visualRef}
      style={motionStyle}
      className={`cotali-flow-scene grid grid-cols-[minmax(0,0.84fr)_minmax(0,1fr)] items-center gap-0 max-tablet:mx-auto max-tablet:w-full max-tablet:max-w-[700px] max-phone:grid-cols-1 max-phone:gap-0 ${isScrollLinked ? 'cotali-flow-scene--scroll-linked' : ''}`}
    >
      <div className="cotali-flow-stage cotali-flow-stage--voice relative z-10 rotate-[-4deg] max-phone:mx-3 max-phone:rotate-[-2deg]">
        <VoiceCapture animated />
      </div>
      <div className="cotali-flow-stage cotali-flow-stage--quote relative z-20 -ml-10 rotate-[4deg] max-phone:ml-7 max-phone:mr-1 max-phone:mt-[-18px] max-phone:rotate-[2deg]">
        <QuotePreview />
      </div>
    </div>
  );
}
