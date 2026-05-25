const assert = require('node:assert/strict');
const test = require('node:test');

const fleetCards = require('../../server/data/fleet-cards.json');
const {
    extractLandingReserveImageSources,
    listVehicleImages,
    previewImageForVehicle,
    removeFaqStructuredData,
    renderVehicleMotherContent,
    replaceVehicleMotherContent,
    vehicleName
} = require('../../server/renderers/render-vehicle-pages');

function relatedTitlesFromMarkup(markup) {
    return Array.from(markup.matchAll(/<a class="vehicle-pdp-related-card"[\s\S]*?<strong>([^<]+)<\/strong>/g))
        .map((match) => match[1]);
}

test('vehicle mother content renders reusable sections from fleet card data', () => {
    const card = fleetCards.find((item) => item.id === 'blue-porsche-gt3-rs');
    const markup = renderVehicleMotherContent(card, fleetCards);

    assert.equal(vehicleName(card), 'Blue Porsche GT3 RS');
    assert.match(markup, /vehicle-pdp-cinema/);
    assert.match(markup, /vehicle-pdp-video-card/);
    assert.match(markup, /Featured detail/);
    assert.match(markup, /blue-porsche-gt3-rs\/05\.jpg/);
    assert.doesNotMatch(markup, /Photo preview/);
    assert.match(markup, /vehicle-pdp-related-card/);
    assert.match(markup, /Porsche 992 GT3/);
    assert.match(markup, /Reserve Blue GT3 RS/);
    assert.doesNotMatch(markup, /vehicle-pdp-video-card__play/);
    assert.doesNotMatch(markup, /<video/);
    assert.doesNotMatch(markup, /vehicle-pdp-quick-spec/);
    assert.doesNotMatch(markup, /vehicle-pdp-experience/);
    assert.doesNotMatch(markup, /vehicle-pdp-detail-split/);
    assert.doesNotMatch(markup, /vehicle-pdp-gallery-strip/);
    assert.doesNotMatch(markup, /class="faq-list"/);
});

test('all configured related vehicle ids are valid curated groups', () => {
    const ids = new Set(fleetCards.map((card) => card.id));

    fleetCards.forEach((card) => {
        assert.equal(Array.isArray(card.relatedIds), true, `${card.id} needs relatedIds.`);
        assert.equal(card.relatedIds.length, 3, `${card.id} needs exactly three relatedIds.`);

        card.relatedIds.forEach((relatedId) => {
            assert.notEqual(relatedId, card.id, `${card.id} cannot relate to itself.`);
            assert.equal(ids.has(relatedId), true, `${card.id} has missing relatedId "${relatedId}".`);
        });

        assert.equal(new Set(card.relatedIds).size, card.relatedIds.length, `${card.id} has duplicate relatedIds.`);
    });
});

test('vehicle related cars follow the curated intent order', () => {
    const cases = [
        {
            id: 'lamborghini-urus-sport',
            expected: ['Mercedes G63 AMG', 'Bronze Mercedes G63', 'Rolls-Royce Cullinan Black Badge']
        },
        {
            id: 'mercedes-g63-amg',
            expected: ['Bronze Mercedes G63', 'Lamborghini Urus SE', 'Rolls-Royce Cullinan Black Badge']
        },
        {
            id: 'mercedes-benz-sl63-amg',
            expected: ['Ferrari 296 GTS', 'Ferrari F8 Spider', 'Lamborghini Huracan EVO Spyder']
        }
    ];

    cases.forEach(({ id, expected }) => {
        const card = fleetCards.find((item) => item.id === id);
        const markup = renderVehicleMotherContent(card, fleetCards);

        assert.deepEqual(relatedTitlesFromMarkup(markup), expected);
    });
});

test('vehicle preview image avoids the hero and first gallery thumbnails when possible', () => {
    const card = fleetCards.find((item) => item.id === 'bronze-mercedes-g63');
    const images = listVehicleImages(card);
    const preview = previewImageForVehicle(images, card.image);
    const topGallerySources = new Set(images.slice(0, 4).map((image) => image.src));

    assert.equal(preview.src.endsWith('/05.jpg'), true);
    assert.equal(topGallerySources.has(preview.src), false);
});

test('vehicle preview image respects existing page gallery exclusions', () => {
    const card = fleetCards.find((item) => item.id === 'bronze-mercedes-g63');
    const images = listVehicleImages(card);
    const excluded = images.slice(0, 5).map((image) => image.src);
    const preview = previewImageForVehicle(images, card.image, excluded);

    assert.equal(preview.src.endsWith('/06.jpg'), true);
});

test('vehicle mother content respects explicit preview image overrides', () => {
    const card = fleetCards.find((item) => item.id === 'ferrari-296-gts');
    const markup = renderVehicleMotherContent(card, fleetCards);

    assert.match(markup, /ferrari-296-gts\/10-cabin-detail\.jpg/);
    assert.doesNotMatch(markup, /ferrari-296-gts\/05-detail-wheel\.jpg/);
});

test('vehicle renderer extracts existing reserve gallery image sources', () => {
    const html = [
        '<main>',
        '<section class="vehicle-landing-reserve">',
        '<figure><img src="./images/fleet/car/01.jpg" alt=""></figure>',
        '<div><img src="./images/fleet/car/02.jpg" alt=""></div>',
        '</section>',
        '<!-- VEHICLE_MOTHER_CONTENT_START -->',
        '<section>Generated</section>',
        '<!-- VEHICLE_MOTHER_CONTENT_END -->',
        '</main>'
    ].join('\n');

    assert.deepEqual(extractLandingReserveImageSources(html), [
        './images/fleet/car/01.jpg',
        './images/fleet/car/02.jpg'
    ]);
});

test('vehicle replacement upgrades old manual detail body with markers', () => {
    const html = [
        '<main>',
        '<section class="vehicle-landing-reserve" id="vehicle-booking">',
        '<div><section class="vehicle-landing-specs">Specs</section></div>',
        '</section>',
        '<section class="vehicle-trim-detail">Old manual body</section>',
        '</main>'
    ].join('\n');

    const nextHtml = replaceVehicleMotherContent(html, '        <section class="vehicle-section">New mother body</section>');

    assert.match(nextHtml, /VEHICLE_MOTHER_CONTENT_START/);
    assert.match(nextHtml, /New mother body/);
    assert.doesNotMatch(nextHtml, /Old manual body/);
});

test('vehicle renderer removes FAQPage structured data when FAQ is not visible', () => {
    const html = [
        '<head>',
        '<script type="application/ld+json">',
        JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
                { '@type': 'Product', name: 'Car' },
                { '@type': 'FAQPage', mainEntity: [] }
            ]
        }),
        '</script>',
        '</head>'
    ].join('\n');

    const nextHtml = removeFaqStructuredData(html);

    assert.match(nextHtml, /"@type": "Product"/);
    assert.doesNotMatch(nextHtml, /FAQPage/);
});
