const assert = require('node:assert/strict');
const test = require('node:test');

const fleetCards = require('../../server/data/fleet-cards.json');
const {
    renderCard,
    renderHomeCards,
    replaceHomeCards
} = require('../../server/renderers/render-fleet-cards');

const homeFeaturedIds = [
    'lamborghini-huracan-evo-spyder',
    'ferrari-296-gts',
    'lamborghini-urus-sport',
    'rolls-royce-cullinan-black-badge'
];

function articleIds(markup) {
    return Array.from(markup.matchAll(/<article[^>]+data-id="([^"]+)"/g), (match) => match[1]);
}

test('fleet cards keep the interactive listing selectors and compact data', () => {
    const card = fleetCards[0];
    const markup = renderCard(card);

    assert.match(markup, /class="fleet-card js-fleet-card"/);
    assert.match(markup, /data-id="lamborghini-huracan-evo-spyder"/);
    assert.match(markup, /data-type="convertible sports"/);
    assert.match(markup, /data-price="3200"/);
    assert.match(markup, /decoding="async"/);
    assert.doesNotMatch(markup, /fleet-card--home/);
    assert.equal(Array.from(markup.matchAll(/<span class="fleet-card__spec">/g)).length, card.copy.specs.length);
});

test('home cards reuse fleet content with home-only presentation hooks', () => {
    const card = fleetCards[0];
    const markup = renderCard(card, { context: 'home' });

    assert.match(markup, /class="fleet-card fleet-card--home fleet-visual-card/);
    assert.doesNotMatch(markup, /js-fleet-card/);
    assert.match(markup, /fleet-visual-card__shade/);
    assert.match(markup, /data-home-fleet-car="Lamborghini Huracan EVO Spyder"/);
    assert.match(markup, /Roof-down Lamborghini drama for Palm, Marina and after-dark arrivals\./);
    assert.match(markup, /<strong class="fleet-card__price-value fleet-visual-card__price-value">3,200 AED<\/strong>/);
    assert.equal(
        Array.from(markup.matchAll(/<span class="fleet-card__spec fleet-visual-card__spec">/g)).length,
        card.copy.specs.length
    );
});

test('home featured cards render the curated subset in stable order', () => {
    const markup = renderHomeCards(fleetCards);

    assert.deepEqual(articleIds(markup), homeFeaturedIds);
    assert.equal(Array.from(markup.matchAll(/<article /g)).length, homeFeaturedIds.length);
    assert.doesNotMatch(markup, /data-id="porsche-992-gt3"/);
    assert.doesNotMatch(markup, /data-id="mercedes-g63-amg"/);
});

test('home replacement updates only the marked featured fleet block', () => {
    const html = [
        '<div class="fleet-showcase">',
        '                    <!-- HOME_FLEET_CARDS_START -->',
        '                    old cards',
        '                    <!-- HOME_FLEET_CARDS_END -->',
        '</div>'
    ].join('\n');

    const result = replaceHomeCards(html, '                    new cards', '\n');

    assert.equal(result.found, true);
    assert.match(result.html, /new cards/);
    assert.doesNotMatch(result.html, /old cards/);
});
