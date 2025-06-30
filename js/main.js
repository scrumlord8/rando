/**
 * Rando Website - Main JavaScript Functionality
 * Random website generation with multiple sources and fallbacks
 */

// ===== CONFIGURATION =====
const CONFIG = {
    // API endpoints for random website generation
    apis: {
        // Primary API source - Random Website Machine (if available)
        randomWebsite: 'https://www.whatsmyip.org/random-website-machine/api',
        
        // Backup APIs
        urlShortener: 'https://api.short.io/links/random', // Example backup
    },
    
    // Rate limiting
    rateLimits: {
        minDelay: 1000, // Minimum delay between clicks (1 second)
        maxRequestsPerMinute: 30
    },
    
    // Content filtering
    filtering: {
        enabled: true,
        blockedKeywords: [
            'adult', 'porn', 'xxx', 'sex', 'casino', 'gambling',
            'drugs', 'violence', 'hate', 'illegal', 'scam'
        ],
        blockedDomains: [
            'pornhub.com', 'xvideos.com', 'redtube.com',
            'casino.com', 'gambling.com', 'bet365.com'
        ]
    }
};

// ===== CURATED WEBSITE LISTS =====
const CURATED_WEBSITES = {
    // Educational and informative sites
    educational: [
        'https://www.khanacademy.org',
        'https://www.coursera.org',
        'https://www.ted.com',
        'https://www.wikipedia.org',
        'https://www.duolingo.com',
        'https://www.codecademy.com',
        'https://www.nationalgeographic.com',
        'https://www.smithsonianmag.com',
        'https://www.scientificamerican.com',
        'https://www.howstuffworks.com'
    ],
    
    // Fun and entertainment
    entertainment: [
        'https://www.reddit.com',
        'https://www.boredpanda.com',
        'https://www.buzzfeed.com',
        'https://www.theoatmeal.com',
        'https://xkcd.com',
        'https://www.mentalfloss.com',
        'https://www.cracked.com',
        'https://www.collegehumor.com',
        'https://www.failblog.org',
        'https://www.awkwardfamilyphotos.com'
    ],
    
    // Creative and artistic
    creative: [
        'https://www.behance.net',
        'https://dribbble.com',
        'https://www.deviantart.com',
        'https://unsplash.com',
        'https://www.pinterest.com',
        'https://www.artstation.com',
        'https://www.flickr.com',
        'https://vimeo.com',
        'https://www.creativebloq.com',
        'https://www.designboom.com'
    ],
    
    // Technology and development
    technology: [
        'https://github.com',
        'https://stackoverflow.com',
        'https://www.producthunt.com',
        'https://news.ycombinator.com',
        'https://www.theverge.com',
        'https://techcrunch.com',
        'https://arstechnica.com',
        'https://www.wired.com',
        'https://www.engadget.com',
        'https://slashdot.org'
    ],
    
    // Interesting and unique
    unique: [
        'https://www.atlasobscura.com',
        'https://www.mentalfloss.com',
        'https://www.sporcle.com',
        'https://www.geoguessr.com',
        'https://www.radio.garden',
        'https://www.zombo.com',
        'https://www.theuselessweb.com',
        'https://www.randomwebsite.com',
        'https://www.stumbleupon.com',
        'https://www.mix.com'
    ]
};

// Flatten all curated websites into a single array
const ALL_CURATED_WEBSITES = Object.values(CURATED_WEBSITES).flat();

