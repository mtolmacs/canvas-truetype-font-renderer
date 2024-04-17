import React, { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import ErrorPage from "./Error"
import Font from "./utils/ttf/font"
import { loadFont } from "./utils/db"
import UploadFont from "./UploadFont"
import { promiseToSuspense } from "./utils/promise"
import FontRenderer from "./utils/render"

function Page() {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const [font, setFont] = React.useState<Font | Error | undefined>()
  const [renderer, setRenderer] = React.useState<FontRenderer | undefined>()
  const [shouldDrawBoundingBoxes, setShouldDrawBoundingBoxes] = React.useState(false)
  const [shouldDrawPoints, setShouldDrawPoints] = React.useState(false)
  const [shouldDrawContours, setShouldDrawContours] = React.useState(true)
  const [shouldRerender, setShouldRerender] = React.useState([window.innerWidth, window.innerHeight])
  const [size, setSize] = React.useState(128)

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
    return () => window.removeEventListener('resize', rerender)
  }, [])

  React.useLayoutEffect(() => {
    function wheeling(event: WheelEvent) {
      setSize(Math.max(0, size + event.deltaY / Math.abs(event.deltaY)))
    }

    const target = canvas.current

    if (target) {
      target.addEventListener('wheel', wheeling)
    }

    return () => {
      if (target) {
        target.removeEventListener('wheel', wheeling)
      }
    }
  }, [canvas, size])

  React.useLayoutEffect(() => {
    if (canvas.current) {
      const ctx = canvas.current.getContext("2d")
      if (!ctx) {
        throw new Error('2D context for canvas is not supported')
      }
      ctx.canvas.width = window.innerWidth
      ctx.canvas.height = window.innerWidth
      setRenderer(new FontRenderer(ctx, size))
    }
  }, [canvas, size])

  React.useLayoutEffect(() => {
    if (renderer && font instanceof Font) {
      const glyphs = font.getGlyphs()

      renderer.renderGlyphs(
        glyphs,
        shouldDrawPoints,
        shouldDrawContours,
        shouldDrawBoundingBoxes,
      )
    }
  }, [
    font,
    renderer,
    shouldDrawContours,
    shouldDrawPoints,
    shouldDrawBoundingBoxes,
    shouldRerender,
    size,
  ])

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
