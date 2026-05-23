const https = require('https');
const http = require('http');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('Не удалось распарсить ответ: ' + raw.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

module.exports = { fetchJSON };
