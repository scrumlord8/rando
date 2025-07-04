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
    },
    // Content filtering state
    filtering: {
        config: null,
        cache: new Map(),
        stats: {
            totalChecked: 0,
            totalBlocked: 0,
            categoriesBlocked: {},
            lastUpdated: Date.now()
        }
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

// ===== CONTENT FILTERING SYSTEM =====

/**
 * Load filtering configuration from blocked-keywords.json
 */
async function loadFilteringConfig() {
    try {
        const response = await fetch('./config/blocked-keywords.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const config = await response.json();
        state.filtering.config = config;
        
        console.log(`✅ Loaded filtering config v${config.version} with ${Object.keys(config.blockedKeywords).length} categories`);
        return config;
    } catch (error) {
        console.warn('⚠️ Failed to load filtering config, using fallback:', error);
        
        // Fallback configuration
        state.filtering.config = {
            settings: { enabled: true, caseSensitive: false },
            blockedKeywords: CONFIG.filtering.blockedKeywords.reduce((acc, keyword) => {
                acc.general = acc.general || [];
                acc.general.push(keyword);
                return acc;
            }, {}),
            blockedDomains: { general: CONFIG.filtering.blockedDomains },
            whitelistedDomains: []
        };
        
        return state.filtering.config;
    }
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.toLowerCase();
    } catch (error) {
        // If URL parsing fails, try to extract domain manually
        const match = url.match(/^https?:\/\/([^\/]+)/i);
        return match ? match[1].toLowerCase() : url.toLowerCase();
    }
}

/**
 * Check if domain is whitelisted
 */
function isDomainWhitelisted(domain) {
    if (!state.filtering.config?.whitelistedDomains) return false;
    
    return state.filtering.config.whitelistedDomains.some(whitelistedDomain => {
        const cleanDomain = whitelistedDomain.toLowerCase();
        return domain === cleanDomain || domain.endsWith('.' + cleanDomain);
    });
}

/**
 * Check if domain is blocked
 */
function isDomainBlocked(domain) {
    if (!state.filtering.config?.blockedDomains) return false;
    
    for (const [category, domains] of Object.entries(state.filtering.config.blockedDomains)) {
        if (Array.isArray(domains)) {
            for (const blockedDomain of domains) {
                const cleanBlockedDomain = blockedDomain.toLowerCase();
                
                // Exact match or subdomain match
                if (domain === cleanBlockedDomain || domain.endsWith('.' + cleanBlockedDomain)) {
                    return { blocked: true, category, domain: blockedDomain };
                }
                
                // Pattern-based matching for wildcard domains
                if (blockedDomain.includes('*')) {
                    const pattern = blockedDomain.replace(/\*/g, '.*').replace(/\./g, '\\.');
                    const regex = new RegExp(`^${pattern}$`, 'i');
                    if (regex.test(domain)) {
                        return { blocked: true, category, domain: blockedDomain, pattern: true };
                    }
                }
            }
        }
    }
    
    return false;
}

/**
 * Check if domain matches suspicious patterns
 */
function hasSuspiciousDomainPattern(domain) {
    const suspiciousPatterns = [
        /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/, // IP addresses
        /[0-9]{4,}/, // Long numbers in domain
        /[a-z]{20,}/, // Very long random strings
        /(.)\1{4,}/, // Repeated characters (aaaa, bbbb)
        /^[0-9a-f]{8,}$/, // Hex strings
        /\b(free|download|crack|keygen|serial|hack)\b/i, // Suspicious keywords
        /\b(adult|sex|porn|xxx|casino|gambling|drugs)\b/i, // Adult/illegal content
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(domain));
}

/**
 * Advanced domain reputation checking
 */
function checkDomainReputation(domain) {
    const reputationChecks = {
        // Check for newly registered domains (common for scams)
        isNewDomain: false, // Would need external API
        
        // Check for domain length (very short or very long can be suspicious)
        suspiciousLength: domain.length < 4 || domain.length > 50,
        
        // Check for suspicious patterns
        suspiciousPattern: hasSuspiciousDomainPattern(domain),
        
        // Check for homograph attacks (similar looking domains)
        possibleHomograph: /[а-я]|[α-ω]|[一-龯]/.test(domain), // Cyrillic, Greek, Chinese chars
        
        // Check for suspicious TLD combinations
        suspiciousTldCombo: checkSuspiciousTldCombination(domain),
        
        // Check for URL shortener domains
        isUrlShortener: isUrlShortenerDomain(domain)
    };
    
    const suspiciousCount = Object.values(reputationChecks).filter(Boolean).length;
    
    return {
        checks: reputationChecks,
        suspiciousCount,
        riskLevel: suspiciousCount >= 3 ? 'high' : suspiciousCount >= 2 ? 'medium' : 'low'
    };
}

/**
 * Check for suspicious TLD combinations
 */
function checkSuspiciousTldCombination(domain) {
    const parts = domain.split('.');
    if (parts.length < 2) return false;
    
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];
    
    // Check for suspicious combinations
    const suspiciousCombos = [
        { tld: 'tk', sld: /^[0-9]+$/ }, // Numbers with .tk
        { tld: 'ml', sld: /^[a-z]{1,3}$/ }, // Very short domains with .ml
        { tld: 'ga', sld: /^[0-9a-f]{8,}$/ }, // Hex strings with .ga
        { tld: 'cf', sld: /free|download|hack/ }, // Suspicious keywords with .cf
    ];
    
    return suspiciousCombos.some(combo => 
        combo.tld === tld && combo.sld.test(sld)
    );
}

/**
 * Check if domain is a URL shortener
 */
function isUrlShortenerDomain(domain) {
    const shorteners = [
        'bit.ly', 'tinyurl.com', 'short.link', 'ow.ly', 'buff.ly',
        'is.gd', 't.co', 'goo.gl', 'tiny.cc', 'cli.gs',
        'short.ly', 'u.to', 'qr.ae', 'cutt.ly', 'rebrand.ly'
    ];
    
    return shorteners.some(shortener => 
        domain === shortener || domain.endsWith('.' + shortener)
    );
}

/**
 * Check if URL contains blocked keywords
 */
