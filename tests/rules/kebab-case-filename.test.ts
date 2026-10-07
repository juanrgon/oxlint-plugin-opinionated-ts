import { ruleTester } from '../support/rule-tester.ts'

ruleTester({
  rule: 'kebab-case-filename',
  valid: [
    { code: 'export {}', filename: 'kebab-name.ts' },
    { code: 'export {}', filename: 'use-track-event.tsx' },
    { code: 'export {}', filename: 'src/server/delete-s3-image.ts' },
    // Multi-part extensions
    { code: 'export {}', filename: 'next-auth.d.ts' },
    { code: 'export {}', filename: 'docx-to-html.test.ts' },
    // Next.js framework files
    { code: 'export {}', filename: 'pages/_app.tsx' },
    { code: 'export {}', filename: 'pages/_document.tsx' },
    // Next.js dynamic routes name code-level identifiers
    { code: 'export {}', filename: 'pages/project/[projectId].tsx' },
    { code: 'export {}', filename: 'pages/share/[...all].tsx' },
    // Digits are fine
    { code: 'export {}', filename: 'oauth2-client.ts' },
  ],
  invalid: [
    {
      code: 'export {}',
      filename: 'DocumentEditor.tsx',
      errors: [{ messageId: 'notKebabCase' }],
    },
    {
      code: 'export {}',
      filename: 'components/ui/Button.tsx',
      errors: [{ messageId: 'notKebabCase' }],
    },
    {
      code: 'export {}',
      filename: 'useDebounce.tsx',
      errors: [{ messageId: 'notKebabCase' }],
    },
    {
      code: 'export {}',
      filename: 'snake_case_file.ts',
      errors: [{ messageId: 'notKebabCase' }],
    },
    {
      code: 'export {}',
      filename: 'mixed.TestHelper.ts',
      errors: [{ messageId: 'notKebabCase' }],
    },
  ],
})
