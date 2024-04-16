import React, { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import ErrorPage from "./Error"
import Font from "./utils/font"
import { loadFont } from "./utils/db"
import UploadFont from "./UploadFont"

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

      const SCALE = 0.5
      const POS = 30
      ctx.canvas.width = window.innerWidth
      ctx.canvas.height = window.innerWidth

      const glyphs = font.getGlyphs()
      ctx.clearRect(0, 0, 2000, 3000)
      ctx.strokeStyle = 'red'
      glyphs.forEach(glyph => {
        glyph?.coords.forEach(point => {
          ctx.beginPath()
          ctx.arc(POS + point.x * SCALE, POS + point.y * SCALE, 3, 0, 2 * Math.PI, false)
          ctx.stroke()
        });
      });
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
