export default class Reader {
  private view: DataView
  private decoder: TextDecoder

  constructor(private buffer: Readonly<ArrayBuffer>, private offset: number = 0) {
    this.view = new DataView(buffer)
    this.decoder = new TextDecoder()
  }

  getUint8() {
    const data = this.view.getUint8(this.offset)
    this.offset += 1
    return data
  }

  getUint16() {
    const data = this.view.getUint16(this.offset)
    this.offset += 2
    return data
  }

  getUint32() {
    const data = this.view.getUint32(this.offset)
    this.offset += 4
    return data
  }

  getInt8() {
    const data = this.view.getInt8(this.offset)
    this.offset += 1
    return data
  }

  getInt16() {
    const data = this.view.getInt16(this.offset)
    this.offset += 2
    return data
  }

  getInt32() {
    const data = this.view.getInt32(this.offset)
    this.offset += 4
    return data
  }

  getSlice(spanSize: number) {
    const span = this.buffer.slice(this.offset, this.offset + spanSize)
    this.offset += spanSize
    return span
  }

  skipSlice(spanSize: number) {
    this.offset += spanSize
  }

  getUTF8(spanSize: number) {
    const slice = this.getSlice(spanSize)
    return this.decoder.decode(slice)
  }
}