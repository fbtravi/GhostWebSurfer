// stats_collector.js

/**
 * Collects and processes statistics from multiple simulation runs.
 */
class StatsCollector {
    constructor(config) {
        this.config = config;
        this.successCount = 0;
        this.errorCount = 0;
        this.totalLoadTime = 0;
        this.totalRequests = 0;
        this.urlStats = {}; // To track stats for each URL
        this.resourceTypeCounts = {}; // To count resource types for the pie chart
    }

    /**
     * Processes the result of a single user simulation.
     * @param {{loadTime: number, requests: {url: string, duration: number, resourceType: string}[], error?: Error}} result
     */
    processResult({ loadTime, requests, error }) {
        if (error) {
            this.errorCount++;
        } else {
            this.successCount++;
            this.totalLoadTime += loadTime;
        }

        this.totalRequests += requests.length;

        requests.forEach(req => {
            const { url, duration, resourceType } = req;

            // --- Logic for Slowest URLs ---
            const urlHostname = new URL(url).hostname;
            if (duration >= this.config.MIN_DURATION_FOR_SLOWEST_MS && !this.config.EXCLUDED_DOMAINS.includes(urlHostname)) {
                if (!this.urlStats[url]) {
                    this.urlStats[url] = { totalTime: 0, count: 0 };
                }
                this.urlStats[url].totalTime += duration;
                this.urlStats[url].count++;
            }

            // --- Logic for Resource Type Pie Chart ---
            if (resourceType) {
                this.resourceTypeCounts[resourceType] = (this.resourceTypeCounts[resourceType] || 0) + 1;
            }
        });
    }

    /**
     * Calculates and returns the top N slowest URLs based on average response time.
     * @param {number} topN - The number of slowest URLs to return.
     * @returns {{url: string, avgTime: number}[]}
     */
    getSlowestUrls(topN) {
        return Object.entries(this.urlStats)
            .map(([url, stats]) => ({
                url,
                avgTime: stats.totalTime / stats.count,
            }))
            .sort((a, b) => b.avgTime - a.avgTime)
            .slice(0, topN);
    }

    /**
     * Returns the counts of each resource type.
     * @returns {Object.<string, number>}
     */
    getResourceTypeCounts() {
        return this.resourceTypeCounts;
    }

    /**
     * Calculates and returns overall summary statistics.
     * @returns {{successCount: number, errorCount: number, totalRequests: number, avgRequestsPerUser: string, avgTimeInSeconds: string}}
     */
    getOverallStats() {
        const totalRuns = this.successCount + this.errorCount;
        const avgRequestsPerUser = totalRuns > 0 ? (this.totalRequests / totalRuns).toFixed(1) : '0.0';
        const avgTimeInSeconds = this.successCount > 0 ? (this.totalLoadTime / this.successCount / 1000).toFixed(2) : '0.00';

        return {
            successCount: this.successCount,
            errorCount: this.errorCount,
            totalRequests: this.totalRequests,
            avgRequestsPerUser,
            avgTimeInSeconds,
        };
    }
}

module.exports = StatsCollector;