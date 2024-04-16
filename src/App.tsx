import React, { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import Error from "./Error"
import Font from "./font"
import { loadFont } from "./db"
import UploadFont from "./UploadFont"

function promiseToSuspense<T>(promise: Promise<T>): () => T | Error | undefined {
  let status = 'pending'
  let result: T | Error

  let loading = promise.then(res => {
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
      // const ctx = canvas.current.getContext("2d")
      font.getGlyphs()
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
    <ErrorBoundary FallbackComponent={Error}>
      <Suspense fallback={<>Loading...</>}>
        <Page />
      </Suspense >
    </ErrorBoundary>
  )
}
