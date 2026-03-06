import type { FieldDefinition, FieldExport, SnapMode } from "../types";

export const PAGE_W = 595.28;
export const PAGE_H = 841.89;

function round(value: number, decimals = 2) {
  return Number(value.toFixed(decimals));
}

export function pxToPtX(xPx: number, imgW: number) {
  return (xPx / imgW) * PAGE_W;
}

export function pxToPtY(yPx: number, imgH: number) {
  return (yPx / imgH) * PAGE_H;
}

export function ptToPxX(xPt: number, imgW: number) {
  return (xPt / PAGE_W) * imgW;
}

export function ptToPxY(yPt: number, imgH: number) {
  return (yPt / PAGE_H) * imgH;
}

export function snapPt(value: number, mode: SnapMode) {
  if (mode === "free") {
    return value;
  }

  const step = mode === "1.0" ? 1 : 0.5;
  return Math.round(value / step) * step;
}

export function snapPxX(valuePx: number, imgW: number, mode: SnapMode) {
  return ptToPxX(snapPt(pxToPtX(valuePx, imgW), mode), imgW);
}

export function snapPxY(valuePx: number, imgH: number, mode: SnapMode) {
  return ptToPxY(snapPt(pxToPtY(valuePx, imgH), mode), imgH);
}

export function fieldPxToPt(field: FieldDefinition, imgW: number, imgH: number): FieldExport {
  return {
    name: field.name,
    x: round(pxToPtX(field.xPx, imgW)),
    y: round(pxToPtY(field.yPx, imgH)),
    width: round(pxToPtX(field.widthPx, imgW)),
    height: round(pxToPtY(field.heightPx, imgH)),
    fontSize: field.fontSize,
    align: field.align,
    lineClamp: field.lineClamp,
  };
}

export function fieldMetricsPt(field: FieldDefinition, imgW: number, imgH: number) {
  return {
    x: round(pxToPtX(field.xPx, imgW)),
    y: round(pxToPtY(field.yPx, imgH)),
    width: round(pxToPtX(field.widthPx, imgW)),
    height: round(pxToPtY(field.heightPx, imgH)),
  };
}
