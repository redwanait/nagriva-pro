module.exports = async function handler(req, res) {
  const payload = JSON.stringify({ ok: true, method: req.method, path: '/api/ping' });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(payload);
};
