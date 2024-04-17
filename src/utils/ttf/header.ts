import Reader from "../reader"

export type FontDirectoryName =
  'acnt' | 'ankr' | 'avar' | 'bdat' | 'bhed' | 'bloc' | 'bsln' | 'cmap' | 'cvar' |
  'cvt ' | 'EBSC' | 'fdsc' | 'feat' | 'fmtx' | 'fond' | 'fpgm' | 'fvar' | 'gasp' |
  'gcid' | 'glyf' | 'gvar' | 'hdmx' | 'head' | 'hhea' | 'hmtx' | 'just' | 'kern' |
  'kerx' | 'lcar' | 'loca' | 'ltag' | 'maxp' | 'meta' | 'mort' | 'morx' | 'name' |
  'opbd' | 'OS/2' | 'post' | 'prep' | 'prop' | 'sbix' | 'trak' | 'vhea' | 'vmtx' |
  'xref' | 'Zapf'

export type FontDirectory = {
  [name in FontDirectoryName]: {
    checksum: number
    offset: number
    length: number
  }
}

export type FontHeader = {
  scalerType: number,
  numTables: number,
  searchRange: number,
  entrySelector: number,
  rangeShift: number,
  directory: FontDirectory,
}

/**
 * Reads the TTF header at the beginning of the font file (at offset 0)
 */
export default function readHeader(data: Readonly<DataView>): FontHeader {
  const reader = new Reader(data)

  const scalerType = reader.getUint32()
  const numTables = reader.getUint16()
  const searchRange = reader.getUint16()
  const entrySelector = reader.getUint16()
  const rangeShift = reader.getUint16()
  const directory = Object.fromEntries(
    [...Array(numTables).keys()]
      .map(() => {
        const name = reader.getUTF8(4)
        const checksum = reader.getUint32()
        const offset = reader.getUint32()
        const length = reader.getUint32()

        return [name, {
          checksum,
          offset,
          length,
        }]
      })
  ) as FontDirectory

  return {
    scalerType,
    numTables,
    searchRange,
    entrySelector,
    rangeShift,
    directory,
  }
}