/**
 * Performance Monitoring and Error Tracking System for Rando Website
 * Monitors load times, tracks errors, and ensures optimal performance
 */

console.log('⚡ Loading Performance Monitoring System...');

// ===== PERFORMANCE MONITORING =====

/**
 * Performance metrics tracking
 */
const performanceTracker = {
    metrics: {},
    thresholds: {
        loadTime: 3000, // 3 seconds
        firstContentfulPaint: 1500, // 1.5 seconds
        largestContentfulPaint: 2500, // 2.5 seconds
        cumulativeLayoutShift: 0.1,
        firstInputDelay: 100 // 100ms
    },
    
    /**
     * Initialize performance monitoring
     */
    init() {
        console.log('📊 Initializing performance monitoring...');
        
        // Monitor page load
        this.monitorPageLoad();
        
        // Monitor Core Web Vitals
        this.monitorCoreWebVitals();
        
        // Monitor resource loading
        this.monitorResourceLoading();
        
        // Monitor user interactions
        this.monitorUserInteractions();
        
        // Set up periodic reporting
        this.setupPeriodicReporting();
        
        console.log('✅ Performance monitoring initialized');
    },
    
    /**
     * Monitor page load performance
     */
    monitorPageLoad() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.measurePageLoadMetrics();
            }, 0);
        });
        
        // Also monitor DOMContentLoaded
        document.addEventListener('DOMContentLoaded', () => {
            this.metrics.domContentLoaded = performance.now();
        });
    },
    
    /**
     * Measure page load metrics
     */
    measurePageLoadMetrics() {
        if (!performance.getEntriesByType) {
            console.warn('⚠️ Performance API not fully supported');
            return;
        }
        
        const navigation = performance.getEntriesByType('navigation')[0];
        
        if (navigation) {
            this.metrics.pageLoad = {
                dns: navigation.domainLookupEnd - navigation.domainLookupStart,
                tcp: navigation.connectEnd - navigation.connectStart,
                ssl: navigation.secureConnectionStart ? navigation.connectEnd - navigation.secureConnectionStart : 0,
                request: navigation.responseStart - navigation.requestStart,
                response: navigation.responseEnd - navigation.responseStart,
                domProcessing: navigation.domContentLoadedEventStart - navigation.responseEnd,
                domComplete: navigation.domComplete - navigation.navigationStart,
                loadComplete: navigation.loadEventEnd - navigation.navigationStart,
                totalTime: navigation.loadEventEnd - navigation.navigationStart
            };
            
            // Check if load time meets threshold
            const loadTimeSeconds = this.metrics.pageLoad.totalTime / 1000;
            this.metrics.pageLoad.meetsThreshold = loadTimeSeconds <= (this.thresholds.loadTime / 1000);
            
            console.log('📊 Page Load Metrics:', this.metrics.pageLoad);
            
            if (!this.metrics.pageLoad.meetsThreshold) {
                console.warn(`⚠️ Page load time (${loadTimeSeconds.toFixed(2)}s) exceeds 3s threshold`);
                this.reportPerformanceIssue('slow_page_load', {
                    loadTime: loadTimeSeconds,
                    threshold: this.thresholds.loadTime / 1000
                });
            } else {
                console.log(`✅ Page load time: ${loadTimeSeconds.toFixed(2)}s (under 3s threshold)`);
            }
        }
    },
    
    /**
     * Monitor Core Web Vitals
     */
    monitorCoreWebVitals() {
        // First Contentful Paint (FCP)
        this.observePerformanceEntry('paint', (entries) => {
            entries.forEach(entry => {
                if (entry.name === 'first-contentful-paint') {
                    this.metrics.firstContentfulPaint = entry.startTime;
                    
                    if (entry.startTime > this.thresholds.firstContentfulPaint) {
                        this.reportPerformanceIssue('slow_fcp', {
                            fcp: entry.startTime,
                            threshold: this.thresholds.firstContentfulPaint
                        });
                    }
                }
            });
        });
        
        // Largest Contentful Paint (LCP)
        this.observePerformanceEntry('largest-contentful-paint', (entries) => {
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
                this.metrics.largestContentfulPaint = lastEntry.startTime;
                
                if (lastEntry.startTime > this.thresholds.largestContentfulPaint) {
                    this.reportPerformanceIssue('slow_lcp', {
                        lcp: lastEntry.startTime,
                        threshold: this.thresholds.largestContentfulPaint
                    });
                }
            }
        });
        
        // Cumulative Layout Shift (CLS)
        this.observePerformanceEntry('layout-shift', (entries) => {
            let clsScore = 0;
            
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsScore += entry.value;
                }
            });
            
            this.metrics.cumulativeLayoutShift = clsScore;
            
            if (clsScore > this.thresholds.cumulativeLayoutShift) {
                this.reportPerformanceIssue('high_cls', {
                    cls: clsScore,
                    threshold: this.thresholds.cumulativeLayoutShift
                });
            }
        });
        
        // First Input Delay (FID)
        this.observePerformanceEntry('first-input', (entries) => {
            const firstInput = entries[0];
            if (firstInput) {
                this.metrics.firstInputDelay = firstInput.processingStart - firstInput.startTime;
                
                if (this.metrics.firstInputDelay > this.thresholds.firstInputDelay) {
                    this.reportPerformanceIssue('high_fid', {
                        fid: this.metrics.firstInputDelay,
                        threshold: this.thresholds.firstInputDelay
                    });
                }
            }
        });
    },
    
    /**
     * Observe performance entries
     */
    observePerformanceEntry(type, callback) {
        if (!window.PerformanceObserver) {
            console.warn(`⚠️ PerformanceObserver not supported for ${type}`);
            return;
        }
        
        try {
            const observer = new PerformanceObserver((list) => {
                callback(list.getEntries());
            });
            
            observer.observe({ entryTypes: [type] });
        } catch (error) {
            console.warn(`⚠️ Could not observe ${type}:`, error.message);
        }
    },
    
    /**
     * Monitor resource loading
     */
    monitorResourceLoading() {
        this.observePerformanceEntry('resource', (entries) => {
            entries.forEach(entry => {
                const duration = entry.responseEnd - entry.startTime;
                
                // Track slow resources
                if (duration > 1000) {
                    this.reportPerformanceIssue('slow_resource', {
                        url: entry.name,
                        duration: duration,
                        type: entry.initiatorType
                    });
                }
                
                // Track failed resources
                if (entry.transferSize === 0 && entry.decodedBodySize === 0) {
                    this.reportPerformanceIssue('failed_resource', {
                        url: entry.name,
                        type: entry.initiatorType
                    });
                }
            });
        });
    },
    
    /**
     * Monitor user interactions
     */
    monitorUserInteractions() {
        // Track click response times
        document.addEventListener('click', (event) => {
            const startTime = performance.now();
            
            // Use requestAnimationFrame to measure response time
            requestAnimationFrame(() => {
                const responseTime = performance.now() - startTime;
                
                if (responseTime > 16) { // More than one frame at 60fps
                    this.reportPerformanceIssue('slow_interaction', {
                        element: event.target.tagName,
                        responseTime: responseTime
                    });
                }
            });
        });
        
        // Track scroll performance
        let scrollStartTime;
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            if (!scrollStartTime) {
                scrollStartTime = performance.now();
            }
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollDuration = performance.now() - scrollStartTime;
                
                if (scrollDuration > 100) {
                    this.reportPerformanceIssue('janky_scroll', {
                        duration: scrollDuration
                    });
                }
                
                scrollStartTime = null;
            }, 50);
        });
    },
    
    /**
     * Set up periodic reporting
     */
    setupPeriodicReporting() {
        // Report metrics every 30 seconds
        setInterval(() => {
            this.generatePerformanceReport();
        }, 30000);
        
        // Report when page becomes hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.generatePerformanceReport();
            }
        });
    },
    
    /**
     * Report performance issue
     */
    reportPerformanceIssue(type, data) {
        console.warn(`⚠️ Performance Issue: ${type}`, data);
        
        // Store issue for reporting
        if (!this.metrics.issues) {
            this.metrics.issues = [];
        }
        
        this.metrics.issues.push({
            type,
            data,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        });
        
        // Trigger error tracking
        errorTracker.logPerformanceIssue(type, data);
    },
    
    /**
     * Generate performance report
     */
    generatePerformanceReport() {
        const report = {
            timestamp: Date.now(),
            url: window.location.href,
            metrics: this.metrics,
            thresholds: this.thresholds,
            userAgent: navigator.userAgent,
            connection: this.getConnectionInfo()
        };
        
        console.log('📊 Performance Report:', report);
        
        // Store report locally
        this.storeReport(report);
        
        return report;
    },
    
    /**
     * Get connection information
     */
    getConnectionInfo() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            return {
                effectiveType: conn.effectiveType,
                downlink: conn.downlink,
                rtt: conn.rtt,
                saveData: conn.saveData
            };
        }
        return null;
    },
    
    /**
     * Store performance report
     */
    storeReport(report) {
        try {
            const reports = JSON.parse(localStorage.getItem('performance_reports') || '[]');
            reports.push(report);
            
            // Keep only last 10 reports
            if (reports.length > 10) {
                reports.splice(0, reports.length - 10);
            }
            
            localStorage.setItem('performance_reports', JSON.stringify(reports));
        } catch (error) {
            console.warn('⚠️ Could not store performance report:', error.message);
        }
    }
};

