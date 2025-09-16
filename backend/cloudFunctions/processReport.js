// Cloud Function: process uploaded report (images/PDF)
const multer = require('multer');
const upload = multer();
const { extractTextFromImage } = require('../services/googleVisionService');
const { extractStructuredFromOcr } = require('../services/reportExtractionService');
let pdfParse = null;
try { pdfParse = require('pdf-parse'); } catch (_) {}

module.exports = [
  upload.single('file'),
  async function processReport(req, res) {
    try {
      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({ ok: false, error: 'No file uploaded' });
      }

      const isPdf = (file.mimetype === 'application/pdf');
      let ocr = { text: '', pages: [] };

      if (isPdf) {
        if (!pdfParse) {
          return res.status(501).json({ ok: false, error: 'PDF support not available on server' });
        }
        const parsed = await pdfParse(file.buffer);
        ocr = { text: parsed?.text || '', pages: [] };
      } else if ((file.mimetype || '').startsWith('image/')) {
        const imageResult = await extractTextFromImage(file.buffer);
        ocr = { text: imageResult?.text || '', pages: imageResult?.pages || [] };
      } else {
        return res.status(415).json({ ok: false, error: 'Unsupported media type', acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'], maxSizeMb: 10 });
      }

      const extracted = await extractStructuredFromOcr(ocr.text || '', { useLLM: false });

      res.json({ ok: true, ocr, extracted });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
];


