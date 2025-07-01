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
    // Criamos um contexto de navegador mais realista para evitar detecção de bot.
    // Alguns sites servem conteúdo diferente (ou nenhum) para scripts automatizados.
    // Definir um User-Agent e um Viewport comuns ajuda a simular um usuário real.
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        viewport: {
            width: 1920,
            height: 1080,
        },
        // Adicionado: Bloqueia service workers. Sites que usam service workers para cache
        // podem impedir a captura correta do tempo das requisições de rede.
        serviceWorkers: 'block',
    });
    const page = await context.newPage();

    // Adicionado: Define cabeçalhos para desabilitar o cache em cada requisição.
    // Isso força o carregamento dos recursos pela rede, garantindo a medição do tempo.
    await page.setExtraHTTPHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    });

    const requests = [];
    const processedRequests = new Set(); // Avoids counting the same request twice
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
        // Etapa 1: Navega e espera pelo evento 'load'. É rápido e confiável.
        // O listener 'requestfinished' cuidará de capturar a requisição principal e todas as outras.
        await page.goto(url, { waitUntil: 'load', timeout });

        // Etapa 2: Após o 'load', espera a rede ficar ociosa.
        // Isso captura requisições de analytics, trackers e outras chamadas assíncronas.
        // Envolvemos em um try/catch pois algumas páginas nunca ficam 100% ociosas.
        try {
            await page.waitForLoadState('networkidle', { timeout: 15000 }); // Dá 15s para a rede acalmar
        } catch (e) {
            // Não há problema se estourar o tempo. Já capturamos a maioria das requisições.
            // O log pode ser habilitado aqui para depuração, se necessário.
        }

        // Etapa 3: Uma espera explícita adicional, se configurada.
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