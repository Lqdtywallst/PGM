#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const nodeBin = process.execPath;
const playwrightCli = path.join(repoRoot, 'node_modules', '@playwright', 'test', 'cli.js');

const flags = new Set(process.argv.slice(2));
const listOnly = flags.has('--list');
const skipAgent = flags.has('--skip-agent');

function playwright(args) {
    return {
        command: nodeBin,
        args: [playwrightCli, 'test', ...args]
    };
}

function node(args) {
    return {
        command: nodeBin,
        args
    };
}

const steps = [
    {
        label: 'Structure and route contract sanity',
        ...node(['scripts/run-structure-audit.js'])
    },
    {
        label: 'Business contracts: CRM availability, reservation lookup, journey rules, functional auditor rules',
        ...node([
            '--test',
            'tests/unit/availability-core.test.js',
            'tests/unit/reservation-lookup-security.test.js',
            'tests/unit/customer-journey-contract.test.js',
            'tests/unit/functional-audit-core.test.js'
        ])
    },
    {
        label: 'Home rental entry points: availability search, category filters, exact vehicle landings',
        ...playwright([
            'tests/e2e/public-site.spec.js',
            '--grep',
            'home date search applies CRM availability|home category cards|home featured car cards',
            '--project=desktop-chromium',
            '--project=mobile-chromium'
        ])
    },
    {
        label: 'Fleet discovery and full booking journeys',
        ...playwright([
            'tests/e2e/customer-journeys.spec.js',
            '--grep',
            'Cars Types card|guest compares Ferrari and Mercedes|guest completes a reservation',
            '--project=desktop-chromium'
        ])
    },
    {
        label: 'Services to reserve funnels',
        ...playwright([
            'tests/e2e/services-to-reserve-funnels.spec.js',
            '--project=desktop-chromium'
        ])
    },
    {
        label: 'Service deep links without parallel artifact races',
        ...playwright([
            'tests/e2e/services-deep-links.spec.js',
            '--project=desktop-chromium',
            '--workers=1'
        ])
    },
    {
        label: 'Reserve, recovery, API failures, mobile friction, adversarial double-submit, lookup',
        ...playwright([
            'tests/e2e/audit-functional-surfaces.spec.js',
            'tests/e2e/reserve-negative.spec.js',
            'tests/e2e/reserve-persistence.spec.js',
            'tests/e2e/functional-resilience.spec.js',
            'tests/e2e/api-failure-states.spec.js',
            'tests/e2e/complete-flow-error-recovery.spec.js',
            'tests/e2e/mobile-friction-points.spec.js',
            'tests/e2e/adversarial-functional-audit.spec.js',
            'tests/e2e/switch-car-mid-flow.spec.js',
            'tests/e2e/reservation-lookup.spec.js',
            '--project=desktop-chromium',
            '--project=mobile-chromium'
        ])
    }
];

if (!skipAgent) {
    steps.push({
        label: 'Functional agent: realistic customer clicks on critical tabs and viewports',
        ...node([
            'scripts/run-functional-agent.js',
            '--route',
            '/',
            '--route',
            '/fleet.html',
            '--route',
            '/app/reserve/page.html',
            '--route',
            '/reservation-lookup.html',
            '--route',
            '/contact.html',
            '--viewport',
            'laptop',
            '--viewport',
            'mobile-modern'
        ])
    });
}

function quoteArg(arg) {
    return /\s/.test(arg) ? `"${arg}"` : arg;
}

function renderCommand(step) {
    return [step.command, ...step.args].map(quoteArg).join(' ');
}

function formatDuration(startedAt) {
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

if (listOnly) {
    console.log('Production functional rental gate steps:');
    steps.forEach((step, index) => {
        console.log(`${index + 1}. ${step.label}`);
        console.log(`   ${renderCommand(step)}`);
    });
    process.exit(0);
}

console.log('Running production functional rental gate...');
console.log('This gate is intentionally business-focused: discovery, availability, exact car handoff, reserve, recovery, contact, and lookup.');

for (const [index, step] of steps.entries()) {
    const startedAt = Date.now();
    console.log('');
    console.log(`[${index + 1}/${steps.length}] ${step.label}`);
    console.log(`$ ${renderCommand(step)}`);

    const result = spawnSync(step.command, step.args, {
        cwd: repoRoot,
        env: process.env,
        stdio: 'inherit'
    });

    if (result.error) {
        console.error(`Gate failed before running command: ${result.error.message}`);
        process.exit(1);
    }

    if (result.status !== 0) {
        const reason = result.signal ? `signal ${result.signal}` : `exit code ${result.status}`;
        console.error(`Gate failed at step ${index + 1}: ${step.label} (${reason})`);
        process.exit(result.status || 1);
    }

    console.log(`Step passed in ${formatDuration(startedAt)}.`);
}

console.log('');
console.log('Production functional rental gate passed.');
