import readHeader, { type FontHeader } from "./header"
import Reader from "../reader"
import readMaxpTable, { type FontMaxp } from "./maxp"
import readHeadTable, { type FontHead } from "./head"
import readLocationsTable from "./loca"

export default class Font {
  readonly header: FontHeader
  readonly maxp: FontMaxp
  readonly head: FontHead
  private glyphs?: (Glyph | undefined)[]
  readonly locations: number[] = []

  constructor(private buffer: Readonly<ArrayBuffer>) {
    const dataView = new DataView(buffer)

    this.header = readHeader(dataView)
    this.maxp = readMaxpTable(dataView, this.header.directory['maxp'].offset)
    this.head = readHeadTable(dataView, this.header.directory['head'].offset)
    this.locations = readLocationsTable(
      dataView,
      this.header.directory['loca'].offset,
      this.header.directory['glyf'].offset,
      this.maxp.numberOfGlyphs,
      this.head.indexToLocFormat,
    )
  }

  getGlyphs(): (Glyph | undefined)[] {
    if (!this.glyphs) {
      // Cache parsed glyphs
      this.glyphs = this.locations.map(loc => {
        return Font.readGlyph(
          new Reader(new DataView(this.buffer, loc)),
          this.head.unitsPerEm,
        )
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

    const contourEndIndices = [...Array(numContours)].map(() => reader.getUint16())

    // Skip instruction length and instructions fields
    const instructionsLength = reader.getUint16()
    reader.skipSlice(instructionsLength)

    // Load contour flags
    const flags = Font.readGlyphFlags(
      reader,
      contourEndIndices[contourEndIndices.length - 1] + 1
    )

    // Load raw compressed coordinates
    const xCoords = Font.readGlyphCoordinates(reader, flags, 1, 4, unitsPerEm)
    const yCoords = Font.readGlyphCoordinates(reader, flags, 2, 5, unitsPerEm)
    const coords = xCoords.map((x, idx) => ({ x, y: yCoords[idx] }))

    return Font.generateImpliedGlyphPoints({
      min: { x: xMin, y: yMin },
      max: { x: xMax, y: yMax },
      onCurve: flags.map(flag => ((flag >> 0) & 1) === 1),
      coords,
      contourEndIndices,
    })
  }

  private static readGlyphCoordinates(
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
      if ((flag >> offsetSizeFlagBit) & 1) {
        const offset = reader.getUint8()
        const sign = (flag >> offsetSignOrSkipBit) & 1 ? 1 : -1
        coord += (offset * sign) / unitsPerEm
      } else if (!((flag >> offsetSignOrSkipBit) & 1)) {
        coord += reader.getInt16() / unitsPerEm
      } else {
        // Skip and jump the index (it's the same as the previous)
      }
      coordinates.push(coord)
    }

    return coordinates
  }

  private static readGlyphFlags(reader: Reader, numPoints: number) {
    const flags = []
    for (let i = 0; i < numPoints; i++) {
      const flag = reader.getInt8()
      flags[i] = flag
      if ((flag >> 3) & 1) {
        const repeat = reader.getInt8()
        for (let j = 0; j < repeat; j++) {
          flags[++i] = flag
        }
      }
    }

    return flags
  }

  private static generateImpliedGlyphPoints(glyph: Glyph) {
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

export type FontDescriptor = {
  version: string,
  revision: string,
  flags: number,
  unitsPerEm: number,
  indexToLocFormat: boolean,
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
