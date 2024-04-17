import Reader from '../reader'

export type FontHead = {
  // ...ignored
  version: string,
  revision: string,
  flags: number,
  unitsPerEm: number,
  indexToLocFormat: boolean,
}

export default function readHeadTable(data: Readonly<DataView>, offset: number): FontHead {
  const reader = new Reader(new DataView(data.buffer, offset))

  const majorVersion = reader.getInt16()
  const minorVersion = reader.getInt16()
  if (majorVersion != 1 || minorVersion != 0) {
    console.error('TTF version is not 1.0: ' + majorVersion + '.' + minorVersion)
  }
  const majorRevision = reader.getInt16()
  const minorRevision = reader.getInt16()
  reader.skipSlice(4) // Skip checksum adjustment
  const magicNumber = reader.getUint32()
  if (magicNumber !== 0x5F0F3CF5) {
    console.error('TTF Magic Number is incorrect: 0x' + magicNumber.toString(16).toUpperCase())
  }
  const flags = reader.getUint16()
  const unitsPerEm = reader.getUint16()
  reader.skipSlice(8) // Skip
  reader.skipSlice(8) // Skip
  reader.skipSlice(2) // Skip
  reader.skipSlice(2) // Skip
  reader.skipSlice(2) // Skip
  reader.skipSlice(2) // Skip
  reader.skipSlice(2) // Skip
  reader.skipSlice(2) // Skip
  reader.skipSlice(2) // Skip
  const indexToLocFormat = reader.getInt16() === 0

  return {
    version: majorVersion + '.' + minorVersion,
    revision: majorRevision + '.' + minorRevision,
    flags,
    unitsPerEm,
    indexToLocFormat,
  }
}