import Dexie, { Table } from 'dexie'

export type Fonts = {
  id?: number,
  name: string,
  data: ArrayBuffer,
}

class Store extends Dexie {
  fonts!: Table<Fonts, number>

  constructor() {
    super('CanvasFonts')
    this.version(1).stores({
      fonts: '++id, name, data' // Primary key and indexed props
    })
  }
}

const db = new Store()

// db.version(1).stores({
//   fonts: '++id, name, data' // Primary key and indexed props
// })

export function loadFont(): Promise<ArrayBuffer | undefined> {
  return db.fonts.toArray().then(res => res[0]?.data)
}

export function storeFont(buf: ArrayBuffer) {
  return db.fonts.delete(1).then(() => db.fonts.add({ id: 1, name: 'default', data: buf }))
}