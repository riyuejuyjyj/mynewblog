import { cn } from "@/lib/utils";

type HeroWavesProps = {
  className?: string;
};

/**
 * ShokaX / Koharu 经典多层柔波浪，将二次元插画头图自然过渡到下方正文画布。
 */
export function HeroWaves({ className }: HeroWavesProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-[-1px] z-20 overflow-hidden leading-none",
        className,
      )}
    >
      <svg
        className="h-12 w-full sm:h-16 md:h-20"
        preserveAspectRatio="none"
        shapeRendering="auto"
        viewBox="0 24 150 28"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <path
            d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
            id="anime-gentle-wave"
          />
        </defs>
        <g>
          <use
            className="anime-wave-layer-1"
            fill="var(--background)"
            fillOpacity="0.42"
            href="#anime-gentle-wave"
            x="48"
            y="0"
          />
          <use
            className="anime-wave-layer-2"
            fill="var(--background)"
            fillOpacity="0.68"
            href="#anime-gentle-wave"
            x="48"
            y="3"
          />
          <use
            className="anime-wave-layer-3"
            fill="var(--background)"
            fillOpacity="1"
            href="#anime-gentle-wave"
            x="48"
            y="6"
          />
        </g>
      </svg>
    </div>
  );
}
