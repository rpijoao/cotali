'use client';

import { useEffect } from 'react';

export function RevealObserver() {
  useEffect(() => {
    const revealElements = [...document.querySelectorAll<HTMLElement>('[data-cotali-reveal]')];

    if (revealElements.length === 0) {
      return;
    }

    revealElements.forEach((element) => {
      const delay = element.dataset.cotaliRevealDelay;

      if (delay) {
        element.style.setProperty('--cotali-reveal-delay', `${delay}ms`);
      }
    });

    document.body.classList.add('cotali-reveal-ready');

    if (!('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('cotali-reveal-visible'));
      return () => document.body.classList.remove('cotali-reveal-ready');
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('cotali-reveal-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      document.body.classList.remove('cotali-reveal-ready');
    };
  }, []);

  return null;
}
