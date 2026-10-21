import test from 'node:test'
import assert from 'node:assert/strict'
import https from 'node:https'
import { EventEmitter } from 'node:events'
import { fetchJson } from './http-json.mjs'

// Inject transport events without opening sockets or depending on Fandom.
function fakeHttps(t, steps) {
  const calls = []
  t.mock.method(https, 'get', (url, options, callback) => {
    const step = steps[calls.length]
    assert.ok(step, 'unexpected extra request')
    const req = new EventEmitter()
    req.destroy = () => { req.destroyed = true }
    const res = new EventEmitter()
    res.statusCode = step.status ?? 200
    res.headers = step.headers ?? {}
    res.complete = false
    res.destroy = () => {
      res.destroyed = true
      queueMicrotask(() => res.emit('close'))
    }
    calls.push({ url: String(url), options, req, res })
    const deliver = () => {
      if (step.requestError) {
        req.emit('error', new Error('connection failed'))
        return
      }
      if (step.stall) return
      callback(res)
      if (req.destroyed || res.destroyed) return
      if (step.run) {
        step.run(res, req)
        return
      }
      for (const part of step.chunks ?? ['{"ok":true}']) {
        res.emit('data', Buffer.from(part))
        if (res.destroyed) return
      }
      res.complete = true
      res.emit('end')
      res.emit('close')
    }
    if (step.delayMs) setTimeout(deliver, step.delayMs)
    else queueMicrotask(deliver)
    return req
  })
  return calls
}

test('decodes a complete UTF-8 JSON body exactly at the byte limit', async t => {
  const calls = fakeHttps(t, [{ chunks: ['"', '€', '"'] }])
  assert.equal(await fetchJson('https://example.test/api', { maxBytes: 5, headers: { Accept: 'application/json' } }), '€')
  assert.equal(calls[0].options.headers.Accept, 'application/json')
})

test('rejects oversized streamed responses and destroys their request', async t => {
  const calls = fakeHttps(t, [{ chunks: ['"', '€', '"'] }])
  await assert.rejects(fetchJson('https://example.test/api', { maxBytes: 4 }), /byte limit/)
  assert.equal(calls[0].req.destroyed, true)
  assert.equal(calls[0].res.destroyed, true)
})

test('rejects advertised oversized responses before collecting data', async t => {
  const calls = fakeHttps(t, [{ headers: { 'content-length': '1000' } }])
  await assert.rejects(fetchJson('https://example.test/api', { maxBytes: 20 }), /byte limit/)
  assert.equal(calls[0].res.destroyed, true)
})

test('rejects HTTP failures even if their body is valid JSON', async t => {
  fakeHttps(t, [{ status: 503 }])
  await assert.rejects(fetchJson('https://example.test/api'), /status 503/)
})

test('rejects invalid JSON without including upstream body content', async t => {
  fakeHttps(t, [{ chunks: ['private upstream error page'] }])
  await assert.rejects(fetchJson('https://example.test/api'), error => error.message === 'Invalid JSON response')
})

test('follows relative HTTPS redirects and stops reading old responses', async t => {
  const calls = fakeHttps(t, [{ status: 302, headers: { location: '/next' } }, {}])
  assert.deepEqual(await fetchJson('https://example.test/start'), { ok: true })
  assert.equal(calls[1].url, 'https://example.test/next')
  assert.equal(calls[0].res.destroyed, true)
  assert.equal(calls[0].req.destroyed, true)
})

test('limits redirect chains to three hops by default', async t => {
  const calls = fakeHttps(t, Array.from({ length: 4 }, () => ({ status: 302, headers: { location: '/again' } })))
  await assert.rejects(fetchJson('https://example.test/start'), /redirect limit/)
  assert.equal(calls.length, 4)
  assert.ok(calls.every(call => call.req.destroyed && call.res.destroyed))
})

test('rejects a redirect to HTTP without opening its destination', async t => {
  const calls = fakeHttps(t, [{ status: 302, headers: { location: 'http://example.test/next' } }])
  await assert.rejects(fetchJson('https://example.test/start'), /Only HTTPS/)
  assert.equal(calls.length, 1)
})

test('request errors reject and release the deadline', async t => {
  fakeHttps(t, [{ requestError: true }])
  await assert.rejects(fetchJson('https://example.test/api'), /connection failed/)
})

test('aborted, closed, errored and truncated bodies reject promptly', async t => {
  const events = ['aborted', 'close', 'error', 'end']
  const calls = fakeHttps(t, events.map(event => ({ run: res => res.emit(event, new Error('stream failed')) })))
  for (const event of events) {
    await assert.rejects(fetchJson('https://example.test/api'), /aborted|closed|stream failed|ended/)
  }
  assert.ok(calls.every(call => call.req.destroyed && call.res.destroyed))
})

test('overall deadline covers a connection that never responds', async t => {
  const calls = fakeHttps(t, [{ stall: true }])
  await assert.rejects(fetchJson('https://example.test/api', { timeoutMs: 30 }), /deadline/)
  assert.equal(calls[0].req.destroyed, true)
})

test('overall deadline covers a continuously arriving slow body', async t => {
  const calls = fakeHttps(t, [{ run: res => {
    const interval = setInterval(() => res.emit('data', Buffer.from(' ')), 5)
    t.after(() => clearInterval(interval))
  } }])
  await assert.rejects(fetchJson('https://example.test/api', { timeoutMs: 30 }), /deadline/)
  assert.equal(calls[0].req.destroyed, true)
  assert.equal(calls[0].res.destroyed, true)
})

test('redirects share the original deadline instead of resetting it', { timeout: 1000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const calls = fakeHttps(t, [
    { delayMs: 20, status: 302, headers: { location: '/next' } },
    { stall: true },
  ])
  const result = assert.rejects(fetchJson('https://example.test/start', { timeoutMs: 30 }), /deadline/)
  t.mock.timers.tick(20)
  await Promise.resolve()
  assert.equal(calls.length, 2)
  t.mock.timers.tick(10)
  await result
  assert.equal(calls[1].req.destroyed, true)
})

test('invalid budget options fail before opening a request', async t => {
  const calls = fakeHttps(t, [])
  for (const options of [{ maxBytes: 0 }, { maxRedirects: -1 }, { timeoutMs: Infinity }]) {
    await assert.rejects(fetchJson('https://example.test/api', options), /budget/)
  }
  assert.equal(calls.length, 0)
})
