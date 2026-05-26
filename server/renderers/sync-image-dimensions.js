const fs = require('fs');
const path = require('path');
const { imageDimensionsForSiteSrc } = require('../shared/image-dimensions');

const projectRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(projectRoot, 'site');

function readUtf8(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function writeUtf8(filePath, value) {
    fs.writeFileSync(filePath, value, 'utf8');
}

function listHtmlFiles(rootDir) {
    return fs.readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(rootDir, entry.name);

        if (entry.isDirectory()) {
            return listHtmlFiles(entryPath);
        }

        return entry.isFile() && entry.name.toLowerCase().endsWith('.html')
            ? [entryPath]
            : [];
    });
}

function getAttribute(tag, name) {
    const match = String(tag || '').match(new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, 'i'));
    return match ? match[2] : '';
}

function hasAttribute(tag, name) {
    return new RegExp(`\\b${name}\\s*=`, 'i').test(String(tag || ''));
}

function addImageDimensionsToTag(tag, rootDir = siteRoot) {
    const src = getAttribute(tag, 'src');

    if (!src || (hasAttribute(tag, 'width') && hasAttribute(tag, 'height'))) {
        return tag;
    }

    const dimensions = imageDimensionsForSiteSrc(rootDir, src);

    if (!dimensions) {
        return tag;
    }

    const close = /\/\s*>$/.test(tag) ? ' />' : '>';
    const body = tag.replace(/\s*\/?>$/, '');
    const width = hasAttribute(tag, 'width') ? '' : ` width="${dimensions.width}"`;
    const height = hasAttribute(tag, 'height') ? '' : ` height="${dimensions.height}"`;

    return `${body}${width}${height}${close}`;
}

function addImageDimensionsToHtml(html, rootDir = siteRoot) {
    return String(html).replace(/<img\b[^>]*>/gi, (tag) => addImageDimensionsToTag(tag, rootDir));
}

function syncImageDimensions(rootDir = siteRoot) {
    const touchedFiles = [];

    listHtmlFiles(rootDir).forEach((filePath) => {
        const html = readUtf8(filePath);
        const nextHtml = addImageDimensionsToHtml(html, rootDir);

        if (nextHtml !== html) {
            writeUtf8(filePath, nextHtml);
            touchedFiles.push(filePath);
        }
    });

    return {
        touchedFiles,
        htmlFileCount: listHtmlFiles(rootDir).length
    };
}

if (require.main === module) {
    const result = syncImageDimensions();
    console.log(JSON.stringify({
        syncedImageDimensionFiles: result.touchedFiles.length,
        htmlFileCount: result.htmlFileCount
    }, null, 2));
}

module.exports = {
    addImageDimensionsToHtml,
    addImageDimensionsToTag,
    syncImageDimensions
};
