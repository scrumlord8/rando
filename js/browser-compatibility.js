/**
 * Browser Compatibility Testing and Polyfills for Rando Website
 * Ensures functionality across Chrome, Firefox, Safari, Edge, and mobile browsers
 */

console.log('🔍 Loading Browser Compatibility System...');

// ===== BROWSER DETECTION =====

/**
 * Detect browser type and version
 */
function detectBrowser() {
    const userAgent = navigator.userAgent;
    const browserInfo = {
        name: 'unknown',
        version: 'unknown',
        engine: 'unknown',
        mobile: false,
        supported: true
    };

    // Mobile detection
    browserInfo.mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    // Browser detection
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
        browserInfo.name = 'Chrome';
        browserInfo.engine = 'Blink';
        const match = userAgent.match(/Chrome\/(\d+)/);
        browserInfo.version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Firefox')) {
        browserInfo.name = 'Firefox';
        browserInfo.engine = 'Gecko';
        const match = userAgent.match(/Firefox\/(\d+)/);
        browserInfo.version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        browserInfo.name = 'Safari';
        browserInfo.engine = 'WebKit';
        const match = userAgent.match(/Version\/(\d+)/);
        browserInfo.version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Edg')) {
        browserInfo.name = 'Edge';
        browserInfo.engine = 'Blink';
        const match = userAgent.match(/Edg\/(\d+)/);
        browserInfo.version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
        browserInfo.name = 'Internet Explorer';
        browserInfo.engine = 'Trident';
        browserInfo.supported = false; // IE not supported
        const match = userAgent.match(/(?:MSIE |rv:)(\d+)/);
        browserInfo.version = match ? match[1] : 'unknown';
    }

    return browserInfo;
}

// ===== FEATURE DETECTION =====

/**
 * Test for required browser features
 */
function testBrowserFeatures() {
    const features = {
        // JavaScript features
        es6: testES6Support(),
        fetch: typeof fetch !== 'undefined',
        promises: typeof Promise !== 'undefined',
        localStorage: testLocalStorage(),
        sessionStorage: testSessionStorage(),
        
        // DOM features
        querySelector: typeof document.querySelector !== 'undefined',
        addEventListener: typeof document.addEventListener !== 'undefined',
        classList: 'classList' in document.createElement('div'),
        
        // CSS features
        flexbox: testFlexboxSupport(),
        customProperties: testCSSCustomProperties(),
        transforms: testCSSTransforms(),
        animations: testCSSAnimations(),
        
        // HTML5 features
        canvas: testCanvasSupport(),
        
        // Performance features
        performanceAPI: typeof performance !== 'undefined' && typeof performance.now !== 'undefined',
        
        // Touch features
        touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };

    return features;
}

/**
 * Test ES6 support
 */
function testES6Support() {
    try {
        eval('() => {}');
        eval('const x = 1; let y = 2;');
        eval('`template ${1}`');
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Test localStorage support
 */
function testLocalStorage() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Test sessionStorage support
 */
function testSessionStorage() {
    try {
        const test = 'test';
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Test flexbox support
 */
function testFlexboxSupport() {
    const element = document.createElement('div');
    element.style.display = 'flex';
    return element.style.display === 'flex';
}

/**
 * Test CSS custom properties support
 */
function testCSSCustomProperties() {
    return window.CSS && CSS.supports && CSS.supports('color', 'var(--test)');
}

/**
 * Test CSS transforms support
 */
function testCSSTransforms() {
    const element = document.createElement('div');
    const prefixes = ['transform', 'webkitTransform', 'mozTransform', 'msTransform'];
    return prefixes.some(prefix => prefix in element.style);
}

/**
 * Test CSS animations support
 */
function testCSSAnimations() {
    const element = document.createElement('div');
    const prefixes = ['animation', 'webkitAnimation', 'mozAnimation', 'msAnimation'];
    return prefixes.some(prefix => prefix in element.style);
}

/**
 * Test Canvas support
 */
function testCanvasSupport() {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext && canvas.getContext('2d'));
}

// ===== POLYFILLS =====

/**
 * Apply necessary polyfills for older browsers
 */
function applyPolyfills() {
    // Polyfill for fetch API
    if (!window.fetch) {
        addFetchPolyfill();
    }

    // Polyfill for Promise
    if (!window.Promise) {
        addPromisePolyfill();
    }

    // Polyfill for Object.assign
    if (!Object.assign) {
        addObjectAssignPolyfill();
    }

    // Polyfill for String.includes
    if (!String.prototype.includes) {
        addStringIncludesPolyfill();
    }

    // Polyfill for performance.now
    if (!window.performance || !window.performance.now) {
        addPerformanceNowPolyfill();
    }

    console.log('✅ Browser polyfills applied');
}

/**
 * Simple fetch polyfill for basic requests
 */
function addFetchPolyfill() {
    window.fetch = function(url, options = {}) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const method = options.method || 'GET';
            
            xhr.open(method, url);
            
            if (options.headers) {
                Object.keys(options.headers).forEach(key => {
                    xhr.setRequestHeader(key, options.headers[key]);
                });
            }
            
            xhr.onload = function() {
                const response = {
                    ok: xhr.status >= 200 && xhr.status < 300,
                    status: xhr.status,
                    statusText: xhr.statusText,
                    text: () => Promise.resolve(xhr.responseText),
                    json: () => Promise.resolve(JSON.parse(xhr.responseText))
                };
                resolve(response);
            };
            
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(options.body);
        });
    };
}

