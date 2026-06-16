/**
 * BookAdapter contract test — verifies all 3 adapters implement the BookAdapter interface
 * with the required method signatures. This is a static structural test (no runtime invocation).
 *
 * Run: npx vitest run src/adapters/__tests__/contract.test.ts
 */
import { describe, it, expect } from 'vitest'
import { BookAdapter } from '../BookAdapter'
import { EpubAdapter } from '../EpubAdapter'
import { TxtAdapter } from '../TxtAdapter'
import { MobiAdapter } from '../MobiAdapter'

// Required BookAdapter methods. Any new method added to the interface MUST be added here.
const REQUIRED_METHODS: Array<keyof BookAdapter> = [
  'open',
  'destroy',
  'next',
  'prev',
  'goToLocation',
  'getCurrentLocation',
  'getToc',
  'getChapterText',
  'getFullText',
  'getChapterCount',
  'search',
  'addHighlight',
  'removeHighlight',
  'clearHighlights',
  'applyTheme',
  'applyCustomThemeCSS',
  'applyLayout',
  'flow',
  'resize',
  'getSelectionInfo',
]

const REQUIRED_PROPERTIES: Array<keyof BookAdapter> = [
  'format',
]

function makeStubAdapters(): Record<string, BookAdapter> {
  return {
    epub: new EpubAdapter({
      layout: { fontSize: 100, fontFamily: 'system-ui', lineHeight: 1.6, margin: 20, flow: 'paginated' },
      theme: 'light',
      customTheme: { type: 'solid', color: 'rgba(255,255,255,1)' },
    }),
    txt: new TxtAdapter({
      layout: { fontSize: 100, fontFamily: 'system-ui', lineHeight: 1.6, margin: 20, flow: 'paginated' },
      theme: 'light',
      customTheme: { type: 'solid', color: 'rgba(255,255,255,1)' },
    }),
    mobi: new MobiAdapter({
      layout: { fontSize: 100, fontFamily: 'system-ui', lineHeight: 1.6, margin: 20, flow: 'paginated' },
      theme: 'light',
      customTheme: { type: 'solid', color: 'rgba(255,255,255,1)' },
    }),
  }
}

describe('BookAdapter contract', () => {
  const adapters = makeStubAdapters()

  for (const [name, adapter] of Object.entries(adapters)) {
    describe(`${name} adapter`, () => {
      for (const method of REQUIRED_METHODS) {
        it(`implements ${method}()`, () => {
          expect(typeof (adapter as any)[method]).toBe('function')
        })
      }

      for (const prop of REQUIRED_PROPERTIES) {
        it(`exposes ${prop} property`, () => {
          expect(adapter).toHaveProperty(prop)
        })
      }

      it('format is a known format string', () => {
        expect(['epub', 'txt', 'mobi']).toContain(adapter.format)
      })
    })
  }
})
