const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildFooterMarkup,
    normalizeFooterConfig,
    replaceFirstFooter
} = require('../../server/renderers/render-global-footer');

function baseFooterConfig() {
    return {
        brand: {
            crestSrc: '/images/dp-crest-cropped.png',
            text: 'Luxury cars, chauffeur options and hotel, villa or airport handovers across Dubai.'
        },
        columns: [
            {
                title: 'Useful links',
                variant: 'links',
                links: [
                    { label: 'Home', href: '/index.html' },
                    { label: 'Fleet', href: '/fleet.html' }
                ]
            },
            {
                title: 'Dubai guides',
                variant: 'guides',
                links: [
                    { label: 'Dubai city guide', href: '/luxury-car-rental-dubai.html' }
                ]
            },
            {
                title: 'Contact us',
                variant: 'contact',
                links: [
                    { label: '+971 58 612 2568', href: 'tel:+971586122568' }
                ],
                body: 'Palm Jumeirah based.'
            }
        ],
        service: {
            label: '24/7',
            text: 'Reservation support'
        },
        legal: [
            { label: 'Booking T&C', href: '/terms-and-conditions.html' }
        ],
        copyright: '© 2026 Dynasty Prestige. All rights reserved.',
        socials: [
            { label: 'WA', href: 'https://wa.me/971586122568', ariaLabel: 'Open WhatsApp' }
        ]
    };
}

test('footer config keeps required global content and variants', () => {
    const normalized = normalizeFooterConfig(baseFooterConfig());

    assert.equal(normalized.brand.text, 'Luxury cars, chauffeur options and hotel, villa or airport handovers across Dubai.');
    assert.equal(normalized.columns[1].variant, 'guides');
    assert.equal(normalized.columns[2].title, 'Contact us');
});

test('footer renderer marks current public path without losing external link safety', () => {
    const markup = buildFooterMarkup(normalizeFooterConfig(baseFooterConfig()), '/fleet.html', {
        className: 'site-v2-footer site-v2-footer--over-video',
        id: 'contact'
    });

    assert.match(markup, /class="site-v2-footer site-v2-footer--over-video"/);
    assert.match(markup, /href="\/fleet.html" aria-current="page"/);
    assert.match(markup, /href="https:\/\/wa\.me\/971586122568" aria-label="Open WhatsApp" target="_blank" rel="noopener"/);
});

test('footer replacement preserves the page footer class variant', () => {
    const original = [
        '<main>Page</main>',
        '<footer class="site-v2-footer site-v2-footer--over-video" id="contact"><p>Old footer</p></footer>'
    ].join('\n');
    const replacement = replaceFirstFooter(original, (options) => buildFooterMarkup(normalizeFooterConfig(baseFooterConfig()), '/', options));

    assert.equal(replacement.found, true);
    assert.match(replacement.html, /class="site-v2-footer site-v2-footer--over-video"/);
    assert.doesNotMatch(replacement.html, /Old footer/);
});
