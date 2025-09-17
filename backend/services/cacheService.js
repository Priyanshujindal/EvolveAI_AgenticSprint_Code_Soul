// Simple in-memory cache service for medical report processing
// In production, this should be replaced with Redis or similar

class CacheService {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000; // Maximum number of items in cache
    this.defaultTTL = 3600000; // 1 hour in milliseconds
  }

  /**
   * Generate cache key for OCR text
   */
  generateKey(text, options = {}) {
    const crypto = require('crypto');
    const keyData = {
      text: text.substring(0, 1000), // Use first 1000 chars for key
      options: options
    };
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  }

  /**
   * Get cached result
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Set cached result
   */
  set(key, data, ttl = this.defaultTTL) {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    };
  }

  /**
   * Cache OCR extraction results
   */
  async getCachedOCRExtraction(text, options = {}) {
    const key = this.generateKey(text, options);
    return this.get(key);
  }

  /**
   * Set cached OCR extraction results
   */
  async setCachedOCRExtraction(text, options = {}, data, ttl = 1800000) { // 30 minutes
    const key = this.generateKey(text, options);
    this.set(key, data, ttl);
  }

  /**
   * Cache lab extraction results
   */
  async getCachedLabExtraction(text, options = {}) {
    const key = this.generateKey(`labs_${text}`, options);
    return this.get(key);
  }

  /**
   * Set cached lab extraction results
   */
  async setCachedLabExtraction(text, options = {}, data, ttl = 3600000) { // 1 hour
    const key = this.generateKey(`labs_${text}`, options);
    this.set(key, data, ttl);
  }

  /**
   * Cache AI summary results
   */
  async getCachedAISummary(extractedData, ocrText) {
    const key = this.generateKey(`ai_summary_${JSON.stringify(extractedData)}_${ocrText.substring(0, 500)}`);
    return this.get(key);
  }

  /**
   * Set cached AI summary results
   */
  async setCachedAISummary(extractedData, ocrText, summary, ttl = 7200000) { // 2 hours
    const key = this.generateKey(`ai_summary_${JSON.stringify(extractedData)}_${ocrText.substring(0, 500)}`);
    this.set(key, summary, ttl);
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