/**
 * Object.assign polyfill
 */
function addObjectAssignPolyfill() {
    Object.assign = function(target) {
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }

        const to = Object(target);

        for (let index = 1; index < arguments.length; index++) {
            const nextSource = arguments[index];

            if (nextSource != null) {
                for (const nextKey in nextSource) {
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }
        return to;
    };
}

/**
 * String.includes polyfill
 */
function addStringIncludesPolyfill() {
    String.prototype.includes = function(search, start) {
        if (typeof start !== 'number') {
            start = 0;
        }
        
        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}

/**
 * performance.now polyfill
 */
function addPerformanceNowPolyfill() {
    if (!window.performance) {
        window.performance = {};
    }
    
    const startTime = Date.now();
    window.performance.now = function() {
        return Date.now() - startTime;
    };
}

/**
 * Simple Promise polyfill
 */
function addPromisePolyfill() {
    window.Promise = function(executor) {
        const self = this;
        self.state = 'pending';
        self.value = undefined;
        self.handlers = [];

        function resolve(result) {
            if (self.state === 'pending') {
                self.state = 'fulfilled';
                self.value = result;
                self.handlers.forEach(handle);
                self.handlers = null;
            }
        }

        function reject(error) {
            if (self.state === 'pending') {
                self.state = 'rejected';
                self.value = error;
                self.handlers.forEach(handle);
                self.handlers = null;
            }
        }

        function handle(handler) {
            if (self.state === 'pending') {
                self.handlers.push(handler);
            } else {
                if (self.state === 'fulfilled' && typeof handler.onFulfilled === 'function') {
                    handler.onFulfilled(self.value);
                }
                if (self.state === 'rejected' && typeof handler.onRejected === 'function') {
                    handler.onRejected(self.value);
                }
            }
        }

        this.then = function(onFulfilled, onRejected) {
            return new Promise((resolve, reject) => {
                handle({
                    onFulfilled: function(result) {
                        try {
                            resolve(onFulfilled ? onFulfilled(result) : result);
                        } catch (ex) {
                            reject(ex);
                        }
                    },
                    onRejected: function(error) {
                        try {
                            resolve(onRejected ? onRejected(error) : error);
                        } catch (ex) {
                            reject(ex);
                        }
                    }
                });
            });
        };

        executor(resolve, reject);
    };
}

// ===== COMPATIBILITY TESTING =====

/**
 * Run comprehensive browser compatibility tests
 */
function runBrowserCompatibilityTests() {
    console.log('🔍 Running Browser Compatibility Tests...');
    
    const browser = detectBrowser();
    const features = testBrowserFeatures();
    
    console.log('📱 Browser Information:', browser);
    console.log('🔧 Feature Support:', features);
    
    // Test core functionality
    const coreTests = testCoreFunctionality();
    console.log('⚙️ Core Functionality Tests:', coreTests);
    
    // Generate compatibility report
    generateCompatibilityReport(browser, features, coreTests);
    
    return { browser, features, coreTests };
}

/**
 * Test core website functionality
 */
function testCoreFunctionality() {
    const tests = {
        randomButton: testRandomButtonFunctionality(),
        counter: testCounterFunctionality(),
        socialSharing: testSocialSharingFunctionality(),
        localStorage: testLocalStorageFunctionality()
    };
    
    return tests;
}

/**
 * Test random button functionality
 */
function testRandomButtonFunctionality() {
    try {
        const button = document.getElementById('random-button');
        if (!button) return { passed: false, error: 'Random button not found' };
        
        const isVisible = button.offsetWidth > 0 && button.offsetHeight > 0;
        const isEnabled = !button.disabled;
        
        return {
            passed: isVisible && isEnabled,
            details: { isVisible, isEnabled }
        };
    } catch (error) {
        return { passed: false, error: error.message };
    }
}

/**
 * Test counter functionality
 */
function testCounterFunctionality() {
    try {
        const counter = document.getElementById('click-counter');
        if (!counter) return { passed: false, error: 'Counter element not found' };
        
        const counterValue = counter.querySelector('.counter-value');
        const hasValue = counterValue && counterValue.textContent !== '';
        
        return {
            passed: hasValue,
            details: { hasValue, value: counterValue?.textContent }
        };
    } catch (error) {
        return { passed: false, error: error.message };
    }
}

/**
 * Test social sharing functionality
 */
function testSocialSharingFunctionality() {
    try {
        const facebookBtn = document.getElementById('share-facebook');
        const twitterBtn = document.getElementById('share-twitter');
        
        const hasFacebookBtn = !!facebookBtn;
        const hasTwitterBtn = !!twitterBtn;
        
        return {
            passed: hasFacebookBtn && hasTwitterBtn,
            details: { hasFacebookBtn, hasTwitterBtn }
        };
    } catch (error) {
        return { passed: false, error: error.message };
    }
}

/**
 * Test localStorage functionality
 */
function testLocalStorageFunctionality() {
    try {
        const testKey = 'browser-compat-test';
        const testValue = 'test-value';
        
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        return {
            passed: retrieved === testValue,
            details: { canSet: true, canGet: retrieved === testValue, canRemove: true }
        };
    } catch (error) {
        return { passed: false, error: error.message };
    }
}

/**
 * Generate compatibility report
 */
function generateCompatibilityReport(browser, features, coreTests) {
    console.log('\n📊 BROWSER COMPATIBILITY REPORT');
    console.log('=====================================');
    
    // Browser info
    console.log(`\n🌐 BROWSER INFORMATION:`);
    console.log(`   Name: ${browser.name} ${browser.version}`);
    console.log(`   Engine: ${browser.engine}`);
    console.log(`   Mobile: ${browser.mobile ? 'Yes' : 'No'}`);
    console.log(`   Supported: ${browser.supported ? 'Yes' : 'No'}`);
    
    // Feature support
    console.log(`\n🔧 FEATURE SUPPORT:`);
    const supportedFeatures = Object.keys(features).filter(key => features[key]);
    const unsupportedFeatures = Object.keys(features).filter(key => !features[key]);
    
    console.log(`   Supported (${supportedFeatures.length}): ${supportedFeatures.join(', ')}`);
    if (unsupportedFeatures.length > 0) {
        console.log(`   Unsupported (${unsupportedFeatures.length}): ${unsupportedFeatures.join(', ')}`);
    }
    
    // Core functionality
    console.log(`\n⚙️ CORE FUNCTIONALITY:`);
    const passedCore = Object.keys(coreTests).filter(key => coreTests[key].passed);
    const failedCore = Object.keys(coreTests).filter(key => !coreTests[key].passed);
    
    console.log(`   Passed (${passedCore.length}): ${passedCore.join(', ')}`);
    if (failedCore.length > 0) {
        console.log(`   Failed (${failedCore.length}): ${failedCore.join(', ')}`);
    }
    
    // Overall compatibility score
    const totalTests = Object.keys(coreTests).length;
    const passedTests = passedCore.length;
    const compatibilityScore = (passedTests / totalTests) * 100;
    
    console.log(`\n🎯 OVERALL COMPATIBILITY:`);
    console.log(`   Score: ${compatibilityScore.toFixed(1)}%`);
    console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    
    if (!browser.supported) {
        console.log(`   ⚠️ ${browser.name} is not supported - recommend browser upgrade`);
    }
    
    if (compatibilityScore < 90) {
        console.log(`   ⚠️ Compatibility score below 90% - investigate failed tests`);
    }
    
    if (!features.fetch) {
        console.log(`   ⚠️ Fetch API not supported - polyfill applied`);
    }
    
    if (!features.localStorage) {
        console.log(`   ⚠️ localStorage not available - some features may not work`);
    }
    
    if (compatibilityScore >= 90 && browser.supported) {
        console.log(`   ✅ Excellent browser compatibility!`);
    }
    
    console.log('\n=====================================');
    
    // Store results globally
    window.browserCompatibilityResults = {
        browser,
        features,
        coreTests,
        compatibilityScore
    };
}

// ===== INITIALIZATION =====

/**
 * Initialize browser compatibility system
 */
function initializeBrowserCompatibility() {
    console.log('🔍 Initializing Browser Compatibility System...');
    
    // Apply polyfills first
    applyPolyfills();
    
    // Run compatibility tests in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(() => {
            runBrowserCompatibilityTests();
        }, 2000); // Wait for page to fully load
        
        // Add test button
        addCompatibilityTestButton();
    }
    
    console.log('✅ Browser compatibility system initialized');
}

/**
 * Add manual compatibility test button
 */
function addCompatibilityTestButton() {
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Browser Compatibility';
    testButton.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: var(--neon-blue);
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
        runBrowserCompatibilityTests();
    });
    
    document.body.appendChild(testButton);
    console.log('🧪 Browser compatibility test button added');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBrowserCompatibility);
} else {
    initializeBrowserCompatibility();
} 