import https from 'node:https'

// One budget covers DNS/connect, redirects, and the complete response body.
export function fetchJson(url, {
  headers = {},
  timeoutMs = 15_000,
  maxBytes = 4 * 1024 * 1024,
  maxRedirects = 3,
} = {}) {
  return new Promise((resolve, reject) => {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 ||
        !Number.isSafeInteger(maxBytes) || maxBytes < 1 ||
        !Number.isSafeInteger(maxRedirects) || maxRedirects < 0) {
      reject(new RangeError('Invalid HTTP response budget'))
      return
    }

    let settled = false
    let activeRequest
    let activeResponse
    const finish = (error, value) => {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      if (error) {
        activeResponse?.destroy()
        activeRequest?.destroy()
        reject(error)
      } else {
        resolve(value)
      }
    }
    const deadline = setTimeout(() => finish(new Error('HTTP JSON deadline exceeded')), timeoutMs)

    const visit = (target, redirects) => {
      let parsed
      try {
        parsed = new URL(target)
        if (parsed.protocol !== 'https:') throw new Error('Only HTTPS JSON endpoints are supported')
        if (parsed.username || parsed.password) throw new Error('Credentials in JSON endpoint URLs are not supported')
        const req = https.get(parsed, { headers }, res => {
          if (settled) {
            res.destroy()
            return
          }
          activeResponse = res
          const failResponse = error => {
            if (res === activeResponse) finish(error)
          }
          res.on('error', failResponse)
          res.on('aborted', () => failResponse(new Error('HTTP JSON response aborted')))
          res.on('close', () => {
            if (!res.complete) failResponse(new Error('HTTP JSON response closed before completion'))
          })

          const status = res.statusCode || 0
          if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
            if (redirects >= maxRedirects) {
              finish(new Error('HTTP JSON redirect limit exceeded'))
              return
            }
            let next
            try {
              next = new URL(res.headers.location, parsed)
            } catch {
              finish(new Error('Invalid HTTP JSON redirect location'))
              return
            }
            // Stop reading the redirect body. Its close/error events must not
            // settle the next hop, which shares the same overall deadline.
            activeRequest = undefined
            activeResponse = undefined
            res.destroy()
            req.destroy()
            visit(next, redirects + 1)
            return
          }
          if (status < 200 || status >= 300) {
            finish(new Error(`HTTP JSON request failed with status ${status}`))
            return
          }
          if (Number(res.headers['content-length']) > maxBytes) {
            finish(new Error('HTTP JSON response exceeds byte limit'))
            return
          }
          const chunks = []
          let bytes = 0
          res.on('data', chunk => {
            if (settled) return
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            bytes += buffer.length
            if (bytes > maxBytes) {
              finish(new Error('HTTP JSON response exceeds byte limit'))
              return
            }
            chunks.push(buffer)
          })
          res.on('end', () => {
            if (settled) return
            if (!res.complete) {
              finish(new Error('HTTP JSON response ended before completion'))
              return
            }
            try {
              finish(null, JSON.parse(Buffer.concat(chunks, bytes).toString('utf8')))
            } catch {
              finish(new Error('Invalid JSON response'))
            }
          })
        })
        activeRequest = req
        req.on('error', error => {
          if (req === activeRequest) finish(error)
        })
      } catch (error) {
        finish(error)
      }
    }
    visit(url, 0)
  })
}
