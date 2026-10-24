async function withRetry(fn, { retries = 4, baseDelayMs = 2000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = err.status === 429 || err.status === 503; // rate limited or overloaded
      if (!retryable || attempt > retries) throw err;
      await new Promise(resolve => setTimeout(resolve, baseDelayMs * attempt)); // wait longer each time
    }
  }
}

module.exports = { withRetry };