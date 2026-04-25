const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const runtimeReservationDir = path.resolve(__dirname, '../output/runtime-reservations');

const CREATE_RESERVATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    reservation_id TEXT UNIQUE NOT NULL,
    payment_intent_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    status TEXT NOT NULL DEFAULT 'received',
    source TEXT NOT NULL DEFAULT 'website',
    car TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    start_date DATE,
    end_date DATE,
    pickup_time TEXT,
    dropoff_time TEXT,
    currency TEXT,
    total_amount NUMERIC,
    upfront_amount NUMERIC,
    remaining_amount NUMERIC,
    customer_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    reservation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    payment_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    email_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_request JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reservations_created_at_idx ON reservations (created_at DESC);
CREATE INDEX IF NOT EXISTS reservations_customer_email_idx ON reservations (customer_email);
CREATE INDEX IF NOT EXISTS reservations_status_idx ON reservations (status);
`;

let pgPool = null;
let databaseReadyPromise = null;

function ensureReservationDir() {
    fs.mkdirSync(runtimeReservationDir, { recursive: true });
}

function normalizeRecordKey(value) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw new Error('Reservation record key is required');
    }

    return normalized.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizeLookupEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function buildReservationId() {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `res_${timestamp}_${crypto.randomBytes(4).toString('hex')}`;
}

function getReservationRecordPath(recordKey) {
    return path.join(runtimeReservationDir, `${normalizeRecordKey(recordKey)}.json`);
}

function getPrimaryRecordKey(record = {}) {
    return (
        record.reservationId ||
        record.reservationData?.reservationId ||
        record.paymentIntentId ||
        record.payment?.paymentIntentId ||
        record.payment?.id ||
        null
    );
}

function mergePlainObject(base = {}, patch = {}) {
    return {
        ...(base && typeof base === 'object' ? base : {}),
        ...(patch && typeof patch === 'object' ? patch : {})
    };
}

function safeJsonParse(value, fallback = null) {
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

function numberOrNull(value) {
    if (value === undefined || value === null || value === '') return null;
    const numericValue = typeof value === 'number'
        ? value
        : Number.parseFloat(String(value).replace(/[^0-9.-]+/g, ''));

    return Number.isFinite(numericValue) ? numericValue : null;
}

function dateOrNull(value) {
    if (!value) return null;
    const normalized = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function isDatabaseConfigured() {
    return Boolean(process.env.DATABASE_URL);
}

function getReservationStoreMode() {
    return isDatabaseConfigured() ? 'postgres' : 'local-json';
}

function getDatabasePool() {
    if (!isDatabaseConfigured()) {
        return null;
    }

    if (!pgPool) {
        const { Pool } = require('pg');
        const sslSetting = process.env.DATABASE_SSL === 'false'
            ? false
            : (
                process.env.DATABASE_SSL === 'true' ||
                (process.env.NODE_ENV || '').toLowerCase() === 'production'
                    ? { rejectUnauthorized: false }
                    : undefined
            );

        pgPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: sslSetting
        });
    }

    return pgPool;
}

async function ensureDatabaseSchema() {
    const pool = getDatabasePool();
    if (!pool) {
        return;
    }

    if (!databaseReadyPromise) {
        databaseReadyPromise = pool.query(CREATE_RESERVATIONS_TABLE_SQL);
    }

    await databaseReadyPromise;
}

function normalizeReservationRecord(record = {}, existingRecord = null) {
    const timestamp = new Date().toISOString();
    const existingReservation = existingRecord?.reservationData || {};
    const incomingReservation = record.reservationData || {};
    const existingPayment = existingRecord?.payment || {};
    const incomingPayment = record.payment || {};
    const reservationId = (
        record.reservationId ||
        incomingReservation.reservationId ||
        existingRecord?.reservationId ||
        existingReservation.reservationId ||
        buildReservationId()
    );
    const paymentIntentId = (
        record.paymentIntentId ||
        incomingPayment.paymentIntentId ||
        incomingPayment.id ||
        existingRecord?.paymentIntentId ||
        existingPayment.paymentIntentId ||
        null
    );
    const customerData = mergePlainObject(existingRecord?.customerData, record.customerData || record.customer);
    const reservationData = {
        ...mergePlainObject(existingReservation, incomingReservation),
        reservationId
    };
    const payment = mergePlainObject(existingPayment, {
        ...incomingPayment,
        paymentIntentId: paymentIntentId || incomingPayment.paymentIntentId || existingPayment.paymentIntentId || null
    });

    return {
        ...existingRecord,
        ...record,
        reservationId,
        paymentIntentId,
        stripeCustomerId: record.stripeCustomerId || record.customerId || existingRecord?.stripeCustomerId || null,
        status: record.status || existingRecord?.status || 'received',
        source: record.source || existingRecord?.source || 'website',
        customerData,
        reservationData,
        payment,
        email: mergePlainObject(existingRecord?.email, record.email),
        rawRequest: record.rawRequest || existingRecord?.rawRequest || null,
        createdAt: existingRecord?.createdAt || record.createdAt || timestamp,
        updatedAt: timestamp
    };
}

function localRecordMatches(record, recordKey) {
    const normalizedKey = String(recordKey || '').trim();
    if (!normalizedKey || !record) return false;

    return [
        record.reservationId,
        record.paymentIntentId,
        record.stripeCustomerId,
        record.customerId,
        record.reservationData?.reservationId,
        record.payment?.paymentIntentId,
        record.payment?.id
    ].some((value) => value && String(value).trim() === normalizedKey);
}

function reservationEmailMatches(record, email) {
    const normalizedEmail = normalizeLookupEmail(email);
    if (!record || !normalizedEmail) return false;

    return [
        record.customerData?.email,
        record.customer?.email,
        record.reservationData?.customerEmail,
        record.rawRequest?.email,
        record.rawRequest?.customerData?.email
    ].some((candidate) => normalizeLookupEmail(candidate) === normalizedEmail);
}

function readLocalReservationRecord(recordKey) {
    const directPath = getReservationRecordPath(recordKey);

    if (fs.existsSync(directPath)) {
        return JSON.parse(fs.readFileSync(directPath, 'utf8'));
    }

    if (!fs.existsSync(runtimeReservationDir)) {
        return null;
    }

    const files = fs.readdirSync(runtimeReservationDir).filter((file) => file.endsWith('.json'));
    for (const file of files) {
        const record = safeJsonParse(fs.readFileSync(path.join(runtimeReservationDir, file), 'utf8'));
        if (localRecordMatches(record, recordKey)) {
            return record;
        }
    }

    return null;
}

function findLocalReservationForLookup({ reservationId, email }) {
    const record = readLocalReservationRecord(reservationId);
    return reservationEmailMatches(record, email) ? record : null;
}

function listLocalReservationRecords({ limit = 1000 } = {}) {
    if (!fs.existsSync(runtimeReservationDir)) {
        return [];
    }

    const maxRows = Math.min(Math.max(Number(limit || 1000), 1), 5000);

    return fs.readdirSync(runtimeReservationDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => {
            const filePath = path.join(runtimeReservationDir, file);
            const record = safeJsonParse(fs.readFileSync(filePath, 'utf8'));
            const fileStats = fs.statSync(filePath);

            return record
                ? {
                    ...record,
                    updatedAt: record.updatedAt || fileStats.mtime.toISOString(),
                    storage: record.storage || 'local-json'
                }
                : null;
        })
        .filter(Boolean)
        .sort((left, right) => (
            new Date(right.updatedAt || right.createdAt || 0) -
            new Date(left.updatedAt || left.createdAt || 0)
        ))
        .slice(0, maxRows);
}

function saveLocalReservationRecord(record) {
    const recordKey = getPrimaryRecordKey(record);
    if (!recordKey) {
        throw new Error('Reservation record requires reservationId or paymentIntentId');
    }

    ensureReservationDir();
    fs.writeFileSync(getReservationRecordPath(recordKey), JSON.stringify(record, null, 2));

    return {
        ...record,
        storage: getReservationStoreMode()
    };
}

function deleteLocalReservationRecord(recordKey) {
    const filePath = getReservationRecordPath(recordKey);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

function rowToReservationRecord(row) {
    if (!row) return null;

    return {
        reservationId: row.reservation_id,
        paymentIntentId: row.payment_intent_id || null,
        stripeCustomerId: row.stripe_customer_id || null,
        status: row.status,
        source: row.source,
        customerData: row.customer_data || {},
        reservationData: row.reservation_data || {},
        payment: row.payment_data || {},
        email: row.email_data || {},
        rawRequest: row.raw_request || null,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
        storage: 'postgres'
    };
}

async function readPostgresReservationRecord(recordKey) {
    await ensureDatabaseSchema();
    const pool = getDatabasePool();
    const result = await pool.query(
        `SELECT *
         FROM reservations
         WHERE reservation_id = $1 OR payment_intent_id = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [String(recordKey || '').trim()]
    );

    return rowToReservationRecord(result.rows[0]);
}

