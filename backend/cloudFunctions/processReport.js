// Cloud Function: process uploaded report (images/PDF)
const multer = require('multer');
const upload = multer();
const { extractTextFromImage } = require('../services/googleVisionService');
const { extractStructuredFromOcr } = require('../services/reportExtractionService');
const { validateExtractionQuality, sanitizeLabValue } = require('../utils/dataValidation');
const cacheService = require('../services/cacheService');
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

      // Check cache first for OCR results
      const fileHash = require('crypto').createHash('md5').update(file.buffer).digest('hex');
      const cachedOCR = await cacheService.getCachedOCRExtraction(fileHash, { type: file.mimetype });
      
      if (cachedOCR) {
        ocr = cachedOCR;
      } else {
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
        
        // Cache OCR result
        await cacheService.setCachedOCRExtraction(fileHash, { type: file.mimetype }, ocr);
      }

      // Check cache for lab extraction
      const cachedExtraction = await cacheService.getCachedLabExtraction(ocr.text, { useLLM: true });
      let extracted;
      
      if (cachedExtraction) {
        extracted = cachedExtraction;
      } else {
        extracted = await extractStructuredFromOcr(ocr.text || '', { useLLM: true });
        // Cache extraction result
        await cacheService.setCachedLabExtraction(ocr.text, { useLLM: true }, extracted);
      }

      // Sanitize and validate extracted data
      if (extracted && extracted.labs) {
        extracted.labs = extracted.labs.map(lab => ({
          ...lab,
          value: sanitizeLabValue(lab.value, lab.unit)
        }));
      }

      // Validate extraction quality
      const validation = validateExtractionQuality(extracted);

      res.json({ 
        ok: true, 
        ocr, 
        extracted,
        validation: {
          score: validation.score,
          issues: validation.issues,
          warnings: validation.warnings,
          labCount: validation.labCount,
          validLabCount: validation.validLabCount,
          highConfidenceCount: validation.highConfidenceCount,
          criticalValues: validation.criticalValues
        }
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
];


