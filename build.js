#!/usr/bin/env node

/**
 * Build Script for Rando Website
 * Minifies CSS, JavaScript, and HTML files for production deployment
 */

const fs = require('fs');
const path = require('path');

// Check if we're in a Node.js environment with required modules
let terser, CleanCSS, minify;

try {
    // Try to require the minification libraries
    const { minify: terserMinify } = require('terser');
    const CleanCSSLib = require('clean-css');
    const { minify: htmlMinify } = require('html-minifier');
    
    terser = terserMinify;
    CleanCSS = CleanCSSLib;
    minify = htmlMinify;
} catch (error) {
    console.log('📦 Build dependencies not found. Creating basic minification...');
    
    // Basic minification fallbacks
    terser = (code) => ({ code: code.replace(/\s+/g, ' ').replace(/\/\*[\s\S]*?\*\//g, '') });
    CleanCSS = function() {
        return {
            minify: (css) => ({
                styles: css.replace(/\s+/g, ' ').replace(/\/\*[\s\S]*?\*\//g, '').trim()
            })
        };
    };
    minify = (html) => html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
}

// Configuration
const config = {
    sourceDir: '.',
    buildDir: 'dist',
    cssFiles: [
        'styles/main.css',
        'styles/colors.css',
        'styles/fonts.css',
        'styles/buttons.css',
        'styles/counter.css',
        'styles/responsive.css',
        'styles/retro-backgrounds.css',
        'styles/animations.css'
    ],
    jsFiles: [
        'js/browser-compatibility.js',
        'js/asset-optimizer.js',
        'js/main.js'
    ],
    htmlFiles: [
        'index.html'
    ],
    configFiles: [
        'config/websites.json',
        'config/blocked-keywords.json'
    ],
    copyFiles: [
        'assets/**/*',
        'favicon.ico',
        'robots.txt',
        'sitemap.xml'
    ]
};

// Utility functions
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dirPath}`);
    }
}

function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.warn(`⚠️ Could not read file: ${filePath}`);
        return '';
    }
}

function writeFile(filePath, content) {
    try {
        ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Written: ${filePath}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to write: ${filePath}`, error.message);
        return false;
    }
}

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        return 0;
    }
}

function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Minification functions
async function minifyCSS() {
    console.log('🎨 Minifying CSS files...');
    
    let combinedCSS = '';
    let originalSize = 0;
    
    // Combine all CSS files
    for (const cssFile of config.cssFiles) {
        const filePath = path.join(config.sourceDir, cssFile);
        if (fs.existsSync(filePath)) {
            const content = readFile(filePath);
            combinedCSS += `/* ${cssFile} */\n${content}\n\n`;
            originalSize += getFileSize(filePath);
        }
    }
    
    // Minify combined CSS
    const cleanCSS = new CleanCSS({
        level: 2,
        returnPromise: false
    });
    
    const minified = cleanCSS.minify(combinedCSS);
    const minifiedCSS = minified.styles || combinedCSS.replace(/\s+/g, ' ').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    
    // Write minified CSS
    const outputPath = path.join(config.buildDir, 'styles', 'main.min.css');
    writeFile(outputPath, minifiedCSS);
    
    const minifiedSize = Buffer.byteLength(minifiedCSS, 'utf8');
    const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
    
    console.log(`   📊 Original: ${formatSize(originalSize)}`);
    console.log(`   📊 Minified: ${formatSize(minifiedSize)}`);
    console.log(`   📊 Savings: ${savings}%`);
    
    return outputPath;
}

async function minifyJS() {
    console.log('⚡ Minifying JavaScript files...');
    
    let combinedJS = '';
    let originalSize = 0;
    
    // Combine all JS files
    for (const jsFile of config.jsFiles) {
        const filePath = path.join(config.sourceDir, jsFile);
        if (fs.existsSync(filePath)) {
            const content = readFile(filePath);
            combinedJS += `/* ${jsFile} */\n${content}\n\n`;
            originalSize += getFileSize(filePath);
        }
    }
    
    // Minify combined JavaScript
    let minifiedJS;
    try {
        const result = await terser(combinedJS, {
            compress: {
                drop_console: false, // Keep console logs for debugging
                drop_debugger: true,
                pure_funcs: ['console.debug']
            },
            mangle: false, // Don't mangle names to keep debugging easier
            format: {
                comments: false
            }
        });
        minifiedJS = result.code;
    } catch (error) {
        console.warn('⚠️ Advanced minification failed, using basic minification');
        minifiedJS = combinedJS.replace(/\s+/g, ' ').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    }
    
    // Write minified JS
    const outputPath = path.join(config.buildDir, 'js', 'main.min.js');
    writeFile(outputPath, minifiedJS);
    
    const minifiedSize = Buffer.byteLength(minifiedJS, 'utf8');
    const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
    
    console.log(`   📊 Original: ${formatSize(originalSize)}`);
    console.log(`   📊 Minified: ${formatSize(minifiedSize)}`);
    console.log(`   📊 Savings: ${savings}%`);
    
    return outputPath;
}

