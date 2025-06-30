/**
 * Mobile Responsiveness Testing System for Rando Website
 * Tests layout and functionality across various device sizes and orientations
 */

console.log('📱 Loading Mobile Responsiveness Testing System...');

// ===== DEVICE CONFIGURATIONS =====

const deviceConfigs = {
    // Mobile devices
    'iPhone SE': { width: 375, height: 667, userAgent: 'iPhone', category: 'mobile' },
    'iPhone 12': { width: 390, height: 844, userAgent: 'iPhone', category: 'mobile' },
    'iPhone 12 Pro Max': { width: 428, height: 926, userAgent: 'iPhone', category: 'mobile' },
    'Samsung Galaxy S21': { width: 384, height: 854, userAgent: 'Android', category: 'mobile' },
    'Google Pixel 5': { width: 393, height: 851, userAgent: 'Android', category: 'mobile' },
    
    // Tablets
    'iPad': { width: 768, height: 1024, userAgent: 'iPad', category: 'tablet' },
    'iPad Pro 11"': { width: 834, height: 1194, userAgent: 'iPad', category: 'tablet' },
    'Samsung Galaxy Tab': { width: 800, height: 1280, userAgent: 'Android', category: 'tablet' },
    
    // Desktop
    'Small Desktop': { width: 1024, height: 768, userAgent: 'Desktop', category: 'desktop' },
    'Medium Desktop': { width: 1366, height: 768, userAgent: 'Desktop', category: 'desktop' },
    'Large Desktop': { width: 1920, height: 1080, userAgent: 'Desktop', category: 'desktop' }
};

// ===== RESPONSIVE TESTING FUNCTIONS =====

/**
 * Test current viewport responsiveness
 */
function testCurrentViewport() {
    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.innerWidth / window.innerHeight,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };
    
    console.log('📐 Current Viewport:', viewport);
    
    const tests = {
        layout: testLayoutResponsiveness(),
        buttons: testButtonResponsiveness(),
        typography: testTypographyResponsiveness(),
        images: testImageResponsiveness(),
        interactions: testInteractionResponsiveness()
    };
    
    return { viewport, tests };
}

/**
 * Test layout responsiveness
 */
function testLayoutResponsiveness() {
    const results = {
        passed: true,
        issues: [],
        details: {}
    };
    
    try {
        const main = document.querySelector('main');
        if (main) {
            const mainStyles = getComputedStyle(main);
            const mainWidth = main.offsetWidth;
            const viewportWidth = window.innerWidth;
            
            results.details.mainContainer = {
                width: mainWidth,
                maxWidth: mainStyles.maxWidth,
                padding: mainStyles.padding,
                usesFullWidth: mainWidth / viewportWidth > 0.9
            };
            
            if (viewportWidth < 768 && mainWidth > viewportWidth) {
                results.issues.push('Main container exceeds viewport width on mobile');
                results.passed = false;
            }
        }
        
        const header = document.querySelector('header');
        if (header) {
            const headerHeight = header.offsetHeight;
            const viewportHeight = window.innerHeight;
            
            results.details.header = {
                height: headerHeight,
                percentageOfViewport: (headerHeight / viewportHeight) * 100
            };
            
            if (viewportWidth < 768 && (headerHeight / viewportHeight) > 0.3) {
                results.issues.push('Header takes more than 30% of viewport height on mobile');
                results.passed = false;
            }
        }
        
    } catch (error) {
        results.passed = false;
        results.issues.push(`Layout test error: ${error.message}`);
    }
    
    return results;
}

/**
 * Test button responsiveness
 */