function containsBlockedKeywords(url, title = '', description = '') {
    if (!state.filtering.config?.blockedKeywords) return false;
    
    const textToCheck = [url, title, description].join(' ').toLowerCase();
    const caseSensitive = state.filtering.config.settings?.caseSensitive || false;
    const checkText = caseSensitive ? textToCheck : textToCheck.toLowerCase();
    
    for (const [category, keywords] of Object.entries(state.filtering.config.blockedKeywords)) {
        if (Array.isArray(keywords)) {
            for (const keyword of keywords) {
                const checkKeyword = caseSensitive ? keyword : keyword.toLowerCase();
                
                // Check for whole word matches to avoid false positives
                const wordBoundaryRegex = new RegExp(`\\b${checkKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
                
                if (wordBoundaryRegex.test(checkText)) {
                    return { blocked: true, category, keyword };
                }
            }
        }
    }
    
    return false;
}

/**
 * Check if TLD is suspicious
 */
function hasSuspiciousTLD(url) {
    if (!state.filtering.config?.suspiciousTlds) return false;
    
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        return state.filtering.config.suspiciousTlds.some(tld => 
            hostname.endsWith(tld.toLowerCase())
        );
    } catch (error) {
        return false;
    }
}

/**
 * Check if URL has blocked file extension
 */
function hasBlockedFileExtension(url) {
    if (!state.filtering.config?.blockedFileExtensions) return false;
    
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        
        return state.filtering.config.blockedFileExtensions.some(ext => 
            pathname.endsWith(ext.toLowerCase())
        );
    } catch (error) {
        return false;
    }
}

/**
 * Comprehensive content filtering function
 */
function isWebsiteAllowed(url, title = '', description = '') {
    // Update stats
    state.filtering.stats.totalChecked++;
    
    // Check if filtering is enabled
    if (!state.filtering.config?.settings?.enabled) {
        return { allowed: true, reason: 'filtering_disabled' };
    }
    
    // Check cache first for performance
    const cacheKey = `${url}|${title}|${description}`;
    if (state.filtering.cache.has(cacheKey)) {
        return state.filtering.cache.get(cacheKey);
    }
    
    let result = { allowed: true, reason: 'passed_all_checks' };
    
    try {
        const domain = extractDomain(url);
        
                 // 1. Check whitelist first (highest priority)
         if (isDomainWhitelisted(domain)) {
             result = { allowed: true, reason: 'whitelisted_domain' };
         }
         // 2. Check blocked domains
         else {
             const domainCheck = isDomainBlocked(domain);
             if (domainCheck.blocked) {
                 result = { 
                     allowed: false, 
                     reason: domainCheck.pattern ? 'blocked_domain_pattern' : 'blocked_domain', 
                     category: domainCheck.category,
                     details: `Domain ${domainCheck.domain} is blocked`
                 };
             }
             // 3. Check blocked keywords
             else {
                 const keywordCheck = containsBlockedKeywords(url, title, description);
                 if (keywordCheck.blocked) {
                     result = { 
                         allowed: false, 
                         reason: 'blocked_keyword', 
                         category: keywordCheck.category,
                         details: `Keyword "${keywordCheck.keyword}" found`
                     };
                 }
                 // 4. Check suspicious TLD
                 else if (hasSuspiciousTLD(url)) {
                     result = { 
                         allowed: false, 
                         reason: 'suspicious_tld', 
                         category: 'suspicious',
                         details: 'Suspicious top-level domain'
                     };
                 }
                 // 5. Check blocked file extensions
                 else if (hasBlockedFileExtension(url)) {
                     result = { 
                         allowed: false, 
                         reason: 'blocked_file_extension', 
                         category: 'malware',
                         details: 'Blocked file extension'
                     };
                 }
                 // 6. Advanced domain reputation check
                 else {
                     const reputationCheck = checkDomainReputation(domain);
                     if (reputationCheck.riskLevel === 'high') {
                         result = { 
                             allowed: false, 
                             reason: 'suspicious_domain_reputation', 
                             category: 'suspicious',
                             details: `High-risk domain (${reputationCheck.suspiciousCount} risk factors)`,
                             reputation: reputationCheck
                         };
                     } else if (reputationCheck.riskLevel === 'medium' && state.filtering.config.settings?.strictMode) {
                         result = { 
                             allowed: false, 
                             reason: 'suspicious_domain_reputation', 
                             category: 'suspicious',
                             details: `Medium-risk domain in strict mode (${reputationCheck.suspiciousCount} risk factors)`,
                             reputation: reputationCheck
                         };
                     }
                 }
             }
         }
        
        // Update statistics
        if (!result.allowed) {
            state.filtering.stats.totalBlocked++;
            const category = result.category || 'unknown';
            state.filtering.stats.categoriesBlocked[category] = 
                (state.filtering.stats.categoriesBlocked[category] || 0) + 1;
        }
        
        // Cache result for performance
        if (state.filtering.cache.size > 1000) {
            // Clear old cache entries if cache gets too large
            const entries = Array.from(state.filtering.cache.entries());
            const keepEntries = entries.slice(-500); // Keep last 500 entries
            state.filtering.cache.clear();
            keepEntries.forEach(([key, value]) => state.filtering.cache.set(key, value));
        }
        
        state.filtering.cache.set(cacheKey, result);
        
        // Log blocked content if enabled
        if (!result.allowed && state.filtering.config.settings?.logFilteredContent) {
            console.log(`🛡️ Blocked content: ${result.reason} - ${url}`, result);
        }
        
        return result;
        
    } catch (error) {
        console.error('Error in content filtering:', error);
        // On error, be conservative and block
        result = { 
            allowed: false, 
            reason: 'filtering_error', 
            category: 'error',
            details: error.message 
        };
        
        state.filtering.cache.set(cacheKey, result);
        return result;
    }
}

/**
 * Get filtering statistics
 */
function getFilteringStats() {
    return {
        ...state.filtering.stats,
        cacheSize: state.filtering.cache.size,
        configLoaded: !!state.filtering.config,
        configVersion: state.filtering.config?.version || 'unknown'
    };
}

/**
 * Clear filtering cache
 */
function clearFilteringCache() {
    state.filtering.cache.clear();
    console.log('🧹 Filtering cache cleared');
}

// ===== DOMAIN BLACKLIST MANAGEMENT =====

/**
 * Add domain to runtime blacklist (temporary, not persistent)
 */
function addDomainToBlacklist(domain, category = 'user_reported') {
    if (!state.filtering.config?.blockedDomains) return false;
    
    if (!state.filtering.config.blockedDomains[category]) {
        state.filtering.config.blockedDomains[category] = [];
    }
    
    const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    if (!state.filtering.config.blockedDomains[category].includes(cleanDomain)) {
        state.filtering.config.blockedDomains[category].push(cleanDomain);
        
        // Clear cache to ensure new blacklist takes effect
        clearFilteringCache();
        
        console.log(`🚫 Added domain to blacklist: ${cleanDomain} (${category})`);
        return true;
    }
    
    return false;
}

/**
 * Remove domain from runtime blacklist
 */
function removeDomainFromBlacklist(domain, category = 'user_reported') {
    if (!state.filtering.config?.blockedDomains?.[category]) return false;
    
    const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const index = state.filtering.config.blockedDomains[category].indexOf(cleanDomain);
    
    if (index > -1) {
        state.filtering.config.blockedDomains[category].splice(index, 1);
        
        // Clear cache to ensure removal takes effect
        clearFilteringCache();
        
        console.log(`✅ Removed domain from blacklist: ${cleanDomain} (${category})`);
        return true;
    }
    
    return false;
}

/**
 * Get all blacklisted domains by category
 */
function getBlacklistedDomains(category = null) {
    if (!state.filtering.config?.blockedDomains) return {};
    
    if (category) {
        return state.filtering.config.blockedDomains[category] || [];
    }
    
    return state.filtering.config.blockedDomains;
}

/**
 * Get blacklist statistics
 */
function getBlacklistStats() {
    if (!state.filtering.config?.blockedDomains) return {};
    
    const stats = {};
    let totalDomains = 0;
    
    for (const [category, domains] of Object.entries(state.filtering.config.blockedDomains)) {
        if (Array.isArray(domains)) {
            stats[category] = domains.length;
            totalDomains += domains.length;
        }
    }
    
    return {
        categories: stats,
        totalDomains,
        totalCategories: Object.keys(stats).length
    };
}

/**
 * Validate domain format
 */
function isValidDomainFormat(domain) {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) && domain.length <= 253;
}

/**
 * Bulk add domains to blacklist
 */
function bulkAddDomainsToBlacklist(domains, category = 'bulk_import') {
    if (!Array.isArray(domains)) return { success: 0, failed: 0, errors: [] };
    
    let success = 0;
    let failed = 0;
    const errors = [];
    
    for (const domain of domains) {
        try {
            const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
            
            if (!isValidDomainFormat(cleanDomain)) {
                failed++;
                errors.push(`Invalid domain format: ${domain}`);
                continue;
            }
            
            if (addDomainToBlacklist(cleanDomain, category)) {
                success++;
            } else {
                failed++;
                errors.push(`Domain already blacklisted: ${domain}`);
            }
        } catch (error) {
            failed++;
            errors.push(`Error processing ${domain}: ${error.message}`);
        }
    }
    
    return { success, failed, errors };
}

// ===== CONTENT VALIDATION SYSTEM =====

/**
 * Comprehensive content validation before opening websites
 */
async function validateWebsiteBeforeOpening(url) {
    console.log(`🔍 Validating website before opening: ${url}`);
    
    try {
        // Step 1: Basic URL validation
        const urlValidation = validateUrlStructure(url);
        if (!urlValidation.valid) {
            return {
                safe: false,
                reason: urlValidation.reason,
                category: 'invalid_url',
                details: urlValidation.details
            };
        }
        
        // Step 2: Content filtering check
        const filterResult = isWebsiteAllowed(url);
        if (!filterResult.allowed) {
            return {
                safe: false,
                reason: filterResult.reason,
                category: filterResult.category,
                details: filterResult.details
            };
        }
        
        // Step 3: Real-time safety checks
        const safetyCheck = await performRealTimeSafetyChecks(url);
        if (!safetyCheck.safe) {
            return safetyCheck;
        }
        
        // Step 4: User confirmation for medium-risk sites
        const riskAssessment = assessWebsiteRisk(url);
        if (riskAssessment.requiresConfirmation) {
            const userConfirmed = await requestUserConfirmation(url, riskAssessment);
            if (!userConfirmed) {
                return {
                    safe: false,
                    reason: 'user_declined',
                    category: 'user_action',
                    details: 'User declined to visit potentially risky website'
                };
            }
        }
        
        // Step 5: Log successful validation
        logWebsiteValidation(url, true);
        
        return {
            safe: true,
            reason: 'validation_passed',
            category: 'safe',
            details: 'Website passed all validation checks'
        };
        
    } catch (error) {
        console.error('Error during website validation:', error);
        
        // Log validation error
        logWebsiteValidation(url, false, error.message);
        
        return {
            safe: false,
            reason: 'validation_error',
            category: 'error',
            details: `Validation failed: ${error.message}`
        };
    }
}

/**
 * Validate URL structure and format
 */
function validateUrlStructure(url) {
    try {
        const urlObj = new URL(url);
        
        // Check protocol
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return {
                valid: false,
                reason: 'invalid_protocol',
                details: `Unsupported protocol: ${urlObj.protocol}`
            };
        }
        
        // Check for localhost/private IPs (security concern)
        const hostname = urlObj.hostname.toLowerCase();
        if (isPrivateOrLocalhost(hostname)) {
            return {
                valid: false,
                reason: 'private_network',
                details: 'Cannot access private network or localhost addresses'
            };
        }
        
        // Check for suspicious URL patterns
        const suspiciousPatterns = [
            /[^\x00-\x7F]/, // Non-ASCII characters
            /%[0-9a-f]{2}/i, // URL encoding (can hide malicious content)
            /javascript:/i, // JavaScript protocol
            /data:/i, // Data protocol
            /file:/i, // File protocol
        ];
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(url)) {
                return {
                    valid: false,
                    reason: 'suspicious_url_pattern',
                    details: 'URL contains suspicious patterns'
                };
            }
        }
        
        return { valid: true };
        
    } catch (error) {
        return {
            valid: false,
            reason: 'malformed_url',
            details: `Invalid URL format: ${error.message}`
        };
    }
}

/**
 * Check if hostname is private network or localhost
 */
function isPrivateOrLocalhost(hostname) {
    // Localhost patterns
    if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
        return true;
    }
    
    // Private IP ranges
    const privateRanges = [
        /^10\./, // 10.0.0.0/8
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
        /^192\.168\./, // 192.168.0.0/16
        /^169\.254\./, // 169.254.0.0/16 (link-local)
    ];
    
    return privateRanges.some(range => range.test(hostname));
}

/**
 * Perform real-time safety checks
 */
async function performRealTimeSafetyChecks(url) {
    const checks = {
        urlShortener: false,
        suspiciousRedirect: false,
        recentlyReported: false
    };
    
    try {
        const domain = extractDomain(url);
        
        // Check if it's a URL shortener
        if (isUrlShortenerDomain(domain)) {
            checks.urlShortener = true;
            
            // URL shorteners can hide the real destination
            return {
                safe: false,
                reason: 'url_shortener',
                category: 'suspicious',
                details: 'URL shorteners are not allowed for security reasons',
                checks
            };
        }
        
        // Check for suspicious redirect patterns
        if (url.includes('redirect') || url.includes('r=') || url.includes('url=')) {
            checks.suspiciousRedirect = true;
        }
        
        // Check against recently reported domains (if we had a reporting system)
        // This would integrate with a real-time threat intelligence feed
        checks.recentlyReported = await checkRecentlyReportedDomains(domain);
        
        // Evaluate overall safety
        const riskFactors = Object.values(checks).filter(Boolean).length;
        
        if (riskFactors >= 2) {
            return {
                safe: false,
                reason: 'multiple_risk_factors',
                category: 'suspicious',
                details: `Multiple risk factors detected (${riskFactors})`,
                checks
            };
        }
        
        return { safe: true, checks };
        
    } catch (error) {
        console.warn('Real-time safety check failed:', error);
        // Allow on error, but log it
        return { safe: true, checks, error: error.message };
    }
}

/**
 * Check against recently reported domains (placeholder for real implementation)
 */
async function checkRecentlyReportedDomains(domain) {
    // In a real implementation, this would check against:
    // - User reports from the last 24 hours
    // - Threat intelligence feeds
    // - Security vendor APIs
    // - Community blacklists
    
    // For now, simulate with a small list of known bad domains
    const recentlyReported = [
        'suspicious-site-reported-today.com',
        'phishing-attempt-2025.tk',
        'malware-distribution.ml'
    ];
    
    return recentlyReported.includes(domain.toLowerCase());
}

/**
 * Assess website risk level
 */
function assessWebsiteRisk(url) {
    const domain = extractDomain(url);
    const reputation = checkDomainReputation(domain);
    
    let riskLevel = 'low';
    let requiresConfirmation = false;
    const riskFactors = [];
    
    // Check reputation risk
    if (reputation.riskLevel === 'high') {
        riskLevel = 'high';
        riskFactors.push('High-risk domain reputation');
    } else if (reputation.riskLevel === 'medium') {
        riskLevel = 'medium';
        riskFactors.push('Medium-risk domain reputation');
    }
    
    // Check if domain is very new (would need external API)
    // riskFactors.push('Newly registered domain');
    
    // Check for suspicious TLD
    if (hasSuspiciousTLD(url)) {
        riskFactors.push('Suspicious top-level domain');
        if (riskLevel === 'low') riskLevel = 'medium';
    }
    
    // Check for non-standard port
    try {
        const urlObj = new URL(url);
        if (urlObj.port && !['80', '443', ''].includes(urlObj.port)) {
            riskFactors.push(`Non-standard port: ${urlObj.port}`);
            if (riskLevel === 'low') riskLevel = 'medium';
        }
    } catch (error) {
        // URL parsing error already handled elsewhere
    }
    
    // Determine if user confirmation is required
    requiresConfirmation = riskLevel === 'medium' || riskLevel === 'high';
    
    return {
        riskLevel,
        requiresConfirmation,
        riskFactors,
        reputation
    };
}

/**
 * Request user confirmation for risky websites
 */
async function requestUserConfirmation(url, riskAssessment) {
    return new Promise((resolve) => {
        // Create confirmation dialog
        const dialog = createConfirmationDialog(url, riskAssessment);
        
        // Add to page
        document.body.appendChild(dialog);
        
        // Focus on the dialog
        dialog.querySelector('.dialog-cancel').focus();
        
        // Handle user choice
        const handleChoice = (confirmed) => {
            document.body.removeChild(dialog);
            resolve(confirmed);
        };
        
        // Set up event listeners
        dialog.querySelector('.dialog-confirm').addEventListener('click', () => handleChoice(true));
        dialog.querySelector('.dialog-cancel').addEventListener('click', () => handleChoice(false));
        
        // Handle escape key
        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                document.removeEventListener('keydown', handleKeydown);
                handleChoice(false);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // Auto-dismiss after 30 seconds (default to cancel)
        setTimeout(() => {
            if (document.body.contains(dialog)) {
                document.removeEventListener('keydown', handleKeydown);
                handleChoice(false);
            }
        }, 30000);
    });
}

/**
 * Create confirmation dialog for risky websites
 */
function createConfirmationDialog(url, riskAssessment) {
    const dialog = document.createElement('div');
    dialog.className = 'validation-dialog';
    
    const domain = extractDomain(url);
    const riskColor = riskAssessment.riskLevel === 'high' ? 'var(--color-red)' : 'var(--neon-yellow)';
    
    dialog.innerHTML = `
        <div class="dialog-overlay">
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>⚠️ Website Safety Warning</h3>
                </div>
                <div class="dialog-body">
                    <p><strong>Domain:</strong> ${domain}</p>
                    <p><strong>Risk Level:</strong> <span style="color: ${riskColor}; font-weight: bold;">${riskAssessment.riskLevel.toUpperCase()}</span></p>
                    
                    ${riskAssessment.riskFactors.length > 0 ? `
                        <p><strong>Risk Factors:</strong></p>
                        <ul>
                            ${riskAssessment.riskFactors.map(factor => `<li>${factor}</li>`).join('')}
                        </ul>
                    ` : ''}
                    
                    <p class="warning-text">
                        This website has been flagged as potentially risky. 
                        Do you want to continue?
                    </p>
                </div>
                <div class="dialog-actions">
                    <button class="dialog-cancel" type="button">
                        🛡️ Stay Safe (Cancel)
                    </button>
                    <button class="dialog-confirm" type="button">
                        ⚠️ Continue Anyway
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        font-family: var(--font-mono);
    `;
    
    const overlay = dialog.querySelector('.dialog-overlay');
    overlay.style.cssText = `
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
    `;
    
    const content = dialog.querySelector('.dialog-content');
    content.style.cssText = `
        background: var(--bg-primary);
        border: 2px solid var(--neon-green);
        border-radius: 8px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 0 20px var(--neon-green);
        animation: dialogSlideIn 0.3s ease-out;
    `;
    
    const header = dialog.querySelector('.dialog-header h3');
    header.style.cssText = `
        color: var(--neon-yellow);
        margin: 0 0 1rem 0;
        text-align: center;
        font-size: 1.2rem;
    `;
    
    const body = dialog.querySelector('.dialog-body');
    body.style.cssText = `
        color: var(--gray-light);
        margin-bottom: 2rem;
        line-height: 1.5;
    `;
    
    const actions = dialog.querySelector('.dialog-actions');
    actions.style.cssText = `
        display: flex;
        gap: 1rem;
        justify-content: center;
    `;
    
    const buttons = dialog.querySelectorAll('button');
    buttons.forEach(button => {
        button.style.cssText = `
            padding: 0.75rem 1.5rem;
            border: 1px solid;
            border-radius: 4px;
            background: transparent;
            font-family: var(--font-mono);
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
    });
    
    const cancelButton = dialog.querySelector('.dialog-cancel');
    cancelButton.style.cssText += `
        color: var(--neon-green);
        border-color: var(--neon-green);
    `;
    
    const confirmButton = dialog.querySelector('.dialog-confirm');
    confirmButton.style.cssText += `
        color: var(--color-red);
        border-color: var(--color-red);
    `;
    
    // Add hover effects
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = `0 0 10px ${button.style.borderColor}`;
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = 'none';
        });
    });
    
    return dialog;
}

