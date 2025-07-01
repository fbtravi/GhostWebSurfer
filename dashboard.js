// dashboard.js
const blessed = require('blessed');
const contrib = require('blessed-contrib');

class Dashboard {
    constructor(config, statsCollector) {
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'GhostWebSurfer - Load Simulation Dashboard',
        });

        // Increased number of rows to fit the new slow requests panel
        this.grid = new contrib.grid({ rows: 15, cols: 12, screen: this.screen });

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
        this.responseTimeData = { title: 'Response Time (s)', x: [], y: [], style: { line: 'cyan' } };

        // Top Row: Chart and Stats (shorter)
        this.lineChart = this.grid.set(1, 0, 4, 8, contrib.line, {
            label: 'Response Times (s) (last 50)',
            showLegend: true,
            legend: { width: 25 },
            style: { text: 'green', baseline: 'black' },
        });

        this.statsTable = this.grid.set(1, 8, 4, 4, contrib.table, {
            keys: true,
            fg: 'white',
            label: 'Request Stats',
            columnSpacing: 1,
            columnWidth: [18, 15],
            tags: true,
        });

        // Middle Row: Event Log (slightly smaller to make room)
        this.logPanel = this.grid.set(5, 0, 4, 8, contrib.log, {
            label: 'Event Log',
            fg: 'green',
            tags: true,
        });

        // New panel next to Event Log for top accessed domains
        this.domainTable = this.grid.set(5, 8, 4, 4, contrib.table, {
            keys: true,
            fg: 'white',
            label: 'Top Accessed Domains',
            columnSpacing: 1,
            columnWidth: [25, 8],
            tags: true,
        });

        // New Panel: Slowest Requests
        this.slowestRequestsTable = this.grid.set(9, 0, 4, 12, contrib.table, {
            keys: true,
            fg: 'white',
            label: 'Top Slowest Requests',
            columnSpacing: 1,
            columnWidth: [12, 120],
            tags: true,
        });

        // Bottom Row: Configuration and Status
        this.configPanel = this.grid.set(13, 0, 2, 8, blessed.box, {
            label: 'Configuration',
            tags: true,
            style: {
                fg: 'white',
                border: { fg: 'cyan' },
            },
        });

        this.statusPanel = this.grid.set(13, 8, 2, 4, blessed.box, {
            label: 'Status',
            tags: true,
            style: {
                fg: 'white',
                border: { fg: 'cyan' },
            },
        });

        this.currentStatus = 'Executing...';
        this.updateStatusPanel();

        this.clockInterval = setInterval(() => this.updateStatusPanel(), 1000);

        this.screen.render();

        this.screen.key(['escape', 'q', 'C-c'], () => {
            clearInterval(this.clockInterval);
            process.exit(0);
        });

        if (config) {
            // Build config string dynamically to display all variables
            const configItems = [];
            for (const [key, value] of Object.entries(config)) {
                if (typeof value === 'object' && !Array.isArray(value)) continue;

                let displayValue = value;
                if (Array.isArray(value)) {
                    displayValue = `[${value.length} items]`;
                }
                configItems.push(`{bold}${key}{/bold}: {white-fg}${displayValue}{/white-fg}`);
            }

            // Group config items into lines for better readability
            const lines = [];
            const itemsPerLine = 4;
            for (let i = 0; i < configItems.length; i += itemsPerLine) {
                const chunk = configItems.slice(i, i + itemsPerLine);
                lines.push(chunk.join(' | '));
            }
            const configContent = lines.join('\n');

            this.configPanel.setContent(configContent);
            this.screen.render();
        }
    }

    /**
     * Updates the dashboard with the result of a simulation.
     * @param {{userId: number, loadTime: number, requests: {url: string, duration: number, resourceType: string}[], error?: Error}} result
     */
    logUserResult({ userId, loadTime, requests, error }) {
        if (error) {
            this.logPanel.log(`{red-fg}ERROR{/red-fg} | User ${userId}: ${error.message.substring(0, 60)}...`);
        } else {
            const loadTimeInSeconds = (loadTime / 1000).toFixed(2);
            this.logPanel.log(`{green-fg}OK{/green-fg}    | User ${userId} finished in ${loadTimeInSeconds}s.`);
        }

        this.responseTimeData.x.push(userId.toString());
        this.responseTimeData.y.push(error ? 0 : loadTime / 1000);
        if (this.responseTimeData.x.length > 50) {
            this.responseTimeData.x.shift();
            this.responseTimeData.y.shift();
        }
        this.lineChart.setData([this.responseTimeData]);

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

        const topDomains = this.statsCollector.getTopDomains(10);
        const domainData = topDomains.map(item => [item.domain, String(item.count)]);
        this.domainTable.setData({
            headers: ['Domain', 'Count'],
            data: domainData,
        });

        this.screen.render();
    }

    logMessage(message) {
        this.logPanel.log(`{blue-fg}INFO  | ${message}{/blue-fg}`);
        this.screen.render();
    }

    /**
     * Updates the status panel with the current state and a clock.
     */
    updateStatusPanel() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US');
        const dateString = now.toLocaleDateString('en-US');
        const statusColor = this.currentStatus === 'Complete!' ? 'green-fg' : 'yellow-fg';

        const content = `{center}{${statusColor}}${this.currentStatus}{/${statusColor}}\n${dateString} ${timeString}{/center}`;
        this.statusPanel.setContent(content);
        this.screen.render();
    }

    setCompleteStatus(totalDurationSeconds) {
        clearInterval(this.clockInterval);
        this.currentStatus = 'Complete!';
        const finalContent = `{center}{green-fg}Complete!{/green-fg}\nFinished at ${new Date().toLocaleTimeString('en-US')}\nTotal Time: ${totalDurationSeconds}s\n\nPress q to exit.{/center}`;
        this.statusPanel.setContent(finalContent);
        this.logMessage('Simulation complete. Calculating final stats...');

        // Fill the table with the slowest requests
        const slowestRequests = this.statsCollector.getSlowestRequests(10);
        const tableData = slowestRequests.map(req => {
            const duration = `${req.duration.toFixed(0).padStart(7)} ms`;
            let url = req.url;
            if (url.length > 110) {
                url = url.substring(0, 107) + '...';
            }
            return [duration, url];
        });

        this.slowestRequestsTable.setData({
            headers: ['Duration', 'URL'],
            data: tableData,
        });

        this.screen.render();
    }
}

module.exports = Dashboard;
