function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({ success: false, error: err.message || 'Server error' });
}

module.exports = { errorHandler };