async function findPostgresReservationForLookup({ reservationId, email }) {
    await ensureDatabaseSchema();
    const pool = getDatabasePool();
    const result = await pool.query(
        `SELECT *
         FROM reservations
         WHERE reservation_id = $1
           AND lower(customer_email) = lower($2)
         ORDER BY updated_at DESC
         LIMIT 1`,
        [String(reservationId || '').trim(), normalizeLookupEmail(email)]
    );

    return rowToReservationRecord(result.rows[0]);
}

async function listPostgresReservationRecords({ limit = 1000 } = {}) {
    await ensureDatabaseSchema();
    const pool = getDatabasePool();
    const maxRows = Math.min(Math.max(Number(limit || 1000), 1), 5000);
    const result = await pool.query(
        `SELECT *
         FROM reservations
         ORDER BY updated_at DESC
         LIMIT $1`,
        [maxRows]
    );

    return result.rows.map(rowToReservationRecord).filter(Boolean);
}

async function savePostgresReservationRecord(record) {
    await ensureDatabaseSchema();
    const pool = getDatabasePool();
    const customerData = record.customerData || {};
    const reservationData = record.reservationData || {};
    const paymentData = record.payment || {};
    const emailData = record.email || {};

    const values = [
        record.reservationId,
        record.reservationId,
        record.paymentIntentId || null,
        record.stripeCustomerId || null,
        record.status || 'received',
        record.source || 'website',
        reservationData.car || null,
        customerData.name || customerData.fullName || null,
        customerData.email || null,
        customerData.phone || null,
        dateOrNull(reservationData.startDate),
        dateOrNull(reservationData.endDate),
        reservationData.pickupTime || null,
        reservationData.dropoffTime || null,
        reservationData.currency || paymentData.currency || null,
        numberOrNull(reservationData.totalAmount),
        numberOrNull(reservationData.upfrontAmount),
        numberOrNull(reservationData.remainingAmount),
        JSON.stringify(customerData),
        JSON.stringify(reservationData),
        JSON.stringify(paymentData),
        JSON.stringify(emailData),
        record.rawRequest ? JSON.stringify(record.rawRequest) : null,
        record.createdAt || new Date().toISOString(),
        record.updatedAt || new Date().toISOString()
    ];

    const result = await pool.query(
        `INSERT INTO reservations (
            id,
            reservation_id,
            payment_intent_id,
            stripe_customer_id,
            status,
            source,
            car,
            customer_name,
            customer_email,
            customer_phone,
            start_date,
            end_date,
            pickup_time,
            dropoff_time,
            currency,
            total_amount,
            upfront_amount,
            remaining_amount,
            customer_data,
            reservation_data,
            payment_data,
            email_data,
            raw_request,
            created_at,
            updated_at
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18,
            $19::jsonb, $20::jsonb, $21::jsonb, $22::jsonb,
            $23::jsonb, $24, $25
        )
        ON CONFLICT (reservation_id) DO UPDATE SET
            payment_intent_id = COALESCE(EXCLUDED.payment_intent_id, reservations.payment_intent_id),
            stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, reservations.stripe_customer_id),
            status = EXCLUDED.status,
            source = EXCLUDED.source,
            car = COALESCE(EXCLUDED.car, reservations.car),
            customer_name = COALESCE(EXCLUDED.customer_name, reservations.customer_name),
            customer_email = COALESCE(EXCLUDED.customer_email, reservations.customer_email),
            customer_phone = COALESCE(EXCLUDED.customer_phone, reservations.customer_phone),
            start_date = COALESCE(EXCLUDED.start_date, reservations.start_date),
            end_date = COALESCE(EXCLUDED.end_date, reservations.end_date),
            pickup_time = COALESCE(EXCLUDED.pickup_time, reservations.pickup_time),
            dropoff_time = COALESCE(EXCLUDED.dropoff_time, reservations.dropoff_time),
            currency = COALESCE(EXCLUDED.currency, reservations.currency),
            total_amount = COALESCE(EXCLUDED.total_amount, reservations.total_amount),
            upfront_amount = COALESCE(EXCLUDED.upfront_amount, reservations.upfront_amount),
            remaining_amount = COALESCE(EXCLUDED.remaining_amount, reservations.remaining_amount),
            customer_data = reservations.customer_data || EXCLUDED.customer_data,
            reservation_data = reservations.reservation_data || EXCLUDED.reservation_data,
            payment_data = reservations.payment_data || EXCLUDED.payment_data,
            email_data = reservations.email_data || EXCLUDED.email_data,
            raw_request = COALESCE(EXCLUDED.raw_request, reservations.raw_request),
            updated_at = EXCLUDED.updated_at
        RETURNING *`,
        values
    );

    return rowToReservationRecord(result.rows[0]);
}

