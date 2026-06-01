# Style Decouple Decisions

## Reader.css (Wave 1)

### Design Decisions

1. **Variable naming** — `--reader-*` prefix for all reader CSS variables (--reader-fg, --reader-panel-text, --reader-panel-muted, --reader-panel-border, --reader-panel-input-bg, --reader-panel-hover-bg, --reader-bg, --reader-glass-bg)

2. **Variable scoping** — Variables defined in :root/[data-ui-theme="glass"] as light-mode defaults. Dark/light/sepia themes override via [data-theme="*"] selectors. Sepia reuses light-mode panel colors but has distinct --reader-bg (#f4ecd8).

3. **Glass mixin vs CSS class** — Implemented as `.reader-glass` class using var(--reader-glass-bg) instead of inline style function. Maintains consistency with other components.

4. **Animation approach** — keyframes defined directly in reader.css. `.reader-fade-in` and `.reader-fade-out` classes with translateY(-4px) to (0) and reverse.

5. **[data-ui-theme="flat"] placement** — All flat overrides grouped at bottom of file after all base classes. Pattern matches bookshelf.css structure.

6. **No !important usage** — All overrides use specificity and proper variable cascading. epub.js content should be handleable via class overrides.

7. **Import order in theme.css** — Added `@import './components/reader.css'` after existing theme imports. Reader.css does not import tokens.css (assumed already loaded).

8. **CSS custom properties only** — No hardcoded theme colors in class definitions. All colors reference variables. This enables theme switching without class changes.