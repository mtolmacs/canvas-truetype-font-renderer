import React, { Suspense } from "react"
import { db, loadFont, storeFont } from "./db"
import UploadFont from "./UploadFont"

function Page() {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  // @ts-ignore
  const [font, setFont] = React.useState(loadFont())
  const setFontCallback = React.useCallback((buf: ArrayBuffer) => {
    storeFont(buf)
    setFont(buf)
  }, [])

  React.useEffect(() => {
    if (canvas.current) {
      const ctx = canvas.current.getContext("2d")
    }
  })

  return (
    <>
      <UploadFont fontCallback={setFontCallback} />
      <canvas ref={canvas}></canvas>
    </>
  )
}

function App() {


  return (
    <Suspense fallback={<>Loading...</>}>
      <Page />
    </Suspense >
  )
}

export default App
