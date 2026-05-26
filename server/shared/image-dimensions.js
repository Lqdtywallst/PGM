const fs = require('fs');
const path = require('path');

const PUBLIC_ORIGIN_PATTERN = /^https?:\/\/www\.dynastyprestigecarrental\.com\//i;

function readPngDimensions(buffer) {
    if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
        return null;
    }

    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
    };
}

function readJpegDimensions(buffer) {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
        return null;
    }

    let offset = 2;

    while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) {
            offset += 1;
            continue;
        }

        while (buffer[offset] === 0xff) {
            offset += 1;
        }

        const marker = buffer[offset];
        offset += 1;

        if (marker === 0xd9 || marker === 0xda) {
            break;
        }

        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
            continue;
        }

        if (offset + 2 > buffer.length) {
            break;
        }

        const segmentLength = buffer.readUInt16BE(offset);
        const segmentStart = offset + 2;

        if (
            [
                0xc0, 0xc1, 0xc2, 0xc3,
                0xc5, 0xc6, 0xc7,
                0xc9, 0xca, 0xcb,
                0xcd, 0xce, 0xcf
            ].includes(marker) &&
            segmentStart + 5 <= buffer.length
        ) {
            return {
                width: buffer.readUInt16BE(segmentStart + 3),
                height: buffer.readUInt16BE(segmentStart + 1)
            };
        }

        offset += segmentLength;
    }

    return null;
}

function readUInt24LE(buffer, offset) {
    return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}

function readWebpDimensions(buffer) {
    if (
        buffer.length < 30 ||
        buffer.toString('ascii', 0, 4) !== 'RIFF' ||
        buffer.toString('ascii', 8, 12) !== 'WEBP'
    ) {
        return null;
    }

    let offset = 12;

    while (offset + 8 <= buffer.length) {
        const chunkType = buffer.toString('ascii', offset, offset + 4);
        const chunkSize = buffer.readUInt32LE(offset + 4);
        const dataStart = offset + 8;

        if (chunkType === 'VP8X' && dataStart + 10 <= buffer.length) {
            return {
                width: readUInt24LE(buffer, dataStart + 4) + 1,
                height: readUInt24LE(buffer, dataStart + 7) + 1
            };
        }

        if (chunkType === 'VP8 ' && dataStart + 10 <= buffer.length) {
            return {
                width: buffer.readUInt16LE(dataStart + 6) & 0x3fff,
                height: buffer.readUInt16LE(dataStart + 8) & 0x3fff
            };
        }

        if (chunkType === 'VP8L' && dataStart + 5 <= buffer.length && buffer[dataStart] === 0x2f) {
            const b1 = buffer[dataStart + 1];
            const b2 = buffer[dataStart + 2];
            const b3 = buffer[dataStart + 3];
            const b4 = buffer[dataStart + 4];

            return {
                width: 1 + (((b2 & 0x3f) << 8) | b1),
                height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6))
            };
        }

        offset = dataStart + chunkSize + (chunkSize % 2);
    }

    return null;
}

function imageDimensionsForFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        return null;
    }

    const buffer = fs.readFileSync(filePath);

    return readPngDimensions(buffer) || readJpegDimensions(buffer) || readWebpDimensions(buffer);
}

function imageFileForSiteSrc(siteRoot, src) {
    const rawSrc = String(src || '').trim();

    if (!rawSrc) {
        return null;
    }

    const withoutPublicOrigin = rawSrc.replace(PUBLIC_ORIGIN_PATTERN, '/');
    const withoutQuery = withoutPublicOrigin.split(/[?#]/)[0];

    if (/^(?:data:|https?:\/\/)/i.test(withoutQuery)) {
        return null;
    }

    const relativePath = withoutQuery
        .replace(/^\.\//, '')
        .replace(/^\//, '');
    const filePath = path.resolve(siteRoot, relativePath);
    const resolvedSiteRoot = path.resolve(siteRoot);

    return filePath.startsWith(resolvedSiteRoot) ? filePath : null;
}

function imageDimensionsForSiteSrc(siteRoot, src) {
    return imageDimensionsForFile(imageFileForSiteSrc(siteRoot, src));
}

function renderImageDimensionAttributes(siteRoot, src) {
    const dimensions = imageDimensionsForSiteSrc(siteRoot, src);

    return dimensions ? ` width="${dimensions.width}" height="${dimensions.height}"` : '';
}

module.exports = {
    imageDimensionsForFile,
    imageDimensionsForSiteSrc,
    imageFileForSiteSrc,
    renderImageDimensionAttributes
};