// ===== STATE MANAGEMENT =====
let state = {
    lastClickTime: 0,
    requestCount: 0,
    requestTimes: [],
    isLoading: false,
    currentWebsite: null,
    visitHistory: [],
    // Counter state
    counter: {
        apiUrl: 'https://tick.rs/c',
        counterId: null,
        fallbackCount: 0,
        maxRetries: 3,
        retryDelay: 1000,
        updateInterval: null
    }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get a random item from an array
 */
function randomChoice(array) {
    return array[randomInt(0, array.length - 1)];
}

/**
 * Check if enough time has passed since last click
 */
function checkRateLimit() {
    const now = Date.now();
    const timeSinceLastClick = now - state.lastClickTime;
    
    if (timeSinceLastClick < CONFIG.rateLimits.minDelay) {
        return false;
    }
    
    // Clean old request times (older than 1 minute)
    const oneMinuteAgo = now - 60000;
    state.requestTimes = state.requestTimes.filter(time => time > oneMinuteAgo);
    
    // Check if we've exceeded requests per minute
    if (state.requestTimes.length >= CONFIG.rateLimits.maxRequestsPerMinute) {
        return false;
    }
    
    return true;
}

/**
 * Content filtering function
 */
function isWebsiteAllowed(url) {
    if (!CONFIG.filtering.enabled) {
        return true;
    }
    
    const urlLower = url.toLowerCase();
    
    // Check blocked domains
    for (const domain of CONFIG.filtering.blockedDomains) {
        if (urlLower.includes(domain.toLowerCase())) {
            return false;
        }
    }
    
    // Check blocked keywords
    for (const keyword of CONFIG.filtering.blockedKeywords) {
        if (urlLower.includes(keyword.toLowerCase())) {
            return false;
        }
    }
    
    return true;
}

/**
 * Validate URL format
 */
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// ===== RANDOM WEBSITE GENERATION =====

/**
 * Get a random website from curated lists
 */
function getRandomCuratedWebsite() {
    const categories = Object.keys(CURATED_WEBSITES);
    const randomCategory = randomChoice(categories);
    const websites = CURATED_WEBSITES[randomCategory];
    return randomChoice(websites);
}

/**
 * Try to fetch a random website from an external API
 */
async function fetchRandomWebsiteFromAPI() {
    // Note: Most random website APIs don't provide CORS headers
    // This is a placeholder for potential API integration
    // In practice, we'll rely on curated lists for now
    
    try {
        // Placeholder for future API integration
        // const response = await fetch(CONFIG.apis.randomWebsite);
        // const data = await response.json();
        // return data.url;
        
        // For now, return null to fall back to curated list
        return null;
    } catch (error) {
        console.warn('API request failed:', error);
        return null;
    }
}

/**
 * Generate a random website URL using multiple methods
 */
async function generateRandomWebsite() {
    let website = null;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!website && attempts < maxAttempts) {
        attempts++;
        
        // Try API first (if available)
        if (attempts === 1) {
            website = await fetchRandomWebsiteFromAPI();
        }
        
        // Fall back to curated list
        if (!website) {
            website = getRandomCuratedWebsite();
        }
        
        // Validate and filter the website
        if (website && isValidUrl(website) && isWebsiteAllowed(website)) {
            break;
        } else {
            website = null;
        }
    }
    
    if (!website) {
        // Final fallback - return a safe default
        website = 'https://www.wikipedia.org';
    }
    
    return website;
}

// ===== UI INTERACTION =====

/**
 * Update button state during loading
 */
function updateButtonState(isLoading) {
    const button = document.getElementById('random-button');
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.textContent = 'Finding Random Website...';
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.textContent = 'Take Me Somewhere Random!';
        button.classList.remove('loading');
    }
}

/**
 * Show error message to user
 */
function showError(message) {
    // Create or update error display
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error-message';
        
        const heroSection = document.querySelector('.hero');
        if (heroSection) {
            heroSection.appendChild(errorDiv);
        }
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

/**
 * Main function to handle random website generation
 */
async function handleRandomWebsiteClick() {
    // Check rate limiting
    if (!checkRateLimit()) {
        showError('Please wait a moment before clicking again.');
        return;
    }
    
    // Prevent multiple simultaneous requests
    if (state.isLoading) {
        return;
    }
    
    // Update state
    state.isLoading = true;
    state.lastClickTime = Date.now();
    state.requestTimes.push(state.lastClickTime);
    
    // Update UI
    updateButtonState(true);
    
    try {
        // Generate random website
        const website = await generateRandomWebsite();
        
        // Store in history
        state.currentWebsite = website;
        state.visitHistory.push({
            url: website,
            timestamp: Date.now()
        });
        
        // Keep history limited to last 50 visits
        if (state.visitHistory.length > 50) {
            state.visitHistory = state.visitHistory.slice(-50);
        }
        
        // Open website in new tab
        window.open(website, '_blank', 'noopener,noreferrer');
        
        // Increment counter
        await incrementCounter();
        
        console.log('Opened random website:', website);
        
    } catch (error) {
        console.error('Error generating random website:', error);
        showError('Sorry, something went wrong. Please try again.');
    } finally {
        // Reset loading state
        state.isLoading = false;
        updateButtonState(false);
    }
}

// ===== EVENT LISTENERS =====

/**
 * Initialize event listeners when DOM is loaded
 */
function initializeEventListeners() {
    const randomButton = document.getElementById('random-button');
    if (randomButton) {
        randomButton.addEventListener('click', handleRandomWebsiteClick);
    }
    
    // Add keyboard shortcut (Space or Enter)
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space' || event.code === 'Enter') {
            // Only trigger if not focused on an input element
            if (!['INPUT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName)) {
                event.preventDefault();
                handleRandomWebsiteClick();
            }
        }
    });
}

