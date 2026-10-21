import test from 'node:test'
import assert from 'node:assert/strict'
import { extractQuoteAndInfobox, TOOLS } from './fandom-mcp.mjs'

test('extractQuoteAndInfobox resolves nested [[Target|Label]] pipes inside {{Quote|...}} and parses brace-depth infoboxes', () => {
  const sampleWikitext = `
{{Quote|The power comes in response to a need, not a [[Desire|desire]]. You have to create that need.|Goku in [[Tournament of Power|this tournament]]}}
{{Character Infobox
| title = Son Goku
| JapName = 孫悟空
| RomName = Son Gokū
| Race = [[Saiyan]]
| FamConnect = * [[Bardock]] (father)
* [[Gine]] (mother)
* [[Chi-Chi]] (wife)
* [[Gohan]] (son)
| Mentors = {{Plainlist|* [[Grandpa Gohan]]* [[Master Roshi]]* [[Whis]]}}
}}
`
  const parsed = extractQuoteAndInfobox(sampleWikitext)
  assert.ok(parsed.quote)
  assert.equal(
    parsed.quote.text,
    'The power comes in response to a need, not a desire. You have to create that need.',
  )
  assert.equal(parsed.quote.attribution, 'Goku in this tournament')
  assert.equal(parsed.infoboxType, 'Character Infobox')
  assert.equal(parsed.infobox.JapName, '孫悟空')
  assert.equal(parsed.infobox.Race, 'Saiyan')
  assert.match(parsed.infobox.FamConnect, /Bardock/)
})

test('TOOLS exposes all 9 Fandom & Sovereign Ontology MCP tools', () => {
  assert.equal(TOOLS.length, 9)
  const names = TOOLS.map((t) => t.name)
  assert.deepEqual(names, [
    'fandom_dbz_scouter',
    'fandom_dbz_saga',
    'fandom_search',
    'fandom_page',
    'fandom_infobox',
    'fandom_sections',
    'fandom_category',
    'fandom_random',
    'fandom_sovereign_ontology',
  ])
})
