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

export const loadFont = (() => {
  let status = 'pending'
  let result: any
  // @ts-ignore
  let fetching = db.fonts.toArray()
    .then((res: any) => {
      status = 'fulfilled'
      result = res
    })
    .catch((error: any) => {
      status = 'rejected'
      result = error
    })

  return () => {
    if (status === 'pending') {
      throw fetching
    } else if (status === 'rejected') {
      throw result
    } else if (status === 'fulfilled') {
      return result[0]
    }
  }
})()

export const storeFont = (buf: ArrayBuffer) => {
  // @ts-ignore
  db.fonts.add({ id: 1, name: 'default', data: buf })
}