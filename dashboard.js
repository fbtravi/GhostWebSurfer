// dashboard.js
const blessed = require('blessed');
const contrib = require('blessed-contrib');

class Dashboard {
    constructor(config) {
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'GhostWebSurfer - Load Simulation Dashboard',
        });

        this.grid = new contrib.grid({ rows: 13, cols: 12, screen: this.screen });

        this.grid.set(0, 0, 1, 12, blessed.box, {
            content: '{center}{bold}GhostWebSurfer{/bold}{/center}',
            tags: true,
            style: {
                fg: 'white',
                bg: 'blue',
            },
        });
        // --- Data for the charts ---
        this.responseTimeData = { title: 'Response Time (s)', x: [], y: [], style: { line: 'cyan' } };
        this.successCount = 0;
        this.errorCount = 0;
        this.totalRequests = 0;
        this.totalTime = 0;
        this.domainTimes = new Map(); // Para rastrear os tempos de requisição por domínio

        // --- Widgets ---
        this.lineChart = this.grid.set(1, 0, 5, 8, contrib.line, {
            label: 'Response Times (s) (last 50)',
            showLegend: true,
            legend: { width: 25 },
            style: { text: 'green', baseline: 'black' },
        });

        this.statsTable = this.grid.set(1, 8, 5, 4, contrib.table, {
            keys: true,
            fg: 'white',
            label: 'Request Stats',
            columnSpacing: 1,
            columnWidth: [18, 15],
            tags: true,
        });

        this.logPanel = this.grid.set(6, 0, 4, 8, contrib.log, {
            label: 'Event Log',
            fg: 'green',
            tags: true,
        });

        this.slowestDomainsTable = this.grid.set(6, 8, 4, 4, contrib.table, {
            keys: true,
            fg: 'white',
            label: 'Slowest Domains (Avg ms)',
            columnSpacing: 1,
            columnWidth: [25, 10],
            tags: true,
        });

        this.configTable = this.grid.set(10, 0, 3, 8, contrib.table, {
            keys: true,
            fg: 'white',
            label: 'Configuration',
            columnSpacing: 1,
            columnWidth: [15, 50],
        });

        this.statusPanel = this.grid.set(10, 8, 3, 4, blessed.box, {
            label: 'Status',
            tags: true,
            content: '{center}{yellow-fg}Executing...{/yellow-fg}{/center}',
            style: {
                fg: 'white',
                border: { fg: 'cyan' },
            },
        });

        // Render the screen for the first time
        this.screen.render();

        // Allow exiting with 'q', 'escape', or 'Ctrl+C'
        this.screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

        if (config) {
            // Dynamically truncate the URL based on the column width
            const valueColWidth = this.configTable.options.columnWidth[1];
            const url = config.URL.length > valueColWidth
                ? `${config.URL.substring(0, valueColWidth - 3)}...`
                : config.URL;
            this.configTable.setData({
                headers: ['Setting', 'Value'],
                data: [
                    ['URL', url],
                    ['Total Users', config.TOTAL_USERS],
                    ['Concurrency', config.CONCURRENCY],
                    ['Wait (ms)', config.WAIT_MS],
                ],
            });
            this.screen.render();
        }
    }

    /**
     * Updates the dashboard with the result of a simulation.
     * @param {{userId: number, loadTime: number, requests: {url: string, duration: number, resourceType: string}[], error?: Error}} result
     */
    logUserResult({ userId, loadTime, requests, error }) {
        if (error) {
            this.errorCount++;
            this.logPanel.log(`{red-fg}ERROR{/red-fg} | User ${userId}: ${error.message.substring(0, 60)}...`);
        } else {
            this.successCount++;
            // Apenas adicione ao tempo total para execuções bem-sucedidas para calcular uma média significativa
            this.totalTime += loadTime;
            const loadTimeInSeconds = (loadTime / 1000).toFixed(2);
            this.logPanel.log(`{green-fg}OK{/green-fg}    | User ${userId} finished in ${loadTimeInSeconds}s.`);
        }

        // Conta as requisições de simulações de usuário bem-sucedidas e com falha
        if (requests) {
            this.totalRequests += requests.length;
            this.updateDomainTimes(requests);
        }

        // Update line chart
        this.responseTimeData.x.push(userId.toString());
        this.responseTimeData.y.push(error ? 0 : loadTime / 1000);
        if (this.responseTimeData.x.length > 50) { // Keep only the last 50 data points
            this.responseTimeData.x.shift();
            this.responseTimeData.y.shift();
        }
        this.lineChart.setData([this.responseTimeData]);

        // Update stats table
        const totalUsersProcessed = this.successCount + this.errorCount;
        const avgRequests = totalUsersProcessed > 0 ? (this.totalRequests / totalUsersProcessed).toFixed(1) : '0.0';
        const avgTimeInSeconds = this.successCount > 0 ? (this.totalTime / this.successCount / 1000).toFixed(2) : '0.00';
        this.statsTable.setData({
            headers: ['Metric', 'Value'],
            data: [
                ['Successes', String(this.successCount).padEnd(10)],
                ['Errors', String(this.errorCount).padEnd(10)],
                ['Total Reqs', String(this.totalRequests)],
                ['Avg Reqs/User', avgRequests],
                ['Avg Time/User', `${avgTimeInSeconds} s`],
            ],
        });

        this.updateSlowestDomainsTable();

        this.screen.render();
    }

    logMessage(message) {
        this.logPanel.log(`{blue-fg}INFO  | ${message}{/blue-fg}`);
        this.screen.render();
    }

    /**
     * Processa as requisições para calcular o tempo total e a contagem por domínio.
     * @param {{url: string, duration: number}[]} requests
     */
    updateDomainTimes(requests) {
        for (const req of requests) {
            if (req.duration < 0) continue; // Ignora requisições com duração inválida
            try {
                const url = new URL(req.url);
                const domain = url.hostname;
                const stats = this.domainTimes.get(domain) || { totalTime: 0, count: 0 };
                stats.totalTime += req.duration;
                stats.count++;
                this.domainTimes.set(domain, stats);
            } catch (e) {
                // Ignora URLs inválidas (ex: 'about:blank')
            }
        }
    }

    /**
     * Calcula a média, ordena e atualiza a tabela de domínios mais lentos.
     */
    updateSlowestDomainsTable() {
        const domainAverages = [];
        for (const [domain, stats] of this.domainTimes.entries()) {
            domainAverages.push({ domain, avgTime: stats.totalTime / stats.count });
        }

        domainAverages.sort((a, b) => b.avgTime - a.avgTime); // Ordena do mais lento para o mais rápido

        const topDomains = domainAverages.slice(0, 10); // Pega os 10 piores
        const data = topDomains.map(item => [
            item.domain.substring(0, 23),
            `${item.avgTime.toFixed(0)} ms`,
        ]);

        this.slowestDomainsTable.setData({ headers: ['Domain', 'Avg (ms)'], data });
    }

    setCompleteStatus() {
        this.statusPanel.setContent('{center}{green-fg}Complete!{/green-fg}\n\nPress q or Ctrl+C to exit.{/center}');
        this.logPanel.log(`{blue-fg}INFO  | Simulation complete.{/blue-fg}`);
        this.screen.render();
    }
}

module.exports = Dashboard;