/**
 * Log website validation results
 */
function logWebsiteValidation(url, success, errorMessage = null) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        url,
        success,
        errorMessage,
        userAgent: navigator.userAgent
    };
    
    // Store in localStorage for debugging (keep last 100 entries)
    const validationLogs = JSON.parse(localStorage.getItem('rando-validation-logs') || '[]');
    validationLogs.push(logEntry);
    
    // Keep only last 100 entries
    if (validationLogs.length > 100) {
        validationLogs.splice(0, validationLogs.length - 100);
    }
    
    localStorage.setItem('rando-validation-logs', JSON.stringify(validationLogs));
    
    // Log to console
    if (success) {
        console.log(`✅ Website validation successful: ${url}`);
    } else {
        console.warn(`❌ Website validation failed: ${url}`, errorMessage);
    }
}

/**
 * Get validation statistics
 */
function getValidationStats() {
    const logs = JSON.parse(localStorage.getItem('rando-validation-logs') || '[]');
    
    const stats = {
        total: logs.length,
        successful: logs.filter(log => log.success).length,
        failed: logs.filter(log => !log.success).length,
        last24Hours: logs.filter(log => {
            const logTime = new Date(log.timestamp);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return logTime > dayAgo;
        }).length
    };
    
    stats.successRate = stats.total > 0 ? (stats.successful / stats.total * 100).toFixed(1) : 0;
    
    return stats;
}

// ===== CONTENT REPORTING SYSTEM =====

/**
 * Report inappropriate content
 */
