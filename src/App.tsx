import React, { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import ErrorPage from "./Error"
import Font, { Glyph } from "./utils/font"
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

function scale(val: number): number {
  const POS = 30
  const SCALE = 0.25
  return POS + val * SCALE
}

function drawBoundingBox(ctx: CanvasRenderingContext2D, glyph: Glyph) {
  ctx.fillStyle = '#444'
  ctx.fillRect(
    scale(glyph.min.x),
    scale(glyph.min.y),
    scale(glyph.max.x),
    scale(glyph.max.y),
  )
}

function drawPoints(ctx: CanvasRenderingContext2D, glyph: Glyph) {
  ctx.strokeStyle = 'red'
  glyph.coords.forEach(point => {
    ctx.beginPath()
    ctx.arc(
      scale(point.x),
      scale(glyph.max.y - point.y), // X is at the bottom for TTF
      3,
      0,
      2 * Math.PI,
      false
    )
    ctx.stroke()
  });
}

function drawContours(ctx: CanvasRenderingContext2D, glyph: Glyph) {
  let startIdx = 0
  glyph.contourEndIndices.forEach(endIdx => {
    ctx.strokeStyle = getNextColor()
    ctx.beginPath()
    ctx.moveTo(
      scale(glyph.coords[startIdx].x),
      scale(glyph.max.y - glyph.coords[startIdx].y),
    )
    for (let i = startIdx + 1; i <= endIdx; i++) {
      ctx.lineTo(
        scale(glyph.coords[i].x),
        scale(glyph.max.y - glyph.coords[i].y),
      )
    }
    ctx.lineTo(
      scale(glyph.coords[startIdx].x),
      scale(glyph.max.y - glyph.coords[startIdx].y),
    )
    startIdx = endIdx + 1
    ctx.stroke()
  })
}

function Page() {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const [font, setFont] = React.useState<Font | Error | undefined>()
  const [shouldDrawPoints, setShouldDrawPoints] = React.useState(true)
  const [shouldDrawContours, setShouldDrawContours] = React.useState(true)

  React.useEffect(() => {
    const promise = loadFont().then(buf => buf && new Font(buf))
    const suspense = promiseToSuspense(promise)
    setFont(suspense)
  }, [])

  React.useEffect(() => {
    if (canvas.current && font instanceof Font) {
      const ctx = canvas.current.getContext("2d")
      if (!ctx) {
        throw new Error('2D context for canvas is not supported')
      }

      const glyphs = font.getGlyphs()

      ctx.canvas.width = window.innerWidth
      ctx.canvas.height = window.innerWidth

      ctx.reset()
      glyphs.forEach(glyph => {
        if (!glyph) {
          return
        }

        drawBoundingBox(ctx, glyph)
        if (shouldDrawPoints) {
          drawPoints(ctx, glyph)
        }
        if (shouldDrawContours) {
          drawContours(ctx, glyph)
        }
      })
    }
  }, [font, shouldDrawContours, shouldDrawPoints])

  return (
    <>
      <UploadFont setFont={setFont} />
      <div style={{ margin: '10px' }}>
        <button onClick={() => setShouldDrawPoints(!shouldDrawPoints)}>Draw Points</button>
        <button onClick={() => setShouldDrawContours(!shouldDrawContours)}>Draw Contours</button>
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
