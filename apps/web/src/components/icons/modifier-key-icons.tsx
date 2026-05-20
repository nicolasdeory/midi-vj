import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

/** Filled shift glyph — balanced visual weight with letter keycaps. */
export function ShiftKeyIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="currentColor"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path d="M6 1.5 10.75 6.25H8.25V10.25H3.75V6.25H1.25L6 1.5Z" />
    </svg>
  );
}