async function reportInappropriateContent(url, reason, description = '', userEmail = '') {
    console.log(`📝 Reporting inappropriate content: ${url}`);
    
    try {
        // Validate inputs
        if (!url || !reason) {
            throw new Error('URL and reason are required');
        }
        
        // Check rate limiting for reports
        if (!checkReportRateLimit()) {
            throw new Error('Too many reports submitted recently. Please wait before submitting another report.');
        }
        
        // Create report object
        const report = {
            id: generateReportId(),
            timestamp: new Date().toISOString(),
            url: url.trim(),
            domain: extractDomain(url),
            reason: reason.trim(),
            description: description.trim(),
            userEmail: userEmail.trim(),
            userAgent: navigator.userAgent,
            sessionId: getSessionId(),
            status: 'pending',
            processed: false
        };
        
        // Store report locally
        const success = storeReport(report);
        
        if (success) {
            // Update rate limiting
            updateReportRateLimit();
            
            // Show success message
            showReportSuccess('Thank you for your report! It will be reviewed and help improve content filtering.');
            
            // Log successful report
            console.log(`✅ Report submitted successfully: ${report.id}`);
            
            // Optionally add to temporary blacklist for this session
            if (shouldTempBlock(reason)) {
                addDomainToBlacklist(report.domain, 'user_reported');
                console.log(`🚫 Temporarily blocked domain: ${report.domain}`);
            }
            
            return {
                success: true,
                reportId: report.id,
                message: 'Report submitted successfully'
            };
        } else {
            throw new Error('Failed to store report');
        }
        
    } catch (error) {
        console.error('Error submitting report:', error);
        showReportError(error.message);
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate unique report ID
 */
function generateReportId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `report_${timestamp}_${random}`;
}

/**
 * Get or create session ID
 */
function getSessionId() {
    let sessionId = sessionStorage.getItem('rando-session-id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('rando-session-id', sessionId);
    }
    return sessionId;
}

/**
 * Check report rate limiting
 */
function checkReportRateLimit() {
    const reports = getRecentReports();
    const maxReportsPerDay = state.filtering.config?.reporting?.maxReportsPerDay || 10;
    
    // Check reports in last 24 hours
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentReports = reports.filter(report => 
        new Date(report.timestamp).getTime() > dayAgo
    );
    
    return recentReports.length < maxReportsPerDay;
}

/**
 * Update report rate limiting
 */
function updateReportRateLimit() {
    const lastReport = {
        timestamp: new Date().toISOString(),
        sessionId: getSessionId()
    };
    
    localStorage.setItem('rando-last-report', JSON.stringify(lastReport));
}

/**
 * Store report locally
 */
function storeReport(report) {
    try {
        const reports = getStoredReports();
        reports.push(report);
        
        // Keep only last 100 reports
        if (reports.length > 100) {
            reports.splice(0, reports.length - 100);
        }
        
        localStorage.setItem('rando-content-reports', JSON.stringify(reports));
        return true;
    } catch (error) {
        console.error('Failed to store report:', error);
        return false;
    }
}

/**
 * Get stored reports
 */
function getStoredReports() {
    try {
        const reports = localStorage.getItem('rando-content-reports');
        return reports ? JSON.parse(reports) : [];
    } catch (error) {
        console.error('Failed to get stored reports:', error);
        return [];
    }
}

/**
 * Get recent reports (last 7 days)
 */
function getRecentReports() {
    const allReports = getStoredReports();
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    return allReports.filter(report => 
        new Date(report.timestamp).getTime() > weekAgo
    );
}

/**
 * Check if domain should be temporarily blocked
 */
function shouldTempBlock(reason) {
    const blockingReasons = [
        'adult_content',
        'malware',
        'phishing',
        'scam',
        'violence',
        'hate_speech'
    ];
    
    return blockingReasons.includes(reason);
}

/**
 * Show report form dialog
 */
function showReportForm(url = '') {
    // Create report form dialog
    const dialog = createReportFormDialog(url);
    
    // Add to page
    document.body.appendChild(dialog);
    
    // Focus on the first input
    setTimeout(() => {
        const firstInput = dialog.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }, 100);
    
    // Handle form submission
    const form = dialog.querySelector('.report-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const formData = new FormData(form);
        const reportData = {
            url: formData.get('url'),
            reason: formData.get('reason'),
            description: formData.get('description'),
            userEmail: formData.get('userEmail')
        };
        
        // Show loading state
        const submitButton = form.querySelector('.submit-button');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Submitting...';
        submitButton.disabled = true;
        
        // Submit report
        const result = await reportInappropriateContent(
            reportData.url,
            reportData.reason,
            reportData.description,
            reportData.userEmail
        );
        
        if (result.success) {
            // Close dialog on success
            document.body.removeChild(dialog);
        } else {
            // Reset button on error
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    });
    
    // Handle cancel
    const cancelButton = dialog.querySelector('.cancel-button');
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
    
    // Handle escape key
    const handleKeydown = (event) => {
        if (event.key === 'Escape') {
            document.removeEventListener('keydown', handleKeydown);
            if (document.body.contains(dialog)) {
                document.body.removeChild(dialog);
            }
        }
    };
    document.addEventListener('keydown', handleKeydown);
}

/**
 * Create report form dialog
 */
function createReportFormDialog(url = '') {
    const dialog = document.createElement('div');
    dialog.className = 'report-dialog';
    
    dialog.innerHTML = `
        <div class="dialog-overlay">
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>📝 Report Inappropriate Content</h3>
                </div>
                <form class="report-form">
                    <div class="form-group">
                        <label for="report-url">Website URL:</label>
                        <input 
                            type="url" 
                            id="report-url" 
                            name="url" 
                            value="${url}" 
                            required
                            placeholder="https://example.com"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="report-reason">Reason for reporting:</label>
                        <select id="report-reason" name="reason" required>
                            <option value="">Select a reason...</option>
                            <option value="adult_content">Adult/Sexual Content</option>
                            <option value="violence">Violence/Gore</option>
                            <option value="hate_speech">Hate Speech</option>
                            <option value="harassment">Harassment/Bullying</option>
                            <option value="malware">Malware/Virus</option>
                            <option value="phishing">Phishing/Scam</option>
                            <option value="spam">Spam/Unwanted Content</option>
                            <option value="illegal_content">Illegal Content</option>
                            <option value="misinformation">Misinformation</option>
                            <option value="copyright">Copyright Violation</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="report-description">Description (optional):</label>
                        <textarea 
                            id="report-description" 
                            name="description" 
                            rows="3"
                            placeholder="Provide additional details about why this content is inappropriate..."
                        ></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="report-email">Email (optional):</label>
                        <input 
                            type="email" 
                            id="report-email" 
                            name="userEmail" 
                            placeholder="your.email@example.com"
                        >
                        <small>Email is optional and will only be used if we need to follow up on your report.</small>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="cancel-button">Cancel</button>
                        <button type="submit" class="submit-button">Submit Report</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Apply styles
    styleReportDialog(dialog);
    
    return dialog;
}

/**
 * Apply styles to report dialog
 */
function styleReportDialog(dialog) {
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10001;
        font-family: var(--font-mono);
    `;
    
    const overlay = dialog.querySelector('.dialog-overlay');
    overlay.style.cssText = `
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
        animation: backdropBlur 0.3s ease-out;
    `;
    
    const content = dialog.querySelector('.dialog-content');
    content.style.cssText = `
        background: var(--bg-primary);
        border: 2px solid var(--neon-blue);
        border-radius: 8px;
        padding: 2rem;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 0 20px var(--neon-blue);
        animation: dialogSlideIn 0.3s ease-out;
    `;
    
    const header = dialog.querySelector('.dialog-header h3');
    header.style.cssText = `
        color: var(--neon-blue);
        margin: 0 0 2rem 0;
        text-align: center;
        font-size: 1.3rem;
    `;
    
    const formGroups = dialog.querySelectorAll('.form-group');
    formGroups.forEach(group => {
        group.style.cssText = `
            margin-bottom: 1.5rem;
        `;
        
        const label = group.querySelector('label');
        if (label) {
            label.style.cssText = `
                display: block;
                color: var(--neon-green);
                margin-bottom: 0.5rem;
                font-weight: bold;
            `;
        }
        
        const input = group.querySelector('input, select, textarea');
        if (input) {
            input.style.cssText = `
                width: 100%;
                padding: 0.75rem;
                background: var(--bg-black);
                border: 1px solid var(--gray-dark);
                border-radius: 4px;
                color: var(--gray-light);
                font-family: var(--font-mono);
                font-size: 0.9rem;
                transition: border-color 0.3s ease;
            `;
            
            input.addEventListener('focus', () => {
                input.style.borderColor = 'var(--neon-blue)';
                input.style.boxShadow = '0 0 5px var(--neon-blue)';
            });
            
            input.addEventListener('blur', () => {
                input.style.borderColor = 'var(--gray-dark)';
                input.style.boxShadow = 'none';
            });
        }
        
        const small = group.querySelector('small');
        if (small) {
            small.style.cssText = `
                display: block;
                color: var(--gray-medium);
                font-size: 0.8rem;
                margin-top: 0.25rem;
            `;
        }
    });
    
    const actions = dialog.querySelector('.form-actions');
    actions.style.cssText = `
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 2rem;
    `;
    
    const buttons = dialog.querySelectorAll('button');
    buttons.forEach(button => {
        button.style.cssText = `
            padding: 0.75rem 1.5rem;
            border: 1px solid;
            border-radius: 4px;
            background: transparent;
            font-family: var(--font-mono);
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = `0 0 10px ${button.style.borderColor}`;
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = 'none';
        });
    });
    
    const cancelButton = dialog.querySelector('.cancel-button');
    cancelButton.style.cssText += `
        color: var(--gray-light);
        border-color: var(--gray-light);
    `;
    
    const submitButton = dialog.querySelector('.submit-button');
    submitButton.style.cssText += `
        color: var(--neon-blue);
        border-color: var(--neon-blue);
    `;
}

/**
 * Show report success message
 */
function showReportSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'report-success';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--neon-green);
        color: var(--bg-primary);
        padding: 1rem 1.5rem;
        border-radius: 6px;
        font-family: var(--font-mono);
        font-weight: 700;
        z-index: 10002;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (document.body.contains(successDiv)) {
                document.body.removeChild(successDiv);
            }
        }, 300);
    }, 5000);
}

/**
 * Show report error message
 */
function showReportError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'report-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--color-red);
        color: var(--gray-light);
        padding: 1rem 1.5rem;
        border-radius: 6px;
        font-family: var(--font-mono);
        font-weight: 700;
        z-index: 10002;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 300);
    }, 4000);
}

/**
 * Get reporting statistics
 */
function getReportingStats() {
    const allReports = getStoredReports();
    const recentReports = getRecentReports();
    
    const stats = {
        total: allReports.length,
        recent: recentReports.length,
        byReason: {},
        byStatus: {},
        last24Hours: 0
    };
    
    // Count by reason
    allReports.forEach(report => {
        stats.byReason[report.reason] = (stats.byReason[report.reason] || 0) + 1;
        stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;
    });
    
    // Count last 24 hours
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    stats.last24Hours = allReports.filter(report => 
        new Date(report.timestamp).getTime() > dayAgo
    ).length;
    
    return stats;
}

/**
 * Add report button to current website (if opened via Rando)
 */
function addReportButton() {
    // Only add if we have a current website from our system
    if (!state.currentWebsite) return;
    
    // Check if button already exists
    if (document.getElementById('rando-report-button')) return;
    
    const reportButton = document.createElement('button');
    reportButton.id = 'rando-report-button';
    reportButton.innerHTML = '⚠️ Report Content';
    reportButton.title = 'Report inappropriate content';
    
    reportButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--color-red);
        color: white;
        border: none;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        font-family: var(--font-mono);
        font-size: 0.8rem;
        font-weight: bold;
        cursor: pointer;
        z-index: 9999;
        transition: all 0.3s ease;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    `;
    
    reportButton.addEventListener('click', () => {
        showReportForm(state.currentWebsite);
    });
    
    reportButton.addEventListener('mouseenter', () => {
        reportButton.style.transform = 'scale(1.05)';
        reportButton.style.boxShadow = '0 4px 15px rgba(255, 0, 0, 0.4)';
    });
    
    reportButton.addEventListener('mouseleave', () => {
        reportButton.style.transform = 'scale(1)';
        reportButton.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    });
    
    document.body.appendChild(reportButton);
}

/**
 * Add visit history stats button (development only)
 */
function addVisitHistoryButton() {
    // Check if button already exists
    if (document.getElementById('visit-history-button')) return;
    
    const historyButton = document.createElement('button');
    historyButton.id = 'visit-history-button';
    historyButton.innerHTML = '📊 Visit Stats';
    historyButton.title = 'Show visit history statistics';
    
    historyButton.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: var(--color-blue);
        color: white;
        border: none;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        font-family: var(--font-mono);
        font-size: 0.8rem;
        font-weight: bold;
        cursor: pointer;
        z-index: 9999;
        transition: all 0.3s ease;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    `;
    
    historyButton.addEventListener('click', () => {
        showVisitHistoryStats();
    });
    
    historyButton.addEventListener('mouseenter', () => {
        historyButton.style.transform = 'scale(1.05)';
        historyButton.style.boxShadow = '0 4px 15px rgba(0, 255, 255, 0.4)';
    });
    
    historyButton.addEventListener('mouseleave', () => {
        historyButton.style.transform = 'scale(1)';
        historyButton.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    });
    
    document.body.appendChild(historyButton);
}

/**
 * Show visit history statistics in a modal
 */
function showVisitHistoryStats() {
    const stats = getVisitHistoryStats();
    const recentVisits = state.visitHistory.slice(-20);
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: var(--font-mono);
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: var(--color-dark);
        border: 2px solid var(--color-green);
        border-radius: 8px;
        padding: 2rem;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        color: var(--color-green);
    `;
    
    content.innerHTML = `
        <h2 style="margin-top: 0; color: var(--color-green); text-align: center;">📊 Visit History Statistics</h2>
        
        <div style="margin-bottom: 1.5rem;">
            <h3>📈 Summary</h3>
            <p><strong>Total Visits:</strong> ${stats.totalVisits}</p>
            <p><strong>Unique Websites:</strong> ${stats.uniqueVisits}</p>
            <p><strong>Repeat Rate:</strong> ${stats.repeatRate}%</p>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
            <h3>🕒 Recent Visits (Last 20)</h3>
            <div style="max-height: 200px; overflow-y: auto; font-size: 0.8rem;">
                ${recentVisits.map((visit, index) => {
                    const domain = new URL(visit.url).hostname;
                    const timeAgo = Math.floor((Date.now() - visit.timestamp) / 1000 / 60);
                    const repeatIcon = visit.isRepeat ? '🔄' : '✨';
                    return `<div style="margin: 0.5rem 0; padding: 0.5rem; background: rgba(0, 255, 0, 0.1); border-radius: 4px;">
                        ${repeatIcon} <strong>${domain}</strong> - ${timeAgo}m ago
                    </div>`;
                }).join('')}
            </div>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
            <h3>🎯 Repeat Prevention</h3>
            <p>System avoids last <strong>10 visits</strong> when selecting new websites</p>
            <p>Prefers different <strong>categories</strong> from last 5 visits</p>
            <p>Tries up to <strong>25 attempts</strong> to find a fresh website</p>
            <p>Falls back to any website if no fresh options found</p>
        </div>
        
        <button id="close-history-modal" style="
            width: 100%;
            padding: 1rem;
            background: var(--color-green);
            color: var(--color-dark);
            border: none;
            border-radius: 4px;
            font-family: var(--font-mono);
            font-weight: bold;
            cursor: pointer;
        ">Close</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close handlers
    const closeButton = content.querySelector('#close-history-modal');
    const closeModal = () => document.body.removeChild(modal);
    
    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // ESC key handler
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

/**
 * Add repeat prevention test button (development only)
 */
function addRepeatPreventionTestButton() {
    // Check if button already exists
    if (document.getElementById('repeat-test-button')) return;
    
    const testButton = document.createElement('button');
    testButton.id = 'repeat-test-button';
    testButton.innerHTML = '🔄 Test Repeats';
    testButton.title = 'Test repeat prevention system';
    
    testButton.style.cssText = `
        position: fixed;
        bottom: 140px;
        right: 20px;
        background: var(--color-pink);
        color: white;
        border: none;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        font-family: var(--font-mono);
        font-size: 0.8rem;
        font-weight: bold;
        cursor: pointer;
        z-index: 9999;
        transition: all 0.3s ease;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    `;
    
    testButton.addEventListener('click', () => {
        testRepeatPrevention();
    });
    
    testButton.addEventListener('mouseenter', () => {
        testButton.style.transform = 'scale(1.05)';
        testButton.style.boxShadow = '0 4px 15px rgba(255, 0, 255, 0.4)';
    });
    
    testButton.addEventListener('mouseleave', () => {
        testButton.style.transform = 'scale(1)';
        testButton.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    });
    
    document.body.appendChild(testButton);
}

/**
 * Test repeat prevention system
 */
function testRepeatPrevention() {
    console.log('🧪 Testing repeat prevention system...');
    
    // Clear existing history for clean test
    const originalHistory = [...state.visitHistory];
    state.visitHistory = [];
    
    console.log('📊 Test 1: Generate 15 websites and check for repeats');
    const testResults = [];
    const seenUrls = new Set();
    let repeatCount = 0;
    
    for (let i = 0; i < 15; i++) {
        const website = getRandomCuratedWebsite();
        
        // Simulate adding to history
        state.visitHistory.push({
            url: website,
            timestamp: Date.now() - (15 - i) * 1000, // Spread over time
            isRepeat: seenUrls.has(website)
        });
        
        if (seenUrls.has(website)) {
            repeatCount++;
            console.log(`🔄 Repeat #${repeatCount}: ${website} (iteration ${i + 1})`);
        } else {
            console.log(`✨ New: ${website} (iteration ${i + 1})`);
        }
        
        seenUrls.add(website);
        testResults.push({
            iteration: i + 1,
            url: website,
            isRepeat: seenUrls.size < testResults.length + 1
        });
    }
    
    const uniqueCount = seenUrls.size;
    const repeatRate = ((15 - uniqueCount) / 15 * 100).toFixed(1);
    
    console.log(`📈 Test Results:`);
    console.log(`   Total generated: 15`);
    console.log(`   Unique websites: ${uniqueCount}`);
    console.log(`   Repeat rate: ${repeatRate}%`);
    console.log(`   Expected: <20% repeat rate with good prevention`);
    
    // Test category diversity
    console.log('📊 Test 2: Category diversity analysis');
    const categoryCount = {};
    testResults.forEach(result => {
        for (const [category, websites] of Object.entries(CURATED_WEBSITES)) {
            if (websites.includes(result.url)) {
                categoryCount[category] = (categoryCount[category] || 0) + 1;
                break;
            }
        }
    });
    
    console.log('   Category distribution:');
    Object.entries(categoryCount).forEach(([category, count]) => {
        console.log(`     ${category}: ${count} visits`);
    });
    
    // Restore original history
    state.visitHistory = originalHistory;
    
    // Show results in modal
    showTestResults(testResults, uniqueCount, repeatRate, categoryCount);
}

/**
 * Show test results in a modal
 */
function showTestResults(testResults, uniqueCount, repeatRate, categoryCount) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: var(--font-mono);
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: var(--color-dark);
        border: 2px solid var(--color-pink);
        border-radius: 8px;
        padding: 2rem;
        max-width: 700px;
        max-height: 80vh;
        overflow-y: auto;
        color: var(--color-pink);
    `;
    
    const categoryStats = Object.entries(categoryCount)
        .map(([cat, count]) => `<span style="margin-right: 1rem;">${cat}: ${count}</span>`)
        .join('<br/>');
    
    content.innerHTML = `
        <h2 style="margin-top: 0; color: var(--color-pink); text-align: center;">🔄 Repeat Prevention Test Results</h2>
        
        <div style="margin-bottom: 1.5rem;">
            <h3>📊 Summary</h3>
            <p><strong>Total Generated:</strong> 15 websites</p>
            <p><strong>Unique Websites:</strong> ${uniqueCount}</p>
            <p><strong>Repeat Rate:</strong> ${repeatRate}%</p>
            <p><strong>Status:</strong> ${parseFloat(repeatRate) < 20 ? '✅ Good prevention' : '⚠️ High repeat rate'}</p>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
            <h3>🎨 Category Distribution</h3>
            <div style="font-size: 0.9rem;">${categoryStats}</div>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
            <h3>📝 Generation Log</h3>
            <div style="max-height: 200px; overflow-y: auto; font-size: 0.8rem;">
                ${testResults.map((result, index) => {
                    const icon = result.isRepeat ? '🔄' : '✨';
                    const domain = new URL(result.url).hostname;
                    return `<div style="margin: 0.25rem 0;">${icon} ${index + 1}. ${domain}</div>`;
                }).join('')}
            </div>
        </div>
        
        <button id="close-test-modal" style="
            width: 100%;
            padding: 1rem;
            background: var(--color-pink);
            color: var(--color-dark);
            border: none;
            border-radius: 4px;
            font-family: var(--font-mono);
            font-weight: bold;
            cursor: pointer;
        ">Close</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close handlers
    const closeButton = content.querySelector('#close-test-modal');
    const closeModal = () => document.body.removeChild(modal);
    
    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // ESC key handler
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
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
    
    // Get recently visited URLs and their categories (last 10 visits)
    const recentVisits = state.visitHistory.slice(-10).map(visit => visit.url);
    const recentCategories = state.visitHistory.slice(-5).map(visit => {
        // Find which category this URL belongs to
        for (const [category, websites] of Object.entries(CURATED_WEBSITES)) {
            if (websites.includes(visit.url)) {
                return category;
            }
        }
        return null;
    }).filter(Boolean);
    
    // Try to find a non-recent website, preferring different categories
    let attempts = 0;
    const maxAttempts = 25;
    
    while (attempts < maxAttempts) {
        attempts++;
        
        // For first 15 attempts, prefer categories we haven't used recently
        let availableCategories = categories;
        if (attempts <= 15 && recentCategories.length > 0) {
            const freshCategories = categories.filter(cat => !recentCategories.includes(cat));
            if (freshCategories.length > 0) {
                availableCategories = freshCategories;
                console.log(`🎨 Preferring fresh categories: ${freshCategories.join(', ')}`);
            }
        }
        
        const randomCategory = randomChoice(availableCategories);
        const websites = CURATED_WEBSITES[randomCategory];
        const selectedWebsite = randomChoice(websites);
        
        // If we haven't visited this recently, use it
        if (!recentVisits.includes(selectedWebsite)) {
            const categoryFreshness = recentCategories.includes(randomCategory) ? '(repeat category)' : '(fresh category)';
            console.log(`🎯 Selected fresh website: ${selectedWebsite} (category: ${randomCategory}) ${categoryFreshness}`);
            return selectedWebsite;
        }
        
        console.log(`🔄 Skipping recently visited: ${selectedWebsite} (attempt ${attempts})`);
    }
    
    // If we can't find a fresh website after 25 attempts, 
    // just return a random one (better than infinite loop)
    const fallbackCategory = randomChoice(categories);
    const fallbackWebsite = randomChoice(CURATED_WEBSITES[fallbackCategory]);
    console.log(`⚠️ Using fallback website after ${maxAttempts} attempts: ${fallbackWebsite}`);
    return fallbackWebsite;
}

