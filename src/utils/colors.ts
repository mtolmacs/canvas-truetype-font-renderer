const COLORS = [
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue'
]

let colorIdx = 0
export function getNextColor(): string {
  return COLORS[colorIdx++ % 9]
}