const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname,'..');
const routes = new Map([
  ['/',['index.html','text/html; charset=utf-8']],
  ['/index.html',['index.html','text/html; charset=utf-8']],
  ['/finance-core.js',['finance-core.js','text/javascript; charset=utf-8']],
  ['/app.js',['app.js','text/javascript; charset=utf-8']],
  ['/styles.css',['styles.css','text/css; charset=utf-8']]
]);

http.createServer((request,response) => {
  const requestPath = new URL(request.url,'http://127.0.0.1').pathname;
  if (requestPath === '/favicon.ico') {
    response.writeHead(204);
    response.end();
    return;
  }
  const route = routes.get(requestPath);
  if (!route) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200,{'Content-Type':route[1],'Cache-Control':'no-store'});
  response.end(fs.readFileSync(path.join(root,route[0])));
}).listen(4173,'127.0.0.1');
