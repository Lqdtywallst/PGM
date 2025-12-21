// Script de verificación de configuración de Stripe
// Ejecuta: node verificar-stripe.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('🔍 VERIFICACIÓN DE CONFIGURACIÓN STRIPE');
console.log('='.repeat(60) + '\n');

let errors = [];
let warnings = [];
let success = [];

// 1. Verificar archivo .env
console.log('1️⃣ Verificando archivo .env...');
if (fs.existsSync('.env')) {
    success.push('✅ Archivo .env existe');
    
    const envContent = fs.readFileSync('.env', 'utf8');
    
    if (envContent.includes('STRIPE_SECRET_KEY=')) {
        const match = envContent.match(/STRIPE_SECRET_KEY=(.+)/);
        if (match && match[1] && !match[1].includes('tu_clave') && match[1].trim() !== '') {
            if (match[1].startsWith('sk_test_') || match[1].startsWith('sk_live_')) {
                success.push('✅ STRIPE_SECRET_KEY configurada correctamente');
            } else {
                errors.push('❌ STRIPE_SECRET_KEY no tiene formato válido (debe empezar con sk_test_ o sk_live_)');
            }
        } else {
            errors.push('❌ STRIPE_SECRET_KEY no está configurada o tiene valor placeholder');
        }
    } else {
        errors.push('❌ STRIPE_SECRET_KEY no encontrada en .env');
    }
} else {
    errors.push('❌ Archivo .env no existe. Crea uno con STRIPE_SECRET_KEY');
}

// 2. Verificar config.js
console.log('\n2️⃣ Verificando config.js...');
if (fs.existsSync('config.js')) {
    success.push('✅ Archivo config.js existe');
    
    const configContent = fs.readFileSync('config.js', 'utf8');
    
    if (configContent.includes('publishableKey:')) {
        const match = configContent.match(/publishableKey:\s*['"](.+?)['"]/);
        if (match && match[1] && !match[1].includes('...') && match[1].trim() !== '') {
            if (match[1].startsWith('pk_test_') || match[1].startsWith('pk_live_')) {
                success.push('✅ publishableKey configurada correctamente');
            } else {
                errors.push('❌ publishableKey no tiene formato válido (debe empezar con pk_test_ o pk_live_)');
            }
        } else {
            errors.push('❌ publishableKey no está configurada o tiene valor placeholder');
        }
    } else {
        errors.push('❌ publishableKey no encontrada en config.js');
    }
    
    if (configContent.includes('backendUrl:')) {
        const match = configContent.match(/backendUrl:\s*['"](.+?)['"]/);
        if (match && match[1]) {
            success.push(`✅ backendUrl configurada: ${match[1]}`);
        }
    }
} else {
    errors.push('❌ Archivo config.js no existe');
}

// 3. Verificar dependencias
console.log('\n3️⃣ Verificando dependencias...');
if (fs.existsSync('node_modules')) {
    success.push('✅ node_modules existe');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['stripe', 'express', 'cors', 'dotenv', 'nodemailer'];
    
    requiredDeps.forEach(dep => {
        const depPath = path.join('node_modules', dep);
        if (fs.existsSync(depPath)) {
            success.push(`✅ ${dep} instalado`);
        } else {
            errors.push(`❌ ${dep} no está instalado. Ejecuta: npm install`);
        }
    });
} else {
    errors.push('❌ node_modules no existe. Ejecuta: npm install');
}

// 4. Verificar backend
console.log('\n4️⃣ Verificando backend...');
if (fs.existsSync('backend-example.js')) {
    success.push('✅ backend-example.js existe');
} else {
    errors.push('❌ backend-example.js no existe');
}

// Mostrar resultados
console.log('\n' + '='.repeat(60));
console.log('📊 RESULTADOS');
console.log('='.repeat(60) + '\n');

if (success.length > 0) {
    console.log('✅ ÉXITOS:');
    success.forEach(msg => console.log('   ' + msg));
    console.log('');
}

if (warnings.length > 0) {
    console.log('⚠️  ADVERTENCIAS:');
    warnings.forEach(msg => console.log('   ' + msg));
    console.log('');
}

if (errors.length > 0) {
    console.log('❌ ERRORES:');
    errors.forEach(msg => console.log('   ' + msg));
    console.log('');
    console.log('='.repeat(60));
    console.log('❌ CONFIGURACIÓN INCOMPLETA');
    console.log('='.repeat(60));
    console.log('\n📖 Sigue la guía en: CONFIGURAR-STRIPE.md\n');
    process.exit(1);
} else {
    console.log('='.repeat(60));
    console.log('✅ CONFIGURACIÓN COMPLETA');
    console.log('='.repeat(60));
    console.log('\n🚀 Puedes iniciar el servidor con: npm start\n');
    process.exit(0);
}



