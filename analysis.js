// analysis.js

/**
 * Collects and processes statistics from all user simulations.
 */
class StatsCollector {
    constructor(config) {
        this.config = config;
        this.successCount = 0;
        this.errorCount = 0;
        this.totalLoadTime = 0;
        this.totalRequests = 0;
        this.allRequests = []; // Stores all requests from all simulations
        this.domainCounts = {}; // Stores the request count per domain
    }

    /**
     * Processes the result of a single user simulation.
     * @param {{loadTime: number, requests: {url: string, duration: number}[], error?: Error}} result
     */
    processResult({ loadTime, requests, error }) {
        if (error) {
            this.errorCount++;
        } else {
            this.successCount++;
            this.totalLoadTime += loadTime;
        }

        // Counts ALL requests (including background) for the overall total.
        this.totalRequests += requests.length;

        // Adds to analysis list (for "slowest requests") only those
        // with valid duration and NOT excluded types.
        const excludeResourceTypes = this.config.EXCLUDE_RESOURCE_TYPES || [];
        for (const req of requests) {
            try {
                const url = new URL(req.url);
                const domain = url.hostname;
                this.domainCounts[domain] = (this.domainCounts[domain] || 0) + 1;
            } catch (e) {
                // Ignores invalid URLs that can't be processed (e.g., data URIs)
            }

            if (req.duration > -1 && !excludeResourceTypes.includes(req.resourceType)) {
                this.allRequests.push(req);
            }
        }
    }

    getOverallStats() {
        const totalSimulations = this.successCount + this.errorCount;
        const avgTimeInSeconds = this.successCount > 0 ? (this.totalLoadTime / this.successCount / 1000).toFixed(2) : '0.00';
        const avgRequestsPerUser = totalSimulations > 0 ? (this.totalRequests / totalSimulations).toFixed(2) : '0.00';

        return {
            successCount: this.successCount,
            errorCount: this.errorCount,
            totalRequests: this.totalRequests,
            avgRequestsPerUser,
            avgTimeInSeconds,
        };
    }

    /**
     * Gets the N slowest requests from all simulations.
     * @param {number} count - The number of slowest requests to return.
     * @returns {{url: string, duration: number}[]}
     */
    getSlowestRequests(count = 10) {
        return this.allRequests
            .sort((a, b) => b.duration - a.duration)
            .slice(0, count);
    }

    /**
     * Gets the N most accessed domains from all simulations.
     * @param {number} count - The number of domains to return.
     * @returns {{domain: string, count: number}[]}
     */
    getTopDomains(count = 10) {
        return Object.entries(this.domainCounts)
            .map(([domain, count]) => ({ domain, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, count);
    }
}

module.exports = StatsCollector;