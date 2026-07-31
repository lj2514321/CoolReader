import { describe, expect, it } from 'vitest'
import { alignPageScrollTop, calculatePageScrollStep, calculateSectionProgress } from '../readerProgress'

describe('calculateSectionProgress', () => {
  it('returns zero when no sections are available', () => {
    expect(calculateSectionProgress(0, 0)).toBe(0)
  })

  it('includes the displayed page within the current section', () => {
    expect(calculateSectionProgress(2, 10, { page: 5, total: 10 })).toBe(25)
  })

  it('reaches 100 at the end of the final section', () => {
    expect(calculateSectionProgress(9, 10, { page: 1, total: 20 }, true)).toBe(100)
  })

  it('clamps invalid indexes and page values', () => {
    expect(calculateSectionProgress(-3, 4, { page: -2, total: 10 })).toBe(0)
    expect(calculateSectionProgress(99, 4, { page: 20, total: 10 })).toBe(100)
  })
})

describe('TXT pagination geometry', () => {
  it('moves by a whole number of visible lines', () => {
    expect(calculatePageScrollStep(800, 24, 24, 28.8)).toBeCloseTo(748.8)
  })

  it('aligns restored positions to a line boundary', () => {
    expect(alignPageScrollTop(137, 1000, 28)).toBe(140)
    expect(alignPageScrollTop(-20, 1000, 28)).toBe(0)
  })
})