async function readReservationRecord(recordKey) {
    if (!recordKey) {
        return null;
    }

    if (isDatabaseConfigured()) {
        return readPostgresReservationRecord(recordKey);
    }

    return readLocalReservationRecord(recordKey);
}

async function findReservationForLookup({ reservationId, email } = {}) {
    const normalizedReservationId = String(reservationId || '').trim();
    const normalizedEmail = normalizeLookupEmail(email);

    if (!normalizedReservationId || !normalizedEmail) {
        return null;
    }

    if (isDatabaseConfigured()) {
        return findPostgresReservationForLookup({
            reservationId: normalizedReservationId,
            email: normalizedEmail
        });
    }

    return findLocalReservationForLookup({
        reservationId: normalizedReservationId,
        email: normalizedEmail
    });
}

async function listReservationRecords(options = {}) {
    if (isDatabaseConfigured()) {
        return listPostgresReservationRecords(options);
    }

    return listLocalReservationRecords(options);
}

async function saveReservationRecord(record) {
    const recordKey = getPrimaryRecordKey(record) || buildReservationId();
    const existingRecord = await readReservationRecord(recordKey);
    const nextRecord = normalizeReservationRecord(record, existingRecord);

    if (isDatabaseConfigured()) {
        return savePostgresReservationRecord(nextRecord);
    }

    return saveLocalReservationRecord(nextRecord);
}

async function deleteReservationRecord(recordKey) {
    if (isDatabaseConfigured()) {
        await ensureDatabaseSchema();
        const pool = getDatabasePool();
        await pool.query(
            'DELETE FROM reservations WHERE reservation_id = $1 OR payment_intent_id = $1',
            [String(recordKey || '').trim()]
        );
        return;
    }

    deleteLocalReservationRecord(recordKey);
}

async function closeReservationStore() {
    if (pgPool) {
        await pgPool.end();
    }

    pgPool = null;
    databaseReadyPromise = null;
}

module.exports = {
    buildReservationId,
    closeReservationStore,
    deleteReservationRecord,
    findReservationForLookup,
    getReservationRecordPath,
    getReservationStoreMode,
    isDatabaseConfigured,
    listReservationRecords,
    readReservationRecord,
    runtimeReservationDir,
    saveReservationRecord
};
