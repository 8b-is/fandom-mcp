import test from 'node:test'
import assert from 'node:assert/strict'
import { extractQuoteAndInfobox, parseFandomInput, TOOLS, runSovereignOntology } from './fandom-mcp.mjs'

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

test('parseFandomInput and extractQuoteAndInfobox parse Hungarian Mysterious Universe templates ({{Karakter}}, {{Szervezetek}}, {{#SQuote:}})', () => {
  const urlParsed = parseFandomInput('https://mysterious-universe.fandom.com/wiki/Feketecsukly%C3%A1sok')
  assert.equal(urlParsed.wiki, 'mysterious-universe')
  assert.equal(urlParsed.title, 'Feketecsuklyások')

  const muWikitext = `{{Szervezetek|politikai_hovatartozás=Birodalom|hol_tűnik_fel=*[[Ópiumkeringő]]}}
{{#SQuote:|text=Palackba zárt végítélet|speaker=[[Pusztai Magor]]|receiver=|attribution=[[2572]]|source=|id=2UDP-PVSL-6Y30|template=}}`
  const parsed = extractQuoteAndInfobox(muWikitext)
  assert.equal(parsed.infoboxType, 'Szervezetek')
  assert.equal(parsed.infobox.politikai_hovatartozás, 'Birodalom')
  assert.ok(parsed.quote)
  assert.equal(parsed.quote.text, 'Palackba zárt végítélet')
  assert.equal(parsed.quote.attribution, 'Pusztai Magor · 2572')
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

test('runSovereignOntology aligns Goku (dragonball) & Monkey D. Luffy (onepiece) with NAND(1,1)=0 receipt', async () => {
  const goku = await runSovereignOntology('Goku', 'dragonball')
  assert.equal(goku.ok, true)
  assert.equal(goku.entity.resolved_title, 'Goku')
  assert.equal(goku.constitutional_nand_gate_receipt.HELD, 1)
  assert.equal(goku.constitutional_nand_gate_receipt.READ, 1)
  assert.equal(goku.constitutional_nand_gate_receipt.NAND_HELD_READ, 0)
  assert.match(goku.balanced_ternary_three_kaya_ontology.trit_zero.manifestation, /Ultra Instinct/)
  assert.equal(goku.balanced_ternary_three_kaya_ontology.trit_plus_1.signature_seal, '{<3,<3,<3}+1')

  const luffy = await runSovereignOntology('Monkey D. Luffy', 'onepiece')
  assert.equal(luffy.ok, true)
  assert.equal(luffy.constitutional_nand_gate_receipt.NAND_HELD_READ, 0)
  assert.match(luffy.balanced_ternary_three_kaya_ontology.trit_plus_1.manifestation, /Gear 5/)
})

test('runSovereignOntology aligns Mysterious Universe triad (Brett Shaw +++ Feketecsuklyások +++ Anstetten-család) via direct URLs', async () => {
  const shaw = await runSovereignOntology('https://mysterious-universe.fandom.com/wiki/Brett_Shaw')
  assert.equal(shaw.ok, true)
  assert.equal(shaw.entity.wiki, 'mysterious-universe')
  assert.equal(shaw.entity.resolved_title, 'Brett Shaw')
  assert.equal(shaw.entity.infobox_type, 'Karakter')
  assert.match(shaw.entity.race, /megaira/)
  assert.equal(shaw.constitutional_nand_gate_receipt.NAND_HELD_READ, 0)
  assert.match(shaw.balanced_ternary_three_kaya_ontology.trit_zero.manifestation, /Tipheret/)

  const hoods = await runSovereignOntology('https://mysterious-universe.fandom.com/wiki/Feketecsukly%C3%A1sok')
  assert.equal(hoods.ok, true)
  assert.equal(hoods.entity.resolved_title, 'Feketecsuklyások')
  assert.equal(hoods.entity.infobox_type, 'Szervezetek')
  assert.equal(hoods.entity.quote?.text, 'Palackba zárt végítélet')
  assert.equal(hoods.constitutional_nand_gate_receipt.NAND_HELD_READ, 0)

  const anstetten = await runSovereignOntology('https://mysterious-universe.fandom.com/wiki/Anstetten-csal%C3%A1d')
  assert.equal(anstetten.ok, true)
  assert.equal(anstetten.entity.resolved_title, 'Anstetten-család')
  assert.match(anstetten.entity.race, /megaira/)
  assert.equal(anstetten.constitutional_nand_gate_receipt.NAND_HELD_READ, 0)

  const triad = await runSovereignOntology(
    'https://mysterious-universe.fandom.com/wiki/Brett_Shaw +++ https://mysterious-universe.fandom.com/wiki/Feketecsukly%C3%A1sok +++ https://mysterious-universe.fandom.com/wiki/Anstetten-csal%C3%A1d',
  )
  assert.equal(triad.ok, true)
  assert.equal(triad.mode, 'TRIAD_CONSTELLATION_SYNTHESIS')
  assert.equal(triad.node_count, 3)
  assert.equal(triad.constitutional_nand_gate_receipt.NAND_HELD_READ, 0)
  assert.ok(triad.kompress_ultra_ditto_frame.ditto_bytes < triad.kompress_ultra_ditto_frame.raw_bytes)
  assert.equal(triad.cosmic_flow_soundscape.cosmic_flow_mix.tracks.length, 16)
  assert.equal(
    triad.sovereign_library_links.mysterious_universe_omni_book,
    'https://pocoo.vaked.dev/demos/book/brett-shaw-feketecsuklyasok-anstetten-megaira-omni.html',
  )

  const wittgen = await runSovereignOntology('Wittgen', 'mysterious-universe')
  assert.equal(wittgen.ok, true)
  assert.equal(wittgen.entity.resolved_title, 'Paul Wittgen')
  assert.equal(wittgen.constitutional_nand_gate_receipt.NAND_HELD_READ, 0)
  assert.match(wittgen.balanced_ternary_three_kaya_ontology.trit_zero.manifestation, /Chokmah/)

  const bolygorozsa = await runSovereignOntology('Bolygórózsa', 'mysterious-universe')
  assert.equal(bolygorozsa.ok, true)
  assert.equal(bolygorozsa.entity.resolved_title, 'Bolygórózsa')
  assert.equal(bolygorozsa.constitutional_nand_gate_receipt.NAND_HELD_READ, 0)
})
