// dashboard.js
const blessed = require('blessed');
const contrib = require('blessed-contrib');

class Dashboard {
    constructor(config, statsCollector) {
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
        this.config = config;
        this.statsCollector = statsCollector;
        // --- Data for the charts ---
        this.responseTimeData = { title: 'Response Time (s)', x: [], y: [], style: { line: 'cyan' } };

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
            label: `Slowest Domains (Top ${this.config.TOP_SLOWEST_DOMAINS})`,
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
        // The statsCollector has already processed the result.
        // This method is now only for updating the UI components.
        if (error) {
            this.logPanel.log(`{red-fg}ERROR{/red-fg} | User ${userId}: ${error.message.substring(0, 60)}...`);
        } else {
            const loadTimeInSeconds = (loadTime / 1000).toFixed(2);
            this.logPanel.log(`{green-fg}OK{/green-fg}    | User ${userId} finished in ${loadTimeInSeconds}s.`);
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
        const stats = this.statsCollector.getOverallStats();
        this.statsTable.setData({
            headers: ['Metric', 'Value'],
            data: [
                ['Successes', String(stats.successCount).padEnd(10)],
                ['Errors', String(stats.errorCount).padEnd(10)],
                ['Total Reqs', String(stats.totalRequests)],
                ['Avg Reqs/User', stats.avgRequestsPerUser],
                ['Avg Time/User', `${stats.avgTimeInSeconds} s`],
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
     * Calcula a média, ordena e atualiza a tabela de domínios mais lentos.
     */
    updateSlowestDomainsTable() {
        const topDomains = this.statsCollector.getSlowestDomains(
            this.config.TOP_SLOWEST_DOMAINS
        );
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