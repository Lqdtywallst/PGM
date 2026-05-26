const assert = require('node:assert/strict');
const path = require('path');
const test = require('node:test');

const { imageDimensionsForSiteSrc } = require('../../server/shared/image-dimensions');
const { addImageDimensionsToHtml } = require('../../server/renderers/sync-image-dimensions');

const siteRoot = path.resolve(__dirname, '..', '..', 'site');

test('image dimension helper reads local fleet image dimensions', () => {
    const dimensions = imageDimensionsForSiteSrc(siteRoot, './images/fleet/ferrari-296-gts/06-exterior-motion.jpg');

    assert.deepEqual(dimensions, {
        width: 1024,
        height: 599
    });
});

test('image dimension renderer adds dimensions without changing existing attributes', () => {
    const html = [
        '<main>',
        '<img src="./images/fleet/ferrari-296-gts/06-exterior-motion.jpg" alt="Ferrari">',
        '<img src="./images/fleet/ferrari-296-gts/06-exterior-motion.jpg" alt="Ferrari" width="1024" height="599">',
        '</main>'
    ].join('\n');

    const nextHtml = addImageDimensionsToHtml(html, siteRoot);

    assert.match(nextHtml, /alt="Ferrari" width="1024" height="599">/);
    assert.equal((nextHtml.match(/width="1024" height="599"/g) || []).length, 2);
});
