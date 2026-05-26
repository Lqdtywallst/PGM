const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const fleetCards = require('../../server/data/fleet-cards.json');

const projectRoot = path.resolve(__dirname, '..', '..');
const vehiclePagesRoot = path.join(projectRoot, 'site', 'pages', 'vehicles');

function readVehiclePage(card) {
    const fileName = String(card.href).replace(/^\.\//, '');
    const pagePath = path.join(vehiclePagesRoot, fileName);

    assert.equal(fs.existsSync(pagePath), true, `Missing vehicle page for ${card.id}`);

    return fs.readFileSync(pagePath, 'utf8');
}

test('all fleet cards have an individual vehicle page with shared header and footer', () => {
    fleetCards.forEach((card) => {
        const html = readVehiclePage(card);

        assert.match(html, /<header class="lab-header">/, `${card.id} needs the shared header`);
        assert.match(html, /<footer class="site-v2-footer" id="contact">/, `${card.id} needs the shared footer`);
        assert.doesNotMatch(html, /<footer class="page-foot"/, `${card.id} must not use the legacy vehicle footer`);
    });
});

test('all vehicle pages keep the generated mother content markers', () => {
    fleetCards.forEach((card) => {
        const html = readVehiclePage(card);

        assert.match(html, /<!-- VEHICLE_MOTHER_CONTENT_START -->/, `${card.id} needs generated content start marker`);
        assert.match(html, /<!-- VEHICLE_MOTHER_CONTENT_END -->/, `${card.id} needs generated content end marker`);
        assert.match(html, /vehicle-pdp-cinema/, `${card.id} needs generated cinematic block`);
        assert.match(html, /vehicle-pdp-video-card/, `${card.id} needs generated video-ready block`);
        assert.match(html, /vehicle-pdp-seo-intent/, `${card.id} needs generated SEO intent block`);
        assert.match(html, new RegExp(card.seo.primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${card.id} needs its primary keyword in the generated body`);
        assert.doesNotMatch(html, /vehicle-pdp-faq/, `${card.id} must not render FAQ blocks as an SEO shortcut`);
        assert.doesNotMatch(html, /"@type":\s*"FAQPage"/, `${card.id} must not ship deprecated FAQPage schema`);
        assert.match(html, /"AutoRental"/, `${card.id} needs AutoRental business schema`);
        assert.match(html, /"LocalBusiness"/, `${card.id} needs LocalBusiness business schema`);
        assert.match(html, /"Product"/, `${card.id} needs rental offer Product schema`);
        assert.match(html, /"Car"/, `${card.id} needs car-specific Product schema`);
        assert.match(html, /"availability":\s*"https:\/\/schema\.org\/LimitedAvailability"/, `${card.id} should not claim always-in-stock rental availability`);
        assert.match(html, /"unitText":\s*"DAY"/, `${card.id} needs day-rate price specification`);
        assert.match(html, /vehicle-pdp-related-card/, `${card.id} needs generated related cars`);
        assert.doesNotMatch(html, /vehicle-pdp-quick-spec/, `${card.id} must not render quick-spec blocks in the lean vehicle mother body`);
        assert.doesNotMatch(html, /vehicle-pdp-experience/, `${card.id} must not render use-case blocks in the lean vehicle mother body`);
        assert.doesNotMatch(html, /vehicle-pdp-detail-split/, `${card.id} must not render detail split blocks in the lean vehicle mother body`);
        assert.doesNotMatch(html, /vehicle-pdp-gallery-strip/, `${card.id} must not render gallery strip blocks in the lean vehicle mother body`);
        assert.doesNotMatch(html, /class="faq-list"/, `${card.id} must not use the legacy FAQ list shell`);
    });
});

test('vehicle hero titles stay clean while the kicker keeps Dubai context', () => {
    fleetCards.forEach((card) => {
        const html = readVehiclePage(card);
        const h1 = html.match(/<h1 id="vehicle-base-title">([^<]+)<\/h1>/)?.[1];
        const kicker = html.match(/<aside class="vehicle-booking">[\s\S]*?<span class="section-kicker">([^<]+)<\/span>/)?.[1];

        assert.ok(h1, `${card.id} needs a vehicle hero H1`);
        assert.ok(kicker, `${card.id} needs a vehicle hero kicker`);
        assert.doesNotMatch(h1, /\bin Dubai\b/i, `${card.id} H1 should not repeat in Dubai`);
        assert.match(kicker, /rental in Dubai$/i, `${card.id} kicker should keep rental in Dubai context`);
    });
});
