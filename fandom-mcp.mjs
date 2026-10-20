#!/usr/bin/env node
// fandom-mcp.mjs — 8b-is Fandom Wiki Consumption MCP Server v1.0.0
// Default Universe: Dragon Ball Universe (https://dragonball.fandom.com)
// Supports ANY Fandom wiki subdomain (dragonball, onepiece, naruto, bleach, starwars, lotr, warhammer40k, ...)
//
// Zero external dependencies. Speaks JSON-RPC 2.0 over stdio for agy, Claude Code, Crush, and opencode,
// plus direct CLI flags (--scouter, --page, --infobox, --search, --saga, --category, --random).

import https from 'node:https'
import readline from 'node:readline'

const DEFAULT_WIKI = process.env.FANDOM_DEFAULT_WIKI || 'dragonball'
const USER_AGENT = '8b-is-fandom-mcp/1.0.0 (+https://github.com/8b-is/fandom-mcp; DragonBallScouter)'

// Canonical Daizenshuu / Super Exciting Guide Power Level Milestones for the DBZ Scouter
const CANON_SCOUTER_BENCHMARKS = {
  goku: [
    { era: 'Dragon Ball Debut (Pilaf Saga)', power_level: '10', source: 'Daizenshuu 7' },
    { era: '22nd Tenkaichi Budokai', power_level: '180', source: 'Daizenshuu 7' },
    { era: 'Raditz Arrival (Weighted / Unweighted)', power_level: '334 / 416 (Kamehameha: 924)', source: 'Manga Ch. 195–196' },
    { era: 'Vegeta Saga (Base / Kaioken x4)', power_level: 'Over 8,000 (9,000+ EN dub) / 32,000', source: 'Daizenshuu 7' },
    { era: 'Namek Arrival / Ginyu Force', power_level: '90,000 (Kaioken x2: 180,000)', source: 'Daizenshuu 7' },
    { era: 'Frieza Final Form Battle (Base / Kaioken x20)', power_level: '3,000,000 / 60,000,000', source: 'Daizenshuu 7' },
    { era: 'Super Saiyan (Namek — First Awakening)', power_level: '150,000,000', source: 'Daizenshuu 7 / Super Exciting Guide' },
    { era: 'Super Saiyan God / Blue / Ultra Instinct', power_level: 'Divine Ki (Transcends mortal Scouter scale)', source: 'Dragon Ball Super' },
  ],
  vegeta: [
    { era: 'Saiyan Saga (Earth Invasion)', power_level: '18,000 (Great Ape: 180,000)', source: 'Daizenshuu 7' },
    { era: 'Namek Saga (vs. Cui / Dodoria / Zarbon)', power_level: '24,000 -> 30,000', source: 'Daizenshuu 7' },
    { era: 'vs. First Form Frieza', power_level: '250,000', source: 'V-Jump / Daizenshuu' },
    { era: 'Super Saiyan / Majin Vegeta / Ultra Ego', power_level: 'Divine Destruction Ki (Hakai)', source: 'Dragon Ball Super' },
  ],
  frieza: [
    { era: 'First Form / Second Form', power_level: '530,000 / 1,060,000', source: 'Manga Ch. 286 / Daizenshuu 7' },
    { era: 'Final Form (50% / 100% Full Power)', power_level: '60,000,000 / 120,000,000', source: 'Daizenshuu 7' },
    { era: 'Golden Frieza / Black Frieza', power_level: 'Apex Emperor Tier (One-shot UI/UE in Granolah Arc)', source: 'DBS Ch. 87' },
  ],
  gohan: [
    { era: 'Raditz Pod Rage Burst', power_level: '1,307', source: 'Manga Ch. 199' },
    { era: 'Namek Guru Potential Unlock', power_level: '14,000 -> 200,000 (vs. Frieza)', source: 'Daizenshuu 7' },
    { era: 'Cell Games (Super Saiyan 2) / Gohan Beast', power_level: 'Supreme Hybrid Apex (Gohan Beast)', source: 'DBS: Super Hero' },
  ],
  broly: [
    { era: 'Newborn Infant (Planet Vegeta)', power_level: '10,000', source: 'DBZ Movie 8 / DBS: Broly' },
    { era: 'Wrathful (Ikari) / Full Power Super Saiyan', power_level: 'Surpasses SSJ Blue Goku & Vegeta combined (Requires Gogeta)', source: 'DBS: Broly' },
  ],
  piccolo: [
    { era: 'Raditz Battle (Special Beam Cannon)', power_level: '408 (Makankosappo: 1,330 / 1,480)', source: 'Manga Ch. 198' },
    { era: 'Nail Fusion (Namek)', power_level: '1,200,000+', source: 'Daizenshuu 7' },
    { era: 'Kami Re-Fusion / Orange Piccolo', power_level: 'Shenron "Plus A Little Extra" Awakening', source: 'DBS: Super Hero' },
  ],
}