/**
 * Get visit history statistics
 */
function getVisitHistoryStats() {
    const recentVisits = state.visitHistory.slice(-20); // Last 20 visits
    const uniqueUrls = new Set(recentVisits.map(visit => visit.url));
    const totalVisits = recentVisits.length;
    const uniqueVisits = uniqueUrls.size;
    const repeatRate = totalVisits > 0 ? ((totalVisits - uniqueVisits) / totalVisits * 100).toFixed(1) : 0;
    
    return {
        totalVisits,
        uniqueVisits,
        repeatRate: parseFloat(repeatRate),
        recentUrls: Array.from(uniqueUrls)
    };
}

/**
 * Check if a website was recently visited
 */
function wasRecentlyVisited(url, lookbackCount = 10) {
    const recentVisits = state.visitHistory.slice(-lookbackCount).map(visit => visit.url);
    return recentVisits.includes(url);
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
        if (website && isValidUrl(website)) {
            const filterResult = isWebsiteAllowed(website);
            
            if (filterResult.allowed) {
                console.log(`✅ Found valid website: ${website} (${filterResult.reason})`);
                break;
            } else {
                console.log(`🛡️ Website blocked: ${website} - ${filterResult.reason} (${filterResult.category})`);
                
                // Show user-friendly message for blocked content (only once per session)
                if (filterResult.category && !sessionStorage.getItem('filter-warning-shown')) {
                    showError(`Content filtered for safety: ${filterResult.category} content blocked`);
                    sessionStorage.setItem('filter-warning-shown', 'true');
                }
                
                website = null;
            }
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
        button.textContent = 'Loading...';
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.textContent = 'LFG!';
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
        
        // Check if this is a repeat visit
        const isRepeat = wasRecentlyVisited(website, 10);
        if (isRepeat) {
            console.log(`🔄 Note: This website was recently visited`);
            // Optional: Show user a subtle notification about the repeat
            // (only in development mode to avoid annoying users)
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                const stats = getVisitHistoryStats();
                console.log(`📊 Visit stats - Total: ${stats.totalVisits}, Unique: ${stats.uniqueVisits}, Repeat rate: ${stats.repeatRate}%`);
            }
        }
        
        // Store in history
        state.currentWebsite = website;
        state.visitHistory.push({
            url: website,
            timestamp: Date.now(),
            isRepeat: isRepeat
        });
        
        // Keep history limited to last 50 visits
        if (state.visitHistory.length > 50) {
            state.visitHistory = state.visitHistory.slice(-50);
        }
        
        // Validate website before opening
        const validationResult = await validateWebsiteBeforeOpening(website);
        
        if (validationResult.safe) {
            // Open website in new tab
            window.open(website, '_blank', 'noopener,noreferrer');
            
            // Log successful opening
            console.log(`🌐 Opened validated website: ${website}`);
        } else {
            // Show validation error
            showError(`Website blocked: ${validationResult.reason}`);
            console.warn(`🚫 Website validation failed: ${website} - ${validationResult.reason}`);
            return; // Don't increment counter for blocked sites
        }
        
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
    
    // Social media sharing buttons
    const facebookShareButton = document.getElementById('share-facebook');
    if (facebookShareButton) {
        facebookShareButton.addEventListener('click', (event) => {
            event.preventDefault();
            
            // Add visual feedback
            facebookShareButton.classList.add('sharing');
            setTimeout(() => {
                facebookShareButton.classList.remove('sharing');
            }, 1000);
            
            shareOnFacebook();
        });
    }
    
    const twitterShareButton = document.getElementById('share-twitter');
    if (twitterShareButton) {
        twitterShareButton.addEventListener('click', (event) => {
            event.preventDefault();
            
            // Add visual feedback
            twitterShareButton.classList.add('sharing');
            setTimeout(() => {
                twitterShareButton.classList.remove('sharing');
            }, 1000);
            
            shareOnTwitter();
        });
    }
    
    // Report content button
    const reportButton = document.getElementById('report-content');
    if (reportButton) {
        reportButton.addEventListener('click', (event) => {
            event.preventDefault();
            showReportForm();
        });
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
    console.log('🚀 Initializing Rando website...');
    
    // Load content filtering configuration
    await loadFilteringConfig();
    
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
    
    // Add development-only features and run tests
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Add development buttons
        addVisitHistoryButton();
        addRepeatPreventionTestButton();
        
        // Run tests
        runSocialSharingTests();
        runContentFilteringTests();
    }
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

// ===== SOCIAL MEDIA SHARING FUNCTIONS =====

/**
 * Share on Facebook
 */
function shareOnFacebook() {
    // Get current counter value for dynamic sharing text
    const counterElement = document.getElementById('click-counter');
    const counterValue = counterElement?.querySelector('.counter-value')?.textContent || '0';
    
    const shareData = {
        url: window.location.href,
        title: 'Rando - Discover Random Websites',
        description: `Join ${counterValue} adventurers exploring the web! 🚀 Rando helps you discover amazing random websites safely. Experience the retro 90s internet adventure!`,
        hashtag: '#RandomWebsites'
    };
    
    // Facebook Share Dialog URL
    const facebookUrl = new URL('https://www.facebook.com/sharer/sharer.php');
    facebookUrl.searchParams.set('u', shareData.url);
    facebookUrl.searchParams.set('quote', `${shareData.title} - ${shareData.description}`);
    facebookUrl.searchParams.set('hashtag', shareData.hashtag);
    
    // Open Facebook share dialog
    const popup = window.open(
        facebookUrl.toString(),
        'facebook-share',
        'width=600,height=400,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,directories=no,status=no'
    );
    
    if (!popup) {
        // Fallback if popup is blocked
        console.warn('Facebook share popup blocked, falling back to direct navigation');
        window.open(facebookUrl.toString(), '_blank', 'noopener,noreferrer');
    } else {
        // Focus the popup window
        popup.focus();
        
        // Log the share event
        console.log('Facebook share initiated with counter:', counterValue);
        
        // Optional: Track share event (for analytics)
        trackSocialShare('facebook');
    }
}

/**
 * Share on X (Twitter)
 */
function shareOnTwitter() {
    // Get current counter value for dynamic sharing text
    const counterElement = document.getElementById('click-counter');
    const counterValue = counterElement?.querySelector('.counter-value')?.textContent || '0';
    
    const shareData = {
        url: window.location.href,
        text: `🚀 Just discovered Rando! Join ${counterValue} web explorers discovering amazing random websites safely. Retro 90s vibes + modern safety! #RandomWebsites #WebExploration #RetroWeb #InternetAdventure`,
        via: 'RandoWebsite',
        related: 'RandoWebsite'
    };
    
    // Twitter/X Share Intent URL
    const twitterUrl = new URL('https://twitter.com/intent/tweet');
    twitterUrl.searchParams.set('text', shareData.text);
    twitterUrl.searchParams.set('url', shareData.url);
    twitterUrl.searchParams.set('via', shareData.via);
    twitterUrl.searchParams.set('related', shareData.related);
    
    // Open Twitter share dialog
    const popup = window.open(
        twitterUrl.toString(),
        'twitter-share',
        'width=550,height=420,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,directories=no,status=no'
    );
    
    if (!popup) {
        // Fallback if popup is blocked
        console.warn('Twitter share popup blocked, falling back to direct navigation');
        window.open(twitterUrl.toString(), '_blank', 'noopener,noreferrer');
    } else {
        // Focus the popup window
        popup.focus();
        
        // Log the share event
        console.log('Twitter share initiated with counter:', counterValue);
        
        // Optional: Track share event (for analytics)
        trackSocialShare('twitter');
    }
}

/**
 * Track social media sharing events (for analytics)
 */
function trackSocialShare(platform) {
    try {
        // Store sharing statistics in localStorage
        const shareStats = JSON.parse(localStorage.getItem('rando-share-stats') || '{}');
        shareStats[platform] = (shareStats[platform] || 0) + 1;
        shareStats.lastShared = Date.now();
        localStorage.setItem('rando-share-stats', JSON.stringify(shareStats));
        
        console.log(`Social share tracked: ${platform}`);
        
        // Future: Send to analytics service if implemented
        // analytics.track('social_share', { platform, url: window.location.href });
        
    } catch (error) {
        console.warn('Failed to track social share:', error);
    }
}

/**
 * Get sharing statistics (for future use)
 */
function getSharingStats() {
    try {
        return JSON.parse(localStorage.getItem('rando-share-stats') || '{}');
    } catch (error) {
        console.warn('Failed to get sharing stats:', error);
        return {};
    }
}

/**
 * Generic social share function with Web Share API fallback
 */
async function shareGeneric(platform = 'generic') {
    const counterElement = document.getElementById('click-counter');
    const counterValue = counterElement?.querySelector('.counter-value')?.textContent || '0';
    
    const shareData = {
        title: 'Rando - Discover Random Websites',
        text: `🚀 Join ${counterValue} web explorers discovering amazing random websites safely! Retro 90s vibes + modern safety.`,
        url: window.location.href
    };
    
    // Try Web Share API first (mobile browsers)
    if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        try {
            await navigator.share(shareData);
            console.log('Shared successfully via Web Share API');
            trackSocialShare('web-share-api');
            return;
        } catch (error) {
            console.log('Web Share API failed, falling back to platform-specific sharing');
        }
    }
    
    // Fallback to platform-specific sharing
    if (platform === 'facebook') {
        shareOnFacebook();
    } else if (platform === 'twitter') {
        shareOnTwitter();
    } else {
        // Generic fallback - copy to clipboard
        try {
            await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
            showShareSuccess('Link copied to clipboard!');
            trackSocialShare('clipboard');
        } catch (error) {
            console.warn('Clipboard API failed:', error);
            showShareError('Unable to share. Please copy the URL manually.');
        }
    }
}

/**
 * Show share success message
 */
function showShareSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'share-success';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--neon-green);
        color: var(--bg-primary);
        padding: 1rem 1.5rem;
        border-radius: 6px;
        font-family: var(--font-mono);
        font-weight: 700;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 300);
    }, 3000);
}

/**
 * Show share error message
 */
function showShareError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'share-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--color-red);
        color: var(--gray-light);
        padding: 1rem 1.5rem;
        border-radius: 6px;
        font-family: var(--font-mono);
        font-weight: 700;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 300);
    }, 4000);
}

// ===== SOCIAL SHARING TESTING FUNCTIONS =====

/**
 * Test social sharing functionality across platforms
 */
function testSocialSharing() {
    console.log('🧪 Testing social sharing functionality...');
    
    // Test 1: Validate sharing URLs
    testSharingUrls();
    
    // Test 2: Test platform detection
    testPlatformDetection();
    
    // Test 3: Test Web Share API availability
    testWebShareApi();
    
    // Test 4: Test clipboard functionality
    testClipboardApi();
    
    // Test 5: Test notification system
    testNotificationSystem();
    
    // Test 6: Test analytics tracking
    testAnalyticsTracking();
    
    console.log('✅ Social sharing tests completed');
}

/**
 * Test sharing URL generation
 */
function testSharingUrls() {
    console.log('📝 Testing sharing URL generation...');
    
    try {
        // Mock counter value for testing
        const mockCounterElement = document.createElement('div');
        mockCounterElement.innerHTML = '<span class="counter-value">1,234</span>';
        mockCounterElement.id = 'click-counter';
        document.body.appendChild(mockCounterElement);
        
        // Test Facebook URL generation
        const facebookUrl = new URL('https://www.facebook.com/sharer/sharer.php');
        facebookUrl.searchParams.set('u', window.location.href);
        facebookUrl.searchParams.set('quote', 'Rando - Discover Random Websites - Join 1,234 adventurers exploring the web!');
        
        console.log('✅ Facebook URL:', facebookUrl.toString());
        
        // Test Twitter URL generation
        const twitterUrl = new URL('https://twitter.com/intent/tweet');
        twitterUrl.searchParams.set('text', '🚀 Just discovered Rando! Join 1,234 web explorers...');
        twitterUrl.searchParams.set('url', window.location.href);
        
        console.log('✅ Twitter URL:', twitterUrl.toString());
        
        // Cleanup
        document.body.removeChild(mockCounterElement);
        
    } catch (error) {
        console.error('❌ URL generation test failed:', error);
    }
}

