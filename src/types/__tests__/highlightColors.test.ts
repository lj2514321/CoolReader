import { describe, expect, it } from 'vitest'
import { highlightColors } from '../index'

describe('highlightColors（水墨四色）', () => {
  it('uses the ink-wash palette: 淡墨/赭石/花青/胭脂', () => {
    expect(highlightColors).toEqual(['#7d7d88', '#a3764a', '#4e7d9e', '#b04f43'])
  })
})
