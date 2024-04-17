import { Point } from "./ttf/font"

export function quadraticBezier(
  ctx: CanvasRenderingContext2D,
  start: Point,
  ctrl: Point,
  end: Point
) {
  const ctrl1 = {
    x: start.x + 2 / 3 * (ctrl.x - start.x),
    y: start.y + 2 / 3 * (ctrl.y - start.y),
  }
  const ctrl2 = {
    x: end.x + 2 / 3 * (ctrl.x - end.x),
    y: end.y + 2 / 3 * (ctrl.y - end.y),
  }

  ctx.moveTo(start.x, start.y)
  ctx.bezierCurveTo(ctrl1.x, ctrl1.y, ctrl2.x, ctrl2.y, end.x, end.y)
}