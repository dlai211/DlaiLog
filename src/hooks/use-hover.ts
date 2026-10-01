import { useState } from 'react';

/**
 * Tracks whether the pointer is over an element, so rows, cards and buttons
 * can lift/scale/tint on hover (desktop) while staying inert on touch.
 */
export function useHover() {
  const [hovered, setHovered] = useState(false);

  return {
    hovered,
    hoverProps: {
      onPointerEnter: () => setHovered(true),
      onPointerLeave: () => setHovered(false),
    },
  } as const;
}