// ===== INITIALIZATION =====

/**
 * Initialize the application
 */
async function init() {
    console.log('Rando website initialized');
    initializeEventListeners();
    
    // Initialize counter system
    const counterInitialized = await initializeCounter();
    
    // Set up real-time counter updates if counter was successfully initialized
    if (counterInitialized) {
        startRealTimeUpdates();
    }
    
    // Load any saved preferences
    loadPreferences();
    
    // Set up periodic cleanup
    setInterval(() => {
        // Clean old request times
        const oneMinuteAgo = Date.now() - 60000;
        state.requestTimes = state.requestTimes.filter(time => time > oneMinuteAgo);
    }, 30000); // Clean every 30 seconds
}

/**
 * Load user preferences (placeholder for future features)
 */
function loadPreferences() {
    // Placeholder for loading user preferences from localStorage
    // Could include preferred categories, filtering settings, etc.
}

// ===== EXPORT FOR TESTING =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateRandomWebsite,
        isWebsiteAllowed,
        isValidUrl,
        CONFIG,
        CURATED_WEBSITES
    };
}

// ===== AUTO-INITIALIZATION =====
// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
} else {
    init();
}

// ===== COUNTER FUNCTIONS =====

/**
 * Initialize the click counter system
 */
async function initializeCounter() {
    try {
        // Try to get existing counter ID from localStorage
        const savedCounterId = localStorage.getItem('rando-counter-id');
        
        if (savedCounterId) {
            // Verify the existing counter still works
            const isValid = await verifyCounter(savedCounterId);
            if (isValid) {
                state.counter.counterId = savedCounterId;
                await displayCurrentCount();
                return true; // Success
            }
        }
        
        // Create a new counter if none exists or existing one failed
        await createNewCounter();
        return true; // Success
        
    } catch (error) {
        console.warn('Counter initialization failed, using fallback:', error);
        displayFallbackCounter();
        return false; // Failed
    }
}

/**
 * Create a new counter using tick.rs API
 */
