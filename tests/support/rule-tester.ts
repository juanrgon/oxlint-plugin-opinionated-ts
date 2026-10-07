// Runs rule test cases through the real oxlint binary.
//
// Each case is written to its own folder in a temp directory. One oxlint run
// lints every case for a rule, with per-case options applied through config
// `overrides`. Cases with an expected `output` are linted again with `--fix`
// in a separate copy so the fixed text can be compared.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { after, before, describe, it } from 'node:test'
import plugin from '../../src/index.ts'

export const repoRoot = join(import.meta.dirname, '..', '..')
export const oxlintBin = join(repoRoot, 'node_modules', '.bin', 'oxlint')
export const pluginEntry = join(repoRoot, 'dist', 'index.js')

type TestCase = {
  code: string
  // Path of the linted file inside the case folder. Defaults to `file.ts`.
  filename?: string
  // Rule options, without the severity (like RuleTester `options`).
  options?: unknown[]
}

type InvalidCase = TestCase & {
  errors: { messageId: string }[]
  // Expected file text after `oxlint --fix`.
  output?: string
}

export type Diagnostic = {
  message: string
  code: string
  filename: string
  labels: { span: { offset: number } }[]
}

type PreparedCase = {
  dir: string
  file: string
  testCase: TestCase
  // Present for invalid cases only.
  invalid?: InvalidCase
}

export function runOxlint(args: { cwd: string; argv: string[] }) {
  const result = spawnSync(oxlintBin, args.argv, {
    cwd: args.cwd,
    encoding: 'utf8',
  })
  if (result.error) throw result.error
  // oxlint exits 1 when it reports errors. Anything else is a crash or a
  // config problem, which should fail loudly.
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `oxlint exited with ${result.status}\n${result.stdout}\n${result.stderr}`,
    )
  }
  return result
}

export function lintJson(args: { cwd: string; argv: string[] }) {
  const result = runOxlint({
    cwd: args.cwd,
    argv: ['--format', 'json', ...args.argv],
  })
  const report: { diagnostics: Diagnostic[] } = JSON.parse(result.stdout)
  return report.diagnostics
}

// oxlint does not match `overrides[].files` globs when the config path runs
// through a symlink (macOS tmpdir is /var -> /private/var), so always use the
// real path.
export function makeTempDir(args: { prefix: string }) {
  return realpathSync(mkdtempSync(join(tmpdir(), args.prefix)))
}

function writeCaseFiles(args: { root: string; cases: PreparedCase[] }) {
  for (const prepared of args.cases) {
    const path = join(args.root, prepared.dir, prepared.file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, prepared.testCase.code)
  }
}

function writeConfig(args: {
  root: string
  ruleId: string
  cases: PreparedCase[]
}) {
  const config = {
    plugins: [],
    jsPlugins: [pluginEntry],
    categories: { correctness: 'off' },
    overrides: args.cases.map((prepared) => ({
      files: [`${prepared.dir}/**`],
      rules: {
        [args.ruleId]: ['error', ...(prepared.testCase.options ?? [])],
      },
    })),
  }
  const path = join(args.root, 'oxlintrc.json')
  writeFileSync(path, JSON.stringify(config, null, 2))
  return path
}

function messagePattern(args: { template: string }) {
  const escaped = args.template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replace(/\\\{\\\{\s*\w+\s*\\\}\\\}/g, '.+')}$`)
}

function caseTitle(args: { testCase: TestCase }) {
  const code = args.testCase.code.replace(/\s+/g, ' ').trim()
  const parts = [code]
  if (args.testCase.filename) parts.push(`[${args.testCase.filename}]`)
  if (args.testCase.options) parts.push(JSON.stringify(args.testCase.options))
  return parts.join(' ')
}

export function ruleTester(args: {
  rule: string
  valid: (string | TestCase)[]
  invalid: InvalidCase[]
}) {
  const ruleId = `opinionated-ts/${args.rule}`
  const diagnosticCode = `opinionated-ts(${args.rule})`
  const ruleMeta = plugin.rules[args.rule]?.meta
  assert.ok(ruleMeta, `rule ${args.rule} is not exported by the plugin`)
  const messages = ruleMeta.messages ?? {}

  const cases: PreparedCase[] = [
    ...args.valid.map((entry, index) => {
      const testCase = typeof entry === 'string' ? { code: entry } : entry
      return {
        dir: `valid-${index}`,
        file: testCase.filename ?? 'file.ts',
        testCase,
      }
    }),
    ...args.invalid.map((testCase, index) => ({
      dir: `invalid-${index}`,
      file: testCase.filename ?? 'file.ts',
      testCase,
      invalid: testCase,
    })),
  ]
  const fixCases = cases.filter(
    (prepared) => prepared.invalid?.output !== undefined,
  )

  describe(args.rule, () => {
    const roots: string[] = []
    const byCase = new Map<string, Diagnostic[]>()
    const fixed = new Map<string, string>()

    before(() => {
      const lintRoot = makeTempDir({ prefix: `opinionated-ts-${args.rule}-` })
      roots.push(lintRoot)
      writeCaseFiles({ root: lintRoot, cases })
      const config = writeConfig({ root: lintRoot, ruleId, cases })
      const diagnostics = lintJson({ cwd: lintRoot, argv: ['-c', config, '.'] })
      for (const diagnostic of diagnostics) {
        const caseDir = relative(lintRoot, resolve(lintRoot, diagnostic.filename)).split(sep)[0] ?? ''
        byCase.set(caseDir, [...(byCase.get(caseDir) ?? []), diagnostic])
      }

      if (fixCases.length === 0) return
      const fixRoot = makeTempDir({ prefix: `opinionated-ts-${args.rule}-fix-` })
      roots.push(fixRoot)
      writeCaseFiles({ root: fixRoot, cases: fixCases })
      const fixConfig = writeConfig({ root: fixRoot, ruleId, cases: fixCases })
      runOxlint({ cwd: fixRoot, argv: ['-c', fixConfig, '--fix', '.'] })
      for (const prepared of fixCases) {
        fixed.set(
          prepared.dir,
          readFileSync(join(fixRoot, prepared.dir, prepared.file), 'utf8'),
        )
      }
    })

    after(() => {
      for (const root of roots) rmSync(root, { recursive: true, force: true })
    })

    for (const prepared of cases) {
      const kind = prepared.invalid ? 'invalid' : 'valid'
      const title = `${kind}: ${caseTitle({ testCase: prepared.testCase })}`
      it(title, () => {
        const diagnostics = [...(byCase.get(prepared.dir) ?? [])].sort(
          (a, b) => (a.labels[0]?.span.offset ?? 0) - (b.labels[0]?.span.offset ?? 0),
        )
        const summary = diagnostics.map((d) => `${d.code}: ${d.message}`)

        const invalid = prepared.invalid
        if (!invalid) {
          assert.deepEqual(summary, [], 'expected no diagnostics')
          return
        }
        assert.equal(
          diagnostics.length,
          invalid.errors.length,
          `expected ${invalid.errors.length} diagnostic(s), got:\n${summary.join('\n')}`,
        )
        invalid.errors.forEach((expected, index) => {
          const actual = diagnostics[index]
          assert.ok(actual)
          assert.equal(actual.code, diagnosticCode)
          const template = messages[expected.messageId]
          assert.ok(template, `unknown messageId ${expected.messageId}`)
          assert.match(actual.message, messagePattern({ template }))
        })

        if (invalid.output !== undefined) {
          assert.equal(fixed.get(prepared.dir), invalid.output)
        }
      })
    }
  })
}