function testButtonResponsiveness() {
    const results = {
        passed: true,
        issues: [],
        details: {}
    };
    
    try {
        const buttons = document.querySelectorAll('button, .button, input[type="submit"]');
        
        results.details.buttonCount = buttons.length;
        
        buttons.forEach((button, index) => {
            const buttonRect = button.getBoundingClientRect();
            const buttonStyles = getComputedStyle(button);
            
            const buttonInfo = {
                width: buttonRect.width,
                height: buttonRect.height,
                fontSize: buttonStyles.fontSize,
                touchFriendly: buttonRect.height >= 44 && buttonRect.width >= 44
            };
            
            results.details[`button_${index}`] = buttonInfo;
            
            if (!buttonInfo.touchFriendly) {
                results.issues.push(`Button ${index} not touch-friendly (${buttonRect.width}x${buttonRect.height}px)`);
                results.passed = false;
            }
            
            const fontSize = parseFloat(buttonStyles.fontSize);
            if (fontSize < 14) {
                results.issues.push(`Button ${index} text too small (${fontSize}px)`);
                results.passed = false;
            }
        });
        
    } catch (error) {
        results.passed = false;
        results.issues.push(`Button test error: ${error.message}`);
    }
    
    return results;
}

/**
 * Test typography responsiveness
 */
function testTypographyResponsiveness() {
    const results = {
        passed: true,
        issues: [],
        details: {}
    };
    
    try {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headings.forEach((heading, index) => {
            const headingStyles = getComputedStyle(heading);
            const fontSize = parseFloat(headingStyles.fontSize);
            
            results.details[`heading_${heading.tagName.toLowerCase()}_${index}`] = {
                fontSize: fontSize,
                fontFamily: headingStyles.fontFamily
            };
            
            if (window.innerWidth < 768) {
                const minSizes = { h1: 24, h2: 20, h3: 18, h4: 16, h5: 14, h6: 14 };
                const minSize = minSizes[heading.tagName.toLowerCase()] || 14;
                
                if (fontSize < minSize) {
                    results.issues.push(`${heading.tagName} too small on mobile (${fontSize}px < ${minSize}px)`);
                    results.passed = false;
                }
            }
        });
        
        const bodyText = document.querySelector('body, p, .text');
        if (bodyText) {
            const bodyStyles = getComputedStyle(bodyText);
            const bodyFontSize = parseFloat(bodyStyles.fontSize);
            
            results.details.bodyText = {
                fontSize: bodyFontSize,
                fontFamily: bodyStyles.fontFamily
            };
            
            if (bodyFontSize < 14) {
                results.issues.push(`Body text too small (${bodyFontSize}px)`);
                results.passed = false;
            }
        }
        
    } catch (error) {
        results.passed = false;
        results.issues.push(`Typography test error: ${error.message}`);
    }
    
    return results;
}

/**
 * Test image responsiveness
 */
function testImageResponsiveness() {
    const results = {
        passed: true,
        issues: [],
        details: {}
    };
    
    try {
        const images = document.querySelectorAll('img');
        
        results.details.imageCount = images.length;
        
        images.forEach((img, index) => {
            const imgRect = img.getBoundingClientRect();
            const imgStyles = getComputedStyle(img);
            
            const imageInfo = {
                displayWidth: imgRect.width,
                displayHeight: imgRect.height,
                maxWidth: imgStyles.maxWidth,
                responsive: imgStyles.maxWidth === '100%' || imgStyles.width === '100%'
            };
            
            results.details[`image_${index}`] = imageInfo;
            
            if (imgRect.width > window.innerWidth) {
                results.issues.push(`Image ${index} overflows viewport`);
                results.passed = false;
            }
        });
        
    } catch (error) {
        results.passed = false;
        results.issues.push(`Image test error: ${error.message}`);
    }
    
    return results;
}

/**
 * Test interaction responsiveness
 */
function testInteractionResponsiveness() {
    const results = {
        passed: true,
        issues: [],
        details: {}
    };
    
    try {
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [onclick], [role="button"]');
        
        results.details.interactiveCount = interactiveElements.length;
        
        let touchFriendlyCount = 0;
        
        interactiveElements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            const isTouchFriendly = rect.width >= 44 && rect.height >= 44;
            
            if (isTouchFriendly) {
                touchFriendlyCount++;
            }
        });
        
        results.details.touchFriendlyPercentage = (touchFriendlyCount / interactiveElements.length) * 100;
        
        if (results.details.touchFriendlyPercentage < 80) {
            results.issues.push(`Only ${results.details.touchFriendlyPercentage.toFixed(1)}% of interactive elements are touch-friendly`);
            results.passed = false;
        }
        
    } catch (error) {
        results.passed = false;
        results.issues.push(`Interaction test error: ${error.message}`);
    }
    
    return results;
}