/**
 * Test platform detection
 */
function testPlatformDetection() {
    console.log('📱 Testing platform detection...');
    
    const userAgent = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    console.log('User Agent:', userAgent);
    console.log('Is Mobile:', isMobile);
    console.log('Platform:', navigator.platform);
    console.log('Touch Support:', 'ontouchstart' in window);
    
    if (isMobile) {
        console.log('✅ Mobile platform detected - Web Share API will be preferred');
    } else {
        console.log('✅ Desktop platform detected - Popup sharing will be used');
    }
}

/**
 * Test Web Share API availability
 */
function testWebShareApi() {
    console.log('🌐 Testing Web Share API...');
    
    if ('share' in navigator) {
        console.log('✅ Web Share API is supported');
        
        // Test if we can share (without actually sharing)
        const testShareData = {
            title: 'Test Share',
            text: 'Testing Web Share API',
            url: window.location.href
        };
        
        try {
            // Just check if the data is valid for sharing
            console.log('✅ Share data is valid:', testShareData);
        } catch (error) {
            console.warn('⚠️ Web Share API validation failed:', error);
        }
    } else {
        console.log('ℹ️ Web Share API not supported - using fallback methods');
    }
}

/**
 * Test clipboard functionality
 */
function testClipboardApi() {
    console.log('📋 Testing Clipboard API...');
    
    if ('clipboard' in navigator) {
        console.log('✅ Clipboard API is supported');
        
        // Test clipboard permissions
        navigator.permissions.query({name: 'clipboard-write'}).then(result => {
            console.log('Clipboard write permission:', result.state);
        }).catch(error => {
            console.log('Clipboard permission check not available:', error.message);
        });
    } else {
        console.log('ℹ️ Clipboard API not supported - manual copy required');
    }
}

/**
 * Test notification system
 */
function testNotificationSystem() {
    console.log('🔔 Testing notification system...');
    
    try {
        // Test success notification (briefly)
        showShareSuccess('Test success notification');
        
        setTimeout(() => {
            // Test error notification (briefly)
            showShareError('Test error notification');
        }, 500);
        
        console.log('✅ Notification system working');
    } catch (error) {
        console.error('❌ Notification system test failed:', error);
    }
}

/**
 * Test analytics tracking
 */
function testAnalyticsTracking() {
    console.log('📊 Testing analytics tracking...');
    
    try {
        // Test tracking functions
        trackSocialShare('test-platform');
        
        const stats = getSharingStats();
        console.log('✅ Analytics tracking working. Current stats:', stats);
        
        // Cleanup test data
        const currentStats = JSON.parse(localStorage.getItem('rando-share-stats') || '{}');
        delete currentStats['test-platform'];
        localStorage.setItem('rando-share-stats', JSON.stringify(currentStats));
        
    } catch (error) {
        console.error('❌ Analytics tracking test failed:', error);
    }
}

/**
 * Run comprehensive social sharing tests
 */
function runSocialSharingTests() {
    console.log('🚀 Starting comprehensive social sharing tests...');
    
    // Add test button to page for manual testing
    const testButton = document.createElement('button');
    testButton.textContent = 'Run Social Sharing Tests';
    testButton.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: var(--neon-yellow);
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
        testSocialSharing();
    });
    
    // Only add test button in development (when running on localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        document.body.appendChild(testButton);
        console.log('🧪 Test button added (development mode)');
    }
    
    // Run initial tests
    testSocialSharing();
}

// ===== CONTENT FILTERING TESTING FUNCTIONS =====

/**
 * Test content filtering functionality
 */
function testContentFiltering() {
    console.log('🧪 Testing content filtering functionality...');
    
    // Test 1: Test blocked domains
    testBlockedDomains();
    
    // Test 2: Test blocked keywords
    testBlockedKeywords();
    
    // Test 3: Test whitelisted domains
    testWhitelistedDomains();
    
    // Test 4: Test suspicious TLDs
    testSuspiciousTlds();
    
    // Test 5: Test filtering performance
    testFilteringPerformance();
    
    // Test 6: Test filtering statistics
    testFilteringStatistics();
    
    // Test 7: Test blacklist management
    testBlacklistManagement();
    
    // Test 8: Test content validation
    testContentValidation();
    
    console.log('✅ Content filtering tests completed');
}

/**
 * Test blocked domains
 */
function testBlockedDomains() {
    console.log('🚫 Testing blocked domains...');
    
    const testDomains = [
        'https://pornhub.com',
        'https://casino.com',
        'https://bet365.com',
        'https://example-malware.com'
    ];
    
    testDomains.forEach(url => {
        const result = isWebsiteAllowed(url);
        if (!result.allowed) {
            console.log(`✅ Correctly blocked: ${url} (${result.reason})`);
        } else {
            console.warn(`⚠️ Should have blocked: ${url}`);
        }
    });
    
    // Test advanced domain reputation
    console.log('🔍 Testing domain reputation system...');
    
    const suspiciousTestDomains = [
        'https://192.168.1.1', // IP address
        'https://aaaaaaaaaa.tk', // Suspicious TLD + repeated chars
        'https://1234567890.ml', // Numbers with suspicious TLD
        'https://free-download-hack.cf', // Suspicious keywords
        'https://аррӏе.com' // Homograph attack (fake Apple)
    ];
    
    suspiciousTestDomains.forEach(url => {
        const result = isWebsiteAllowed(url);
        const domain = extractDomain(url);
        const reputation = checkDomainReputation(domain);
        
        console.log(`Domain: ${url}`);
        console.log(`  Risk Level: ${reputation.riskLevel}`);
        console.log(`  Suspicious Count: ${reputation.suspiciousCount}`);
        console.log(`  Blocked: ${!result.allowed} (${result.reason})`);
        console.log('---');
    });
}

/**
 * Test blocked keywords
 */
function testBlockedKeywords() {
    console.log('🔍 Testing blocked keywords...');
    
    const testUrls = [
        'https://example.com/adult-content',
        'https://example.com/casino-games',
        'https://example.com/drug-store',
        'https://example.com/violence-content'
    ];
    
    testUrls.forEach(url => {
        const result = isWebsiteAllowed(url);
        if (!result.allowed) {
            console.log(`✅ Correctly blocked keyword: ${url} (${result.details})`);
        } else {
            console.warn(`⚠️ Should have blocked keyword: ${url}`);
        }
    });
}

/**
 * Test whitelisted domains
 */
function testWhitelistedDomains() {
    console.log('✅ Testing whitelisted domains...');
    
    const testDomains = [
        'https://wikipedia.org',
        'https://github.com',
        'https://stackoverflow.com',
        'https://khanacademy.org'
    ];
    
    testDomains.forEach(url => {
        const result = isWebsiteAllowed(url);
        if (result.allowed) {
            console.log(`✅ Correctly allowed: ${url} (${result.reason})`);
        } else {
            console.warn(`⚠️ Should have allowed: ${url} - ${result.reason}`);
        }
    });
}

/**
 * Test suspicious TLDs
 */
function testSuspiciousTlds() {
    console.log('🌐 Testing suspicious TLDs...');
    
    const testUrls = [
        'https://example.tk',
        'https://example.ml',
        'https://example.xxx',
        'https://example.bet'
    ];
    
    testUrls.forEach(url => {
        const result = isWebsiteAllowed(url);
        if (!result.allowed && result.reason === 'suspicious_tld') {
            console.log(`✅ Correctly blocked suspicious TLD: ${url}`);
        } else if (result.allowed) {
            console.warn(`⚠️ Should have blocked suspicious TLD: ${url}`);
        }
    });
}

/**
 * Test filtering performance
 */
