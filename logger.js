// logger.js
const fs = require('fs');
const path = require('path');

class Logger {
    constructor(logFilePath) {
        // Ensures the log path is absolute
        this.logStream = fs.createWriteStream(path.resolve(logFilePath), { flags: 'a' });
    }

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

    close() {
        this.logStream.end();
    }
}

module.exports = Logger;