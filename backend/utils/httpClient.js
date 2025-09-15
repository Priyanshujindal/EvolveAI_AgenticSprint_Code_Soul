const axios = require('axios');

const httpClient = axios.create({
  timeout: 10000,
  maxRedirects: 5,
});

// Simple retry on network/5xx up to 2 times
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const status = error.response && error.response.status;
    const shouldRetry = !config.__retryCount && (status >= 500 || !status);
    if (shouldRetry) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      if (config.__retryCount <= 2) {
        await new Promise((r) => setTimeout(r, 250 * config.__retryCount));
        return httpClient.request(config);
      }
    }
    return Promise.reject(error);
  }
);

module.exports = { httpClient };


