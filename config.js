// config.js

// Use environment variables for flexibility (great for Docker) or default values.
module.exports = {
    URL: process.env.TARGET_URL || 'https://cimedremedios.com.br/',
    TOTAL_USERS: parseInt(process.env.TOTAL_USERS, 10) || 5,
    CONCURRENCY: parseInt(process.env.CONCURRENCY, 10) || 5,
    WAIT_MS: parseInt(process.env.WAIT_MS, 10) || 2000,
    LOG_FILE: process.env.LOG_FILE || 'log-saida.txt',
    PAGE_LOAD_TIMEOUT_MS: parseInt(process.env.PAGE_LOAD_TIMEOUT_MS, 10) || 60000, // Timeout for page.goto()
    OUTPUT_MODE: process.env.OUTPUT_MODE || 'file', // Options: 'file' or 'dashboard'
    /**
     * Array de tipos de recursos a serem ignorados na coleta de requisições.
     * Tipos comuns: 'document', 'stylesheet', 'image', 'media', 'font', 'script', 'texttrack',
     * 'xhr', 'fetch', 'eventsource', 'websocket', 'manifest', 'other'.
     * Excluir 'xhr' e 'fetch' ajuda a focar na performance do carregamento inicial da página.
     */
    EXCLUDE_RESOURCE_TYPES: ['xhr', 'fetch', 'other'],

    // Playwright options
    PLAYWRIGHT_OPTIONS: {
        headless: true, // Change to false to see the browser in action
    },
};