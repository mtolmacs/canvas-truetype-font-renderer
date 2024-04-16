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

type SimpleGlyph = {}

type Glyph = SimpleGlyph

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

  getGlyphs() {
    if (this.glyphs) {
      return this.glyphs
    }

    const offset = this.directory['glyf'].offset
    const reader = new Reader(this.buffer, offset)
    Font.readGlyph(reader)
  }

  private static readGlyph(reader: Reader) {
    const numContours = reader.getInt16()
    const xMin = reader.getInt16()
    const YMin = reader.getInt16()
    const xMax = reader.getInt16()
    const yMax = reader.getInt16()

    if (numContours < 0) {
      console.error('Compound glyphs are not yet supported')
      return null
    } else {
      return this.readSimpleGlyph(reader, numContours)
    }
  }

  private static readSimpleGlyph(reader: Reader, numContours: number) {
    const endPoints = [...Array(numContours).keys()]
      .map(_ => reader.getUint16())
    const numPoints = endPoints.pop()!

    const instructionsLength = reader.getUint16()
    reader.skipSlice(instructionsLength) // Skip instructions

    const flags = []
    for (let i = 0; i <= numPoints; i++) {
      const flag = reader.getUint8()
      flags.push(flag)
      if (Font.flagBitIsSet(flag, 3)) {
        for (let j = 0; j < reader.getUint8(); j++) {
          flags.push(flag)
        }
      }
    }
    console.log(flags)
  }
}