// config.js

// Use environment variables for flexibility (great for Docker) or default values.
module.exports = {
    URL: process.env.TARGET_URL || 'https://link-tracker.globo.com/cimed/',
    TOTAL_USERS: parseInt(process.env.TOTAL_USERS, 10) || 5,
    CONCURRENCY: parseInt(process.env.CONCURRENCY, 10) || 5,
    WAIT_MS: parseInt(process.env.WAIT_MS, 10) || 2000,
    LOG_FILE: process.env.LOG_FILE || 'log-saida.txt',
    OUTPUT_MODE: process.env.OUTPUT_MODE || 'file', // Options: 'file' or 'dashboard'
    // Playwright options
    PLAYWRIGHT_OPTIONS: {
        headless: true, // Change to false to see the browser in action
    },
};