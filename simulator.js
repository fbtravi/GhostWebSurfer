// simulator.js

/**
 * Simulates a single user accessing the URL.
 * @param {import('playwright').Browser} browser - The Playwright browser instance.
 * @param {number} userId - The user ID for logging purposes.
 * @param {string} url - The URL to access.
 * @param {number} waitMs - Wait time in milliseconds after the page loads.
 * @returns {Promise<{userId: number, url: string, loadTime: number, requests: {url: string, duration: number, resourceType: string}[], error?: Error}>}
 */
async function simulateUser(browser, userId, url, waitMs) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const requests = [];
    const processedRequests = new Set(); // Evita contar a mesma requisição duas vezes

    const listener = (request) => {
        // Ignora data URIs e requisições já processadas
        if (request.url().startsWith('data:') || processedRequests.has(request)) {
            return;
        }
        processedRequests.add(request);

        const timing = request.timing();
        // Para requisições que falham, a duração pode não ser calculável. Usamos -1.
        const duration = (timing.responseEnd > -1 && timing.startTime > -1)
            ? (timing.responseEnd - timing.startTime)
            : -1;

        requests.push({ url: request.url(), duration, resourceType: request.resourceType() });
    };

    // Ouve tanto requisições finalizadas quanto as que falharam
    page.on('requestfinished', listener);
    page.on('requestfailed', listener);

    const pageLoadStartTime = Date.now();
    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        if (waitMs > 0) {
            await page.waitForTimeout(waitMs);
        }
        const loadTime = Date.now() - pageLoadStartTime;
        return { userId, url, loadTime, requests };
    } catch (error) {
        return { userId, url, loadTime: Date.now() - pageLoadStartTime, requests, error };
    } finally {
        await context.close();
    }
}

module.exports = { simulateUser };