// ===== ERROR TRACKING =====

/**
 * Error tracking and logging system
 */
const errorTracker = {
    errors: [],
    maxErrors: 50,
    
    /**
     * Initialize error tracking
     */
    init() {
        console.log('🐛 Initializing error tracking...');
        
        // Track JavaScript errors
        this.trackJavaScriptErrors();
        
        // Track unhandled promise rejections
        this.trackPromiseRejections();
        
        // Track resource loading errors
        this.trackResourceErrors();
        
        // Track custom errors
        this.setupCustomErrorTracking();
        
        console.log('✅ Error tracking initialized');
    },
    
    /**
     * Track JavaScript errors
     */
    trackJavaScriptErrors() {
        window.addEventListener('error', (event) => {
            this.logError('javascript_error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error ? event.error.stack : null
            });
        });
    },
    
    /**
     * Track unhandled promise rejections
     */
    trackPromiseRejections() {
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('promise_rejection', {
                reason: event.reason,
                promise: event.promise,
                stack: event.reason && event.reason.stack ? event.reason.stack : null
            });
        });
    },
    
    /**
     * Track resource loading errors
     */
    trackResourceErrors() {
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.logError('resource_error', {
                    element: event.target.tagName,
                    source: event.target.src || event.target.href,
                    type: event.target.type
                });
            }
        }, true);
    },
    
    /**
     * Set up custom error tracking
     */
    setupCustomErrorTracking() {
        // Override console.error to track custom errors
        const originalConsoleError = console.error;
        console.error = (...args) => {
            this.logError('console_error', {
                message: args.join(' '),
                stack: new Error().stack
            });
            originalConsoleError.apply(console, args);
        };
    },
    
    /**
     * Log error
     */
    logError(type, details) {
        const error = {
            type,
            details,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
        
        console.error(`🐛 Error tracked: ${type}`, error);
        
        // Store error
        this.errors.push(error);
        
        // Limit stored errors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        // Store in localStorage
        this.storeErrors();
        
        // Report critical errors immediately
        if (this.isCriticalError(type)) {
            this.reportCriticalError(error);
        }
    },
    
    /**
     * Log performance issue
     */
    logPerformanceIssue(type, data) {
        this.logError('performance_issue', {
            performanceType: type,
            data: data
        });
    },
    
    /**
     * Check if error is critical
     */
    isCriticalError(type) {
        const criticalTypes = [
            'javascript_error',
            'promise_rejection',
            'resource_error'
        ];
        return criticalTypes.includes(type);
    },
    
    /**
     * Report critical error
     */
    reportCriticalError(error) {
        console.error('🚨 Critical Error Detected:', error);
        
        // In a real application, you would send this to your error reporting service
        // For now, we'll just log it prominently
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.showErrorNotification(error);
        }
    },
    
    /**
     * Show error notification in development
     */
    showErrorNotification(error) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 1rem;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.8rem;
            max-width: 300px;
            z-index: 10001;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;
        
        notification.innerHTML = `
            <strong>🚨 Error Detected</strong><br>
            Type: ${error.type}<br>
            Message: ${error.details.message || 'Unknown error'}<br>
            <button onclick="this.parentElement.remove()" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 2px; cursor: pointer;">Dismiss</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    },
    
    /**
     * Store errors in localStorage
     */
    storeErrors() {
        try {
            localStorage.setItem('error_log', JSON.stringify(this.errors));
        } catch (error) {
            console.warn('⚠️ Could not store error log:', error.message);
        }
    },
    
    /**
     * Get error summary
     */
    getErrorSummary() {
        const summary = {
            totalErrors: this.errors.length,
            errorTypes: {},
            recentErrors: this.errors.slice(-5),
            criticalErrors: this.errors.filter(e => this.isCriticalError(e.type))
        };
        
        this.errors.forEach(error => {
            summary.errorTypes[error.type] = (summary.errorTypes[error.type] || 0) + 1;
        });
        
        return summary;
    },
    
    /**
     * Clear error log
     */
    clearErrors() {
        this.errors = [];
        localStorage.removeItem('error_log');
        console.log('🧹 Error log cleared');
    }
};

// ===== REPORTING SYSTEM =====

/**
 * Generate comprehensive performance and error report
 */
function generatePerformanceAndErrorReport() {
    console.log('📊 Generating Performance and Error Report...');
    console.log('=============================================');
    
    // Performance metrics
    const performanceReport = performanceTracker.generatePerformanceReport();
    
    console.log('\n⚡ PERFORMANCE METRICS:');
    if (performanceReport.metrics.pageLoad) {
        const load = performanceReport.metrics.pageLoad;
        console.log(`   Page Load Time: ${(load.totalTime / 1000).toFixed(2)}s`);
        console.log(`   DNS Lookup: ${load.dns.toFixed(2)}ms`);
        console.log(`   TCP Connection: ${load.tcp.toFixed(2)}ms`);
        console.log(`   Request/Response: ${(load.request + load.response).toFixed(2)}ms`);
        console.log(`   DOM Processing: ${load.domProcessing.toFixed(2)}ms`);
        console.log(`   Meets 3s Threshold: ${load.meetsThreshold ? '✅' : '❌'}`);
    }
    
    if (performanceReport.metrics.firstContentfulPaint) {
        console.log(`   First Contentful Paint: ${(performanceReport.metrics.firstContentfulPaint / 1000).toFixed(2)}s`);
    }
    
    if (performanceReport.metrics.largestContentfulPaint) {
        console.log(`   Largest Contentful Paint: ${(performanceReport.metrics.largestContentfulPaint / 1000).toFixed(2)}s`);
    }
    
    // Error summary
    const errorSummary = errorTracker.getErrorSummary();
    
    console.log('\n🐛 ERROR SUMMARY:');
    console.log(`   Total Errors: ${errorSummary.totalErrors}`);
    console.log(`   Critical Errors: ${errorSummary.criticalErrors.length}`);
    
    if (Object.keys(errorSummary.errorTypes).length > 0) {
        console.log('   Error Types:');
        Object.entries(errorSummary.errorTypes).forEach(([type, count]) => {
            console.log(`     ${type}: ${count}`);
        });
    }
    
    // Connection info
    if (performanceReport.connection) {
        console.log('\n📶 CONNECTION INFO:');
        console.log(`   Effective Type: ${performanceReport.connection.effectiveType}`);
        console.log(`   Downlink: ${performanceReport.connection.downlink}Mbps`);
        console.log(`   RTT: ${performanceReport.connection.rtt}ms`);
    }
    
    // Overall health score
    let healthScore = 100;
    
    if (performanceReport.metrics.pageLoad && !performanceReport.metrics.pageLoad.meetsThreshold) {
        healthScore -= 30;
    }
    
    if (errorSummary.criticalErrors.length > 0) {
        healthScore -= 20 * Math.min(errorSummary.criticalErrors.length, 3);
    }
    
    if (performanceReport.metrics.issues && performanceReport.metrics.issues.length > 0) {
        healthScore -= 10 * Math.min(performanceReport.metrics.issues.length, 5);
    }
    
    healthScore = Math.max(0, healthScore);
    
    console.log('\n🎯 OVERALL HEALTH SCORE:');
    console.log(`   Score: ${healthScore}/100`);
    
    if (healthScore >= 90) {
        console.log('   Status: ✅ Excellent');
    } else if (healthScore >= 70) {
        console.log('   Status: ⚠️ Good');
    } else if (healthScore >= 50) {
        console.log('   Status: ⚠️ Needs Improvement');
    } else {
        console.log('   Status: ❌ Poor');
    }
    
    console.log('\n=============================================');
    
    return {
        performance: performanceReport,
        errors: errorSummary,
        healthScore
    };
}

// ===== INITIALIZATION =====

/**
 * Initialize performance monitoring and error tracking
 */
function initializePerformanceAndErrorTracking() {
    console.log('⚡ Initializing Performance Monitoring and Error Tracking...');
    
    // Initialize systems
    performanceTracker.init();
    errorTracker.init();
    
    // Add test button in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        addPerformanceTestButton();
    }
    
    // Generate initial report after page load
    window.addEventListener('load', () => {
        setTimeout(() => {
            generatePerformanceAndErrorReport();
        }, 3000);
    });
    
    console.log('✅ Performance monitoring and error tracking initialized');
}

/**
 * Add performance test button
 */
function addPerformanceTestButton() {
    const testButton = document.createElement('button');
    testButton.textContent = 'Performance Report';
    testButton.style.cssText = `
        position: fixed;
        top: 130px;
        left: 10px;
        background: var(--neon-pink);
        color: var(--bg-primary);
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-family: var(--font-mono);
        font-size: 0.8rem;
        cursor: pointer;
        z-index: 10000;
        white-space: nowrap;
    `;
    
    testButton.addEventListener('click', () => {
        generatePerformanceAndErrorReport();
    });
    
    document.body.appendChild(testButton);
    console.log('🧪 Performance test button added');
}

// Make functions globally available
window.performanceTracker = performanceTracker;
window.errorTracker = errorTracker;
window.generatePerformanceAndErrorReport = generatePerformanceAndErrorReport;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePerformanceAndErrorTracking);
} else {
    initializePerformanceAndErrorTracking();
} 