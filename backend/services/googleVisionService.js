let visionClient = null;
try {
  // Lazy load only if available in environment
  const vision = require('@google-cloud/vision');
  visionClient = new vision.ImageAnnotatorClient();
} catch (_) {}

async function extractTextFromImage(fileBufferOrGcsUri) {
  if (!visionClient) {
    return { text: '', pages: [], note: 'Vision SDK not installed or credentials missing' };
  }
  const request = Array.isArray(fileBufferOrGcsUri) ? fileBufferOrGcsUri : [fileBufferOrGcsUri];
  const images = request.filter(Boolean).map(src => (Buffer.isBuffer(src) ? { image: { content: src } } : { image: { source: { imageUri: src } } }));
  if (!images.length) return { text: '', pages: [] };
  const [result] = await visionClient.batchAnnotateImages(images.map(i => ({ image: i.image, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] })));
  const pages = (result?.responses || []).map(r => r.fullTextAnnotation?.text || '').filter(Boolean);
  return { text: pages.join('\n\n'), pages };
}

module.exports = { extractTextFromImage };


