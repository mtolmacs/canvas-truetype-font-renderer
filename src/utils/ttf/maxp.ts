import Reader from '../reader'

export type FontMaxp = {
  version: string,
  numberOfGlyphs: number,
  //...ignored
}

export default function readMaxpTable(data: Readonly<DataView>, offset: number): FontMaxp {
  const reader = new Reader(new DataView(data.buffer, offset))

  const majorVersion = reader.getInt16()
  const minorVersion = reader.getInt16()
  const version = majorVersion + '.' + minorVersion
  const numberOfGlyphs = reader.getUint16()

  return {
    version,
    numberOfGlyphs,
  }
}