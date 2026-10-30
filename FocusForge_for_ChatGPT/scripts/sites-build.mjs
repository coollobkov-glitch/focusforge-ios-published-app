import { mkdir, readFile, writeFile } from 'node:fs/promises'

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const manifest = await readFile(new URL('../.openai/hosting.json', import.meta.url), 'utf8').catch((error) => {
  if (error.code === 'ENOENT') return null
  throw error
})

if (!manifest) process.exit(0)

await mkdir(new URL('../dist/server/', import.meta.url), { recursive: true })
await mkdir(new URL('../dist/.openai/', import.meta.url), { recursive: true })

const worker = `const html = ${JSON.stringify(html)};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    return new Response(request.method === 'HEAD' ? null : html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  },
};
`

await writeFile(new URL('../dist/server/index.js', import.meta.url), worker)
await writeFile(new URL('../dist/.openai/hosting.json', import.meta.url), manifest)
