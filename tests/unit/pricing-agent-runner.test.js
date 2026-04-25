const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
    parseArgs,
    readReservationsForPricing
} = require('../../scripts/run-pricing-agent');

test('pricing runner parses reservation source options', () => {
    const args = parseArgs([
        '--reservations-dir',
        'test-data/pricing-reservations',
        '--reservation-limit',
        '25'
    ]);

    assert.equal(args.reservationsDir.endsWith(path.join('test-data', 'pricing-reservations')), true);
    assert.equal(args.reservationLimit, 25);
});

test('pricing runner reads local reservation snapshots when explicitly provided', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pricing-agent-'));
    const reservationPath = path.join(tempDir, 'reservation.json');

    fs.writeFileSync(reservationPath, JSON.stringify({
        reservationId: 'res_test',
        createdAt: '2026-04-24T00:00:00.000Z',
        reservationData: {
            car: 'Mercedes G63 AMG',
            startDate: '2026-04-26',
            endDate: '2026-04-28'
        }
    }), 'utf8');

    const result = await readReservationsForPricing({
        reservationsDir: tempDir,
        reservationLimit: 10
    });

    assert.equal(result.reservations.length, 1);
    assert.equal(result.source.includes('local-json:'), true);
    assert.equal(result.reservations[0].reservationId, 'res_test');
});
