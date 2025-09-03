#!/usr/bin/env node
/**
 * backend/scripts/promoteAdmin.js
 *
 * Usage:
 *  - Promote existing user by email:
 *      node backend/scripts/promoteAdmin.js admin@example.com
 *
 *  - Promote existing user by id:
 *      node backend/scripts/promoteAdmin.js --id 64a1b2c3d4e5f6a7b8c9d0e1
 *
 *  - Create & promote a new admin if email not found:
 *      node backend/scripts/promoteAdmin.js admin@example.com --create --name "Admin Name" --password "StrongP@ss1" --age 30 --gender Other
 *
 * Notes:
 *  - This script reads backend/.env (so make sure MONGO_URI or similar is set there).
 *  - The script sets both isAdmin = true and role = 'admin'.
 *  - It uses the app's User model (so pre-save hooks like password hashing remain intact).
 *  - Remove or restrict this script after use.
 */

const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Resolve the app model relative to this script (backend/models/userModel.js)
const User = require('../models/userModel');

const argv = process.argv.slice(2);

function usageAndExit(msg) {
  if (msg) console.error(msg);
  console.error('\nUsage: ');
  console.error('  node backend/scripts/promoteAdmin.js <email> [--create] [--name "Full Name"] [--password "pass"] [--age 30] [--gender Other]');
  console.error('  node backend/scripts/promoteAdmin.js --id <userId> [--force]');
  process.exit(msg ? 1 : 0);
}

if (argv.length === 0) usageAndExit('Error: missing arguments');

let email = null;
let userId = null;
let create = false;
let name = null;
let password = null;
let age = 30;
let gender = 'Other';
let force = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--create') {
    create = true;
  } else if (a === '--id') {
    userId = argv[i + 1];
    i++;
  } else if (a === '--name') {
    name = argv[i + 1];
    i++;
  } else if (a === '--password') {
    password = argv[i + 1];
    i++;
  } else if (a === '--age') {
    age = parseInt(argv[i + 1], 10) || age;
    i++;
  } else if (a === '--gender') {
    gender = argv[i + 1] || gender;
    i++;
  } else if (a === '--force') {
    force = true;
  } else if (!a.startsWith('--') && !email && !userId) {
    if (/@/.test(a)) email = a;
    else if (/^[0-9a-fA-F]{24}$/.test(a)) userId = a;
    else email = a;
  } else {
    usageAndExit(`Unknown argument: ${a}`);
  }
}

if (!email && !userId) usageAndExit('Provide an email or --id');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || process.env.DB_URI || 'mongodb://localhost:27017/litbuddy';

async function connectDB() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

function genPassword(len = 12) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

async function promoteById(id) {
  const u = await User.findById(id);
  if (!u) {
    console.error('User not found for id:', id);
    process.exit(1);
  }
  if (u.role === 'admin' || u.isAdmin) {
    console.log('User already admin:', u.email || u._id.toString());
    return u;
  }
  u.isAdmin = true;
  u.role = 'admin';
  await u.save();
  return u;
}

async function promoteByEmail(em) {
  let u = await User.findOne({ email: em });
  if (u) {
    if (u.role === 'admin' || u.isAdmin) {
      console.log('User already admin:', em);
      return u;
    }
    u.isAdmin = true;
    u.role = 'admin';
    await u.save();
    return u;
  }

  if (!create) {
    console.error(`User with email ${em} not found. Use --create to create and promote.`);
    process.exit(1);
  }

  const pwd = password || genPassword(12);
  const nm = name || em.split('@')[0];
  const userObj = {
    name: nm,
    email: em,
    password: pwd,
    age: Math.max(18, age || 30),
    gender: ['Male', 'Female', 'Other'].includes(gender) ? gender : 'Other',
    role: 'admin',
    isAdmin: true,
  };

  u = new User(userObj);
  await u.save();
  u._plaintextPassword = pwd;
  return u;
}

(async () => {
  try {
    console.log('Connecting to DB:', MONGO_URI);
    await connectDB();
    console.log('Connected.');

    let user;
    if (userId) {
      user = await promoteById(userId);
    } else {
      user = await promoteByEmail(email);
    }

    console.log('--- SUCCESS ---');
    console.log(`User id: ${user._id}`);
    if (user.email) console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`isAdmin: ${user.isAdmin}`);
    if (user._plaintextPassword) {
      console.log('Temporary password for newly created admin:', user._plaintextPassword);
      console.log('Please ask the user to change this password on first login.');
    }
    console.log('IMPORTANT: Remove this script or restrict access after use.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    console.error(err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
})();
