// Cloud Function stub: process uploaded report
const multer = require('multer');
const upload = multer();
const { extractTextFromImage } = require('../services/googleVisionService');

module.exports = [
  upload.single('file'),
  async function processReport(req, res) {
    try {
      const file = req.file;
      const ocr = await extractTextFromImage(file ? file.buffer : null);
      res.json({ ok: true, ocr });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
];


