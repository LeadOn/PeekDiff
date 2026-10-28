/**
 * Regenerates every AI instruction file from a single source.
 *
 * `.agents/instructions.base.md` is the only file meant to be edited by hand. The five targets below
 * are byte-for-byte derivations of it, so they cannot drift apart — which is what the previous
 * version of this script allowed: it patched one section with a regex and silently did nothing when
 * that regex stopped matching, leaving the files disagreeing with each other and with the code.
 *
 * Usage: npm run sync:rules  (add --check to fail instead of writing, for CI)
 */
import fs from 'node:fs'
import path from 'node:path'

const SOURCE = '.agents/instructions.base.md'

/**
 * `.agents/AGENTS.md` carries a title and is conventionally read as a document, so its headings are
 * demoted one level and the meta-rule is hoisted to the top. The other four are consumed as raw
 * rule sets and take the source verbatim.
 */
const TARGETS = [
  { file: '.cursorrules', transform: (s) => s },
  { file: '.windsurfrules', transform: (s) => s },
  { file: 'CLAUDE.md', transform: (s) => s },
  { file: '.github/copilot-instructions.md', transform: (s) => s },
  { file: '.agents/AGENTS.md', transform: toAgentsDoc },
]

const BANNER = '<!-- Generated from .agents/instructions.base.md by `npm run sync:rules`. Do not edit by hand. -->'

function toAgentsDoc(source) {
  const metaHeading = '# IMPORTANT META-RULE: Synchronization'
  const metaIndex = source.indexOf(metaHeading)
  if (metaIndex === -1) throw new Error(`Missing "${metaHeading}" section in ${SOURCE}`)

  const body = source.slice(0, metaIndex).trimEnd()
  const meta = source.slice(metaIndex).trimEnd()
  const demote = (text) => text.replace(/^# /gm, '## ')

  return [
    '# Project Guidelines: PickDiff',
    '',
    demote(meta),
    '',
    demote(body),
    '',
  ].join('\n')
}

function render(target, source) {
  return `${BANNER}\n\n${target.transform(source).trimEnd()}\n`
}

const checkOnly = process.argv.includes('--check')

if (!fs.existsSync(SOURCE)) {
  console.error(`✖ Source not found: ${SOURCE}`)
  process.exit(1)
}

const source = fs.readFileSync(SOURCE, 'utf8')
const stale = []

for (const target of TARGETS) {
  const expected = render(target, source)
  const current = fs.existsSync(target.file) ? fs.readFileSync(target.file, 'utf8') : null

  if (current === expected) {
    console.log(`= ${target.file} (up to date)`)
    continue
  }

  if (checkOnly) {
    stale.push(target.file)
    continue
  }

  fs.mkdirSync(path.dirname(target.file), { recursive: true })
  fs.writeFileSync(target.file, expected)
  console.log(`→ ${target.file} (regenerated)`)
}

if (stale.length > 0) {
  console.error(`\n✖ Out of date with ${SOURCE}:\n${stale.map((f) => `  - ${f}`).join('\n')}`)
  console.error('\nRun `npm run sync:rules` and commit the result.')
  process.exit(1)
}
