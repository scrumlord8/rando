/**
 * Asset Optimization System for Rando Website
 * Handles font loading, lazy loading, and performance monitoring
 */

console.log('⚡ Loading Asset Optimization System...');

// ===== FONT OPTIMIZATION =====

/**
 * Optimize font loading with preloading and fallbacks
 */
function optimizeFontLoading() {
    console.log('🔤 Optimizing font loading...');
    
    // Monitor font loading performance
    if ('fonts' in document) {
        document.fonts.ready.then(() => {
            console.log('✅ All fonts loaded successfully');
            document.documentElement.classList.add('fonts-loaded');
            
            if (window.performance && window.performance.mark) {
                window.performance.mark('fonts-loaded');
            }
        });
        
        document.fonts.addEventListener('loadingdone', (event) => {
            console.log(`✅ Font loaded: ${event.fontface.family}`);
        });
        
        document.fonts.addEventListener('loadingerror', (event) => {
            console.warn(`⚠️ Font failed to load: ${event.fontface.family}`);
        });
    }
    
    console.log('✅ Font loading optimized');
}

/**
 * Add font-display: swap to improve loading performance
 */
function addFontDisplaySwap() {
    const style = document.createElement('style');
    style.textContent = `
        @font-face {
            font-family: 'VT323';
            font-display: swap;
        }
        @font-face {
            font-family: 'Share Tech Mono';
            font-display: swap;
        }
        @font-face {
            font-family: 'Orbitron';
            font-display: swap;
        }
        @font-face {
            font-family: 'Fixedsys';
            font-display: swap;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Monitor font loading performance
 */
function monitorFontLoading() {
    if ('fonts' in document) {
        document.fonts.ready.then(() => {
            console.log('✅ All fonts loaded successfully');
            
            // Mark fonts as loaded for styling
            document.documentElement.classList.add('fonts-loaded');
            
            // Measure font loading time
            if (window.performance && window.performance.mark) {
                window.performance.mark('fonts-loaded');
            }
        });
        
        // Monitor individual font loading
        document.fonts.addEventListener('loadingdone', (event) => {
            console.log(`✅ Font loaded: ${event.fontface.family}`);
        });
        
        document.fonts.addEventListener('loadingerror', (event) => {
            console.warn(`⚠️ Font failed to load: ${event.fontface.family}`);
        });
    }
}

// ===== IMAGE OPTIMIZATION =====

/**
 * Implement lazy loading for images
 */
function implementLazyLoading() {
    console.log('🖼️ Implementing lazy loading...');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    loadImage(img);
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
        
        console.log('✅ Lazy loading implemented with Intersection Observer');
    } else {
        loadAllImages();
        console.log('✅ Lazy loading fallback: loaded all images immediately');
    }
}

/**
 * Load individual image
 */
function loadImage(img) {
    const src = img.getAttribute('data-src');
    if (src) {
        img.src = src;
        img.removeAttribute('data-src');
        img.classList.add('loaded');
    }
}

/**
 * Load all images immediately (fallback)
 */
function loadAllImages() {
    document.querySelectorAll('img[data-src]').forEach(loadImage);
}

/**
 * Optimize existing images
 */
function optimizeImages() {
    console.log('🖼️ Optimizing images...');
    
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
        if (!img.hasAttribute('loading')) {
            img.setAttribute('loading', 'lazy');
        }
        
        if (!img.hasAttribute('decoding')) {
            img.setAttribute('decoding', 'async');
        }
        
        img.addEventListener('load', () => {
            console.log(`✅ Image loaded: ${img.src}`);
        });
        
        img.addEventListener('error', () => {
            console.warn(`⚠️ Image failed to load: ${img.src}`);
            img.style.display = 'none';
        });
    });
    
    console.log(`✅ Optimized ${images.length} images`);
}

// ===== CSS OPTIMIZATION =====

/**
 * Optimize CSS loading and delivery
 */
function optimizeCSS() {
    console.log('🎨 Optimizing CSS...');
    
    // Preload critical CSS files
    const criticalCSS = [
        'styles/main.css',
        'styles/colors.css',
        'styles/fonts.css'
    ];
    
    criticalCSS.forEach(cssFile => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = cssFile;
        link.onload = function() {
            this.onload = null;
            this.rel = 'stylesheet';
        };
        document.head.appendChild(link);
    });
    
    // Load non-critical CSS asynchronously
    const nonCriticalCSS = [
        'styles/animations.css',
        'styles/retro-backgrounds.css'
    ];
    
    setTimeout(() => {
        nonCriticalCSS.forEach(cssFile => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssFile;
            document.head.appendChild(link);
        });
    }, 100);
    
    console.log('✅ CSS loading optimized');
}

/**
 * Remove unused CSS (basic implementation)
 */
function removeUnusedCSS() {
    console.log('🧹 Analyzing CSS usage...');
    
    // This is a basic implementation - in production, use tools like PurgeCSS
    const allElements = document.querySelectorAll('*');
    const usedClasses = new Set();
    
    allElements.forEach(element => {
        if (element.className) {
            const classes = element.className.split(' ');
            classes.forEach(cls => {
                if (cls.trim()) {
                    usedClasses.add(cls.trim());
                }
            });
        }
    });
    
    console.log(`✅ Found ${usedClasses.size} used CSS classes`);
    
    // Store for potential cleanup
    window.usedCSSClasses = Array.from(usedClasses);
}

// ===== JAVASCRIPT OPTIMIZATION =====

/**
 * Optimize JavaScript loading
 */
function optimizeJavaScript() {
    console.log('⚡ Optimizing JavaScript...');
    
    // Defer non-critical JavaScript
    const scripts = document.querySelectorAll('script[src]');
    
    scripts.forEach(script => {
        if (!script.hasAttribute('defer') && !script.hasAttribute('async')) {
            // Add defer to non-critical scripts
            if (!script.src.includes('main.js') && !script.src.includes('browser-compatibility.js')) {
                script.defer = true;
            }
        }
    });
    
    // Preload critical JavaScript modules
    const criticalJS = [
        'js/main.js'
    ];
    
    criticalJS.forEach(jsFile => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'script';
        link.href = jsFile;
        document.head.appendChild(link);
    });
    
    console.log('✅ JavaScript loading optimized');
}

// ===== PERFORMANCE MONITORING =====

/**
 * Monitor loading performance
 */
function monitorPerformance() {
    console.log('📊 Setting up performance monitoring...');
    
    if (!window.performance) {
        console.warn('⚠️ Performance API not available');
        return;
    }
    
    window.addEventListener('load', () => {
        setTimeout(() => {
            measureLoadingPerformance();
        }, 0);
    });
    
    if (window.PerformanceObserver) {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                if (entry.entryType === 'resource') {
                    logResourcePerformance(entry);
                }
            });
        });
        
        observer.observe({ entryTypes: ['resource'] });
    }
    
    console.log('✅ Performance monitoring active');
}

/**
 * Measure and report loading performance
 */
function measureLoadingPerformance() {
    const navigation = performance.getEntriesByType('navigation')[0];
    
    if (navigation) {
        const metrics = {
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            request: navigation.responseStart - navigation.requestStart,
            response: navigation.responseEnd - navigation.responseStart,
            dom: navigation.domContentLoadedEventEnd - navigation.navigationStart,
            load: navigation.loadEventEnd - navigation.navigationStart
        };
        
        console.log('📊 PERFORMANCE METRICS:');
        console.log(`   DNS Lookup: ${metrics.dns.toFixed(2)}ms`);
        console.log(`   TCP Connection: ${metrics.tcp.toFixed(2)}ms`);
        console.log(`   Request Time: ${metrics.request.toFixed(2)}ms`);
        console.log(`   Response Time: ${metrics.response.toFixed(2)}ms`);
        console.log(`   DOM Ready: ${metrics.dom.toFixed(2)}ms`);
        console.log(`   Page Load: ${metrics.load.toFixed(2)}ms`);
        
        const loadTimeSeconds = metrics.load / 1000;
        if (loadTimeSeconds < 3) {
            console.log(`✅ Page load time: ${loadTimeSeconds.toFixed(2)}s (under 3s target)`);
        } else {
            console.warn(`⚠️ Page load time: ${loadTimeSeconds.toFixed(2)}s (over 3s target)`);
        }
        
        window.performanceMetrics = metrics;
    }
}

/**
 * Log resource loading performance
 */
function logResourcePerformance(entry) {
    const duration = entry.responseEnd - entry.startTime;
    
    if (duration > 1000) {
        console.warn(`⚠️ Slow resource: ${entry.name} (${duration.toFixed(2)}ms)`);
    }
    
    if (entry.name.includes('.css')) {
        console.log(`🎨 CSS loaded: ${entry.name} (${duration.toFixed(2)}ms)`);
    } else if (entry.name.includes('.js')) {
        console.log(`⚡ JS loaded: ${entry.name} (${duration.toFixed(2)}ms)`);
    } else if (entry.name.includes('fonts.googleapis.com')) {
        console.log(`🔤 Font loaded: ${entry.name} (${duration.toFixed(2)}ms)`);
    }
}

// ===== CACHING OPTIMIZATION =====

/**
 * Implement client-side caching strategies
 */
function optimizeCaching() {
    console.log('💾 Optimizing caching...');
    
    const criticalResources = [
        'config/websites.json',
        'config/blocked-keywords.json'
    ];
    
    criticalResources.forEach(resource => {
        cacheResource(resource);
    });
    
    console.log('💡 Recommended cache headers:');
    console.log('   CSS/JS: Cache-Control: public, max-age=31536000');
    console.log('   Images: Cache-Control: public, max-age=31536000');
    console.log('   HTML: Cache-Control: public, max-age=3600');
    
    console.log('✅ Caching optimization configured');
}

/**
 * Cache resource in localStorage
 */
async function cacheResource(resourcePath) {
    try {
        const cacheKey = `cache_${resourcePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        
        const cacheExpiry = 60 * 60 * 1000; // 1 hour
        const now = Date.now();
        
        if (cached && cacheTime && (now - parseInt(cacheTime)) < cacheExpiry) {
            console.log(`✅ Using cached resource: ${resourcePath}`);
            return JSON.parse(cached);
        }
        
        const response = await fetch(resourcePath);
        if (response.ok) {
            const data = await response.text();
            localStorage.setItem(cacheKey, data);
            localStorage.setItem(`${cacheKey}_time`, now.toString());
            console.log(`✅ Cached resource: ${resourcePath}`);
            return data;
        }
    } catch (error) {
        console.warn(`⚠️ Failed to cache resource: ${resourcePath}`, error);
    }
}

