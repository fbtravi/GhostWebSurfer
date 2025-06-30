// analysis.js

/**
 * Collects, processes, and provides statistics from simulation runs.
 */
class StatsCollector {
    constructor() {
        this.successCount = 0;
        this.errorCount = 0;
        this.totalRequests = 0;
        this.totalLoadTime = 0; // Only for successful runs
        this.domainTimes = new Map(); // { totalTime: number, count: number }
    }

    /**
     * Processes a single user simulation result to update statistics.
     * @param {{loadTime: number, requests: {url: string, duration: number}[], error?: Error}} result
     */
    processResult({ loadTime, requests, error }) {
        if (error) {
            this.errorCount++;
        } else {
            this.successCount++;
            this.totalLoadTime += loadTime;
        }

        if (requests) {
            this.totalRequests += requests.length;
            this._updateDomainTimes(requests);
        }
    }

    /**
     * Internal method to process requests and aggregate domain timings.
     * @param {{url: string, duration: number}[]} requests
     */
    _updateDomainTimes(requests) {
        for (const req of requests) {
            if (req.duration < 0) continue; // Ignore requests with invalid duration
            try {
                const url = new URL(req.url);
                const domain = url.hostname;
                const stats = this.domainTimes.get(domain) || { totalTime: 0, count: 0 };
                stats.totalTime += req.duration;
                stats.count++;
                this.domainTimes.set(domain, stats);
            } catch (e) {
                // Ignore invalid URLs (e.g., 'about:blank')
            }
        }
    }

    /**
     * Calculates and returns overall simulation statistics.
     * @returns {{successCount: number, errorCount: number, totalRequests: number, avgRequestsPerUser: string, avgTimeInSeconds: string}}
     */
    getOverallStats() {
        const totalUsersProcessed = this.successCount + this.errorCount;
        const avgRequestsPerUser = totalUsersProcessed > 0 ? (this.totalRequests / totalUsersProcessed).toFixed(1) : '0.0';
        const avgTimeInSeconds = this.successCount > 0 ? (this.totalLoadTime / this.successCount / 1000).toFixed(2) : '0.00';

        return { successCount: this.successCount, errorCount: this.errorCount, totalRequests: this.totalRequests, avgRequestsPerUser, avgTimeInSeconds };
    }

    /**
     * Calculates, sorts, and returns the slowest domains.
     * @param {number} count - The number of slowest domains to return.
     * @returns {{domain: string, avgTime: number}[]}
     */
    getSlowestDomains(count) {
        const domainAverages = Array.from(this.domainTimes.entries()).map(([domain, stats]) => ({ domain, avgTime: stats.totalTime / stats.count }));
        domainAverages.sort((a, b) => b.avgTime - a.avgTime);
        return domainAverages.slice(0, count);
    }
}

module.exports = StatsCollector;