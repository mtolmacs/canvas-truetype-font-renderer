import React, { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import ErrorPage from "./Error"
import Font from "./utils/font"
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

function Page() {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const [font, setFont] = React.useState<Font | Error | undefined>()

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

      const SCALE = 0.5
      const POS = 30
      ctx.canvas.width = window.innerWidth
      ctx.canvas.height = window.innerWidth

      ctx.reset()
      ctx.strokeStyle = 'red'
      ctx.fillStyle = '#444'
      glyphs.forEach(glyph => {
        if (!glyph) {
          return
        }

        // Fill bounding box background
        // ctx.fillRect(
        //   POS + glyph.min.x * SCALE,
        //   POS + glyph.min.y * SCALE,
        //   POS + glyph.max.x * SCALE,
        //   POS + glyph.max.y * SCALE
        // )

        // Draw the coords
        // glyph.coords.forEach(point => {
        //   ctx.beginPath()
        //   ctx.arc(
        //     POS + point.x * SCALE,
        //     POS + point.y * SCALE,
        //     3,
        //     0,
        //     2 * Math.PI,
        //     false
        //   )
        //   ctx.stroke()
        // });

        // Draw contours
        let idx = 0
        glyph.contourEndIndices.forEach(endIdx => {
          ctx.strokeStyle = getNextColor()
          ctx.beginPath()
          ctx.moveTo(
            POS + glyph.coords[idx].x * SCALE,
            POS + glyph.coords[idx].y * SCALE
          )
          for (let i = idx + 1; i <= endIdx; i++) {
            ctx.lineTo(
              POS + glyph.coords[i].x * SCALE,
              POS + glyph.coords[i].y * SCALE,
            )
          }
          ctx.lineTo(
            POS + glyph.coords[idx].x * SCALE,
            POS + glyph.coords[idx].y * SCALE,
          )
          idx = endIdx + 1
          ctx.stroke()

        })
      })
    }
  }, [font])

  return (
    <>
      <UploadFont setFont={setFont} />
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
