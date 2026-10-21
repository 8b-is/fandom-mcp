import test from 'node:test'
import assert from 'node:assert/strict'
import { runSovereignOntology } from './fandom-mcp.mjs'

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