function testFilteringPerformance() {
    console.log('⚡ Testing filtering performance...');
    
    const testUrls = [
        'https://example.com',
        'https://github.com',
        'https://stackoverflow.com',
        'https://wikipedia.org',
        'https://google.com'
    ];
    
    const startTime = performance.now();
    
    // Test 1000 filtering operations
    for (let i = 0; i < 1000; i++) {
        const url = testUrls[i % testUrls.length];
        isWebsiteAllowed(url);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Filtering performance: ${duration.toFixed(2)}ms for 1000 operations (${(duration/1000).toFixed(3)}ms per operation)`);
    
    if (duration < 100) {
        console.log('🚀 Excellent performance!');
    } else if (duration < 500) {
        console.log('👍 Good performance');
    } else {
        console.warn('⚠️ Performance could be improved');
    }
}

/**
 * Test filtering statistics
 */
function testFilteringStatistics() {
    console.log('📊 Testing filtering statistics...');
    
    const stats = getFilteringStats();
    console.log('Current filtering statistics:', stats);
    
    if (stats.configLoaded) {
        console.log(`✅ Config loaded: v${stats.configVersion}`);
    } else {
        console.warn('⚠️ Config not loaded');
    }
    
    console.log(`📈 Cache size: ${stats.cacheSize} entries`);
    console.log(`🔍 Total checked: ${stats.totalChecked}`);
    console.log(`🛡️ Total blocked: ${stats.totalBlocked}`);
    
    if (Object.keys(stats.categoriesBlocked).length > 0) {
        console.log('📋 Blocked by category:', stats.categoriesBlocked);
    }
}

/**
 * Test blacklist management functions
 */
function testBlacklistManagement() {
    console.log('🛡️ Testing blacklist management...');
    
    // Test blacklist statistics
    const blacklistStats = getBlacklistStats();
    console.log('📊 Blacklist statistics:', blacklistStats);
    
    // Test adding domain to blacklist
    const testDomain = 'test-malicious-site.com';
    const addResult = addDomainToBlacklist(testDomain, 'test');
    console.log(`➕ Add domain result: ${addResult}`);
    
    // Test if domain is now blocked
    const blockTest = isWebsiteAllowed(`https://${testDomain}`);
    console.log(`🚫 Domain blocked after adding: ${!blockTest.allowed}`);
    
    // Test removing domain from blacklist
    const removeResult = removeDomainFromBlacklist(testDomain, 'test');
    console.log(`➖ Remove domain result: ${removeResult}`);
    
    // Test if domain is now allowed
    const allowTest = isWebsiteAllowed(`https://${testDomain}`);
    console.log(`✅ Domain allowed after removing: ${allowTest.allowed}`);
    
    // Test bulk domain addition
    const bulkDomains = ['bulk-test1.com', 'bulk-test2.com', 'invalid..domain'];
    const bulkResult = bulkAddDomainsToBlacklist(bulkDomains, 'bulk_test');
    console.log('📦 Bulk add result:', bulkResult);
    
    // Test domain format validation
    const validDomains = ['valid-domain.com', 'sub.domain.org', 'test123.net'];
    const invalidDomains = ['invalid..domain', 'toolongdomainnamethatexceedslimits.com', ''];
    
    console.log('✅ Valid domains:');
    validDomains.forEach(domain => {
        console.log(`  ${domain}: ${isValidDomainFormat(domain)}`);
    });
    
    console.log('❌ Invalid domains:');
    invalidDomains.forEach(domain => {
        console.log(`  ${domain}: ${isValidDomainFormat(domain)}`);
    });
    
    // Cleanup test domains
    removeDomainFromBlacklist('bulk-test1.com', 'bulk_test');
    removeDomainFromBlacklist('bulk-test2.com', 'bulk_test');
}

/**
 * Test content validation system
 */
async function testContentValidation() {
    console.log('🔍 Testing content validation system...');
    
    // Test URL structure validation
    console.log('📝 Testing URL structure validation...');
    
    const urlTests = [
        { url: 'https://example.com', expectValid: true },
        { url: 'http://example.com', expectValid: true },
        { url: 'ftp://example.com', expectValid: false },
        { url: 'javascript:alert(1)', expectValid: false },
        { url: 'https://localhost', expectValid: false },
        { url: 'https://192.168.1.1', expectValid: false },
        { url: 'malformed-url', expectValid: false }
    ];
    
    for (const test of urlTests) {
        const result = validateUrlStructure(test.url);
        const passed = result.valid === test.expectValid;
        console.log(`${passed ? '✅' : '❌'} ${test.url}: ${result.valid ? 'valid' : 'invalid'} (${result.reason || 'ok'})`);
    }
    
    // Test risk assessment
    console.log('⚠️ Testing risk assessment...');
    
    const riskTests = [
        'https://example.com',
        'https://suspicious-site.tk',
        'https://example.com:8080',
        'https://github.com'
    ];
    
    for (const url of riskTests) {
        const assessment = assessWebsiteRisk(url);
        console.log(`Risk assessment for ${url}:`);
        console.log(`  Risk Level: ${assessment.riskLevel}`);
        console.log(`  Requires Confirmation: ${assessment.requiresConfirmation}`);
        console.log(`  Risk Factors: ${assessment.riskFactors.length}`);
    }
    
    // Test validation statistics
    console.log('📊 Testing validation statistics...');
    
    const validationStats = getValidationStats();
    console.log('Validation statistics:', validationStats);
    
    // Test real-time safety checks
    console.log('🛡️ Testing real-time safety checks...');
    
    const safetyTests = [
        'https://bit.ly/test', // URL shortener
        'https://example.com/redirect?url=malicious.com', // Suspicious redirect
        'https://safe-site.com' // Safe site
    ];
    
    for (const url of safetyTests) {
        try {
            const safetyResult = await performRealTimeSafetyChecks(url);
            console.log(`Safety check for ${url}: ${safetyResult.safe ? 'safe' : 'unsafe'} (${safetyResult.reason || 'ok'})`);
        } catch (error) {
            console.log(`Safety check error for ${url}: ${error.message}`);
        }
    }
    
    console.log('✅ Content validation tests completed');
}

/**
 * Run comprehensive content filtering tests
 */
function runContentFilteringTests() {
    console.log('🚀 Starting comprehensive content filtering tests...');
    
    // Add test button to page for manual testing
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Content Filtering';
    testButton.style.cssText = `
        position: fixed;
        top: 50px;
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
        testContentFiltering();
    });
    
    // Only add test button in development (when running on localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        document.body.appendChild(testButton);
        console.log('🧪 Content filtering test button added (development mode)');
    }
    
    // Run initial tests
    setTimeout(() => {
        testContentFiltering();
        testFilteringEffectiveness();
    }, 1000); // Wait for config to load
}

/**
 * Comprehensive filtering effectiveness testing
 */
function testFilteringEffectiveness() {
    console.log('\n🔍 Testing Filtering Effectiveness...');
    
    // Initialize test results storage
    window.filteringTestResults = {};
    
    // Test various website sources and scenarios
    testRealWorldWebsites();
    testEdgeCases();
    testFalsePositives();
    testFilteringAccuracy();
    testPerformanceUnderLoad();
    testMultiLanguageContent();
    testEvasionAttempts();
    testCuratedWebsiteValidation();
    
    // Generate comprehensive report
    generateFilteringEffectivenessReport();
}

/**
 * Test filtering against real-world websites
 */
function testRealWorldWebsites() {
    console.log('📊 Testing Real-World Websites...');
    
    const testCases = [
        // Safe educational websites
        { url: 'https://wikipedia.org', expected: true, category: 'educational' },
        { url: 'https://khanacademy.org', expected: true, category: 'educational' },
        { url: 'https://coursera.org', expected: true, category: 'educational' },
        { url: 'https://ted.com', expected: true, category: 'educational' },
        { url: 'https://nationalgeographic.com', expected: true, category: 'educational' },
        
        // Safe entertainment websites
        { url: 'https://reddit.com', expected: true, category: 'entertainment' },
        { url: 'https://youtube.com', expected: true, category: 'entertainment' },
        { url: 'https://netflix.com', expected: true, category: 'entertainment' },
        { url: 'https://spotify.com', expected: true, category: 'entertainment' },
        
        // Safe technology websites
        { url: 'https://github.com', expected: true, category: 'technology' },
        { url: 'https://stackoverflow.com', expected: true, category: 'technology' },
        { url: 'https://mozilla.org', expected: true, category: 'technology' },
        
        // Known problematic domains (should be blocked)
        { url: 'https://pornhub.com', expected: false, category: 'adult' },
        { url: 'https://xvideos.com', expected: false, category: 'adult' },
        { url: 'https://casino.com', expected: false, category: 'gambling' },
        { url: 'https://bet365.com', expected: false, category: 'gambling' },
        
        // Suspicious TLDs
        { url: 'https://example.tk', expected: false, category: 'suspicious_tld' },
        { url: 'https://test.xxx', expected: false, category: 'suspicious_tld' },
        { url: 'https://site.adult', expected: false, category: 'suspicious_tld' },
        
        // URL shorteners
        { url: 'https://bit.ly/test123', expected: false, category: 'url_shortener' },
        { url: 'https://tinyurl.com/test', expected: false, category: 'url_shortener' },
        { url: 'https://t.co/test', expected: false, category: 'url_shortener' }
    ];
    
    let passed = 0;
    let failed = 0;
    const results = [];
    
    testCases.forEach((testCase, index) => {
        const startTime = performance.now();
        const result = isWebsiteAllowed(testCase.url);
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        const success = result === testCase.expected;
        
        if (success) {
            passed++;
        } else {
            failed++;
            console.warn(`❌ Test ${index + 1} failed:`, {
                url: testCase.url,
                expected: testCase.expected,
                actual: result,
                category: testCase.category
            });
        }
        
        results.push({
            url: testCase.url,
            expected: testCase.expected,
            actual: result,
            success: success,
            category: testCase.category,
            processingTime: processingTime
        });
    });
    
    const accuracy = (passed / testCases.length) * 100;
    const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    
    console.log(`📈 Real-World Website Testing Results:`);
    console.log(`   Total tests: ${testCases.length}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Accuracy: ${accuracy.toFixed(1)}%`);
    console.log(`   Avg processing time: ${avgProcessingTime.toFixed(2)}ms`);
    
    // Store results for reporting
    window.filteringTestResults.realWorld = {
        total: testCases.length,
        passed: passed,
        failed: failed,
        accuracy: accuracy,
        avgProcessingTime: avgProcessingTime,
        results: results
    };
}

/**
 * Test edge cases and unusual scenarios
 */
function testEdgeCases() {
    console.log('🎯 Testing Edge Cases...');
    
    const edgeCases = [
        // Malformed URLs
        { url: 'not-a-url', expected: false, description: 'Invalid URL format' },
        { url: '', expected: false, description: 'Empty URL' },
        { url: 'http://', expected: false, description: 'Incomplete URL' },
        { url: 'https://.com', expected: false, description: 'Missing domain' },
        
        // IP addresses
        { url: 'http://192.168.1.1', expected: false, description: 'Private IP address' },
        { url: 'http://127.0.0.1', expected: false, description: 'Localhost IP' },
        { url: 'http://10.0.0.1', expected: false, description: 'Private network IP' },
        
        // Unusual protocols
        { url: 'ftp://example.com', expected: false, description: 'FTP protocol' },
        { url: 'file:///etc/passwd', expected: false, description: 'File protocol' },
        { url: 'javascript:alert(1)', expected: false, description: 'JavaScript protocol' },
        
        // Very long URLs
        { url: 'https://example.com/' + 'a'.repeat(2000), expected: true, description: 'Very long URL' },
        
        // Unicode and international domains
        { url: 'https://例え.テスト', expected: true, description: 'Unicode domain' },
        { url: 'https://xn--r8jz45g.xn--zckzah', expected: true, description: 'Punycode domain' },
        
        // Subdomain variations
        { url: 'https://www.example.com', expected: true, description: 'WWW subdomain' },
        { url: 'https://subdomain.example.com', expected: true, description: 'Custom subdomain' },
        { url: 'https://deep.nested.subdomain.example.com', expected: true, description: 'Deep subdomain' },
        
        // Port numbers
        { url: 'https://example.com:8080', expected: true, description: 'Custom port' },
        { url: 'https://example.com:443', expected: true, description: 'Standard HTTPS port' },
        
        // Query parameters and fragments
        { url: 'https://example.com?param=value&other=test', expected: true, description: 'Query parameters' },
        { url: 'https://example.com#fragment', expected: true, description: 'URL fragment' },
        { url: 'https://example.com/path?param=value#fragment', expected: true, description: 'Full URL with all parts' }
    ];
    
    let passed = 0;
    let failed = 0;
    const results = [];
    
    edgeCases.forEach((testCase, index) => {
        try {
            const startTime = performance.now();
            const result = isWebsiteAllowed(testCase.url);
            const endTime = performance.now();
            const processingTime = endTime - startTime;
            
            const success = result === testCase.expected;
            
            if (success) {
                passed++;
            } else {
                console.warn(`❌ Edge case ${index + 1} failed:`, {
                    description: testCase.description,
                    url: testCase.url,
                    expected: testCase.expected,
                    actual: result
                });
            }
            
            results.push({
                description: testCase.description,
                url: testCase.url,
                expected: testCase.expected,
                actual: result,
                success: success,
                processingTime: processingTime,
                error: null
            });
            
        } catch (error) {
            failed++;
            console.error(`💥 Edge case ${index + 1} threw error:`, {
                description: testCase.description,
                url: testCase.url,
                error: error.message
            });
            
            results.push({
                description: testCase.description,
                url: testCase.url,
                expected: testCase.expected,
                actual: null,
                success: false,
                processingTime: 0,
                error: error.message
            });
        }
    });
    
    const accuracy = (passed / edgeCases.length) * 100;
    
    console.log(`🎯 Edge Case Testing Results:`);
    console.log(`   Total tests: ${edgeCases.length}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Accuracy: ${accuracy.toFixed(1)}%`);
    
    // Store results
    window.filteringTestResults.edgeCases = {
        total: edgeCases.length,
        passed: passed,
        failed: failed,
        accuracy: accuracy,
        results: results
    };
}

/**
 * Test for false positives (legitimate sites being blocked)
 */
function testFalsePositives() {
    console.log('🔍 Testing for False Positives...');
    
    const legitimateSites = [
        // Educational sites that might contain sensitive keywords in educational context
        { url: 'https://en.wikipedia.org/wiki/Human_sexuality', description: 'Wikipedia sex education' },
        { url: 'https://khanacademy.org/science/biology/behavioral-biology', description: 'Biology education' },
        { url: 'https://www.plannedparenthood.org/learn', description: 'Health education' },
        
        // News sites covering sensitive topics
        { url: 'https://www.bbc.com/news/health', description: 'BBC Health News' },
        { url: 'https://www.cnn.com/health', description: 'CNN Health' },
        { url: 'https://www.reuters.com/lifestyle/health', description: 'Reuters Health' },
        
        // Medical and health sites
        { url: 'https://www.mayoclinic.org', description: 'Mayo Clinic' },
        { url: 'https://www.webmd.com', description: 'WebMD' },
        { url: 'https://www.nih.gov', description: 'National Institutes of Health' },
        
        // Gaming sites (might contain "violence" keywords)
        { url: 'https://store.steampowered.com', description: 'Steam gaming platform' },
        { url: 'https://www.ign.com', description: 'IGN gaming news' },
        { url: 'https://www.gamespot.com', description: 'GameSpot reviews' },
        
        // Art and culture sites
        { url: 'https://www.metmuseum.org', description: 'Metropolitan Museum' },
        { url: 'https://www.louvre.fr', description: 'Louvre Museum' },
        { url: 'https://www.moma.org', description: 'Museum of Modern Art' },
        
        // Financial and investment sites
        { url: 'https://www.investopedia.com', description: 'Investment education' },
        { url: 'https://finance.yahoo.com', description: 'Yahoo Finance' },
        { url: 'https://www.bloomberg.com', description: 'Bloomberg News' }
    ];
    
    let falsePositives = 0;
    const blockedLegitimate = [];
    
    legitimateSites.forEach((site, index) => {
        const result = isWebsiteAllowed(site.url);
        
        if (!result) {
            falsePositives++;
            blockedLegitimate.push({
                url: site.url,
                description: site.description
            });
            console.warn(`🚫 False positive detected: ${site.description} (${site.url})`);
        }
    });
    
    const falsePositiveRate = (falsePositives / legitimateSites.length) * 100;
    
    console.log(`🔍 False Positive Testing Results:`);
    console.log(`   Total legitimate sites tested: ${legitimateSites.length}`);
    console.log(`   False positives: ${falsePositives}`);
    console.log(`   False positive rate: ${falsePositiveRate.toFixed(1)}%`);
    
    if (falsePositives > 0) {
        console.log(`   Blocked legitimate sites:`, blockedLegitimate);
    }
    
    // Store results
    window.filteringTestResults.falsePositives = {
        total: legitimateSites.length,
        falsePositives: falsePositives,
        rate: falsePositiveRate,
        blockedSites: blockedLegitimate
    };
}

/**
 * Test overall filtering accuracy
 */
function testFilteringAccuracy() {
    console.log('📊 Testing Overall Filtering Accuracy...');
    
    // Combine results from previous tests
    const realWorldResults = window.filteringTestResults?.realWorld;
    const edgeCaseResults = window.filteringTestResults?.edgeCases;
    const falsePositiveResults = window.filteringTestResults?.falsePositives;
    
    if (realWorldResults && edgeCaseResults && falsePositiveResults) {
        const totalTests = realWorldResults.total + edgeCaseResults.total + falsePositiveResults.total;
        const totalPassed = realWorldResults.passed + edgeCaseResults.passed + (falsePositiveResults.total - falsePositiveResults.falsePositives);
        const overallAccuracy = (totalPassed / totalTests) * 100;
        
        console.log(`📊 Overall Filtering Accuracy:`);
        console.log(`   Total tests across all categories: ${totalTests}`);
        console.log(`   Total passed: ${totalPassed}`);
        console.log(`   Overall accuracy: ${overallAccuracy.toFixed(1)}%`);
        console.log(`   Real-world accuracy: ${realWorldResults.accuracy.toFixed(1)}%`);
        console.log(`   Edge case handling: ${edgeCaseResults.accuracy.toFixed(1)}%`);
        console.log(`   False positive rate: ${falsePositiveResults.rate.toFixed(1)}%`);
        
        // Store overall results
        window.filteringTestResults.overall = {
            totalTests: totalTests,
            totalPassed: totalPassed,
            accuracy: overallAccuracy,
            breakdown: {
                realWorld: realWorldResults.accuracy,
                edgeCases: edgeCaseResults.accuracy,
                falsePositiveRate: falsePositiveResults.rate
            }
        };
    } else {
        console.warn('⚠️ Cannot calculate overall accuracy - missing test results');
    }
}

/**
 * Test performance under load
 */
function testPerformanceUnderLoad() {
    console.log('⚡ Testing Performance Under Load...');
    
    const testUrls = [
        'https://example.com',
        'https://test.com',
        'https://pornhub.com',
        'https://wikipedia.org',
        'https://casino.com',
        'https://github.com',
        'https://malicious-site.tk',
        'https://educational-site.edu'
    ];
    
    const iterations = 100;
    const results = [];
    
    console.log(`   Running ${iterations} iterations with ${testUrls.length} URLs each...`);
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        testUrls.forEach(url => {
            const iterationStart = performance.now();
            isWebsiteAllowed(url);
            const iterationEnd = performance.now();
            results.push(iterationEnd - iterationStart);
        });
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const maxTime = Math.max(...results);
    const minTime = Math.min(...results);
    
    console.log(`⚡ Performance Under Load Results:`);
    console.log(`   Total operations: ${iterations * testUrls.length}`);
    console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Average time per operation: ${avgTime.toFixed(2)}ms`);
    console.log(`   Min time: ${minTime.toFixed(2)}ms`);
    console.log(`   Max time: ${maxTime.toFixed(2)}ms`);
    console.log(`   Operations per second: ${((iterations * testUrls.length) / (totalTime / 1000)).toFixed(0)}`);
    
    // Store results
    window.filteringTestResults.performance = {
        totalOperations: iterations * testUrls.length,
        totalTime: totalTime,
        avgTime: avgTime,
        minTime: minTime,
        maxTime: maxTime,
        operationsPerSecond: (iterations * testUrls.length) / (totalTime / 1000)
    };
}

