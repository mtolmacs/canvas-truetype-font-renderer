import Reader from "./reader"

export type FontHeader = {
  scalerType: number,
  numTables: number,
  searchRange: number,
  entrySelector: number,
  rangeShift: number,
}

export type FontDescriptor = {
  version: string,
  revision: string,
  flags: number,
  unitsPerEm: number,
  indexToLocFormat: boolean,
}

export type FontDirectory = {
  [name: string]: {
    checksum: number,
    offset: number,
    length: number,
  }
}

export type Point = {
  x: number,
  y: number,
}

export type Glyph = {
  min: Point,
  max: Point,
  onCurve: boolean[],
  coords: Point[],
  contourEndIndices: number[],
}

export default class Font {
  readonly header: FontHeader
  readonly descriptor: FontDescriptor
  readonly directory: FontDirectory
  private glyphs?: (Glyph | undefined)[]
  readonly numGlyphs: number
  readonly locations: number[] = []

  constructor(private buffer: Readonly<ArrayBuffer>) {
    const reader = new Reader(buffer)
    this.header = Font.loadHeader(reader)
    this.directory = Font.loadDirectory(reader, this.header.numTables)

    const numGlyphReader = new Reader(buffer, this.directory['maxp'].offset)
    numGlyphReader.skipSlice(4) // Skip version info
    this.numGlyphs = numGlyphReader.getUint16()

    const headReader = new Reader(this.buffer, this.directory['head'].offset)
    const majorVersion = headReader.getInt16()
    const minorVersion = headReader.getInt16()
    if (majorVersion != 1 || minorVersion != 0) {
      console.error('TTF version is not 1.0: ' + majorVersion + '.' + minorVersion)
    }
    const majorRevision = headReader.getInt16()
    const minorRevision = headReader.getInt16()
    headReader.skipSlice(4) // Skip checksum adjustment
    const magicNumber = headReader.getUint32()
    if (magicNumber !== 0x5F0F3CF5) {
      console.error('TTF Magic Number is incorrect: 0x' + magicNumber.toString(16).toUpperCase())
    }
    const flags = headReader.getUint16()
    const unitsPerEm = headReader.getUint16()
    headReader.skipSlice(8)
    headReader.skipSlice(8)
    headReader.skipSlice(2)
    headReader.skipSlice(2)
    headReader.skipSlice(2)
    headReader.skipSlice(2)
    headReader.skipSlice(2)
    headReader.skipSlice(2)
    headReader.skipSlice(2)
    const indexToLocFormat = headReader.getInt16() === 0
    this.descriptor = {
      version: majorVersion + '.' + minorVersion,
      revision: majorRevision + '.' + minorRevision,
      flags,
      unitsPerEm,
      indexToLocFormat,
    }

    for (let idx = 0; idx < this.numGlyphs; idx++) {
      const gReader = new Reader(buffer, this.directory['loca'].offset + idx * (indexToLocFormat ? 2 : 4))
      const offset = indexToLocFormat ? gReader.getUint16() * 2 : gReader.getUint32()
      this.locations[idx] = this.directory['glyf'].offset + offset
    }
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

  static flagBitIsSet(flag: number, bitIdx: number) {
    return ((flag >> bitIdx) & 1) === 1
  }

  getGlyphs(): (Glyph | undefined)[] {
    if (!this.glyphs) {
      this.glyphs = this.locations.map(loc => {
        const reader = new Reader(this.buffer, loc)
        return Font.readGlyph(reader, this.descriptor.unitsPerEm)
      })
    }

    return this.glyphs
  }

  private static readGlyph(reader: Reader, unitsPerEm: number): Glyph | undefined {
    const numContours = reader.getInt16()

    const xMin = reader.getInt16() / unitsPerEm
    const yMin = reader.getInt16() / unitsPerEm
    const xMax = reader.getInt16() / unitsPerEm
    const yMax = reader.getInt16() / unitsPerEm

    if (numContours < 0) {
      console.warn('Compound glyphs are not yet supported')
      return
    }

    const contourEndIndices = [...Array(numContours).keys()]
      .map(() => reader.getUint16())

    // Skip instruction length and instructions fields
    const instructionsLength = reader.getUint16()
    reader.skipSlice(instructionsLength)

    const flags = Font.readFlags(reader, contourEndIndices[contourEndIndices.length - 1] + 1)
    const xCoords = Font.readCoordinates(reader, flags, 1, 4, unitsPerEm)
    const yCoords = Font.readCoordinates(reader, flags, 2, 5, unitsPerEm)
    const coords = xCoords.map((x, idx) => ({ x, y: yCoords[idx] }))

    return Font.generateImpliedPoints({
      min: { x: xMin, y: yMin },
      max: { x: xMax, y: yMax },
      onCurve: flags.map(flag => Font.flagBitIsSet(flag, 0)),
      coords,
      contourEndIndices,
    })
  }

  private static readCoordinates(
    reader: Reader,
    flags: number[],
    offsetSizeFlagBit: number,
    offsetSignOrSkipBit: number,
    unitsPerEm: number,
  ): number[] {
    const coordinates: number[] = []
    let coord = 0
    for (let i = 0; i < flags.length; i++) {
      const flag = flags[i]
      if (Font.flagBitIsSet(flag, offsetSizeFlagBit)) {
        const offset = reader.getUint8()
        const sign = Font.flagBitIsSet(flag, offsetSignOrSkipBit) ? 1 : -1
        coord += (offset * sign) / unitsPerEm
      } else if (!Font.flagBitIsSet(flag, offsetSignOrSkipBit)) {
        coord += reader.getInt16() / unitsPerEm
      } else {
        // Skip and jump the index (it's the same as the previous)
      }
      coordinates.push(coord)
    }

    return coordinates
  }

  private static readFlags(reader: Reader, numPoints: number) {
    const flags = []
    for (let i = 0; i < numPoints; i++) {
      const flag = reader.getInt8()
      flags[i] = flag
      if (Font.flagBitIsSet(flag, 3)) {
        const repeat = reader.getInt8()
        for (let j = 0; j < repeat; j++) {
          flags[++i] = flag
        }
      }
    }

    // Verify flags
    flags.forEach((flag, idx) => {
      if (Font.flagBitIsSet(flag, 6) || Font.flagBitIsSet(flag, 7)) {
        console.error('Incorrectly formatted flag no ' + idx)
      }
    })

    return flags
  }

  private static generateImpliedPoints(glyph: Glyph) {
    const smoothGlyph: Glyph = {
      min: glyph.min,
      max: glyph.max,
      onCurve: [],
      coords: [],
      contourEndIndices: [],
    }

    let start = 0

    for (const end of glyph.contourEndIndices) {
      // Walk through each contour
      let lastOnCurve = glyph.onCurve[start]
      smoothGlyph.coords.push(glyph.coords[start])
      smoothGlyph.onCurve.push(glyph.onCurve[start])
      for (let i = start + 1; i <= end; i++) {
        const thisOnCurve = glyph.onCurve[i]
        if (lastOnCurve === thisOnCurve) {
          // Insert midpoint
          const midpoint: Point = {
            x: (glyph.coords[i - 1].x + glyph.coords[i].x) / 2,
            y: (glyph.coords[i - 1].y + glyph.coords[i].y) / 2,
          }
          smoothGlyph.coords.push(midpoint)
          smoothGlyph.onCurve.push(!lastOnCurve)
        }
        smoothGlyph.coords.push(glyph.coords[i])
        smoothGlyph.onCurve.push(glyph.onCurve[i])
        lastOnCurve = glyph.onCurve[i]
      }
      smoothGlyph.contourEndIndices.push(smoothGlyph.coords.length - 1)
      start = end + 1
    }

    return smoothGlyph
  }
}