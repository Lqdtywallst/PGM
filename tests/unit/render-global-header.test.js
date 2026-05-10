const assert = require('node:assert/strict');
const test = require('node:test');

const {
    normalizeHeaderConfig
} = require('../../server/renderers/render-global-header');

function baseHeaderConfig(utilityLink) {
    return {
        utilityLinks: [utilityLink],
        navItems: [
            {
                itemType: 'link',
                label: 'Home',
                href: '/',
                visible: true
            }
        ],
        primaryButton: {
            label: 'Reserve',
            href: '/app/reserve/page.html',
            visible: true
        }
    };
}

test('known quick contact types keep label, href and aria label aligned', () => {
    const normalized = normalizeHeaderConfig(baseHeaderConfig({
        kind: 'whatsapp',
        label: 'Call',
        href: 'tel:+971586122568',
        ariaLabel: 'Call Dynasty Prestige',
        visible: true
    }));

    assert.deepEqual(normalized.utilityLinks[0], {
        kind: 'whatsapp',
        label: 'WhatsApp',
        href: 'https://wa.me/971586122568',
        ariaLabel: 'Open WhatsApp',
        visible: true
    });
});

test('custom quick contact labels are preserved while known links are normalized', () => {
    const normalized = normalizeHeaderConfig(baseHeaderConfig({
        kind: 'call',
        label: 'Talk to concierge',
        href: 'https://wa.me/971586122568',
        ariaLabel: 'Call Dynasty Prestige',
        visible: true
    }));

    assert.equal(normalized.utilityLinks[0].label, 'Talk to concierge');
    assert.equal(normalized.utilityLinks[0].href, 'tel:+971586122568');
    assert.equal(normalized.utilityLinks[0].ariaLabel, 'Call Dynasty Prestige');
});

test('header dropdown variants fall back to supported visual styles', () => {
    const normalized = normalizeHeaderConfig({
        utilityLinks: [
            {
                kind: 'call',
                label: 'Call',
                href: 'tel:+971586122568',
                ariaLabel: 'Call Dynasty Prestige',
                visible: true
            }
        ],
        navItems: [
            {
                itemType: 'mega',
                label: 'Cars',
                href: '',
                visible: true,
                panelVariant: 'generic',
                cardVariant: 'poster',
                cards: [
                    {
                        title: 'Lamborghini',
                        description: 'Brand page',
                        href: '/lamborghini-rental-dubai.html',
                        imageSrc: '/images/brands/lamborghini-mark.png',
                        imageAlt: '',
                        visible: true
                    }
                ]
            }
        ],
        primaryButton: {
            label: 'Reserve',
            href: '/app/reserve/page.html',
            visible: true
        }
    });

    assert.equal(normalized.navItems[0].panelVariant, 'brands');
    assert.equal(normalized.navItems[0].cardVariant, 'brand');
});