/**
 * Test multi-language content filtering
 */
function testMultiLanguageContent() {
    console.log('🌍 Testing Multi-Language Content...');
    
    const multiLanguageTests = [
        // Safe sites in different languages
        { url: 'https://fr.wikipedia.org', expected: true, language: 'French' },
        { url: 'https://es.wikipedia.org', expected: true, language: 'Spanish' },
        { url: 'https://de.wikipedia.org', expected: true, language: 'German' },
        { url: 'https://ja.wikipedia.org', expected: true, language: 'Japanese' },
        { url: 'https://zh.wikipedia.org', expected: true, language: 'Chinese' },
        
        // International news sites
        { url: 'https://www.lemonde.fr', expected: true, language: 'French news' },
        { url: 'https://www.elpais.com', expected: true, language: 'Spanish news' },
        { url: 'https://www.spiegel.de', expected: true, language: 'German news' },
        
        // Educational sites in different languages
        { url: 'https://www.coursera.org/browse/language-learning', expected: true, language: 'Language learning' },
        { url: 'https://www.duolingo.com', expected: true, language: 'Language learning platform' }
    ];
    
    let passed = 0;
    let failed = 0;
    
    multiLanguageTests.forEach((test, index) => {
        const result = isWebsiteAllowed(test.url);
        const success = result === test.expected;
        
        if (success) {
            passed++;
        } else {
            failed++;
            console.warn(`❌ Multi-language test ${index + 1} failed:`, {
                language: test.language,
                url: test.url,
                expected: test.expected,
                actual: result
            });
        }
    });
    
    const accuracy = (passed / multiLanguageTests.length) * 100;
    
    console.log(`🌍 Multi-Language Content Results:`);
    console.log(`   Total tests: ${multiLanguageTests.length}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Accuracy: ${accuracy.toFixed(1)}%`);
    
    // Store results
    window.filteringTestResults.multiLanguage = {
        total: multiLanguageTests.length,
        passed: passed,
        failed: failed,
        accuracy: accuracy
    };
}

/**
 * Test evasion attempts and obfuscation
 */
function testEvasionAttempts() {
    console.log('🕵️ Testing Evasion Attempts...');
    
    const evasionTests = [
        // Domain obfuscation attempts
        { url: 'https://p0rnhub.com', expected: false, description: 'Character substitution (0 for o)' },
        { url: 'https://pornhub.c0m', expected: false, description: 'TLD character substitution' },
        { url: 'https://porn-hub.com', expected: false, description: 'Hyphen insertion' },
        { url: 'https://pornhub123.com', expected: false, description: 'Number appending' },
        
        // Subdomain tricks
        { url: 'https://safe.pornhub.com', expected: false, description: 'Safe subdomain on blocked domain' },
        { url: 'https://pornhub.safe-site.com', expected: false, description: 'Blocked keyword in subdomain' },
        
        // Path-based evasion
        { url: 'https://example.com/porn', expected: true, description: 'Blocked keyword in path (should allow)' },
        { url: 'https://example.com/casino/games', expected: true, description: 'Blocked keyword in path (should allow)' },
        
        // Query parameter evasion
        { url: 'https://example.com?site=pornhub', expected: true, description: 'Blocked keyword in query (should allow)' },
        { url: 'https://example.com?redirect=casino.com', expected: true, description: 'Blocked domain in query (should allow)' },
        
        // URL encoding attempts
        { url: 'https://example.com/%70%6F%72%6E', expected: true, description: 'URL encoded path (should allow)' },
        
        // Homograph attacks (similar looking characters)
        { url: 'https://gοοgle.com', expected: false, description: 'Greek omicron instead of o' },
        { url: 'https://аpple.com', expected: false, description: 'Cyrillic a instead of Latin a' }
    ];
    
    let detectedEvasions = 0;
    let missedEvasions = 0;
    
    evasionTests.forEach((test, index) => {
        const result = isWebsiteAllowed(test.url);
        const success = result === test.expected;
        
        if (success) {
            if (!test.expected) {
                detectedEvasions++;
            }
        } else {
            if (!test.expected) {
                missedEvasions++;
                console.warn(`🚨 Evasion attempt not detected:`, {
                    description: test.description,
                    url: test.url
                });
            }
        }
    });
    
    const evasionDetectionRate = (detectedEvasions / (detectedEvasions + missedEvasions)) * 100;
    
    console.log(`🕵️ Evasion Attempt Results:`);
    console.log(`   Total evasion tests: ${evasionTests.length}`);
    console.log(`   Evasions detected: ${detectedEvasions}`);
    console.log(`   Evasions missed: ${missedEvasions}`);
    console.log(`   Detection rate: ${evasionDetectionRate.toFixed(1)}%`);
    
    // Store results
    window.filteringTestResults.evasion = {
        total: evasionTests.length,
        detected: detectedEvasions,
        missed: missedEvasions,
        detectionRate: evasionDetectionRate
    };
}

/**
 * Test curated website validation
 */
function testCuratedWebsiteValidation() {
    console.log('📋 Testing Curated Website Validation...');
    
    // Test all websites in our curated list
    let validSites = 0;
    let invalidSites = 0;
    const invalidUrls = [];
    
    Object.values(CURATED_WEBSITES).forEach(category => {
        category.forEach(site => {
            const isValid = isWebsiteAllowed(site.url);
            
            if (isValid) {
                validSites++;
            } else {
                invalidSites++;
                invalidUrls.push({
                    url: site.url,
                    name: site.name,
                    category: site.category || 'unknown'
                });
                console.warn(`❌ Curated site blocked by filter:`, site);
            }
        });
    });
    
    const totalCurated = validSites + invalidSites;
    const validationRate = (validSites / totalCurated) * 100;
    
    console.log(`📋 Curated Website Validation Results:`);
    console.log(`   Total curated sites: ${totalCurated}`);
    console.log(`   Valid sites: ${validSites}`);
    console.log(`   Invalid sites: ${invalidSites}`);
    console.log(`   Validation rate: ${validationRate.toFixed(1)}%`);
    
    if (invalidSites > 0) {
        console.log(`   Invalid URLs:`, invalidUrls);
    }
    
    // Store results
    window.filteringTestResults.curatedValidation = {
        total: totalCurated,
        valid: validSites,
        invalid: invalidSites,
        validationRate: validationRate,
        invalidUrls: invalidUrls
    };
}

/**
 * Generate comprehensive filtering effectiveness report
 */
function generateFilteringEffectivenessReport() {
    console.log('\n📊 FILTERING EFFECTIVENESS REPORT');
    console.log('=====================================');
    
    const results = window.filteringTestResults;
    
    if (!results) {
        console.warn('⚠️ No test results available');
        return;
    }
    
    // Overall summary
    if (results.overall) {
        console.log(`\n🎯 OVERALL PERFORMANCE:`);
        console.log(`   Total Tests: ${results.overall.totalTests}`);
        console.log(`   Total Passed: ${results.overall.totalPassed}`);
        console.log(`   Overall Accuracy: ${results.overall.accuracy.toFixed(1)}%`);
    }
    
    // Detailed breakdown
    console.log(`\n📈 DETAILED BREAKDOWN:`);
    
    if (results.realWorld) {
        console.log(`   Real-World Sites: ${results.realWorld.accuracy.toFixed(1)}% (${results.realWorld.passed}/${results.realWorld.total})`);
    }
    
    if (results.edgeCases) {
        console.log(`   Edge Cases: ${results.edgeCases.accuracy.toFixed(1)}% (${results.edgeCases.passed}/${results.edgeCases.total})`);
    }
    
    if (results.falsePositives) {
        console.log(`   False Positive Rate: ${results.falsePositives.rate.toFixed(1)}% (${results.falsePositives.falsePositives}/${results.falsePositives.total})`);
    }
    
    if (results.multiLanguage) {
        console.log(`   Multi-Language: ${results.multiLanguage.accuracy.toFixed(1)}% (${results.multiLanguage.passed}/${results.multiLanguage.total})`);
    }
    
    if (results.evasion) {
        console.log(`   Evasion Detection: ${results.evasion.detectionRate.toFixed(1)}% (${results.evasion.detected}/${results.evasion.detected + results.evasion.missed})`);
    }
    
    if (results.curatedValidation) {
        console.log(`   Curated Sites: ${results.curatedValidation.validationRate.toFixed(1)}% (${results.curatedValidation.valid}/${results.curatedValidation.total})`);
    }
    
    // Performance metrics
    if (results.performance) {
        console.log(`\n⚡ PERFORMANCE METRICS:`);
        console.log(`   Operations per Second: ${results.performance.operationsPerSecond.toFixed(0)}`);
        console.log(`   Average Processing Time: ${results.performance.avgTime.toFixed(2)}ms`);
        console.log(`   Min/Max Time: ${results.performance.minTime.toFixed(2)}ms / ${results.performance.maxTime.toFixed(2)}ms`);
    }
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    
    if (results.overall && results.overall.accuracy < 95) {
        console.log(`   ⚠️ Overall accuracy below 95% - consider tuning filter rules`);
    }
    
    if (results.falsePositives && results.falsePositives.rate > 5) {
        console.log(`   ⚠️ False positive rate above 5% - consider whitelist additions`);
    }
    
    if (results.evasion && results.evasion.detectionRate < 80) {
        console.log(`   ⚠️ Evasion detection below 80% - consider enhanced pattern matching`);
    }
    
    if (results.performance && results.performance.avgTime > 10) {
        console.log(`   ⚠️ Average processing time above 10ms - consider performance optimization`);
    }
    
    if (results.overall && results.overall.accuracy >= 95 && results.falsePositives && results.falsePositives.rate <= 5) {
        console.log(`   ✅ Filtering system performing well!`);
    }
    
    console.log('\n=====================================');
    console.log('📋 Report complete. Results stored in window.filteringTestResults');
} 