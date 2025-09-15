function requestIdMiddleware(req, _res, next) {
  const existing = req.headers['x-request-id'];
  req.id = typeof existing === 'string' && existing ? existing : generateId();
  next();
}

function generateId() {
  const rnd = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36);
  return `${time}-${rnd}`;
}

module.exports = { requestIdMiddleware };