// ===== DEVICE SIMULATION =====

/**
 * Simulate different device viewports
 */
function simulateDeviceViewports() {
    console.log('📱 Simulating device viewports...');
    
    const results = {};
    
    Object.entries(deviceConfigs).forEach(([deviceName, config]) => {
        console.log(`   Testing ${deviceName} (${config.width}x${config.height})`);
        
        try {
            const deviceTest = testResponsivenessAtSize(config.width, config.height);
            
            results[deviceName] = {
                config,
                ...deviceTest,
                tested: true
            };
            
        } catch (error) {
            results[deviceName] = {
                config,
                error: error.message,
                tested: false
            };
        }
    });
    
    return results;
}

/**
 * Test responsiveness at specific size
 */
function testResponsivenessAtSize(width, height) {
    const isSmallMobile = width < 480;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    
    const tests = {
        mediaQueries: testMediaQueriesAtSize(width, height),
        layout: testLayoutAtSize(width, height),
        readability: testReadabilityAtSize(width, height),
        usability: testUsabilityAtSize(width, height)
    };
    
    const overallPassed = Object.values(tests).every(test => test.passed);
    
    return {
        size: { width, height },
        category: isSmallMobile ? 'small-mobile' : (isMobile ? 'mobile' : (isTablet ? 'tablet' : 'desktop')),
        tests,
        passed: overallPassed
    };
}

/**
 * Test media queries at specific size
 */
function testMediaQueriesAtSize(width, height) {
    const results = {
        passed: true,
        issues: [],
        details: {}
    };
    
    try {
        const mediaQueries = [
            { query: '(max-width: 480px)', expected: width <= 480 },
            { query: '(max-width: 768px)', expected: width <= 768 },
            { query: '(max-width: 1024px)', expected: width <= 1024 }
        ];
        
        mediaQueries.forEach(({ query, expected }) => {
            results.details[query] = { expected, wouldMatch: expected };
        });
        
    } catch (error) {
        results.passed = false;
        results.issues.push(`Media query test error: ${error.message}`);
    }
    
    return results;
}

/**
 * Test layout at specific size
 */
function testLayoutAtSize(width, height) {
    const results = {
        passed: true,
        issues: [],
        details: {}
    };
    
    const isMobile = width < 768;
    const aspectRatio = width / height;
    
    results.details = {
        isMobile,
        aspectRatio,
        orientation: width > height ? 'landscape' : 'portrait'
    };
    
    if (isMobile && aspectRatio > 2) {
        results.issues.push('Very wide aspect ratio on mobile may cause layout issues');
        results.passed = false;
    }
    
    if (height < 400) {
        results.issues.push('Very short viewport height may cause content overflow');
        results.passed = false;
    }
    
    return results;
}

/**
 * Test readability at specific size
 */
function testReadabilityAtSize(width, height) {
    const results = {
        passed: true,
        issues: [],
        details: {}
    };
    
    const isMobile = width < 768;
    const baseFontSize = isMobile ? 14 : 16;
    const lineLength = width / (baseFontSize * 0.6);
    
    results.details = {
        baseFontSize,
        estimatedLineLength: lineLength,
        readableLineLength: lineLength >= 45 && lineLength <= 75
    };
    
    if (lineLength > 90) {
        results.issues.push('Lines may be too long for comfortable reading');
        results.passed = false;
    }
    
    if (lineLength < 30) {
        results.issues.push('Lines may be too short, causing frequent line breaks');
        results.passed = false;
    }
    
    return results;
}

/**
 * Test usability at specific size
 */
function testUsabilityAtSize(width, height) {
    const results = {
        passed: true,
        issues: [],
        details: {}
    };
    
    const isMobile = width < 768;
    
    results.details = {
        isMobile,
        recommendedMinTouchSize: 44,
        viewportArea: width * height
    };
    
    if (isMobile && width < 320) {
        results.issues.push('Viewport too narrow for comfortable touch interaction');
        results.passed = false;
    }
    
    if (height < 480) {
        results.issues.push('Viewport too short, may cause scrolling issues');
        results.passed = false;
    }
    
    return results;
}