async function minifyHTML() {
    console.log('📄 Minifying HTML files...');
    
    for (const htmlFile of config.htmlFiles) {
        const filePath = path.join(config.sourceDir, htmlFile);
        if (fs.existsSync(filePath)) {
            let content = readFile(filePath);
            const originalSize = Buffer.byteLength(content, 'utf8');
            
            // Update HTML to use minified assets
            content = content.replace(
                /<link[^>]*href="styles\/[^"]*\.css"[^>]*>/g,
                '<link rel="stylesheet" href="styles/main.min.css">'
            );
            
            content = content.replace(
                /<script[^>]*src="js\/[^"]*\.js"[^>]*><\/script>/g,
                ''
            );
            
            // Add single minified JS file before closing body
            content = content.replace(
                '</body>',
                '    <script src="js/main.min.js"></script>\n</body>'
            );
            
            // Minify HTML
            let minifiedHTML;
            try {
                minifiedHTML = minify(content, {
                    collapseWhitespace: true,
                    removeComments: true,
                    removeRedundantAttributes: true,
                    removeScriptTypeAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    minifyCSS: true,
                    minifyJS: true
                });
            } catch (error) {
                console.warn('⚠️ Advanced HTML minification failed, using basic minification');
                minifiedHTML = content.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
            }
            
            // Write minified HTML
            const outputPath = path.join(config.buildDir, htmlFile);
            writeFile(outputPath, minifiedHTML);
            
            const minifiedSize = Buffer.byteLength(minifiedHTML, 'utf8');
            const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
            
            console.log(`   📊 ${htmlFile}: ${formatSize(originalSize)} → ${formatSize(minifiedSize)} (${savings}% savings)`);
        }
    }
}

function copyConfigFiles() {
    console.log('⚙️ Copying configuration files...');
    
    for (const configFile of config.configFiles) {
        const sourcePath = path.join(config.sourceDir, configFile);
        const targetPath = path.join(config.buildDir, configFile);
        
        if (fs.existsSync(sourcePath)) {
            const content = readFile(sourcePath);
            writeFile(targetPath, content);
        }
    }
}

function copyAssets() {
    console.log('📁 Copying assets...');
    
    // Copy assets directory if it exists
    const assetsSource = path.join(config.sourceDir, 'assets');
    const assetsTarget = path.join(config.buildDir, 'assets');
    
    if (fs.existsSync(assetsSource)) {
        ensureDir(assetsTarget);
        
        function copyRecursive(src, dest) {
            const stats = fs.statSync(src);
            
            if (stats.isDirectory()) {
                ensureDir(dest);
                const items = fs.readdirSync(src);
                
                items.forEach(item => {
                    copyRecursive(path.join(src, item), path.join(dest, item));
                });
            } else {
                const content = fs.readFileSync(src);
                fs.writeFileSync(dest, content);
                console.log(`   📋 Copied: ${src} → ${dest}`);
            }
        }
        
        copyRecursive(assetsSource, assetsTarget);
    }
    
    // Copy other files
    const otherFiles = ['favicon.ico', 'robots.txt', 'sitemap.xml'];
    for (const file of otherFiles) {
        const sourcePath = path.join(config.sourceDir, file);
        const targetPath = path.join(config.buildDir, file);
        
        if (fs.existsSync(sourcePath)) {
            const content = fs.readFileSync(sourcePath);
            writeFile(targetPath, content);
        }
    }
}

function generateBuildInfo() {
    console.log('📊 Generating build information...');
    
    const buildInfo = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'production',
        files: {
            css: 'styles/main.min.css',
            js: 'js/main.min.js',
            html: 'index.html'
        },
        optimizations: {
            cssMinified: true,
            jsMinified: true,
            htmlMinified: true,
            assetsOptimized: true
        }
    };
    
    const buildInfoPath = path.join(config.buildDir, 'build-info.json');
    writeFile(buildInfoPath, JSON.stringify(buildInfo, null, 2));
}

// Main build function
async function build() {
    console.log('🚀 Starting build process...');
    console.log('=====================================');
    
    const startTime = Date.now();
    
    try {
        // Clean build directory
        if (fs.existsSync(config.buildDir)) {
            fs.rmSync(config.buildDir, { recursive: true, force: true });
            console.log('🧹 Cleaned build directory');
        }
        
        ensureDir(config.buildDir);
        
        // Check command line arguments
        const args = process.argv.slice(2);
        const cssOnly = args.includes('--css-only');
        const jsOnly = args.includes('--js-only');
        const optimize = args.includes('--optimize');
        
        if (cssOnly) {
            await minifyCSS();
        } else if (jsOnly) {
            await minifyJS();
        } else {
            // Full build
            await minifyCSS();
            await minifyJS();
            await minifyHTML();
            copyConfigFiles();
            copyAssets();
            generateBuildInfo();
        }
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        console.log('=====================================');
        console.log(`✅ Build completed in ${duration.toFixed(2)}s`);
        console.log(`📁 Output directory: ${config.buildDir}`);
        
        // Show build summary
        if (!cssOnly && !jsOnly) {
            console.log('\n📊 BUILD SUMMARY:');
            console.log('   ✅ CSS minified and combined');
            console.log('   ✅ JavaScript minified and combined');
            console.log('   ✅ HTML minified and optimized');
            console.log('   ✅ Assets copied');
            console.log('   ✅ Configuration files copied');
            console.log('\n🚀 Ready for deployment!');
        }
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

// Run build if this script is executed directly
if (require.main === module) {
    build();
}

module.exports = { build, minifyCSS, minifyJS, minifyHTML }; 