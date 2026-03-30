// Stripe configuration verification script
// Run: node server/verificar-stripe.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function readProjectFile(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

console.log('\n' + '='.repeat(60));
console.log('STRIPE CONFIGURATION CHECK');
console.log('='.repeat(60) + '\n');

const errors = [];
const warnings = [];
const success = [];

console.log('1. Checking .env file...');
if (fs.existsSync(path.join(projectRoot, '.env'))) {
    success.push('.env file exists');

    const envContent = readProjectFile('.env');
    if (envContent.includes('STRIPE_SECRET_KEY=')) {
        const match = envContent.match(/STRIPE_SECRET_KEY=(.+)/);
        if (match && match[1] && !match[1].includes('tu_clave') && match[1].trim() !== '') {
            if (match[1].startsWith('sk_test_') || match[1].startsWith('sk_live_')) {
                success.push('STRIPE_SECRET_KEY configured correctly');
            } else {
                errors.push('STRIPE_SECRET_KEY has invalid format (must start with sk_test_ or sk_live_)');
            }
        } else {
            errors.push('STRIPE_SECRET_KEY is not configured or still contains a placeholder value');
        }
    } else {
        errors.push('STRIPE_SECRET_KEY not found in .env');
    }
} else {
    errors.push('.env file does not exist. Create one with STRIPE_SECRET_KEY');
}

console.log('\n2. Checking site/config.js...');
if (fs.existsSync(path.join(projectRoot, 'site/config.js'))) {
    success.push('site/config.js file exists');

    const configContent = readProjectFile('site/config.js');
    if (configContent.includes('publishableKey:')) {
        const match = configContent.match(/publishableKey:\s*['"](.+?)['"]/);
        if (match && match[1] && !match[1].includes('...') && match[1].trim() !== '') {
            if (match[1].startsWith('pk_test_') || match[1].startsWith('pk_live_')) {
                success.push('publishableKey configured correctly');
            } else {
                errors.push('publishableKey has invalid format (must start with pk_test_ or pk_live_)');
            }
        } else {
            errors.push('publishableKey is not configured or still contains a placeholder value');
        }
    } else {
        errors.push('publishableKey not found in site/config.js');
    }

    if (configContent.includes('backendUrl:')) {
        const match = configContent.match(/backendUrl:\s*['"](.+?)['"]/);
        if (match && match[1]) {
            success.push(`backendUrl configured: ${match[1]}`);
        } else {
            warnings.push('backendUrl exists but could not be parsed');
        }
    } else {
        warnings.push('backendUrl not found in site/config.js');
    }
} else {
    errors.push('site/config.js file does not exist');
}

console.log('\n3. Checking dependencies...');
if (fs.existsSync(path.join(projectRoot, 'node_modules'))) {
    success.push('node_modules exists');

    const requiredDeps = ['stripe', 'express', 'cors', 'dotenv', 'nodemailer'];
    requiredDeps.forEach((dep) => {
        const depPath = path.join(projectRoot, 'node_modules', dep);
        if (fs.existsSync(depPath)) {
            success.push(`${dep} installed`);
        } else {
            errors.push(`${dep} is not installed. Run: npm install`);
        }
    });
} else {
    errors.push('node_modules does not exist. Run: npm install');
}

console.log('\n4. Checking backend...');
if (fs.existsSync(path.join(projectRoot, 'server/backend-example.js'))) {
    success.push('server/backend-example.js exists');
} else {
    errors.push('server/backend-example.js does not exist');
}

console.log('\n' + '='.repeat(60));
console.log('RESULTS');
console.log('='.repeat(60) + '\n');

if (success.length > 0) {
    console.log('SUCCESS:');
    success.forEach((msg) => console.log('  - ' + msg));
    console.log('');
}

if (warnings.length > 0) {
    console.log('WARNINGS:');
    warnings.forEach((msg) => console.log('  - ' + msg));
    console.log('');
}

if (errors.length > 0) {
    console.log('ERRORS:');
    errors.forEach((msg) => console.log('  - ' + msg));
    console.log('');
    console.log('='.repeat(60));
    console.log('CONFIGURATION INCOMPLETE');
    console.log('='.repeat(60));
    console.log('\nReview .env.example, site/config.js, and server/backend-example.js before retrying.\n');
    process.exit(1);
}

console.log('='.repeat(60));
console.log('CONFIGURATION COMPLETE');
console.log('='.repeat(60));
console.log('\nYou can start the server with: npm start\n');
process.exit(0);
