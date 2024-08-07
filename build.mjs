// This project is meant for a Squarespace website. Squarespace code blocks do not allow multifile code, so using build to streamline bundling the code into a single file
// will allow for the use of the code.
import fs from 'fs';
import path, { dirname } from 'path';
import { rollup } from 'rollup';
import { babel } from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// List of Node.js modules to exclude and replace with CDN
const externalModules = ['mapbox-gl'];
const cdnLinks = [
    '<script src="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js"></script>',
];

// Function to combine CSS files
function combineCSS(cssDir) {
    let css = '';
    fs.readdirSync(cssDir).forEach(file => {
        const filePath = path.join(cssDir, file);
        if (fs.statSync(filePath).isFile() && path.extname(file) === '.css') {
            css += fs.readFileSync(filePath, 'utf8');
        }
    });
    return css;
}

// Function to find the first non-CDN script tag and return its src attribute
function findEntryScript(html) {
    const scriptTagPattern = /<script\s[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
    let match;
    while ((match = scriptTagPattern.exec(html)) !== null) {
        const src = match[1];
        if (!src.startsWith('https://') && !src.startsWith('http://') && !externalModules.some(module => src.includes(module))) {
            return src;
        }
    }
    return null;
}

// Function to remove all non-CDN script tags from the HTML
function removeNonCdnScripts(html) {
    const scriptTagPattern = /<script\s[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
    return html.replace(scriptTagPattern, (match, src) => {
        if (!src.startsWith('https://') && !src.startsWith('http://') && !externalModules.some(module => src.includes(module))) {
            return '';
        }
        return match;
    });
}

// Function to remove a specific script tag from the HTML
function removeScriptTag(html, scriptSrc) {
    const scriptTagPattern = new RegExp(`<script\\s[^>]*src=["']${scriptSrc}["'][^>]*><\\/script>`, 'gi');
    return html.replace(scriptTagPattern, '');
}

// Function to bundle JavaScript files
async function bundleJS(entryFile) {
    const bundle = await rollup({
        input: entryFile,
        external: externalModules,
        plugins: [
            resolve(),
            commonjs(),
            babel({
                babelHelpers: 'bundled',
                exclude: 'node_modules/**',
                presets: ['@babel/preset-env'],
                plugins: [
                    ['babel-plugin-transform-import-ignore', { "patterns": [".css"] }]
                ]
            })
        ]
    });

    const { output } = await bundle.generate({
        format: 'iife'
    });

    return output[0].code;
}

// Main build function
async function build() {
    const htmlPath = path.join(__dirname, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // Check if an entry script argument is provided
    // eslint-disable-next-line no-undef
    const entryArg = process.argv[2];

    let entryScript;
    if (entryArg) {
        // Use the specified entry script and remove all non-CDN scripts
        entryScript = entryArg;
        html = removeNonCdnScripts(html);
    } else {
        // Find the first non-CDN script
        entryScript = findEntryScript(html);
        if (!entryScript) {
            throw new Error('No valid entry script found.');
        }
        // Remove the entry script tag from the HTML
        html = removeScriptTag(html, entryScript);
    }

    const entryFile = path.join(__dirname, entryScript);

    // Inject CDN links into HTML
    cdnLinks.forEach(link => {
        html = html.replace('</head>', `${link}\n</head>`);
    });

    // Combine CSS and inject into HTML
    const cssDir = path.join(__dirname, 'styles');
    const combinedCSS = combineCSS(cssDir);
    html = html.replace('</head>', `<style>\n${combinedCSS}</style>\n</head>`);

    // Bundle JavaScript and inject into HTML
    const bundledJS = await bundleJS(entryFile);

    // Inject bundled JavaScript
    html = html.replace('</body>', `<script>\n${bundledJS}</script>\n</body>`);

    // Write the final HTML file
    const outputPath = path.join(__dirname, 'single-file.html');
    fs.writeFileSync(outputPath, html);
    console.log('Single HTML file generated:', outputPath);
}

// Run the build process
build().catch(err => {
    console.error('Error during build process:', err);
});
