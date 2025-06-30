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
            logEntry += `Load Time: ${loadTimeInSeconds}s\n`;
            const internalRequests = requests.filter(r => r.resourceType !== 'document' && r.duration >= 0);
            logEntry += `Internal Requests (${internalRequests.length}):\n`;
            const sortedRequests = [...internalRequests].sort((a, b) => b.duration - a.duration);
            logEntry += sortedRequests
                .map(r => `  - [${(r.duration / 1000).toFixed(3)}s] ${r.url.substring(0, 100)}`)
                .join('\n') + '\n\n';
        }
        this.logStream.write(logEntry);
    }

    /**
     * Writes the final summary report to the log file and closes the stream.
     */
    close() {
        const topDomains = this.statsCollector.getSlowestDomains(this.config.TOP_SLOWEST_DOMAINS);

        this.logStream.write('\n\n--- Simulation Summary ---\n');
        this.logStream.write(`\nTop ${topDomains.length} Slowest Domains (by average resource load time):\n`);
        this.logStream.write('------------------------------------------------------------------\n');
        topDomains.forEach(item => {
            const avgTime = `${item.avgTime.toFixed(0)} ms`.padEnd(10);
            this.logStream.write(`${avgTime} | ${item.domain}\n`);
        });
        this.logStream.write('------------------------------------------------------------------\n');
        this.logStream.end();
    }
}

module.exports = Logger;