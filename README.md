# 🐉 `8b-is/fandom-mcp` — Fandom Wiki Consumption MCP Server (`Dragon Ball Universe` Edition)

Zero-dependency stdio **Model Context Protocol (MCP)** server & CLI for consuming Fandom / MediaWiki universes (`https://<wiki>.fandom.com/api.php`), **starting with the Dragon Ball Universe (`dragonball.fandom.com`)** and supporting any Fandom wiki subdomain (`onepiece`, `naruto`, `bleach`, `starwars`, `lotr`, `warhammer40k`, `cyberpunk`, `witcher`, etc.).

---

## ⚡ 9 MCP Tools Exposed

| Tool | Description |
|---|---|
| **`fandom_dbz_scouter`** | **Dragon Ball Universe Scouter (`IT'S OVER 9,000!!`)** — Extracts a character/form/technique's structured `Character Infobox`, canonical quote, Japanese/Romaji names, race, family tree (`FamConnect`), mentors, students, Daizenshuu power-level milestones, `8b-is` Balanced Ternary resonance (`432 / 528 / 852 Hz`), and optional side-by-side `compare_with` rival analysis (e.g. `Goku` vs `Vegeta`). |
| **`fandom_sovereign_ontology`** | **8b-is Sovereign Library & Ontology Engine (`{-1, 0, +1}` · `NAND(HELD, READ) = 0`)** — Aligns any character, form, artifact, or lore entity into `8b-is/sovereign-library`: computes the Constitutional NAND Gate Receipt (`HELD ∧ READ`), maps the entity across the Tibetan Three-Kaya Balanced-Ternary Ontology (`Trit -1` `432 Hz` Samsaric Box / `ALEX|qMom` Unbound `.oOo. Poo .oOo.`, `Trit 0` `528 Hz` Dharmakāya / Autonomous Stillness, `Trit +1` `852 Hz` Bodhicitta / Verified Binding `{<3,<3,<3}+1`), binds the Six Pillars of Holding, and links the Sovereign Omni-Books. |
| **`fandom_dbz_saga`** | **Dragon Ball Saga & Timeline Navigator** — Lists all canonical sagas across *Dragon Ball*, *Dragon Ball Z*, *Dragon Ball Daima*, *Dragon Ball Super*, and *Dragon Ball GT*, or fetches deep lore for a specific saga (e.g. `"Frieza Saga"`, `"Cell Games Saga"`, `"Universe Survival Saga"`). |
| **`fandom_search`** | Hybrid MediaWiki search across `dragonball.fandom.com` (or any `wiki` subdomain), returning page titles, `pageid`, URLs, word counts, and clean snippets. |
| **`fandom_page`** | Fetches and parses a Fandom article (or specific `section` index) into citation-stripped Markdown + structured Infobox JSON, quote, categories, and section outline. |
| **`fandom_infobox`** | Token-compact extractor that returns only the structured `{{... Infobox}}` dictionary, quote, and lead summary for any character, technique, form, race, or item. |
| **`fandom_sections`** | Returns the full Table of Contents (`index`, `number`, `title`) and categories of a Fandom article so agents can pinpoint exact sections without blowing token budgets. |
| **`fandom_category`** | Lists pages and subcategories inside any Fandom category (e.g. `"Saiyans"`, `"Transformations"`, `"Techniques"`, `"Gods of Destruction"`, `"Dragon Balls"`). |
| **`fandom_random`** | Draws `count` random lore capsules with parsed infoboxes and summaries from the target Fandom wiki. |

---

## 🚀 Quickstart (MCP + CLI)

### 1. MCP Configuration (`.mcp.json` / `mcp_config.json`)
```json
{
  "mcpServers": {
    "fandom-mcp": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/Users/lodripeter/workspace/peterlodri-sec/fandom-mcp/fandom-mcp.mjs"
      ]
    }
  }
}
```