const CANON_DB_SAGAS = [
  { series: 'Dragon Ball', sagas: ['Emperor Pilaf Saga', 'Tournament Saga', 'Red Ribbon Army Saga', 'Fortuneteller Baba Saga', 'Tien Shinhan Saga', 'King Piccolo Saga', 'Piccolo Jr. Saga'] },
  { series: 'Dragon Ball Z', sagas: ['Raditz Saga', 'Vegeta Saga', 'Namek Saga', 'Captain Ginyu Saga', 'Frieza Saga', 'Garlic Jr. Saga', 'Trunks Saga', 'Androids Saga', 'Imperfect Cell Saga', 'Perfect Cell Saga', 'Cell Games Saga', 'Other World Saga', 'Great Saiyaman Saga', 'World Tournament Saga', 'Babidi Saga', 'Majin Buu Saga', 'Fusion Saga', 'Kid Buu Saga', 'Peaceful World Saga'] },
  { series: 'Dragon Ball Daima', sagas: ['Demon Realm Saga'] },
  { series: 'Dragon Ball Super', sagas: ['God of Destruction Beerus Saga', 'Golden Frieza Saga', 'Universe 6 Saga', 'Copy-Vegeta Saga', '"Future" Trunks Saga', 'Universe Survival Saga', 'Broly Saga', 'Galactic Patrol Prisoner Saga', 'Granolah the Survivor Saga', 'Super Hero Saga'] },
  { series: 'Dragon Ball GT', sagas: ['Black Star Dragon Ball Saga', 'Baby Saga', 'Super 17 Saga', 'Shadow Dragon Saga'] },
]

function sanitizeWikiSlug(wiki) {
  const cleaned = String(wiki || DEFAULT_WIKI)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\.fandom\.com.*$/, '')
    .replace(/[^a-z0-9-_]/g, '')
  return cleaned || DEFAULT_WIKI
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        timeout: 15000,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchJson(res.headers.location).then(resolve, reject)
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8')
          try {
            resolve(JSON.parse(raw))
          } catch (e) {
            reject(new Error(`Invalid JSON from ${url}: ${raw.slice(0, 180)}`))
          }
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy(new Error(`Timeout fetching ${url}`))
    })
  })
}

function apiUrl(wiki, params) {
  const slug = sanitizeWikiSlug(wiki)
  const usp = new URLSearchParams({ format: 'json', formatversion: '2', redirects: '1', ...params })
  return `https://${slug}.fandom.com/api.php?${usp.toString()}`
}

