#!/usr/bin/env node

/**
 * Environment Setup Checker
 * Validates that all required environment variables are configured
 */

import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

dotenv.config();

console.log('🔍 Checking HTI Daily Briefing Environment Setup...\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

// Check 1: .env file exists
console.log('📄 Checking .env file...');
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  console.log('✅ .env file found\n');
  checks.passed++;
} else {
  console.log('❌ .env file not found!');
  console.log('   Run: cp .env.example .env\n');
  checks.failed++;
}

// Check 2: DATABASE_URL
console.log('🗄️  Checking database configuration...');
if (process.env.DATABASE_URL) {
  if (process.env.DATABASE_URL.startsWith('mysql://')) {
    console.log('✅ DATABASE_URL configured');
    console.log(`   Connection: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);
    checks.passed++;
  } else {
    console.log('⚠️  DATABASE_URL format may be incorrect');
    console.log('   Expected: mysql://user:password@host:port/database\n');
    checks.warnings++;
  }
} else {
  console.log('❌ DATABASE_URL not set');
  console.log('   Add to .env: DATABASE_URL=mysql://user:password@host:port/database\n');
  checks.failed++;
}

// Check 3: JWT_SECRET
console.log('🔐 Checking JWT secret...');
if (process.env.JWT_SECRET) {
  console.log(`✅ JWT_SECRET configured (${process.env.JWT_SECRET.length} characters)\n`);
  checks.passed++;
} else {
  console.log('❌ JWT_SECRET not set');
  console.log('   Add to .env: JWT_SECRET=your-random-secret-key\n');
  checks.failed++;
}

// Check 4: AI API Keys (at least one required)
console.log('🤖 Checking AI API keys...');
const aiKeys = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  XAI_API_KEY: process.env.XAI_API_KEY,
  SONAR_API_KEY: process.env.SONAR_API_KEY,
};

let hasAnyKey = false;
for (const [key, value] of Object.entries(aiKeys)) {
  if (value) {
    console.log(`✅ ${key} configured`);
    hasAnyKey = true;
    checks.passed++;
  } else {
    console.log(`⚠️  ${key} not set`);
    checks.warnings++;
  }
}

if (!hasAnyKey) {
  console.log('\n❌ No AI API keys configured!');
  console.log('   At minimum, set ANTHROPIC_API_KEY for Claude\n');
  checks.failed++;
} else {
  console.log('');
}

// Summary
console.log('━'.repeat(60));
console.log('📊 Environment Check Summary\n');
console.log(`✅ Passed: ${checks.passed}`);
if (checks.warnings > 0) {
  console.log(`⚠️  Warnings: ${checks.warnings}`);
}
if (checks.failed > 0) {
  console.log(`❌ Failed: ${checks.failed}`);
}
console.log('');

if (checks.failed === 0) {
  console.log('🎉 Environment is ready!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. npm run db:push     # Initialize database');
  console.log('  2. node scripts/seed.mjs  # Seed demo data');
  console.log('  3. npm run dev         # Start development server');
  console.log('');
  process.exit(0);
} else {
  console.log('⚠️  Please fix the issues above before continuing.');
  console.log('');
  process.exit(1);
}
