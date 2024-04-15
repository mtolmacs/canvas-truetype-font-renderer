import React, { Suspense } from "react"
import Font from "./font"
import { loadFont, storeFont } from "./db"
import UploadFont from "./UploadFont"

function Page() {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const [buffer, setBuffer] = React.useState(loadFont())
  const setFontCallback = React.useCallback((buf: Readonly<ArrayBuffer>) => {
    storeFont(buf)
    setBuffer(buf)
  }, [])

  React.useEffect(() => {
    if (canvas.current && buffer) {
      // const ctx = canvas.current.getContext("2d")
      const font = new Font(buffer)

      font.getGlyphs()
    }
  }, [buffer])

  return (
    <>
      <UploadFont fontCallback={setFontCallback} />
      <canvas ref={canvas}></canvas>
    </>
  )
}

export default function App() {
  return (
    <Suspense fallback={<>Loading...</>}>
      <Page />
    </Suspense >
  )
}
