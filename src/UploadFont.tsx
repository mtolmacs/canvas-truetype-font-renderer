export default function UploadFont({
  fontCallback
}: {
  fontCallback: (buf: ArrayBuffer) => void
}) {
  function fontChanged(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files![0]
    const reader = new FileReader()

    reader.onload = (loaded) => {
      fontCallback(loaded.target?.result as ArrayBuffer)
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