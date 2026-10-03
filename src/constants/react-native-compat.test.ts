/**
 * This is the one test that reads the filesystem. The project's TypeScript
 * settings deliberately exclude Node's types (the app itself runs in a
 * browser or on a phone, never in Node), so the two modules it needs are
 * pulled in through Jest's own escape hatch and described inline.
 */
interface FileSystem {
  readFileSync(path: string, encoding: string): string;
  readdirSync(path: string): string[];
  statSync(path: string): { isDirectory(): boolean };
}

const { readFileSync, readdirSync, statSync } = jest.requireActual('node:fs') as FileSystem;
const { join, sep } = jest.requireActual('node:path') as {
  join(...parts: string[]): string;
  sep: string;
};

/**
 * React Native takes real numbers for sizes. A CSS string — `'1.2vw'`,
 * `'clamp(13.6px, 1.11vw, 20px)'`, `'16px'` — is accepted by react-native-web
 * but **crashes Android** the moment it reaches a native view:
 *
 *   Error while updating property 'fontSize' of a view managed by: RCTText
 *   java.lang.String cannot be cast to java.lang.Double
 *
 * This scans every style in the app so the mistake cannot come back quietly.
 * Add the exception (`boxShadow`) if you genuinely need a CSS-only value.
 */

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(full) && !/\.test\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

/** Comments may talk about CSS freely — only real code counts. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const CSS_UNIT = /(['"`])([^'"`\n]*?(?:\d(?:px|vw|vh|vmin|vmax|rem|em)\b|\b(?:clamp|calc)\([^'"`\n]*?))[^'"`\n]*?\1/g;

describe('React Native compatibility of the styles', () => {
  it('never passes a CSS unit or function as a size', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles('src')) {
      const lines = withoutComments(readFileSync(file, 'utf8')).split('\n');
      lines.forEach((line, index) => {
        // A shadow is the one place a CSS length string is legitimate: the
        // `boxShadow` shorthand is a definition, not a single dimension.
        if (line.includes('boxShadow')) return;
        for (const match of line.matchAll(CSS_UNIT)) {
          offenders.push(`${file.split(sep).join('/')}:${index + 1} → ${match[0]}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  it('has no leftovers of the removed window-scaling helpers', () => {
    const offenders = sourceFiles('src').filter((file) =>
      /from '@\/lib\/fluid'|from '@\/hooks\/use-ui-scale'/.test(readFileSync(file, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });
});
