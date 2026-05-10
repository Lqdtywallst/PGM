#!/usr/bin/env node

const { hashAdminPassword } = require('../../server/admin/admin-auth');

function readPasswordFromArgs() {
    const directValue = process.argv[2];
    if (directValue) {
        return directValue;
    }

    if (process.env.ADMIN_PASSWORD) {
        return process.env.ADMIN_PASSWORD;
    }

    if (!process.stdin.isTTY) {
        const input = require('fs').readFileSync(0, 'utf8').trim();
        if (input) {
            return input;
        }
    }

    return '';
}

const password = readPasswordFromArgs();

if (!password) {
    console.error('Usage: npm run admin:hash-password -- "your-strong-password"');
    console.error('Or set ADMIN_PASSWORD and run: npm run admin:hash-password');
    process.exit(1);
}

console.log(hashAdminPassword(password));
