import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || 4173);
// Binding to 0.0.0.0 lets cloud workspaces expose the server through their
// port-preview UI. It is still available at localhost when run on your computer.
const host = process.env.HOST || '0.0.0.0';
const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    const relative = normalize(pathname === '/' ? 'index.html' : pathname.slice(1));
    const file = join(root, relative);
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error('Not found');
    res.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8` });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}).listen(port, host, () => {
  console.log(`Roomplay Studio is running on port ${port}.`);
  console.log(`Codex Cloud: open the port preview for port ${port}.`);
  console.log(`Local computer: http://localhost:${port}`);
});
