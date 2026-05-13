#!/usr/bin/env node

require('dotenv').config();

const {
    closeReservationStore,
    getReservationStoreDiagnostics,
    listLocalReservationRecords,
    saveReservationRecord
} = require('../../server/reservations/reservation-store');

function parseArgs(argv = process.argv.slice(2)) {
    const args = {
        dryRun: false,
        limit: 5000
    };

    argv.forEach((value, index) => {
        if (value === '--dry-run') {
            args.dryRun = true;
        }
        if (value === '--limit' && argv[index + 1]) {
            args.limit = Math.min(Math.max(Number(argv[index + 1]) || args.limit, 1), 5000);
        }
    });

    return args;
}

async function main() {
    const args = parseArgs();
    const localRecords = listLocalReservationRecords({ limit: args.limit });

    if (!process.env.DATABASE_URL && !args.dryRun) {
        throw new Error('DATABASE_URL is required. Use --dry-run to preview local records without writing to PostgreSQL.');
    }

    if (args.dryRun) {
        console.log(JSON.stringify({
            ok: true,
            dryRun: true,
            localRecords: localRecords.length,
            sampleReservationIds: localRecords.slice(0, 10).map((record) => record.reservationId || record.paymentIntentId)
        }, null, 2));
        return;
    }

    const diagnosticsBefore = await getReservationStoreDiagnostics();
    const migrated = [];
    const failed = [];

    for (const record of localRecords) {
        try {
            const saved = await saveReservationRecord({
                ...record,
                source: record.source || 'local_json_migration'
            });
            migrated.push(saved.reservationId || saved.paymentIntentId);
        } catch (error) {
            failed.push({
                reservationId: record.reservationId || record.paymentIntentId || null,
                error: error.message
            });
        }
    }

    const diagnosticsAfter = await getReservationStoreDiagnostics();

    console.log(JSON.stringify({
        ok: failed.length === 0,
        localRecords: localRecords.length,
        migrated: migrated.length,
        failed,
        storageBefore: diagnosticsBefore,
        storageAfter: diagnosticsAfter
    }, null, 2));

    if (failed.length) {
        process.exitCode = 1;
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await closeReservationStore();
    });
