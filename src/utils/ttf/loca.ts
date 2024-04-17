import Reader from '../reader'

export default function readLocationsTable(
  data: Readonly<DataView>,
  locaOffet: number,
  glyfOffset: number,
  numberOfGlyphs: number,
  indexToLocFormat: boolean,
): number[] {
  const locationByteSize = indexToLocFormat ? 2 : 4

  return [...Array(numberOfGlyphs).keys()]
    .map(idx => {
      const reader = new Reader(new DataView(data.buffer, locaOffet + idx * locationByteSize))
      const offset = indexToLocFormat
        ? reader.getUint16() * 2
        : reader.getUint32()

      return glyfOffset + offset
    })
}