function stripWikitextMarkup(str) {
  if (!str) return ''
  let s = String(str)
  // Remove comments and <ref>...</ref>
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<ref[^>]*\/>/gi, '')
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
  // Convert {{Ruby|Kanji|Kana}} -> Kanji (Kana)
  s = s.replace(/\{\{Ruby\|([^|}]+)\|([^|}]+)\}\}/gi, '$1 ($2)')
  // Convert {{Nihongo|English|Kanji|Romaji}} -> English (Kanji, Romaji)
  s = s.replace(/\{\{Nihongo\|([^|}]+)\|([^|}]+)\|([^|}]+)(?:\|[^}]*)?\}\}/gi, '$1 ($2, $3)')
  s = s.replace(/\{\{Nihongo\|([^|}]+)\|([^|}]+)(?:\|[^}]*)?\}\}/gi, '$1 ($2)')
  // Convert {{Small|text}} or {{Former}}
  s = s.replace(/\{\{Small\|([^}]+)\}\}/gi, '($1)')
  s = s.replace(/\{\{Former\}\}/gi, '(formerly)')
  s = s.replace(/\{\{DB Series\|([^}]+)\}\}/gi, (_, p1) => p1.split('|').join(', '))
  // Convert <br> to ", " or newline
  s = s.replace(/<br\s*\/?>/gi, ', ')
  // Remove tabber / file tags
  s = s.replace(/<tabber>[\s\S]*?<\/tabber>/gi, '')
  s = s.replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, '')
  // Convert [[Target|Label]] -> Label and [[Target]] -> Target
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1')
  // Strip remaining simple templates {{...}}
  let prev
  do {
    prev = s
    s = s.replace(/\{\{[^{}]*\}\}/g, '')
  } while (s !== prev)
  // Strip HTML tags
  s = s.replace(/<\/?[^>]+>/g, '')
  // Clean bold/italic quotes
  s = s.replace(/'''([^']+)'''/g, '**$1**')
  s = s.replace(/''([^']+)''/g, '*$1*')
  return s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function extractQuoteAndInfobox(wikitext) {
  const result = {
    quote: null,
    infoboxType: null,
    infobox: {},
  }
  if (!wikitext) return result

  // Extract {{Quote|text|speaker}} (resolve [[Target|Label]] links before splitting on |)
  const quoteMatch = wikitext.match(/\{\{Quote\|([\s\S]*?)\}\}/i)
  if (quoteMatch) {
    const precleaned = quoteMatch[1]
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
    const parts = precleaned.split('|').map((p) => stripWikitextMarkup(p))
    if (parts[0]) {
      result.quote = {
        text: parts[0],
        attribution: parts[1] || null,
      }
    }
  }

  // Find first Infobox or Character/Attack/Saga template block using brace depth
  const startMatch = wikitext.match(/\{\{([A-Za-z0-9 _-]*Infobox|Character|Attack|Saga|Form|Race|Location|Item)\b/i)
  if (!startMatch || startMatch.index === undefined) return result

  result.infoboxType = startMatch[1].trim()
  let depth = 0
  let i = startMatch.index
  let endIdx = wikitext.length
  for (; i < wikitext.length - 1; i++) {
    const two = wikitext.slice(i, i + 2)
    if (two === '{{') {
      depth++
      i++
    } else if (two === '}}') {
      depth--
      i++
      if (depth === 0) {
        endIdx = i + 1
        break
      }
    }
  }

  const rawBox = wikitext.slice(startMatch.index + 2, endIdx - 2)
  // Split top-level |key = value pairs
  const fields = []
  let cur = ''
  let d = 0
  let linkDepth = 0
  for (let c = 0; c < rawBox.length; c++) {
    const two = rawBox.slice(c, c + 2)
    if (two === '{{') {
      d++
      cur += two
      c++
      continue
    }
    if (two === '}}') {
      d = Math.max(0, d - 1)
      cur += two
      c++
      continue
    }
    if (two === '[[') {
      linkDepth++
      cur += two
      c++
      continue
    }
    if (two === ']]') {
      linkDepth = Math.max(0, linkDepth - 1)
      cur += two
      c++
      continue
    }
    if (rawBox[c] === '|' && d === 0 && linkDepth === 0) {
      fields.push(cur)
      cur = ''
    } else {
      cur += rawBox[c]
    }
  }
  if (cur) fields.push(cur)

  for (const f of fields.slice(1)) {
    const eq = f.indexOf('=')
    if (eq === -1) continue
    const k = f.slice(0, eq).trim()
    const v = stripWikitextMarkup(f.slice(eq + 1))
    if (k && v) {
      result.infobox[k] = v
    }
  }

  return result
}

async function fandomSearch({ query, wiki = DEFAULT_WIKI, limit = 10 }) {
  const slug = sanitizeWikiSlug(wiki)
  const srlimit = Math.min(50, Math.max(1, Number(limit) || 10))
  const data = await fetchJson(
    apiUrl(slug, {
      action: 'query',
      list: 'search',
      srsearch: String(query || '').trim(),
      srlimit: String(srlimit),
    }),
  )
  const hits = (data?.query?.search || []).map((item) => ({
    title: item.title,
    pageid: item.pageid,
    url: `https://${slug}.fandom.com/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
    wordcount: item.wordcount,
    size_bytes: item.size,
    timestamp: item.timestamp,
    snippet: stripWikitextMarkup(item.snippet || ''),
  }))
  return {
    wiki: slug,
    baseUrl: `https://${slug}.fandom.com`,
    query,
    count: hits.length,
    results: hits,
  }
}

async function fandomSections({ title, wiki = DEFAULT_WIKI }) {
  const slug = sanitizeWikiSlug(wiki)
  const data = await fetchJson(
    apiUrl(slug, {
      action: 'parse',
      page: String(title || '').trim(),
      prop: 'sections|categories',
    }),
  )
  if (data?.error) {
    throw new Error(data.error.info || `Page not found: ${title}`)
  }
  const p = data.parse
  return {
    wiki: slug,
    title: p.title,
    pageid: p.pageid,
    url: `https://${slug}.fandom.com/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
    sectionsCount: (p.sections || []).length,
    sections: (p.sections || []).map((s) => ({
      index: Number(s.index),
      number: s.number,
      level: Number(s.level),
      title: stripWikitextMarkup(s.line),
      anchor: s.anchor,
    })),
    categories: (p.categories || []).map((c) => c.category),
  }
}

async function fandomPage({ title, wiki = DEFAULT_WIKI, section = 0, max_chars = 8000, include_wikitext = false }) {
  const slug = sanitizeWikiSlug(wiki)
  const secParams = section !== undefined && section !== null && section !== 'all' ? { rvsection: String(section) } : {}
  const [revData, secData] = await Promise.all([
    fetchJson(
      apiUrl(slug, {
        action: 'query',
        prop: 'revisions|categories',
        titles: String(title || '').trim(),
        rvprop: 'content|timestamp',
        rvslots: 'main',
        cllimit: '30',
        ...secParams,
      }),
    ),
    section === 0 || section === '0'
      ? fetchJson(
          apiUrl(slug, {
            action: 'parse',
            page: String(title || '').trim(),
            prop: 'sections',
          }),
        ).catch(() => null)
      : Promise.resolve(null),
  ])

  const page = revData?.query?.pages?.[0]
  if (!page || page.missing) {
    // Fallback to search suggestion if exact title missed
    const fallback = await fandomSearch({ query: title, wiki: slug, limit: 5 })
    return {
      ok: false,
      error: `Exact page "${title}" not found on ${slug}.fandom.com`,
      suggestions: fallback.results,
    }
  }

  const rev = page.revisions?.[0]
  const rawWikitext = rev?.slots?.main?.content || ''
  const { quote, infoboxType, infobox } = extractQuoteAndInfobox(rawWikitext)

  // Strip infobox & quote templates before converting prose to clean Markdown
  let proseWiki = rawWikitext
  const cleanedProse = stripWikitextMarkup(proseWiki).slice(0, Number(max_chars) || 8000)

  const sections = (secData?.parse?.sections || []).slice(0, 40).map((s) => ({
    index: Number(s.index),
    number: s.number,
    title: stripWikitextMarkup(s.line),
  }))

  const out = {
    ok: true,
    wiki: slug,
    title: page.title,
    pageid: page.pageid,
    section: section,
    timestamp: rev?.timestamp || null,
    url: `https://${slug}.fandom.com/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    quote,
    infoboxType,
    infobox,
    content_markdown: cleanedProse,
    categories: (page.categories || []).map((c) => c.title.replace(/^Category:/, '')),
    sections_preview: sections,
  }
  if (include_wikitext) {
    out.raw_wikitext = rawWikitext.slice(0, Number(max_chars) || 8000)
  }
  return out
}

async function fandomInfobox({ title, wiki = DEFAULT_WIKI }) {
  const page = await fandomPage({ title, wiki, section: 0, max_chars: 1200 })
  if (!page.ok) return page
  return {
    ok: true,
    wiki: page.wiki,
    title: page.title,
    pageid: page.pageid,
    url: page.url,
    quote: page.quote,
    infoboxType: page.infoboxType,
    infobox: page.infobox,
    lead_summary: page.content_markdown.slice(0, 900),
  }
}

async function fandomCategory({ category, wiki = DEFAULT_WIKI, limit = 30 }) {
  const slug = sanitizeWikiSlug(wiki)
  const cleanCat = String(category || '')
    .trim()
    .replace(/^Category:/i, '')
  const cmlimit = Math.min(100, Math.max(1, Number(limit) || 30))
  const data = await fetchJson(
    apiUrl(slug, {
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${cleanCat}`,
      cmlimit: String(cmlimit),
    }),
  )
  const items = (data?.query?.categorymembers || []).map((m) => ({
    title: m.title,
    pageid: m.pageid,
    ns: m.ns,
    type: m.ns === 14 ? 'subcategory' : 'page',
    url: `https://${slug}.fandom.com/wiki/${encodeURIComponent(m.title.replace(/ /g, '_'))}`,
  }))
  return {
    wiki: slug,
    category: cleanCat,
    url: `https://${slug}.fandom.com/wiki/Category:${encodeURIComponent(cleanCat.replace(/ /g, '_'))}`,
    count: items.length,
    members: items,
  }
}

async function fandomDbzScouter({ target, compare_with }) {
  const primary = await fandomPage({ title: target, wiki: 'dragonball', section: 0, max_chars: 3500 })
  let resolvedPrimary = primary
  if (!primary.ok && primary.suggestions?.length > 0) {
    resolvedPrimary = await fandomPage({ title: primary.suggestions[0].title, wiki: 'dragonball', section: 0, max_chars: 3500 })
  }

  const keyLower = String(resolvedPrimary.title || target || '')
    .toLowerCase()
    .split(' ')[0]
  const scouterBenchmarks = CANON_SCOUTER_BENCHMARKS[keyLower] || [
    { era: 'Scouter Lock', power_level: ' OVER 9,000!! (Dynamic Ki Signature)', source: '8b-is Scouter Telemetry' },
  ]

  // Assign 8b-is Balanced Ternary Resonance
  const box = resolvedPrimary.infobox || {}
  const race = box.Race || 'Unknown'
  const allegiance = box.Allegiance || 'Independent'
  const trit = race.toLowerCase().includes('angel') || allegiance.toLowerCase().includes('dragon team') ? '+1' : race.toLowerCase().includes('demon') ? '-1' : '0'
  const carrierHz = trit === '+1' ? 852 : trit === '-1' ? 432 : 528

  const report = {
    scouter_unit: '8b-is Capsule Corp Scouter v2.0 (MEDUSA-OMNI Edition)',
    wiki: 'dragonball.fandom.com',
    target: {
      title: resolvedPrimary.title,
      url: resolvedPrimary.url,
      quote: resolvedPrimary.quote,
      japanese_name: box.JapName || null,
      romaji_name: box.RomName || null,
      alternate_names: box.AltName || null,
      race,
      gender: box.Gender || null,
      height: box.Height || null,
      weight: box.Weight || null,
      birth_date: box['Date of birth'] || null,
      death_dates: box['Date of death'] || null,
      allegiance,
      family_connections: box.FamConnect || null,
      mentors: box.Mentors || null,
      students: box.Students || null,
      appears_in: box['Appears in'] || null,
      manga_debut: box['manga debut'] || null,
      anime_debut: box['anime debut'] || null,
      canon_power_benchmarks: scouterBenchmarks,
      eightb_resonance: {
        trit,
        carrier_hz: carrierHz,
        scouter_alert: 'IT\'S OVER 9,000!! ⚡🐉',
      },
      lead_summary: resolvedPrimary.content_markdown?.slice(0, 1400) || '',
      sections: resolvedPrimary.sections_preview || [],
    },
  }

  if (compare_with && String(compare_with).trim()) {
    let rival = await fandomPage({ title: String(compare_with).trim(), wiki: 'dragonball', section: 0, max_chars: 2200 })
    if (!rival.ok && rival.suggestions?.length > 0) {
      rival = await fandomPage({ title: rival.suggestions[0].title, wiki: 'dragonball', section: 0, max_chars: 2200 })
    }
    const rBox = rival.infobox || {}
    const rKey = String(rival.title || compare_with)
      .toLowerCase()
      .split(' ')[0]
    report.versus_comparison = {
      rival_title: rival.title,
      rival_url: rival.url,
      rival_quote: rival.quote,
      rival_race: rBox.Race || null,
      rival_allegiance: rBox.Allegiance || null,
      rival_family: rBox.FamConnect || null,
      rival_mentors: rBox.Mentors || null,
      rival_power_benchmarks: CANON_SCOUTER_BENCHMARKS[rKey] || [],
      rival_summary: rival.content_markdown?.slice(0, 900) || '',
    }
  }

  return report
}

async function fandomDbzSaga({ saga }) {
  if (!saga || !String(saga).trim()) {
    return {
      wiki: 'dragonball',
      url: 'https://dragonball.fandom.com/wiki/List_of_Sagas',
      canonical_timeline: CANON_DB_SAGAS,
    }
  }
  const page = await fandomPage({ title: String(saga).trim(), wiki: 'dragonball', section: 0, max_chars: 5000 })
  if (!page.ok && page.suggestions?.length > 0) {
    return fandomPage({ title: page.suggestions[0].title, wiki: 'dragonball', section: 0, max_chars: 5000 })
  }
  return page
}

async function fandomRandom({ wiki = DEFAULT_WIKI, count = 3 }) {
  const slug = sanitizeWikiSlug(wiki)
  const rnlimit = Math.min(10, Math.max(1, Number(count) || 3))
  const data = await fetchJson(
    apiUrl(slug, {
      action: 'query',
      list: 'random',
      rnnamespace: '0',
      rnlimit: String(rnlimit),
    }),
  )
  const picks = data?.query?.random || []
  const detailed = await Promise.all(
    picks.map((p) => fandomInfobox({ title: p.title, wiki: slug }).catch(() => ({ title: p.title, pageid: p.id }))),
  )
  return {
    wiki: slug,
    count: detailed.length,
    capsules: detailed,
  }
}

export const TOOLS = [
  {
    name: 'fandom_dbz_scouter',
    description:
      'Dragon Ball Universe Scouter & Lore Analyzer (dragonball.fandom.com). Extracts a character/transformation/technique infobox, canonical quote, race, family tree, mentors, Daizenshuu power-level benchmarks, 8b-is ternary resonance, and optional versus comparison with a rival (e.g. Goku vs Vegeta).',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Character, transformation, technique, or entity name (e.g. "Goku", "Vegeta", "Frieza", "Ultra Instinct", "Kamehameha", "Shenron").',
        },
        compare_with: {
          type: 'string',
          description: 'Optional rival character/form to compare side-by-side (e.g. "Vegeta", "Broly", "Beerus", "Jiren").',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'fandom_dbz_saga',
    description:
      'Navigate the Dragon Ball Universe timeline & sagas (Dragon Ball, Dragon Ball Z, Dragon Ball Daima, Dragon Ball Super, Dragon Ball GT). Omit `saga` for the full canonical saga index, or pass a saga name (e.g. "Frieza Saga", "Cell Games Saga", "Universe Survival Saga") for detailed lore.',
    inputSchema: {
      type: 'object',
      properties: {
        saga: {
          type: 'string',
          description: 'Optional specific saga title (e.g. "Frieza Saga", "Majin Buu Saga", "Universe Survival Saga"). Omit to list all sagas.',
        },
      },
    },
  },
  {
    name: 'fandom_search',
    description:
      'Search any Fandom wiki (defaults to `dragonball` -> https://dragonball.fandom.com, or pass any Fandom subdomain such as `onepiece`, `naruto`, `bleach`, `starwars`, `lotr`, `warhammer40k`). Returns matching page titles, URLs, word counts, and snippets.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g. "Super Saiyan", "Namekian Dragon Balls", "Capsule Corporation").',
        },
        wiki: {
          type: 'string',
          description: 'Fandom wiki subdomain (default: "dragonball").',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 10, max: 50).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'fandom_page',
    description:
      'Fetch and parse a Fandom wiki article (or specific section) into clean, citation-stripped Markdown plus structured Infobox JSON, quote, categories, and section outline. Defaults to `dragonball`.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Exact or approximate article title (e.g. "Goku", "Vegeta", "Kamehameha", "Beerus").',
        },
        wiki: {
          type: 'string',
          description: 'Fandom wiki subdomain (default: "dragonball").',
        },
        section: {
          type: 'number',
          description: 'Section index to read (0 = lead + infobox; use `fandom_sections` to list all section numbers).',
        },
        max_chars: {
          type: 'number',
          description: 'Max prose characters to return (default: 8000).',
        },
        include_wikitext: {
          type: 'boolean',
          description: 'Include raw MediaWiki wikitext alongside parsed Markdown (default: false).',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'fandom_infobox',
    description:
      'Extract only the structured Infobox key-value dictionary, quote, and lead summary from a Fandom wiki page (fast, token-compact). Defaults to `dragonball`.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Page title (e.g. "Vegeta", "Piccolo", "Trunks", "Shenron").',
        },
        wiki: {
          type: 'string',
          description: 'Fandom wiki subdomain (default: "dragonball").',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'fandom_sections',
    description:
      'Get the full table-of-contents section tree and categories for a Fandom wiki article so you can selectively read any section index via `fandom_page`. Defaults to `dragonball`.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Article title (e.g. "Goku", "Frieza").',
        },
        wiki: {
          type: 'string',
          description: 'Fandom wiki subdomain (default: "dragonball").',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'fandom_category',
    description:
      'List pages and subcategories inside a Fandom category (e.g. "Saiyans", "Transformations", "Techniques", "Gods of Destruction", "Angels", "Sagas"). Defaults to `dragonball`.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Category name without prefix (e.g. "Saiyans", "Dragon Balls", "Transformations").',
        },
        wiki: {
          type: 'string',
          description: 'Fandom wiki subdomain (default: "dragonball").',
        },
        limit: {
          type: 'number',
          description: 'Max members to list (default: 30, max: 100).',
        },
      },
      required: ['category'],
    },
  },
  {
    name: 'fandom_random',
    description:
      'Draw random lore capsules (with infoboxes and lead summaries) from a Fandom wiki (`dragonball` by default).',
    inputSchema: {
      type: 'object',
      properties: {
        wiki: {
          type: 'string',
          description: 'Fandom wiki subdomain (default: "dragonball").',
        },
        count: {
          type: 'number',
          description: 'Number of random articles to draw (default: 3, max: 10).',
        },
      },
    },
  },
]

async function dispatchTool(name, args = {}) {
  switch (name) {
    case 'fandom_dbz_scouter':
      return fandomDbzScouter(args)
    case 'fandom_dbz_saga':
      return fandomDbzSaga(args)
    case 'fandom_search':
      return fandomSearch(args)
    case 'fandom_page':
      return fandomPage(args)
    case 'fandom_infobox':
      return fandomInfobox(args)
    case 'fandom_sections':
      return fandomSections(args)
    case 'fandom_category':
      return fandomCategory(args)
    case 'fandom_random':
      return fandomRandom(args)
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// CLI Mode Support (when invoked with --scouter, --search, --page, --infobox, --saga, --category, --random, --dump-schemas)
const argv = process.argv.slice(2)
if (argv.length > 0) {
  const runCli = async () => {
    const getArg = (flag) => {
      const idx = argv.indexOf(flag)
      return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : null
    }
    const wiki = getArg('--wiki') || DEFAULT_WIKI
    if (argv.includes('--dump-schemas')) {
      console.log(JSON.stringify(TOOLS, null, 2))
      return
    }
    if (getArg('--scouter')) {
      const out = await fandomDbzScouter({ target: getArg('--scouter'), compare_with: getArg('--compare') })
      console.log(JSON.stringify(out, null, 2))
      return
    }
    if (getArg('--search')) {
      const out = await fandomSearch({ query: getArg('--search'), wiki, limit: Number(getArg('--limit') || 10) })
      console.log(JSON.stringify(out, null, 2))
      return
    }
    if (getArg('--page')) {
      const out = await fandomPage({ title: getArg('--page'), wiki, section: Number(getArg('--section') || 0) })
      console.log(JSON.stringify(out, null, 2))
      return
    }
    if (getArg('--infobox')) {
      const out = await fandomInfobox({ title: getArg('--infobox'), wiki })
      console.log(JSON.stringify(out, null, 2))
      return
    }
    if (argv.includes('--saga')) {
      const out = await fandomDbzSaga({ saga: getArg('--saga') })
      console.log(JSON.stringify(out, null, 2))
      return
    }
    if (getArg('--category')) {
      const out = await fandomCategory({ category: getArg('--category'), wiki })
      console.log(JSON.stringify(out, null, 2))
      return
    }
    if (argv.includes('--random')) {
      const out = await fandomRandom({ wiki, count: Number(getArg('--count') || 3) })
      console.log(JSON.stringify(out, null, 2))
      return
    }
  }
  runCli().catch((err) => {
    console.error(err)
    process.exit(1)
  })
} else {
  // Stdio JSON-RPC 2.0 MCP Server Loop
  function reply(id, result) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n')
  }

  function replyErr(id, code, message) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n')
  }

  const rl = readline.createInterface({ input: process.stdin, terminal: false })
  rl.on('line', async (line) => {
    const trimmed = line.trim()
    if (!trimmed) return
    let msg
    try {
      msg = JSON.parse(trimmed)
    } catch {
      return
    }
    const { id, method, params } = msg
    if (id === undefined || id === null) return

    if (method === 'initialize') {
      reply(id, {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'fandom-mcp',
          version: '1.0.0',
        },
      })
      return
    }

    if (method === 'tools/list') {
      reply(id, { tools: TOOLS })
      return
    }

    if (method === 'tools/call') {
      const name = params?.name
      const args = params?.arguments || {}
      try {
        const data = await dispatchTool(name, args)
        reply(id, {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        })
      } catch (e) {
        reply(id, {
          isError: true,
          content: [{ type: 'text', text: `Error: ${e?.message || e}` }],
        })
      }
      return
    }

    if (method === 'ping') {
      reply(id, {})
      return
    }

    replyErr(id, -32601, `Method not found: ${method}`)
  })
}
