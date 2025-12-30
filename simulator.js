// simulator.js

/**
 * Simulates a single user accessing the URL.
 * @param {import('playwright').Browser} browser - The Playwright browser instance.
 * @param {number} userId - The user ID for logging purposes.
 * @param {object} config - The application configuration object.
 * @returns {Promise<{userId: number, url: string, loadTime: number, requests: {url: string, duration: number, resourceType: string}[], error?: Error}>}
 */
async function simulateUser(browser, userId, config) {
    const { URL: url, WAIT_MS: waitMs, PAGE_LOAD_TIMEOUT_MS: timeout } = config;
    // We create a more realistic browser context to avoid bot detection.
    // Some sites serve different content (or none) to automated scripts.
    // Setting a common User-Agent and Viewport helps simulate a real user.
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        viewport: {
            width: 1920,
            height: 1080,
        },
        // Added: Blocks service workers. Sites using service workers for caching
        // can prevent accurate capture of network request timings.
        serviceWorkers: 'block',
    });
    const page = await context.newPage();

    // Added: Set headers to disable cache on each request.
    // This forces resource loading from the network, ensuring timing measurement.
    await page.setExtraHTTPHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    });

    const requests = [];
    const processedRequests = new Set(); // Prevents counting the same request twice
    const requestStartTimes = new Map(); // Fallback for timing: stores request start time

    // Capture the start time for every request as a fallback mechanism.
    page.on('request', request => {
        requestStartTimes.set(request, Date.now());
    });

    const listener = (request) => {
        const resourceType = request.resourceType();
        const requestUrl = request.url();

        // Ignore data URIs and requests already processed to avoid duplicates
        if (requestUrl.startsWith('data:') || processedRequests.has(request)) {
            return;
        }
        processedRequests.add(request);

        const timing = request.timing();
        let duration = -1;

        // Try to get the precise duration from the browser's PerformanceTiming API.
        if (timing && timing.responseEnd > -1 && timing.startTime > -1) {
            duration = timing.responseEnd - timing.startTime;
        } else {
            // Fallback to manual timing if the browser API is not available (e.g., cross-origin restrictions).
            const startTime = requestStartTimes.get(request);
            if (startTime) {
                duration = Date.now() - startTime;
            }
        }

        requests.push({ url: requestUrl, duration, resourceType });
    };

    // Ouve tanto requisições finalizadas quanto as que falharam
    page.on('requestfinished', listener);
    page.on('requestfailed', listener);

    const pageLoadStartTime = Date.now();
    try {
        // Step 1: Navigate and wait for the 'load' event. It's fast and reliable.
        // The 'requestfinished' listener will handle capturing the main request and all others.
        await page.goto(url, { waitUntil: 'load', timeout });

        // Step 2: After 'load', wait for the network to become idle.
        // This captures analytics, trackers, and other async calls.
        // We wrap this in try/catch since some pages never become 100% idle.
        try {
            await page.waitForLoadState('networkidle', { timeout: 15000 }); // Give 15s for the network to settle
        } catch (e) {
            // No problem if it times out. We've already captured most requests.
            // Logging can be enabled here for debugging if needed.
        }

        // Step 3: An additional explicit wait, if configured.
        if (waitMs > 0) {
            await page.waitForTimeout(waitMs);
        }

        // Final buffer: Wait a moment to ensure any pending 'requestfinished'
        // events in the Node.js event loop are processed by the listener before
        // the function returns and the context is closed in the 'finally' block.
        // This helps prevent a race condition where the context closes too early.
        await page.waitForTimeout(500);

        const loadTime = Date.now() - pageLoadStartTime;
        return { userId, url, loadTime, requests };
    } catch (error) {
        // Also wait here in case of an error during navigation, to ensure
        // we collect any requests that were successfully made before the error.
        await page.waitForTimeout(500);
        return { userId, url, loadTime: Date.now() - pageLoadStartTime, requests, error };
    } finally {
        await context.close();
    }
}

module.exports = { simulateUser };