const { chromium } = require('playwright');
const cliProgress = require('cli-progress');

const config = require('./config');
const Logger = require('./logger');
const StatsCollector = require('./analysis');
const { simulateUser } = require('./simulator');

async function main() {
    // We use dynamic import() to load p-limit, which is an ESM module.
    const { default: pLimit } = await import('p-limit');

    const startTime = Date.now(); // Registra o tempo de início da simulação

    // Don't show initial logs in dashboard mode to avoid cluttering the screen
    if (config.OUTPUT_MODE !== 'dashboard') {
        console.log('--- Simulation Configuration ---');
        for (const [key, value] of Object.entries(config)) {
            // Usa JSON.stringify para objetos/arrays para melhor legibilidade
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
            console.log(`${key.padEnd(30)}: ${displayValue}`);
        }
        console.log('--------------------------------\n');
        console.log('Starting user simulation...');
    }

    let outputHandler;
    let progressBar;
    // Centralized statistics collector
    const statsCollector = new StatsCollector(config);

    if (config.OUTPUT_MODE === 'dashboard') {
        // Load the Dashboard only when needed to avoid dependency errors.
        const Dashboard = require('./dashboard');
        outputHandler = new Dashboard(config, statsCollector);
    } else {
        outputHandler = new Logger(config, statsCollector);
        // The progress bar is only used in 'file' mode
        progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    }

    const limit = pLimit(config.CONCURRENCY);
    // Add arguments when launching the browser to make automation detection harder.
    // The '--disable-blink-features=AutomationControlled' argument removes the `navigator.webdriver` flag,
    // which is one of the main indicators sites use to detect bots.
    const launchOptions = {
        ...config.PLAYWRIGHT_OPTIONS,
        args: ['--disable-blink-features=AutomationControlled'],
    };
    const browser = await chromium.launch(launchOptions);

    try {
        if (progressBar) progressBar.start(config.TOTAL_USERS, 0);

        const simulationPromises = Array.from({ length: config.TOTAL_USERS }, (_, i) => {
            const userId = i + 1;
            return limit(async () => {
                const result = await simulateUser(browser, userId, config);

                // Process stats centrally
                statsCollector.processResult(result);

                // Send the result to the active handler (logger or dashboard)
                outputHandler.logUserResult(result);

                if (progressBar) progressBar.increment();
            });
        });

        await Promise.all(simulationPromises);

    } catch (error) {
        console.error('\nAn unexpected error occurred during the simulation:', error);
    } finally {
        if (progressBar) progressBar.stop();
        await browser.close();

        const totalDurationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

        if (config.OUTPUT_MODE === 'dashboard') {
            outputHandler.setCompleteStatus(totalDurationSeconds);
        } else {
            outputHandler.close(totalDurationSeconds);
            console.log(`\nSimulation complete in ${totalDurationSeconds}s. Log saved to ${config.LOG_FILE}`);
        }
    }
}

// Execute the main function and handle unhandled errors.
main().catch(error => {
    console.error('Fatal error during script execution:', error);
    process.exit(1);
});
