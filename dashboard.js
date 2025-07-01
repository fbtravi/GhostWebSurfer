// dashboard.js
const blessed = require('blessed');
const contrib = require('blessed-contrib');

class Dashboard {
    constructor(config, statsCollector) {
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'GhostWebSurfer - Load Simulation Dashboard',
        });

        // Aumentamos o número de linhas para acomodar o novo painel de requisições lentas
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
        // --- Data for the charts ---
        this.responseTimeData = { title: 'Response Time (s)', x: [], y: [], style: { line: 'cyan' } };

        // --- Widgets ---
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

        // Middle Row: Event Log (agora um pouco menor para dar espaço)
        this.logPanel = this.grid.set(5, 0, 4, 8, contrib.log, {
            label: 'Event Log',
            fg: 'green',
            tags: true,
        });

        // Novo painel ao lado do Event Log para os domínios mais acessados
        this.domainTable = this.grid.set(5, 8, 4, 4, contrib.table, {
            keys: true,
            fg: 'white',
            label: 'Top Accessed Domains',
            columnSpacing: 1,
            columnWidth: [25, 8], // Domain, Count
            tags: true,
        });

        // Novo Painel: Requisições mais lentas
        this.slowestRequestsTable = this.grid.set(9, 0, 4, 12, contrib.table, {
            keys: true,
            fg: 'white',
            label: 'Top Slowest Requests',
            columnSpacing: 1, // AJUSTADO: Alinhado com a outra tabela para corrigir bug de renderização.
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
            // O conteúdo é definido dinamicamente pelo relógio
            style: {
                fg: 'white',
                border: { fg: 'cyan' },
            },
        });

        this.currentStatus = 'Executing...';
        this.updateStatusPanel(); // Chamada inicial para exibir o status

        // Inicia um relógio para atualizar a data e hora a cada segundo
        this.clockInterval = setInterval(() => this.updateStatusPanel(), 1000);

        // Render the screen for the first time
        this.screen.render();

        // Allow exiting with 'q', 'escape', or 'Ctrl+C'
        this.screen.key(['escape', 'q', 'C-c'], () => {
            clearInterval(this.clockInterval); // Garante que o processo termine limpo
            process.exit(0);
        });

        if (config) {
            // Constrói a string de configuração dinamicamente para exibir todas as variáveis.
            const configItems = [];
            for (const [key, value] of Object.entries(config)) {
                // Pula objetos complexos para uma exibição mais limpa no dashboard.
                if (typeof value === 'object' && !Array.isArray(value)) continue;

                let displayValue = value;
                if (Array.isArray(value)) {
                    displayValue = `[${value.length} items]`; // Mostra a contagem de arrays para economizar espaço
                }
                configItems.push(`{bold}${key}{/bold}: {white-fg}${displayValue}{/white-fg}`);
            }

            // Agrupa os itens de configuração em linhas para melhor legibilidade.
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

        // Update top domains table
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
     * Atualiza o painel de status com o estado atual e um relógio.
     */
    updateStatusPanel() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-BR');
        const dateString = now.toLocaleDateString('pt-BR');
        const statusColor = this.currentStatus === 'Complete!' ? 'green-fg' : 'yellow-fg';

        const content = `{center}{${statusColor}}${this.currentStatus}{/${statusColor}}\n${dateString} ${timeString}{/center}`;
        this.statusPanel.setContent(content);
        this.screen.render();
    }

    setCompleteStatus(totalDurationSeconds) {
        clearInterval(this.clockInterval); // Para o relógio
        this.currentStatus = 'Complete!';
        const finalContent = `{center}{green-fg}Complete!{/green-fg}\nFinished at ${new Date().toLocaleTimeString('pt-BR')}\nTotal Time: ${totalDurationSeconds}s\n\nPress q to exit.{/center}`;
        this.statusPanel.setContent(finalContent);
        this.logMessage('Simulation complete. Calculating final stats...');

        // Adicionado: Preenche a tabela com as requisições mais lentas
        const slowestRequests = this.statsCollector.getSlowestRequests(10);
        const tableData = slowestRequests.map(req => {
            // Removido o código de cor ({yellow-fg}) que estava causando um bug de renderização na tabela.
            const duration = `${req.duration.toFixed(0).padStart(7)} ms`;
            // Trunca a URL para caber no painel, se necessário
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