async function createNewCounter() {
    try {
        const response = await fetch(`${state.counter.apiUrl}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // The response should contain the new counter ID
        const counterId = await response.text();
        
        if (counterId && counterId.trim()) {
            state.counter.counterId = counterId.trim();
            localStorage.setItem('rando-counter-id', state.counter.counterId);
            console.log('Created new counter:', state.counter.counterId);
            await displayCurrentCount();
        } else {
            throw new Error('Invalid counter ID received');
        }

    } catch (error) {
        console.error('Failed to create new counter:', error);
        throw error;
    }
}

/**
 * Verify if a counter ID is still valid
 */
async function verifyCounter(counterId) {
    try {
        const response = await fetch(`${state.counter.apiUrl}/${counterId}`, {
            method: 'GET',
        });

        return response.ok;
    } catch (error) {
        console.warn('Counter verification failed:', error);
        return false;
    }
}

/**
 * Increment the click counter
 */
async function incrementCounter() {
    if (!state.counter.counterId) {
        // Use fallback counter if no API counter available
        state.counter.fallbackCount++;
        displayFallbackCounter();
        return state.counter.fallbackCount;
    }

    let retries = 0;
    while (retries < state.counter.maxRetries) {
        try {
            const response = await fetch(`${state.counter.apiUrl}/${state.counter.counterId}`, {
                method: 'POST',
            });

            if (response.ok) {
                const newCount = await response.text();
                const count = parseInt(newCount, 10);
                
                if (!isNaN(count)) {
                    displayCount(count);
                    return count;
                }
            }

            throw new Error(`HTTP error! status: ${response.status}`);

        } catch (error) {
            retries++;
            console.warn(`Counter increment attempt ${retries} failed:`, error);
            
            if (retries < state.counter.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, state.counter.retryDelay * retries));
            } else {
                // Fall back to local counter
                state.counter.fallbackCount++;
                displayFallbackCounter();
                return state.counter.fallbackCount;
            }
        }
    }
}

/**
 * Get and display the current counter value
 */
async function displayCurrentCount() {
    if (!state.counter.counterId) {
        displayFallbackCounter();
        return;
    }

    try {
        const response = await fetch(`${state.counter.apiUrl}/${state.counter.counterId}`, {
            method: 'GET',
        });

        if (response.ok) {
            const countText = await response.text();
            const count = parseInt(countText, 10);
            
            if (!isNaN(count)) {
                displayCount(count);
            } else {
                throw new Error('Invalid count received');
            }
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

    } catch (error) {
        console.warn('Failed to fetch current count:', error);
        displayFallbackCounter();
    }
}

/**
 * Display the counter value in the UI
 */
function displayCount(count) {
    const counterElement = document.getElementById('click-counter');
    if (counterElement) {
        // Add animation class for counter update
        counterElement.classList.add('updating');
        
        // Format the number with commas for readability
        const formattedCount = count.toLocaleString();
        
        // Update the counter display
        const counterValue = counterElement.querySelector('.counter-value');
        if (counterValue) {
            counterValue.textContent = formattedCount;
        }
        
        // Remove animation class after animation completes
        setTimeout(() => {
            counterElement.classList.remove('updating');
        }, 300);
    }
}

/**
 * Display fallback counter when API is unavailable
 */
function displayFallbackCounter() {
    const counterElement = document.getElementById('click-counter');
    if (counterElement) {
        counterElement.classList.add('fallback');
        
        const formattedCount = state.counter.fallbackCount.toLocaleString();
        const counterValue = counterElement.querySelector('.counter-value');
        if (counterValue) {
            counterValue.textContent = formattedCount;
        }
        
        // Show fallback indicator
        const fallbackIndicator = counterElement.querySelector('.fallback-indicator');
        if (fallbackIndicator) {
            fallbackIndicator.style.display = 'block';
        }
    }
}

/**
 * Start real-time counter updates
 */
function startRealTimeUpdates() {
    // Only start real-time updates if we have a valid counter ID
    if (!state.counter.counterId) {
        console.log('No counter ID available, skipping real-time updates');
        return;
    }
    
    // Update counter every 30 seconds
    const updateInterval = setInterval(async () => {
        try {
            await updateCounterDisplay();
        } catch (error) {
            console.warn('Real-time counter update failed:', error);
        }
    }, 30000); // 30 seconds
    
    // Store interval ID for cleanup if needed
    state.counter.updateInterval = updateInterval;
    
    console.log('Real-time counter updates started');
}

/**
 * Update counter display with current value (for real-time updates)
 */
async function updateCounterDisplay() {
    if (!state.counter.counterId) {
        return;
    }
    
    try {
        const response = await fetch(`${state.counter.apiUrl}/${state.counter.counterId}`, {
            method: 'GET',
        });

        if (response.ok) {
            const countText = await response.text();
            const count = parseInt(countText, 10);
            
            if (!isNaN(count)) {
                // Only update if the count has changed
                const currentDisplayValue = document.getElementById('click-counter')
                    ?.querySelector('.counter-value')?.textContent?.replace(/,/g, '');
                
                if (currentDisplayValue && parseInt(currentDisplayValue, 10) !== count) {
                    displayCount(count);
                    console.log('Counter updated via real-time sync:', count);
                }
            }
        }
    } catch (error) {
        // Silently fail for real-time updates to avoid spam
        console.debug('Real-time counter update failed:', error);
    }
}

/**
 * Stop real-time counter updates (for cleanup)
 */
function stopRealTimeUpdates() {
    if (state.counter.updateInterval) {
        clearInterval(state.counter.updateInterval);
        state.counter.updateInterval = null;
        console.log('Real-time counter updates stopped');
    }
} 