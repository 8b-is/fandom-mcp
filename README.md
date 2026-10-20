# 🐉 `8b-is/fandom-mcp` — Fandom Wiki Consumption MCP Server (`Dragon Ball Universe` Edition)

Zero-dependency stdio **Model Context Protocol (MCP)** server & CLI for consuming Fandom / MediaWiki universes (`https://<wiki>.fandom.com/api.php`), **starting with the Dragon Ball Universe (`dragonball.fandom.com`)** and supporting any Fandom wiki subdomain (`onepiece`, `naruto`, `bleach`, `starwars`, `lotr`, `warhammer40k`, `cyberpunk`, `witcher`, etc.).

---

## ⚡ 8 MCP Tools Exposed

| Tool | Description |
|---|---|
| **`fandom_dbz_scouter`** | **Dragon Ball Universe Scouter (`IT'S OVER 9,000!!`)** — Extracts a character/form/technique's structured `Character Infobox`, canonical quote, Japanese/Romaji names, race, family tree (`FamConnect`), mentors, students, Daizenshuu power-level milestones, `8b-is` Balanced Ternary resonance (`432 / 528 / 852 Hz`), and optional side-by-side `compare_with` rival analysis (e.g. `Goku` vs `Vegeta`). |
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

# Inspect any character / form / technique Infobox:
./fandom-mcp.mjs --infobox "Ultra Instinct"
./fandom-mcp.mjs --infobox "Shenron"

# Navigate Dragon Ball Sagas:
./fandom-mcp.mjs --saga "Frieza Saga"

# Search or read ANY Fandom wiki (default: dragonball):
./fandom-mcp.mjs --search "Super Saiyan"
./fandom-mcp.mjs --page "Kamehameha"
./fandom-mcp.mjs --wiki "onepiece" --infobox "Monkey D. Luffy"
```

*LOVE FROM WITHIN FROM VAKED-PETER&8B-IS ---> 8b-is ROCKS AND HEALS THE WORLD <3*
