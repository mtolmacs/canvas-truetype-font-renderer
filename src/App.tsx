import React, { Suspense } from "react"
import { loadFont, storeFont } from "./db"
import { ErrorBoundary } from "react-error-boundary"
import Error from "./Error"
import UploadFont from "./UploadFont"

function getNumberOfTables(view: DataView) {
  return view.getUint16(4) // Skip scaler table in header
}

function getFontDirectory(buf: ArrayBuffer) {
  const DIRECTORY_OFFSET = 12
  const decoder = new TextDecoder()
  const numTables = getNumberOfTables(new DataView(buf))

  return [...Array(numTables).keys()]
    // Offset step in directory
    .map(num => DIRECTORY_OFFSET + num * 16)
    // Create slice of directory item
    .map(offset => buf.slice(offset, offset + 16))
    // Read the data entries from the directory
    .map(slice => {
      const name = decoder.decode(slice.slice(0, 4))
      const view = new DataView(slice)

      return {
        name,
        checksum: view.getUint32(4),
        offset: view.getUint32(8),
        length: view.getUint32(12),
      }
    })
}

function Page() {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const [font, setFont] = React.useState(loadFont())
  const setFontCallback = React.useCallback((buf: ArrayBuffer) => {
    storeFont(buf)
    setFont(buf)
  }, [])

  React.useEffect(() => {
    if (canvas.current && font) {
      const ctx = canvas.current.getContext("2d")

      console.log(getFontDirectory(font))
    }
  }, [font])

  return (
    <>
      <UploadFont fontCallback={setFontCallback} />
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
