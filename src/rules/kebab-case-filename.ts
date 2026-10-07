import type { Rule } from '@oxlint/plugins'

const KEBAB_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const kebabCaseFilename: Rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require file names to be kebab-case',
    },
    schema: [],
    messages: {
      notKebabCase:
        'Filename `{{basename}}` is not kebab-case (expected e.g. `{{expected}}`).',
    },
  },
  create(context) {
    return {
      Program() {
        const filename = context.filename
        // Virtual filenames from editors/stdin have no real file to rename
        if (!filename || filename.startsWith('<')) return

        const basename = filename.split(/[\\/]/).pop() ?? filename

        // Next.js dynamic route segments ([projectId].tsx, [...all].tsx)
        // name a code-level identifier, so camelCase is correct there
        if (basename.includes('[')) return

        // Framework underscore prefixes (_app.tsx, _document.tsx)
        const segments = basename
          .replace(/^_/, '')
          .split('.')
          .filter((segment) => segment.length > 0)

        if (segments.every((segment) => KEBAB_SEGMENT.test(segment))) return

        context.report({
          loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
          messageId: 'notKebabCase',
          data: {
            basename,
            expected: segments
              .map((segment) =>
                segment
                  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                  .replace(/_/g, '-')
                  .toLowerCase(),
              )
              .join('.'),
          },
        })
      },
    }
  },
}
