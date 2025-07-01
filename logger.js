// logger.js
const fs = require('fs');

/**
 * Handles logging user results to a file and writing a final summary.
 */
class Logger {
    constructor(config, statsCollector) {
        // 'w' flag overwrites the file on each run. Use 'a' to append.
        this.logStream = fs.createWriteStream(config.LOG_FILE, { flags: 'w' });
        this.config = config;
        this.statsCollector = statsCollector;
    }

    // This method now only focuses on formatting the output for a single user.
    logUserResult({ userId, url, loadTime, requests, error }) {
        let logEntry = `--- User ${userId} ---\n`;
        if (error) {
            logEntry += `ERROR: ${error.message}\n\n`;
        } else {
            const loadTimeInSeconds = (loadTime / 1000).toFixed(3);
            logEntry += `URL: ${url}\n`;
            logEntry += `Total Load Time: ${loadTimeInSeconds}s\n`;
            // Loga todas as requisições capturadas com duração válida, ordenadas pela mais lenta.
            const validRequests = requests.filter(r => r.duration >= 0);
            logEntry += `Captured Requests (${validRequests.length}):\n`;
            logEntry += [...validRequests].sort((a, b) => b.duration - a.duration)
                .map(r => `  - [${(r.duration / 1000).toFixed(3)}s] ${r.url.substring(0, 100)}`)
                .join('\n') + '\n\n';
        }
        this.logStream.write(logEntry);
    }

    /**
     * Writes the final summary report to the log file and closes the stream.
     */
    close(totalDurationSeconds) {
        const summary = [];
        summary.push('\n\n--- Simulation Summary ---');
        summary.push(`Total Duration: ${totalDurationSeconds}s`);

        const stats = this.statsCollector.getOverallStats();
        summary.push(''); // Linha em branco
        summary.push('Overall Stats:');
        summary.push(`  - Successes      : ${stats.successCount}`);
        summary.push(`  - Errors         : ${stats.errorCount}`);
        summary.push(`  - Total Requests : ${stats.totalRequests}`);
        summary.push(`  - Avg Reqs/User  : ${stats.avgRequestsPerUser}`);
        summary.push(`  - Avg Time/User  : ${stats.avgTimeInSeconds}s`);

        const slowestRequests = this.statsCollector.getSlowestRequests(10);
        if (slowestRequests.length > 0) {
            summary.push(''); // Linha em branco
            summary.push('--- Top 10 Slowest Requests ---');
            slowestRequests.forEach(req => {
                const durationStr = `${req.duration.toFixed(0)}ms`.padStart(8);
                summary.push(`${durationStr} | ${req.url}`);
            });
        }

        summary.push('--------------------------\n');

        this.logStream.write(summary.join('\n'));
        this.logStream.end();
    }
}

module.exports = Logger;