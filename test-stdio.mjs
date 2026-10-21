import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile, spawnSync } from 'node:child_process'
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const moduleUrl = new URL('./fandom-mcp.mjs', import.meta.url)
const entry = fileURLToPath(moduleUrl)
const options = { timeout: 3000, maxBuffer: 1024 * 1024 }

function exchange(lines) {
  const result = spawnSync(process.execPath, [entry], {
    ...options,
    encoding: 'utf8',
    input: lines.join('\n') + '\n',
  })
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
  return result.stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
}

test('library import exits even while the parent keeps stdin open', async () => {
  const { stdout, stderr } = await run(process.execPath, [
    '--input-type=module', '--eval', `await import(${JSON.stringify(moduleUrl.href)})`,
  ], options)
  assert.equal(stdout, '')
  assert.equal(stderr, '')
})

test('library import does not consume the importing program CLI arguments', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fandom-import-'))
  try {
    const wrapper = join(dir, 'wrapper.mjs')
    await writeFile(wrapper, `import ${JSON.stringify(moduleUrl.href)}\nconsole.log('caller only')\n`)
    const { stdout, stderr } = await run(process.execPath, [wrapper, '--dump-schemas'], options)
    assert.equal(stdout, 'caller only\n')
    assert.equal(stderr, '')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('direct and npm-style symlink CLI entry points expose the tools', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fandom-bin-'))
  try {
    const bin = join(dir, 'fandom-mcp')
    await symlink(entry, bin)
    for (const path of [entry, bin]) {
      const { stdout, stderr } = await run(process.execPath, [path, '--dump-schemas'], options)
      assert.equal(JSON.parse(stdout).length, 9)
      assert.equal(stderr, '')
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('stdio initialization, tools/list and ping remain available', () => {
  const replies = exchange([
    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping' }),
  ])
  assert.deepEqual(replies.map(r => r.id), [1, 2, 3])
  assert.equal(replies[0].result.serverInfo.name, 'fandom-mcp')
  assert.equal(replies[1].result.tools.length, 9)
  assert.deepEqual(replies[2].result, {})
})

test('malformed JSON values report errors and leave the server alive for ping', () => {
  const invalid = ['null', '[]', '42', 'true', '"hello"']
  const replies = exchange([
    '{', ...invalid,
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'ping' }),
  ])
  assert.equal(replies.length, invalid.length + 2)
  assert.equal(replies[0].error.code, -32700)
  for (const reply of replies.slice(1, -1)) {
    assert.equal(reply.id, null)
    assert.equal(reply.error.code, -32600)
  }
  assert.deepEqual(replies.at(-1), { jsonrpc: '2.0', id: 7, result: {} })
})

test('unknown methods and tools produce errors without terminating stdio', () => {
  const replies = exchange([
    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'missing' }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'missing' } }),
    JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping' }),
  ])
  const byId = new Map(replies.map(reply => [reply.id, reply]))
  assert.equal(byId.get(1).error.code, -32601)
  assert.equal(byId.get(2).result.isError, true)
  assert.deepEqual(byId.get(3).result, {})
})