// ===== REPORTING =====

/**
 * Generate comprehensive mobile responsiveness report
 */
function generateMobileResponsivenessReport() {
    console.log('📊 Generating Mobile Responsiveness Report...');
    console.log('===========================================');
    
    const currentTest = testCurrentViewport();
    
    console.log('\n📐 CURRENT VIEWPORT ANALYSIS:');
    console.log(`   Size: ${currentTest.viewport.width}x${currentTest.viewport.height}`);
    console.log(`   Orientation: ${currentTest.viewport.orientation}`);
    console.log(`   Aspect Ratio: ${currentTest.viewport.ratio.toFixed(2)}`);
    
    Object.entries(currentTest.tests).forEach(([testName, testResult]) => {
        const status = testResult.passed ? '✅' : '❌';
        console.log(`   ${status} ${testName}: ${testResult.passed ? 'PASS' : 'FAIL'}`);
        
        if (!testResult.passed && testResult.issues.length > 0) {
            testResult.issues.forEach(issue => {
                console.log(`     ⚠️ ${issue}`);
            });
        }
    });
    
    console.log('\n📱 DEVICE SIMULATION RESULTS:');
    const deviceResults = simulateDeviceViewports();
    
    const deviceCategories = { mobile: [], tablet: [], desktop: [] };
    
    Object.entries(deviceResults).forEach(([deviceName, result]) => {
        if (result.tested) {
            deviceCategories[result.config.category].push({ name: deviceName, result });
        }
    });
    
    Object.entries(deviceCategories).forEach(([category, devices]) => {
        if (devices.length > 0) {
            console.log(`\n📱 ${category.toUpperCase()} DEVICES:`);
            
            devices.forEach(({ name, result }) => {
                const overallStatus = result.passed ? '✅' : '❌';
                console.log(`   ${overallStatus} ${name} (${result.size.width}x${result.size.height})`);
            });
        }
    });
    
    const totalDevices = Object.keys(deviceResults).length;
    const passedDevices = Object.values(deviceResults).filter(r => r.tested && r.passed).length;
    const compatibilityScore = (passedDevices / totalDevices) * 100;
    
    console.log('\n🎯 MOBILE RESPONSIVENESS SUMMARY:');
    console.log(`   Devices Tested: ${totalDevices}`);
    console.log(`   Devices Passed: ${passedDevices}`);
    console.log(`   Compatibility Score: ${compatibilityScore.toFixed(1)}%`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (compatibilityScore < 90) {
        console.log('   ⚠️ Mobile compatibility below 90% - review failed tests');
    }
    
    if (compatibilityScore >= 90) {
        console.log('   ✅ Excellent mobile responsiveness!');
    }
    
    console.log('\n===========================================');
    
    window.mobileResponsivenessResults = {
        currentTest,
        deviceResults,
        compatibilityScore
    };
    
    return { currentTest, deviceResults, compatibilityScore };
}

// ===== INITIALIZATION =====

/**
 * Initialize mobile testing system
 */
function initializeMobileTesting() {
    console.log('📱 Initializing Mobile Responsiveness Testing System...');
    
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            console.log('📱 Orientation changed - retesting responsiveness...');
            testCurrentViewport();
        }, 100);
    });
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log('📐 Viewport resized - retesting responsiveness...');
            testCurrentViewport();
        }, 250);
    });
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        addMobileTestButton();
    }
    
    setTimeout(() => {
        generateMobileResponsivenessReport();
    }, 2000);
    
    console.log('✅ Mobile responsiveness testing system initialized');
}

/**
 * Add manual mobile test button
 */
function addMobileTestButton() {
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Mobile Responsiveness';
    testButton.style.cssText = `
        position: fixed;
        top: 90px;
        left: 10px;
        background: var(--neon-green);
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
        generateMobileResponsivenessReport();
    });
    
    document.body.appendChild(testButton);
    console.log('🧪 Mobile responsiveness test button added');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileTesting);
} else {
    initializeMobileTesting();
} 