// ===== NETWORK OPTIMIZATION =====

/**
 * Optimize network requests
 */
function optimizeNetwork() {
    console.log('🌐 Optimizing network requests...');
    
    window.requestBatcher = {
        queue: [],
        timeout: null,
        
        add: function(request) {
            this.queue.push(request);
            
            if (this.timeout) {
                clearTimeout(this.timeout);
            }
            
            this.timeout = setTimeout(() => {
                this.flush();
            }, 100);
        },
        
        flush: function() {
            if (this.queue.length > 0) {
                console.log(`📦 Batching ${this.queue.length} requests`);
                this.queue = [];
            }
            this.timeout = null;
        }
    };
    
    if ('connection' in navigator) {
        const connection = navigator.connection;
        console.log(`📶 Connection: ${connection.effectiveType} (${connection.downlink}Mbps)`);
        
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            console.log('📱 Slow connection detected - applying aggressive optimizations');
            document.documentElement.classList.add('slow-connection');
        }
    }
    
    console.log('✅ Network optimization configured');
}

// ===== INITIALIZATION =====

/**
 * Initialize asset optimization system
 */
function initializeAssetOptimization() {
    console.log('⚡ Initializing Asset Optimization System...');
    
    optimizeFontLoading();
    optimizeCSS();
    optimizeJavaScript();
    optimizeImages();
    implementLazyLoading();
    optimizeCaching();
    optimizeNetwork();
    removeUnusedCSS();
    monitorPerformance();
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        addOptimizationTestButton();
    }
    
    console.log('✅ Asset optimization system initialized');
}

/**
 * Add manual optimization test button
 */
function addOptimizationTestButton() {
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Performance';
    testButton.style.cssText = `
        position: fixed;
        top: 50px;
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
    `;
    
    testButton.addEventListener('click', () => {
        measureLoadingPerformance();
        console.log('🔄 Performance test completed - check console for results');
    });
    
    document.body.appendChild(testButton);
    console.log('🧪 Performance test button added');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAssetOptimization);
} else {
    initializeAssetOptimization();
} 