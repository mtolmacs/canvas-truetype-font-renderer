import React, { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import ErrorPage from "./Error"
import Font, { Glyph, Point } from "./utils/font"
import { loadFont } from "./utils/db"
import UploadFont from "./UploadFont"

const COLORS = [
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue'
]

let colorIdx = 0
function getNextColor(): string {
  return COLORS[colorIdx++ % 9]
}

function promiseToSuspense<T>(promise: Promise<T>): () => T | Error | undefined {
  let status = 'pending'
  let result: T | Error

  const loading = promise.then(res => {
    status = 'fulfilled'
    result = res
  }).catch(error => {
    status = 'rejected'
    result = error
  })

  return () => {
    if (status === 'pending') {
      throw loading
    } else if (status === 'rejected') {
      throw result
    } else if (status === 'fulfilled') {
      return result
    }
  }
}

function quadraticBezier(ctx: CanvasRenderingContext2D, start: Point, ctrl: Point, end: Point) {
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

function scale(val: number): number {
  const POS = 0
  const SCALE = 128
  return POS + val * SCALE
}

function drawBoundingBox(ctx: CanvasRenderingContext2D, glyph: Glyph, base: Point) {
  ctx.fillStyle = getNextColor()
  ctx.strokeStyle = 'white'

  ctx.beginPath()
  ctx.rect(
    scale(base.x + glyph.min.x),
    scale(base.y), // Bounding box is off if glyph.min.y is added???
    scale(glyph.max.x - glyph.min.x),
    scale(glyph.max.y - glyph.min.y),
  )
  ctx.stroke()
}

function drawPoints(ctx: CanvasRenderingContext2D, glyph: Glyph, base: Point) {
  glyph.coords.forEach((point, idx) => {
    ctx.beginPath()
    ctx.strokeStyle = glyph.onCurve[idx] ? 'blue' : 'red'
    ctx.arc(
      scale(base.x + point.x),
      scale(base.y + (glyph.max.y - point.y)), // X is at the bottom for TTF so we need to flip on Y
      3,
      0,
      2 * Math.PI,
      false
    )
    ctx.stroke()
  });
}

function drawContours(ctx: CanvasRenderingContext2D, glyph: Glyph, base: Point) {
  let startIdx = 0
  glyph.contourEndIndices.forEach((endIdx) => {
    ctx.strokeStyle = getNextColor()

    ctx.beginPath()
    ctx.arc(
      scale(base.x + glyph.coords[startIdx].x),
      scale(base.y + (glyph.max.y - glyph.coords[startIdx].y)),
      3,
      0,
      2 * Math.PI
    )
    //ctx.stroke()

    ctx.beginPath()
    ctx.arc(
      scale(base.x + glyph.coords[endIdx].x),
      scale(base.y + (glyph.max.y - glyph.coords[endIdx].y)),
      3,
      0,
      2 * Math.PI
    )
    //ctx.stroke()

    ctx.beginPath()
    for (let i = startIdx; i < endIdx - 1; i += 2) {
      const start = {
        x: scale(base.x + glyph.coords[i].x),
        y: scale(base.y + (glyph.max.y - glyph.coords[i].y)),
      }
      const ctrl = {
        x: scale(base.x + glyph.coords[i + 1].x),
        y: scale(base.y + (glyph.max.y - glyph.coords[i + 1].y)),
      }
      const end = {
        x: scale(base.x + glyph.coords[i + 2].x),
        y: scale(base.y + (glyph.max.y - glyph.coords[i + 2].y)),
      }
      quadraticBezier(ctx, start, ctrl, end)
    }
    // Close the path
    if (glyph.onCurve[endIdx]) {
      ctx.lineTo(
        scale(base.x + glyph.coords[startIdx].x),
        scale(base.y + (glyph.max.y - glyph.coords[startIdx].y)),
      )
    } else {
      const start = {
        x: scale(base.x + glyph.coords[endIdx - 1].x),
        y: scale(base.y + (glyph.max.y - glyph.coords[endIdx - 1].y)),
      }
      const ctrl = {
        x: scale(base.x + glyph.coords[endIdx].x),
        y: scale(base.y + (glyph.max.y - glyph.coords[endIdx].y)),
      }
      const end = {
        x: scale(base.x + glyph.coords[startIdx].x),
        y: scale(base.y + (glyph.max.y - glyph.coords[startIdx].y)),
      }
      quadraticBezier(ctx, start, ctrl, end)
    }
    startIdx = endIdx + 1
    ctx.stroke()
  })
}

function renderGlyphs(
  ctx: CanvasRenderingContext2D,
  glyphs: (Glyph | undefined)[],
  shouldDrawPoints: boolean,
  shouldDrawContours: boolean,
  shouldDrawBoundingBoxes: boolean,
) {
  const lineHeightEm = 0.3
  let posX = 0
  let posY = 0.2

  ctx.reset()
  glyphs.forEach((glyph) => {
    if (!glyph) {
      // If the glyph cannot be rendered, replace it with the NOTDEF glyph
      glyph = glyphs[0]!
    }

    if (shouldDrawBoundingBoxes) {
      drawBoundingBox(ctx, glyph, { x: posX, y: posY })
    }
    if (shouldDrawPoints) {
      drawPoints(ctx, glyph, { x: posX, y: posY })
    }
    if (shouldDrawContours) {
      drawContours(ctx, glyph, { x: posX, y: posY })
    }

    posX += glyph.max.x
    if (scale(posX) > window.innerWidth - 70) {
      posX = 0
      posY += (glyph.max.y - glyph.min.y) + lineHeightEm
    }
  })
}

function Page() {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const [font, setFont] = React.useState<Font | Error | undefined>()
  const [shouldDrawBoundingBoxes, setShouldDrawBoundingBoxes] = React.useState(false)
  const [shouldDrawPoints, setShouldDrawPoints] = React.useState(false)
  const [shouldDrawContours, setShouldDrawContours] = React.useState(true)
  const [shouldRerender, setShouldRerender] = React.useState([window.innerWidth, window.innerHeight])

  React.useEffect(() => {
    const promise = loadFont().then(buf => buf && new Font(buf))
    const suspense = promiseToSuspense(promise)
    setFont(suspense)
  }, [])

  React.useLayoutEffect(() => {
    function rerender() {
      setShouldRerender([window.innerWidth, window.innerHeight])
    }
    window.addEventListener('resize', rerender)
    return () => window.removeEventListener('resize', rerender);
  }, [])

  React.useLayoutEffect(() => {
    if (canvas.current && font instanceof Font) {
      const ctx = canvas.current.getContext("2d")
      if (!ctx) {
        throw new Error('2D context for canvas is not supported')
      }

      const glyphs = font.getGlyphs()

      ctx.canvas.width = window.innerWidth
      ctx.canvas.height = window.innerWidth

      renderGlyphs(ctx, glyphs, shouldDrawPoints, shouldDrawContours, shouldDrawBoundingBoxes)
    }
  }, [font, shouldDrawContours, shouldDrawPoints, shouldDrawBoundingBoxes, shouldRerender])

  return (
    <>
      <UploadFont setFont={setFont} />
      <div style={{ margin: '10px' }}>
        <button onClick={() => setShouldDrawPoints(!shouldDrawPoints)}>Draw Points</button>
        <button onClick={() => setShouldDrawContours(!shouldDrawContours)}>Draw Contours</button>
        <button onClick={() => setShouldDrawBoundingBoxes(!shouldDrawBoundingBoxes)}>Draw Bounding Boxes</button>
      </div>
      <canvas ref={canvas}></canvas>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <Suspense fallback={<>Loading...</>}>
        <Page />
      </Suspense >
    </ErrorBoundary>
  )
}