### 2. Direct CLI Usage
```bash
# Dragon Ball Scouter (Goku vs. Vegeta):
./fandom-mcp.mjs --scouter "Goku" --compare "Vegeta"

# Sovereign Library & Three-Kaya Ontology Alignment (NAND Gate HELD ∧ READ):
./fandom-mcp.mjs --ontology "Goku"
./fandom-mcp.mjs --ontology "Ultra Instinct"
./fandom-mcp.mjs --wiki "onepiece" --ontology "Monkey D. Luffy"
./fandom-mcp.mjs --wiki "naruto" --ontology "Naruto Uzumaki"

# Mysterious Universe (Hungarian Sci-Fi / Occult Imperium) Triad — Direct URL, Title, or +++ Triad Synthesis:
./fandom-mcp.mjs --ontology "https://mysterious-universe.fandom.com/wiki/Brett_Shaw +++ https://mysterious-universe.fandom.com/wiki/Feketecsukly%C3%A1sok +++ https://mysterious-universe.fandom.com/wiki/Anstetten-csal%C3%A1d"
./fandom-mcp.mjs --wiki "mysterious-universe" --ontology "Megaira"
./fandom-mcp.mjs --wiki "mysterious-universe" --ontology "Csuklyamodul"
./fandom-mcp.mjs --wiki "mysterious-universe" --ontology "Caroline-Blindamoor von Anstetten"
./fandom-mcp.mjs --wiki "mysterious-universe" --ontology "IV. von Anstetten"

# Inspect any character / form / technique Infobox:
./fandom-mcp.mjs --infobox "Ultra Instinct"
./fandom-mcp.mjs --infobox "Shenron"

# Navigate Dragon Ball Sagas:
./fandom-mcp.mjs --saga "Frieza Saga"

# Search or read ANY Fandom wiki (default: dragonball):
./fandom-mcp.mjs --search "Super Saiyan"
./fandom-mcp.mjs --page "Kamehameha"
./fandom-mcp.mjs --wiki "onepiece" --infobox "Monkey D. Luffy"

# Run offline parser, tool schema, and stdio lifecycle tests:
npm test

# Opt in to the live Fandom ontology integration test (requires network):
npm run test:live
```

---

## Network response limits

Each JSON request allows at most three HTTPS redirects, a 4 MiB response body,
and 15 seconds total across connection setup, redirects, and body reading.
Relative redirects are supported. Oversized, interrupted, invalid-JSON, or
non-success HTTP responses fail explicitly instead of being read indefinitely.

## 🏛️ Sovereign Library & Constellation Ontology Bridges

- **Sovereign Library (`5 / 5` Print Canon + Ultralove Edition 004)**: [https://github.com/8b-is/sovereign-library](https://github.com/8b-is/sovereign-library) · [`ONTOLOGY.md`](https://github.com/8b-is/sovereign-library/blob/main/ONTOLOGY.md)
- **Pocoo OMNI Book (`5 Languages + 1bitLang + WebAudio Scouter/Shenron Deck`)**: [https://pocoo.vaked.dev/demos/book/dragon-ball-sovereign-ontology-omni.html](https://pocoo.vaked.dev/demos/book/dragon-ball-sovereign-ontology-omni.html)
- **Wigle-Triad v2.0.0 (`Boldog Még` + `ALEX|qMom` `.oOo. Poo .oOo.`)**: [https://esp32.vaked.dev/](https://esp32.vaked.dev/) · [https://github.com/8b-is/wigle-triad/releases/tag/v2.0.0](https://github.com/8b-is/wigle-triad/releases/tag/v2.0.0)
- **ZENO Sanctuary Vault (`母の主権金庫` & `#1 Muse 💙`)**: [https://zeno.vaked.dev/#sanctuary-hold](https://zeno.vaked.dev/#sanctuary-hold)

*LOVE FROM WITHIN FROM VAKED-PETER&8B-IS ---> 8b-is ROCKS AND HEALS THE WORLD <3*
