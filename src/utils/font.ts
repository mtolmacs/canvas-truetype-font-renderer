import Reader from "./reader"

type FontHeader = {
  scalerType: number,
  numTables: number,
  searchRange: number,
  entrySelector: number,
  rangeShift: number,
}

type FontDirectory = {
  [name: string]: {
    checksum: number,
    offset: number,
    length: number,
  }
}

type Point = {
  x: number,
  y: number,
}

type Glyph = {
  min: Point,
  max: Point,
  coords: Point[],
  contourEndIndices: number[],
}

export default class Font {
  private header: FontHeader
  private directory: FontDirectory
  private glyphs?: Glyph[]

  constructor(private buffer: Readonly<ArrayBuffer>) {
    const reader = new Reader(buffer)
    this.header = Font.loadHeader(reader)
    this.directory = Font.loadDirectory(reader, this.header.numTables)
  }

  private static loadHeader(reader: Reader) {
    const scalerType = reader.getUint32()
    const numTables = reader.getUint16()
    const searchRange = reader.getUint16()
    const entrySelector = reader.getUint16()
    const rangeShift = reader.getUint16()

    return {
      scalerType,
      numTables,
      searchRange,
      entrySelector,
      rangeShift,
    }
  }

  private static loadDirectory(reader: Reader, numTables: number) {
    const directory: FontDirectory = {}
    for (let i = 0; i < numTables; i++) {
      const name = reader.getUTF8(4)
      const checksum = reader.getUint32()
      const offset = reader.getUint32()
      const length = reader.getUint32()

      directory[name] = {
        checksum, offset, length
      }
    }

    return directory
  }

  private static flagBitIsSet(flag: number, bitIdx: number) {
    return ((flag >> bitIdx) & 1) === 1
  }

  getGlyphs(): (Glyph | undefined)[] {
    if (this.glyphs) {
      return this.glyphs
    }

    const offset = this.directory['glyf'].offset
    const reader = new Reader(this.buffer, offset)

    return [Font.readGlyph(reader)]
  }

  private static readGlyph(reader: Reader): Glyph | undefined {
    const numContours = reader.getInt16()

    const xMin = reader.getInt16()
    const yMin = reader.getInt16()
    const xMax = reader.getInt16()
    const yMax = reader.getInt16()

    if (numContours < 0) {
      console.error('Compound glyphs are not yet supported')
      return
    }

    const contourEndIndices = [...Array(numContours).keys()]
      .map(() => reader.getUint16())

    // Skip instruction length and instructions fields
    reader.skipSlice(reader.getUint16())

    const flags = Font.readFlags(reader, contourEndIndices[contourEndIndices.length - 1] + 1)
    const xCoords = Font.readCoordinates(reader, flags, 1, 4)
    const yCoords = Font.readCoordinates(reader, flags, 2, 5)
    const coords = xCoords.map((x, idx) => ({ x, y: yCoords[idx] }))

    return {
      min: { x: xMin, y: yMin },
      max: { x: xMax, y: yMax },
      coords,
      contourEndIndices,
    }
  }

  private static readCoordinates(reader: Reader, flags: number[], offsetSizeFlagBit: number, offsetSignOrSkipBit: number): number[] {
    const coordinates: number[] = []
    let coord = 0
    for (let i = 0; i < flags.length; i++) {
      const flag = flags[i]
      //const onCurve = Font.flagBitIsSet(flag, 0)
      if (Font.flagBitIsSet(flag, offsetSizeFlagBit)) {
        const offset = reader.getUint8()
        const sign = Font.flagBitIsSet(flag, offsetSignOrSkipBit) ? 1 : -1
        coord += offset * sign
      } else if (!Font.flagBitIsSet(flag, offsetSignOrSkipBit)) {
        coord += reader.getInt16()
      }
      coordinates.push(coord)
    }

    return coordinates
  }

  private static readFlags(reader: Reader, numPoints: number) {
    const flags = []
    for (let i = 0; i < numPoints; i++) {
      const flag = reader.getUint8()
      flags.push(flag)
      if (Font.flagBitIsSet(flag, 3)) {
        for (let j = 0; j < reader.getUint8(); j++) {
          flags.push(flag)
        }
      }
    }

    return flags
  }
}