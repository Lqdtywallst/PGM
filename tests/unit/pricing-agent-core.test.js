const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildPricingReport,
    matchVehicleId,
    normalizeCompetitorSnapshot,
    roundToStep
} = require('../../server/pricing/pricing-agent-core');

const fleetCards = [
    {
        id: 'mercedes-g63-amg',
        brand: 'Mercedes',
        pricePerDay: 1990,
        href: './mercedes-g63-amg-rental-dubai.html',
        copy: { title: 'G63 AMG' }
    },
    {
        id: 'ferrari-296-gts',
        brand: 'Ferrari',
        pricePerDay: 3400,
        href: './ferrari-rental-dubai.html',
        copy: { title: '296 GTS' }
    }
];

test('pricing agent matches common vehicle labels to fleet ids', () => {
    assert.equal(matchVehicleId('Mercedes G63 AMG', fleetCards), 'mercedes-g63-amg');
    assert.equal(matchVehicleId('Ferrari 296 GTS rental Dubai', fleetCards), 'ferrari-296-gts');
});

test('pricing agent normalizes fresh competitor snapshots', () => {
    const entries = normalizeCompetitorSnapshot({
        generatedAt: '2026-04-25T00:00:00.000Z',
        prices: [
            {
                vehicle: 'Mercedes G63 AMG',
                company: 'Example A',
                dailyPrice: 'AED 1,850',
                capturedAt: '2026-04-24T00:00:00.000Z'
            }
        ]
    }, fleetCards, new Date('2026-04-25T00:00:00.000Z'));

    assert.equal(entries.length, 1);
    assert.equal(entries[0].vehicleId, 'mercedes-g63-amg');
    assert.equal(entries[0].dailyPrice, 1850);
});

test('pricing report undercuts fresh market prices within guardrails', () => {
    const report = buildPricingReport({
        fleetCards,
        competitorSnapshot: {
            prices: [
                {
                    vehicleId: 'mercedes-g63-amg',
                    company: 'Example A',
                    dailyPrice: 1900,
                    capturedAt: '2026-04-25T00:00:00.000Z'
                }
            ]
        },
        policy: {
            global: {
                requireFreshCompetitorsForApply: true,
                priceStep: 50,
                undercutPct: 0.025,
                maxChangePct: 0.08
            },
            vehicles: {
                'mercedes-g63-amg': {
                    floor: 1450,
                    ceiling: 2300
                }
            }
        },
        now: new Date('2026-04-25T00:00:00.000Z')
    });

    const mercedes = report.recommendations.find((entry) => entry.vehicleId === 'mercedes-g63-amg');

    assert.equal(mercedes.canApply, true);
    assert.equal(mercedes.recommendedPrice, 1850);
    assert.equal(report.summary.changedCount, 1);
});

test('pricing report keeps current prices when there is no demand or competitor evidence', () => {
    const report = buildPricingReport({
        fleetCards: [fleetCards[0]],
        competitorSnapshot: {},
        policy: {
            global: {
                requireFreshCompetitorsForApply: true
            }
        },
        now: new Date('2026-04-25T00:00:00.000Z')
    });

    assert.equal(report.recommendations[0].recommendedPrice, 1990);
    assert.equal(report.summary.changedCount, 0);
});

test('pricing report blocks apply when competitor data is missing by policy', () => {
    const report = buildPricingReport({
        fleetCards: [fleetCards[0]],
        reservations: [
            {
                createdAt: '2026-04-24T00:00:00.000Z',
                reservationData: {
                    car: 'Mercedes G63 AMG',
                    startDate: '2026-04-26',
                    endDate: '2026-05-20'
                }
            }
        ],
        competitorSnapshot: {},
        policy: {
            global: {
                requireFreshCompetitorsForApply: true,
                priceStep: 50,
                maxChangePct: 0.08
            }
        },
        now: new Date('2026-04-25T00:00:00.000Z')
    });

    const mercedes = report.recommendations[0];
    assert.equal(mercedes.status, 'change');
    assert.equal(mercedes.canApply, false);
    assert.equal(report.summary.applyBlockedCount, 1);
});

test('roundToStep rounds to the configured AED step', () => {
    assert.equal(roundToStep(1724, 50), 1700);
    assert.equal(roundToStep(1725, 50), 1750);
});
