const { chromium } = require('playwright');
const cliProgress = require('cli-progress');

const config = require('./config');
const Logger = require('./logger');
const StatsCollector = require('./analysis');
const { simulateUser } = require('./simulator');

async function main() {
    // We use dynamic import() to load p-limit, which is an ESM module.
    const { default: pLimit } = await import('p-limit');

    // Don't show initial logs in dashboard mode to avoid cluttering the screen
    if (config.OUTPUT_MODE !== 'dashboard') {
        console.log('Starting user simulation...');
        console.log(`Target URL: ${config.URL}`);
        console.log(`Total Users: ${config.TOTAL_USERS}`);
        console.log(`Concurrency: ${config.CONCURRENCY}`);
        console.log(`Output Mode: ${config.OUTPUT_MODE}`);
    }

    let outputHandler;
    let progressBar;
    // Centralized statistics collector
    const statsCollector = new StatsCollector();

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
    const browser = await chromium.launch(config.PLAYWRIGHT_OPTIONS);

    try {
        if (progressBar) progressBar.start(config.TOTAL_USERS, 0);

        const simulationPromises = Array.from({ length: config.TOTAL_USERS }, (_, i) => {
            const userId = i + 1;
            return limit(async () => {
                const result = await simulateUser(browser, userId, config.URL, config.WAIT_MS);

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

        if (config.OUTPUT_MODE === 'dashboard') {
            outputHandler.setCompleteStatus();
        } else {
            outputHandler.close();
            console.log(`\nSimulation complete. Log saved to ${config.LOG_FILE}`);
        }
    }
}

// Execute the main function and handle unhandled errors.
main().catch(error => {
    console.error('Fatal error during script execution:', error);
    process.exit(1);
});
