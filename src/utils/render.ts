import { quadraticBezier } from "./bezier"
import { getNextColor } from "./colors"
import { Glyph, Point } from "./ttf/font"

export default class FontRenderer {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private size: number = 128) {

  }

  private scale(val: number): number {
    return val * this.size
  }

  private drawBoundingBox(glyph: Glyph, base: Point) {
    this.ctx.fillStyle = getNextColor()
    this.ctx.strokeStyle = 'white'

    this.ctx.beginPath()
    this.ctx.rect(
      this.scale(base.x + glyph.min.x),
      this.scale(base.y), // Bounding box is off if glyph.min.y is added???
      this.scale(glyph.max.x - glyph.min.x),
      this.scale(glyph.max.y - glyph.min.y),
    )
    this.ctx.stroke()
  }

  private drawPoints(glyph: Glyph, base: Point) {
    glyph.coords.forEach((point, idx) => {
      this.ctx.beginPath()
      this.ctx.strokeStyle = glyph.onCurve[idx] ? 'blue' : 'red'
      this.ctx.arc(
        this.scale(base.x + point.x),
        this.scale(base.y + (glyph.max.y - point.y)), // X is at the bottom for TTF so we need to flip on Y
        3,
        0,
        2 * Math.PI,
        false
      )
      this.ctx.stroke()
    });
  }

  private drawContours(glyph: Glyph, base: Point) {
    let startIdx = 0
    glyph.contourEndIndices.forEach((endIdx) => {
      this.ctx.strokeStyle = getNextColor()
      this.ctx.beginPath()
      for (let i = startIdx; i < endIdx - 1; i += 2) {
        const start = {
          x: this.scale(base.x + glyph.coords[i].x),
          y: this.scale(base.y + (glyph.max.y - glyph.coords[i].y)),
        }
        const ctrl = {
          x: this.scale(base.x + glyph.coords[i + 1].x),
          y: this.scale(base.y + (glyph.max.y - glyph.coords[i + 1].y)),
        }
        const end = {
          x: this.scale(base.x + glyph.coords[i + 2].x),
          y: this.scale(base.y + (glyph.max.y - glyph.coords[i + 2].y)),
        }
        quadraticBezier(this.ctx, start, ctrl, end)
      }
      // Close the path
      if (glyph.onCurve[endIdx]) {
        this.ctx.lineTo(
          this.scale(base.x + glyph.coords[startIdx].x),
          this.scale(base.y + (glyph.max.y - glyph.coords[startIdx].y)),
        )
      } else {
        const start = {
          x: this.scale(base.x + glyph.coords[endIdx - 1].x),
          y: this.scale(base.y + (glyph.max.y - glyph.coords[endIdx - 1].y)),
        }
        const ctrl = {
          x: this.scale(base.x + glyph.coords[endIdx].x),
          y: this.scale(base.y + (glyph.max.y - glyph.coords[endIdx].y)),
        }
        const end = {
          x: this.scale(base.x + glyph.coords[startIdx].x),
          y: this.scale(base.y + (glyph.max.y - glyph.coords[startIdx].y)),
        }
        quadraticBezier(this.ctx, start, ctrl, end)
      }
      startIdx = endIdx + 1
      this.ctx.stroke()
    })
  }

  renderGlyphs(
    glyphs: (Glyph | undefined)[],
    shouldDrawPoints: boolean,
    shouldDrawContours: boolean,
    shouldDrawBoundingBoxes: boolean,
  ) {
    const lineHeightEm = 0.3
    let posX = 0
    let posY = 0.2

    this.ctx.reset()
    glyphs.forEach((glyph) => {
      if (!glyph) {
        // If the glyph cannot be rendered, replace it with the NOTDEF glyph
        glyph = glyphs[0]!
      }

      if (shouldDrawBoundingBoxes) {
        this.drawBoundingBox(glyph, { x: posX, y: posY })
      }
      if (shouldDrawPoints) {
        this.drawPoints(glyph, { x: posX, y: posY })
      }
      if (shouldDrawContours) {
        this.drawContours(glyph, { x: posX, y: posY })
      }

      posX += glyph.max.x
      if (this.scale(posX) > window.innerWidth - 70) {
        posX = 0
        posY += (glyph.max.y - glyph.min.y) + lineHeightEm
      }
    })
  }
}
