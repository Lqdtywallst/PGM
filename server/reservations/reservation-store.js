const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
    buildCrmInteractionSeed,
    buildCrmReservationIntelligence
} = require('../crm/crm-intelligence');

const runtimeReservationDir = path.resolve(__dirname, '..', '..', 'output', 'runtime-reservations');
const RESERVATION_STORAGE_SCHEMA_VERSION = 2;

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
    schema_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reservations_created_at_idx ON reservations (created_at DESC);
CREATE INDEX IF NOT EXISTS reservations_customer_email_idx ON reservations (customer_email);
CREATE INDEX IF NOT EXISTS reservations_status_idx ON reservations (status);
CREATE INDEX IF NOT EXISTS reservations_car_idx ON reservations (car);
CREATE INDEX IF NOT EXISTS reservations_schedule_idx ON reservations (start_date, end_date);

ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS crm_customers (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    primary_email TEXT,
    primary_phone TEXT,
    stripe_customer_id TEXT,
    city TEXT,
    country TEXT,
    identity_key TEXT,
    consent_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    data_quality JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_customers_primary_email_idx
    ON crm_customers (primary_email)
    WHERE primary_email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS crm_customers_primary_phone_idx
    ON crm_customers (primary_phone)
    WHERE primary_phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS crm_customers_stripe_customer_idx
    ON crm_customers (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_customers_updated_at_idx ON crm_customers (updated_at DESC);

CREATE TABLE IF NOT EXISTS crm_reservation_intelligence (
    reservation_id TEXT PRIMARY KEY REFERENCES reservations(reservation_id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    lead_stage TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    handover_status TEXT NOT NULL,
    reservation_status TEXT NOT NULL,
    source TEXT NOT NULL,
    preferred_vehicle TEXT,
    pickup_area TEXT,
    dropoff_area TEXT,
    rental_start DATE,
    rental_end DATE,
    total_amount NUMERIC,
    attribution JSONB NOT NULL DEFAULT '{}'::jsonb,
    data_quality JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_features JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_reservation_intelligence_customer_idx
    ON crm_reservation_intelligence (customer_id);
CREATE INDEX IF NOT EXISTS crm_reservation_intelligence_stage_idx
    ON crm_reservation_intelligence (lead_stage, payment_status, handover_status);
CREATE INDEX IF NOT EXISTS crm_reservation_intelligence_quality_idx
    ON crm_reservation_intelligence (((data_quality ->> 'score')::int));

CREATE TABLE IF NOT EXISTS crm_interaction_events (
    id TEXT PRIMARY KEY,
    reservation_id TEXT,
    customer_id TEXT,
    event_type TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'system',
    direction TEXT NOT NULL DEFAULT 'internal',
    summary TEXT NOT NULL,
    actor TEXT,
    outcome TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_interaction_events_reservation_idx
    ON crm_interaction_events (reservation_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS crm_interaction_events_customer_idx
    ON crm_interaction_events (customer_id, occurred_at DESC);
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
    const filePath = getReservationRecordPath(recordKey);
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify({
        ...record,
        schemaVersion: record.schemaVersion || RESERVATION_STORAGE_SCHEMA_VERSION
    }, null, 2));
    fs.renameSync(tempPath, filePath);

    return {
        ...record,
        schemaVersion: record.schemaVersion || RESERVATION_STORAGE_SCHEMA_VERSION,
        storage: getReservationStoreMode()
    };
}

function buildLocalCrmDataDiagnostics(records = []) {
    const intelligenceRows = records.map(buildCrmReservationIntelligence);
    const customerIds = new Set(intelligenceRows.map((item) => item.customer.customerId).filter(Boolean));
    const scores = intelligenceRows
        .map((item) => item.dataQuality?.score)
        .filter((score) => Number.isFinite(score));
    const averageScore = scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null;

    return {
        schemaVersion: RESERVATION_STORAGE_SCHEMA_VERSION,
        customerCount: customerIds.size,
        reservationIntelligenceCount: intelligenceRows.length,
        interactionEventCount: intelligenceRows.length,
        aiReadyReservationCount: intelligenceRows.filter((item) => item.dataQuality?.aiReadyForOps).length,
        averageDataQualityScore: averageScore
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
        schemaVersion: row.schema_version || RESERVATION_STORAGE_SCHEMA_VERSION,
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

async function resolveCrmCustomerId(pool, customer = {}) {
    const result = await pool.query(
        `SELECT id
         FROM crm_customers
         WHERE ($1::text IS NOT NULL AND primary_email = $1)
            OR ($2::text IS NOT NULL AND primary_phone = $2)
            OR ($3::text IS NOT NULL AND stripe_customer_id = $3)
         ORDER BY updated_at DESC
         LIMIT 1`,
        [
            customer.email || null,
            customer.phone || null,
            customer.stripeCustomerId || null
        ]
    );

    return result.rows[0]?.id || customer.customerId;
}

async function syncPostgresCrmData(pool, record = {}) {
    const intelligence = buildCrmReservationIntelligence(record);
    if (!intelligence.reservationId || !intelligence.customer?.customerId) {
        return;
    }

    const customerId = await resolveCrmCustomerId(pool, intelligence.customer);
    const customer = {
        ...intelligence.customer,
        customerId
    };
    const event = {
        ...buildCrmInteractionSeed(record),
        customerId
    };
    const updatedAt = record.updatedAt || new Date().toISOString();

    await pool.query(
        `INSERT INTO crm_customers (
            id,
            display_name,
            primary_email,
            primary_phone,
            stripe_customer_id,
            city,
            country,
            identity_key,
            consent_data,
            data_quality,
            first_source,
            created_at,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
            display_name = COALESCE(EXCLUDED.display_name, crm_customers.display_name),
            primary_email = COALESCE(EXCLUDED.primary_email, crm_customers.primary_email),
            primary_phone = COALESCE(EXCLUDED.primary_phone, crm_customers.primary_phone),
            stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, crm_customers.stripe_customer_id),
            city = COALESCE(EXCLUDED.city, crm_customers.city),
            country = COALESCE(EXCLUDED.country, crm_customers.country),
            identity_key = COALESCE(EXCLUDED.identity_key, crm_customers.identity_key),
            consent_data = crm_customers.consent_data || EXCLUDED.consent_data,
            data_quality = EXCLUDED.data_quality,
            first_source = COALESCE(crm_customers.first_source, EXCLUDED.first_source),
            updated_at = EXCLUDED.updated_at`,
        [
            customer.customerId,
            customer.name || null,
            customer.email || null,
            customer.phone || null,
            customer.stripeCustomerId || null,
            customer.city || null,
            customer.country || null,
            customer.identityKey || null,
            JSON.stringify(customer.consent || {}),
            JSON.stringify(intelligence.dataQuality || {}),
            intelligence.source || record.source || null,
            record.createdAt || updatedAt,
            updatedAt
        ]
    );

    await pool.query(
        `INSERT INTO crm_reservation_intelligence (
            reservation_id,
            customer_id,
            lead_stage,
            payment_status,
            handover_status,
            reservation_status,
            source,
            preferred_vehicle,
            pickup_area,
            dropoff_area,
            rental_start,
            rental_end,
            total_amount,
            attribution,
            data_quality,
            ai_features,
            created_at,
            updated_at
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16::jsonb, $17, $18
        )
        ON CONFLICT (reservation_id) DO UPDATE SET
            customer_id = EXCLUDED.customer_id,
            lead_stage = EXCLUDED.lead_stage,
            payment_status = EXCLUDED.payment_status,
            handover_status = EXCLUDED.handover_status,
            reservation_status = EXCLUDED.reservation_status,
            source = EXCLUDED.source,
            preferred_vehicle = COALESCE(EXCLUDED.preferred_vehicle, crm_reservation_intelligence.preferred_vehicle),
            pickup_area = COALESCE(EXCLUDED.pickup_area, crm_reservation_intelligence.pickup_area),
            dropoff_area = COALESCE(EXCLUDED.dropoff_area, crm_reservation_intelligence.dropoff_area),
            rental_start = COALESCE(EXCLUDED.rental_start, crm_reservation_intelligence.rental_start),
            rental_end = COALESCE(EXCLUDED.rental_end, crm_reservation_intelligence.rental_end),
            total_amount = COALESCE(EXCLUDED.total_amount, crm_reservation_intelligence.total_amount),
            attribution = crm_reservation_intelligence.attribution || EXCLUDED.attribution,
            data_quality = EXCLUDED.data_quality,
            ai_features = EXCLUDED.ai_features,
            updated_at = EXCLUDED.updated_at`,
        [
            intelligence.reservationId,
            customer.customerId,
            intelligence.leadStage,
            intelligence.paymentStatus,
            intelligence.handoverStatus,
            intelligence.reservationStatus,
            intelligence.source,
            intelligence.preferredVehicle || null,
            intelligence.pickupArea || null,
            intelligence.dropoffArea || null,
            dateOrNull(intelligence.rentalStart),
            dateOrNull(intelligence.rentalEnd),
            numberOrNull(intelligence.totalAmount),
            JSON.stringify(intelligence.attribution || {}),
            JSON.stringify(intelligence.dataQuality || {}),
            JSON.stringify(intelligence.aiFeatures || {}),
            record.createdAt || updatedAt,
            updatedAt
        ]
    );

    await pool.query(
        `INSERT INTO crm_interaction_events (
            id,
            reservation_id,
            customer_id,
            event_type,
            channel,
            direction,
            summary,
            actor,
            outcome,
            metadata,
            occurred_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
        ON CONFLICT (id) DO UPDATE SET
            customer_id = EXCLUDED.customer_id,
            summary = EXCLUDED.summary,
            outcome = EXCLUDED.outcome,
            metadata = crm_interaction_events.metadata || EXCLUDED.metadata`,
        [
            event.id,
            event.reservationId || null,
            event.customerId || null,
            event.eventType,
            event.channel,
            event.direction,
            event.summary,
            event.actor,
            event.outcome,
            JSON.stringify(event.metadata || {}),
            event.occurredAt || updatedAt
        ]
    );
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
        record.schemaVersion || RESERVATION_STORAGE_SCHEMA_VERSION,
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
            schema_version,
            created_at,
            updated_at
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18,
            $19::jsonb, $20::jsonb, $21::jsonb, $22::jsonb,
            $23::jsonb, $24, $25, $26
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
            schema_version = GREATEST(reservations.schema_version, EXCLUDED.schema_version),
            updated_at = EXCLUDED.updated_at
        RETURNING *`,
        values
    );

    const savedRecord = rowToReservationRecord(result.rows[0]);
    try {
        await syncPostgresCrmData(pool, savedRecord);
    } catch (error) {
        console.warn('[CRM DATA] Reservation saved but CRM intelligence sync failed:', {
            reservationId: savedRecord.reservationId,
            message: error.message
        });
    }

    return savedRecord;
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
    let existingRecord = await readReservationRecord(recordKey);
    const paymentIntentId = record.paymentIntentId || record.payment?.paymentIntentId || record.payment?.id || null;
    if (!existingRecord && paymentIntentId && paymentIntentId !== recordKey) {
        existingRecord = await readReservationRecord(paymentIntentId);
    }
    const existingPaymentIntentId = existingRecord?.paymentIntentId || existingRecord?.payment?.paymentIntentId || existingRecord?.payment?.id || null;
    const hasConflictingReservationId = Boolean(
        existingRecord?.reservationId &&
        record.reservationId &&
        record.reservationId !== existingRecord.reservationId &&
        paymentIntentId &&
        paymentIntentId === existingPaymentIntentId
    );
    const incomingRecord = hasConflictingReservationId
        ? {
            ...record,
            reservationId: existingRecord.reservationId,
            reservationData: {
                ...(record.reservationData || {}),
                reservationId: existingRecord.reservationId
            }
        }
        : record;
    const nextRecord = normalizeReservationRecord(incomingRecord, existingRecord);

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

async function getReservationStoreDiagnostics() {
    const mode = getReservationStoreMode();
    const diagnostics = {
        mode,
        databaseConfigured: isDatabaseConfigured(),
        schemaVersion: RESERVATION_STORAGE_SCHEMA_VERSION,
        ok: true
    };

    if (!isDatabaseConfigured()) {
        try {
            ensureReservationDir();
            const records = listLocalReservationRecords({ limit: 5000 });
            return {
                ...diagnostics,
                storagePath: runtimeReservationDir,
                reservationCount: records.length,
                latestUpdatedAt: records[0]?.updatedAt || records[0]?.createdAt || null,
                crmData: buildLocalCrmDataDiagnostics(records)
            };
        } catch (error) {
            return {
                ...diagnostics,
                ok: false,
                error: error.message
            };
        }
    }

    try {
        await ensureDatabaseSchema();
        const pool = getDatabasePool();
        const result = await pool.query(
            `SELECT COUNT(*)::int AS reservation_count, MAX(updated_at) AS latest_updated_at
             FROM reservations`
        );
        const crmResult = await pool.query(
            `SELECT
                (SELECT COUNT(*)::int FROM crm_customers) AS customer_count,
                (SELECT COUNT(*)::int FROM crm_reservation_intelligence) AS reservation_intelligence_count,
                (SELECT COUNT(*)::int FROM crm_interaction_events) AS interaction_event_count,
                (SELECT COUNT(*)::int FROM crm_reservation_intelligence WHERE data_quality ->> 'aiReadyForOps' = 'true') AS ai_ready_reservation_count,
                (SELECT ROUND(AVG((data_quality ->> 'score')::numeric))::int FROM crm_reservation_intelligence WHERE data_quality ? 'score') AS average_data_quality_score`
        );
        const row = result.rows[0] || {};
        const crmRow = crmResult.rows[0] || {};

        return {
            ...diagnostics,
            schemaReady: true,
            reservationCount: row.reservation_count || 0,
            latestUpdatedAt: row.latest_updated_at instanceof Date
                ? row.latest_updated_at.toISOString()
                : row.latest_updated_at || null,
            crmData: {
                schemaVersion: RESERVATION_STORAGE_SCHEMA_VERSION,
                customerCount: crmRow.customer_count || 0,
                reservationIntelligenceCount: crmRow.reservation_intelligence_count || 0,
                interactionEventCount: crmRow.interaction_event_count || 0,
                aiReadyReservationCount: crmRow.ai_ready_reservation_count || 0,
                averageDataQualityScore: crmRow.average_data_quality_score ?? null
            }
        };
    } catch (error) {
        return {
            ...diagnostics,
            ok: false,
            schemaReady: false,
            error: error.message
        };
    }
}

async function closeReservationStore() {
    if (pgPool) {
        await pgPool.end();
    }

    pgPool = null;
    databaseReadyPromise = null;
}

module.exports = {
    RESERVATION_STORAGE_SCHEMA_VERSION,
    buildReservationId,
    closeReservationStore,
    deleteReservationRecord,
    findReservationForLookup,
    getReservationStoreDiagnostics,
    getReservationRecordPath,
    getReservationStoreMode,
    isDatabaseConfigured,
    listLocalReservationRecords,
    listReservationRecords,
    readReservationRecord,
    runtimeReservationDir,
    saveReservationRecord
};
