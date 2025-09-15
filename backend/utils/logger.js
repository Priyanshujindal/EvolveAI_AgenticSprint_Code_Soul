function format(meta) {
  if (!meta) return '';
  try {
    return typeof meta === 'string' ? meta : JSON.stringify(meta);
  } catch (_e) {
    return '';
  }
}

function logInfo(message, meta) {
  console.log('[INFO]', message, format(meta));
}

function logError(message, meta) {
  console.error('[ERROR]', message, format(meta));
}

module.exports = { logInfo, logError };


