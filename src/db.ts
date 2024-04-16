import Dexie from 'dexie'

export type Fonts = {
  id: number,
  name: string,
  data: ArrayBuffer,
}

export const db = new Dexie('CanvasFonts')

db.version(1).stores({
  fonts: '++id, name, data' // Primary key and indexed props
})

export function loadFont(): Promise<ArrayBuffer | undefined> {
  // @ts-ignore
  return db.fonts.toArray().then(res => res[0]?.data)
}

export function storeFont(buf: ArrayBuffer) {
  // @ts-ignore
  return db.fonts.add({ id: 1, name: 'default', data: buf })
}