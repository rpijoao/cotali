type IconProps = {
  className?: string;
};

export function ArrowUpRight({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`size-[18px] fill-none stroke-current stroke-[1.5] stroke-linecap-round stroke-linejoin-round transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1 ${className}`}
      viewBox="0 0 16 16"
    >
      <path d="M3 13 13 3M5 3h8v8" />
    </svg>
  );
}

export function AudioIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-[18px] fill-current stroke-none"
      viewBox="0 0 20 20"
    >
      <rect height="8" rx="2" width="4" x="2" y="6" />
      <rect height="14" rx="2" width="4" x="8" y="3" />
      <rect height="10" rx="2" width="4" x="14" y="5" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-[15px] fill-none stroke-current stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
      viewBox="0 0 16 16"
    >
      <path d="m3 8 3 3 7-7" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-[9px] font-cotali-display text-[22px] font-semibold tracking-[-0.07em] leading-none">
      <span className="flex h-5 w-[22px] items-end gap-0.5" aria-hidden="true">
        <i className="block h-[9px] w-[5px] origin-bottom skew-x-[-18deg] rounded-t-full bg-current" />
        <i className="block h-[15px] w-[5px] origin-bottom skew-x-[-18deg] rounded-t-full bg-current" />
        <i className="block h-5 w-[5px] origin-bottom skew-x-[-18deg] rounded-t-full bg-current" />
      </span>
      <span>
        cotali<span aria-hidden="true">.</span>
      </span>
    </span>
  );
}

export function AudioBars({ animated = false }: { animated?: boolean }) {
  return (
    <span className={`flex h-7 items-center gap-[3px] ${animated ? 'cotali-flow-wave' : ''}`} aria-hidden="true">
      <i className="block h-[10px] w-0.5 rounded-full bg-cotali-white/75" />
      <i className="block h-[17px] w-0.5 rounded-full bg-cotali-white/75" />
      <i className="block h-6 w-0.5 rounded-full bg-cotali-white/75" />
      <i className="block h-[14px] w-0.5 rounded-full bg-cotali-white/75" />
      <i className="block h-5 w-0.5 rounded-full bg-cotali-white/75" />
      <i className="block h-[10px] w-0.5 rounded-full bg-cotali-white/75" />
      <i className="block h-6 w-0.5 rounded-full bg-cotali-white/75" />
      <i className="block h-[14px] w-0.5 rounded-full bg-cotali-white/75" />
      <i className="block h-6 w-0.5 rounded-full bg-cotali-white/75" />
      <i className="block h-[17px] w-0.5 rounded-full bg-cotali-white/75" />
      <i className="block h-[10px] w-0.5 rounded-full bg-cotali-white/75" />
    </span>
  );
}
