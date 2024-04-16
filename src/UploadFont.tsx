import { storeFont } from "./utils/db"
import Font from "./utils/font"

export default function UploadFont({
  setFont
}: {
  setFont: (font: Font) => void
}) {
  function fontChanged(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files![0]
    const reader = new FileReader()

    reader.onload = (loaded) => {
      const buf = loaded.target?.result as ArrayBuffer

      storeFont(loaded.target?.result as ArrayBuffer)
      setFont(new Font(buf))
      event.target.value = ''
    }

    reader.readAsArrayBuffer(file)
  }

  return (
    <>
      <label>
        Font: <input name="font-upload" type="file" onChange={fontChanged} />
      </label>

    </>
  )
}