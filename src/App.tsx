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
  const [dragging, setDragging] = React.useState<[number, number]>()
  const [pan, setPan] = React.useState([0, 0])

  React.useEffect(() => {
    const promise = loadFont().then(buf => buf && new Font(buf))
    const suspense = promiseToSuspense(promise)
    setFont(suspense)
  }, [])

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
        { x: pan[0] / 100, y: pan[1] / 100 },
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
    dragging,
    pan
  ])

  React.useLayoutEffect(() => {
    function rerender() {
      setShouldRerender([window.innerWidth, window.innerHeight])
    }
    window.addEventListener('resize', rerender)
    return () => window.removeEventListener('resize', rerender)
  }, [])

  React.useLayoutEffect(() => {
    function wheeling(event: WheelEvent) {
      setSize(Math.max(0, size - event.deltaY / Math.abs(event.deltaY)))
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
    const mouseDown = (event: MouseEvent) => setDragging([event.clientX, event.clientY])
    const mouseUp = () => setDragging(undefined)
    const mouseMove = (event: MouseEvent) => {
      if (dragging) {
        const [x, y] = dragging
        const [panX, panY] = pan
        setPan([panX + x - event.clientX, panY + y - event.clientY])
      }
    }
    const target = canvas.current
    if (target) {
      target.addEventListener('mousedown', mouseDown)
      target.addEventListener('mouseup', mouseUp)
      target.addEventListener('mousemove', mouseMove)
    }

    return () => {
      if (target) {
        target.removeEventListener('mousedown', mouseDown)
        target.removeEventListener('mouseup', mouseUp)
        target.removeEventListener('mousemove', mouseMove)
      }
    }
  }, [dragging])

  return (
    <>
      <h3>CanvasText - Render TTF fonts in a HTML canvas</h3>
      <p>
        Upload any TTF font (like downloading from
        <a href="https://fonts.google.com/">Google Fonts</a>). You can scroll with
        the mouse wheel to scale the font size and drag around with the canvas with
        the mouse.
      </p>
      <UploadFont setFont={setFont} />
      <div>
        <button onClick={() => setShouldDrawPoints(!shouldDrawPoints)}>
          Draw Points
        </button>
        <button onClick={() => setShouldDrawContours(!shouldDrawContours)}>
          Draw Contours
        </button>
        <button onClick={() => setShouldDrawBoundingBoxes(!shouldDrawBoundingBoxes)}>
          Draw Bounding Boxes
        </button>
      </div>
      <canvas ref={canvas} style={{ cursor: dragging ? 'pointer' : 'auto' }}></canvas>
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
