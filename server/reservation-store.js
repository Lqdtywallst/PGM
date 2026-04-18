const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const runtimeReservationDir = path.resolve(__dirname, '../output/runtime-reservations');

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

function buildReservationId() {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `res_${timestamp}_${crypto.randomBytes(4).toString('hex')}`;
}

function getReservationRecordPath(recordKey) {
    return path.join(runtimeReservationDir, `${normalizeRecordKey(recordKey)}.json`);
}

function readReservationRecord(recordKey) {
    const filePath = getReservationRecordPath(recordKey);

    if (!fs.existsSync(filePath)) {
        return null;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveReservationRecord(record) {
    const recordKey = record.paymentIntentId || record.reservationId;
    if (!recordKey) {
        throw new Error('Reservation record requires paymentIntentId or reservationId');
    }

    const existingRecord = readReservationRecord(recordKey);
    const timestamp = new Date().toISOString();

    const nextRecord = {
        ...existingRecord,
        ...record,
        reservationId: record.reservationId || existingRecord?.reservationId || buildReservationId(),
        createdAt: existingRecord?.createdAt || record.createdAt || timestamp,
        updatedAt: timestamp
    };

    ensureReservationDir();
    fs.writeFileSync(getReservationRecordPath(recordKey), JSON.stringify(nextRecord, null, 2));
    return nextRecord;
}

function deleteReservationRecord(recordKey) {
    const filePath = getReservationRecordPath(recordKey);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

module.exports = {
    buildReservationId,
    deleteReservationRecord,
    getReservationRecordPath,
    readReservationRecord,
    runtimeReservationDir,
    saveReservationRecord
};
