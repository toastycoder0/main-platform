export interface ContentPoint {
  x: number;
  y: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface CenteredTransform {
  positionX: number;
  positionY: number;
  scale: number;
}

// Positions the unscaled content point at the center of the viewport for the
// requested scale. The map uses this instead of `zoomToElement`, whose
// centering drifts when the current scale sits on the max bound.
export function centeredTransform(
  contentPoint: ContentPoint,
  viewport: ViewportSize,
  scale: number,
): CenteredTransform {
  return {
    positionX: viewport.width / 2 - contentPoint.x * scale,
    positionY: viewport.height / 2 - contentPoint.y * scale,
    scale,
  };
}
