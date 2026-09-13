// backend/tests/cityIndexLocation.test.js
//
// Regression coverage for the 2026-09 sign-up bug: PUT /api/profile
// returned a 500 ("Server error") at Step 6/6 for any user who reached
// Review & Submit without ever setting a location. Root cause: an
// `upsert: true` + `setDefaultsOnInsert: true` findOneAndUpdate() on
// CityIndex let Mongoose's implicit "arrays default to []" behaviour
// manufacture `location: { type: 'Point', coordinates: [] }` on insert,
// which MongoDB's 2dsphere index then rejected with:
//   MongoServerError: Plan executor error during findAndModify :: caused
//   by :: Can't extract geo keys ... Point must only contain numeric
//   elements, instead got type missing
//
// Full writeup: see the file-level comments in
// backend/models/cityIndexModel.js and backend/controllers/
// profileController.js.
//
// Pure schema/logic tests -- no DB connection required, matching the
// existing bookModelIndexes.test.js / userModel.uniqueFields.test.js
// convention in this directory.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const CityIndex = require('../models/cityIndexModel');

function buildDoc(overrides = {}) {
  return new CityIndex({
    user: new mongoose.Types.ObjectId(),
    ...overrides,
  });
}

test('location.coordinates has no implicit default (the actual root cause)', () => {
  const path = CityIndex.schema.path('location.coordinates');
  assert.equal(path.getDefault(null, true), undefined);
});

test('location.type has no lone default either (belt-and-suspenders)', () => {
  const path = CityIndex.schema.path('location.type');
  assert.equal(path.getDefault(null, true), undefined);
});

test('the 2dsphere index on location is still declared', () => {
  const indexes = CityIndex.schema.indexes();
  const hasGeoIndex = indexes.some(([spec]) => spec.location === '2dsphere');
  assert.equal(hasGeoIndex, true);
});

test('a document with valid coordinates validates cleanly', async () => {
  const doc = buildDoc({
    lat: 23.7724,
    lng: 90.4247,
    location: { type: 'Point', coordinates: [90.4247, 23.7724] },
  });
  await assert.doesNotReject(() => doc.validate());
});

test('an empty coordinates array is now a clean ValidationError, not a raw Mongo crash', async () => {
  const doc = buildDoc({
    lat: 0,
    lng: 0,
    location: { type: 'Point', coordinates: [] },
  });
  await assert.rejects(
    () => doc.validate(),
    (err) => {
      assert.equal(err.name, 'ValidationError');
      assert.ok(err.errors['location.coordinates'], 'expected an error keyed at location.coordinates');
      return true;
    }
  );
});

test('coordinates outside valid lng/lat ranges are rejected by the custom validator', async () => {
  const doc = buildDoc({
    lat: 45,
    lng: 45,
    location: { type: 'Point', coordinates: [999, 999] },
  });
  await assert.rejects(() => doc.validate());
});

test('a location object with no coordinates key at all is also rejected (belt-and-suspenders)', async () => {
  const doc = buildDoc({ lat: 1, lng: 1, location: { type: 'Point' } });
  await assert.rejects(() => doc.validate());
});

test('buildLocationUpdate: brand-new user + no coordinates -> returns null (the exact crash payload)', () => {
  // This is the literal request body captured in render_logs.txt for the
  // reported bug.
  const result = CityIndex.buildLocationUpdate(
    {
      lat: null,
      lng: null,
      cityName: '',
      admin1: '',
      countryCode: '',
      countryName: '',
      preferredSearchRadiusKm: 25,
    },
    { hasExisting: false }
  );
  assert.equal(result, null);
});

test('buildLocationUpdate: an empty location object behaves the same as "no coordinates"', () => {
  const result = CityIndex.buildLocationUpdate({}, { hasExisting: false });
  assert.equal(result, null);
});

test('buildLocationUpdate: valid coordinates for a brand-new user -> upsert with a complete location', () => {
  const result = CityIndex.buildLocationUpdate(
    {
      lat: 23.7724,
      lng: 90.4247,
      cityName: 'Dhaka',
      countryCode: 'bd',
      countryName: 'Bangladesh',
      preferredSearchRadiusKm: 10,
    },
    { hasExisting: false }
  );
  assert.equal(result.upsert, true);
  assert.deepEqual(result.set.location, { type: 'Point', coordinates: [90.4247, 23.7724] });
  assert.equal(result.set.lat, 23.7724);
  assert.equal(result.set.lng, 90.4247);
  assert.equal(result.set.countryCode, 'BD'); // uppercased
  assert.equal(result.set.citySlug, 'dhaka-bd');
  assert.equal(result.set.preferredSearchRadiusKm, 10);
});

test('buildLocationUpdate: invalid coordinates but an existing document -> patches descriptive fields only', () => {
  const result = CityIndex.buildLocationUpdate(
    {
      lat: null,
      lng: null,
      cityName: 'Chattogram',
      countryCode: 'BD',
      countryName: 'Bangladesh',
      preferredSearchRadiusKm: 30,
    },
    { hasExisting: true }
  );
  assert.equal(result.upsert, false);
  assert.equal(result.set.cityName, 'Chattogram');
  assert.equal(result.set.citySlug, 'chattogram-bd');
  assert.equal(result.set.preferredSearchRadiusKm, 30);
  // The whole point of this branch: never touch previously-saved coordinates.
  assert.equal('lat' in result.set, false);
  assert.equal('lng' in result.set, false);
  assert.equal('location' in result.set, false);
});

test('buildLocationUpdate: radius is clamped to the schema-declared range', () => {
  const tooHigh = CityIndex.buildLocationUpdate(
    { lat: 1, lng: 1, preferredSearchRadiusKm: 999999 },
    { hasExisting: false }
  );
  assert.equal(tooHigh.set.preferredSearchRadiusKm, 500);

  const tooLow = CityIndex.buildLocationUpdate(
    { lat: 1, lng: 1, preferredSearchRadiusKm: -5 },
    { hasExisting: false }
  );
  assert.equal(tooLow.set.preferredSearchRadiusKm, 1);

  const notANumber = CityIndex.buildLocationUpdate(
    { lat: 1, lng: 1, preferredSearchRadiusKm: 'lots' },
    { hasExisting: false }
  );
  assert.equal(notANumber.set.preferredSearchRadiusKm, 25);
});

test('buildLocationUpdate: lat/lng out of range count as invalid, same as missing', () => {
  const result = CityIndex.buildLocationUpdate(
    { lat: 200, lng: 90.4247, cityName: 'Nowhere' },
    { hasExisting: false }
  );
  assert.equal(result, null);
});

test('preferredSearchRadiusKm defaults to 25 (matches every other default in the app), not the old 50', () => {
  const path = CityIndex.schema.path('preferredSearchRadiusKm');
  assert.equal(path.getDefault(null, true), 25);
});

test('sanitizeRadius is exposed for reuse and behaves consistently on its own', () => {
  assert.equal(CityIndex.sanitizeRadius(10), 10);
  assert.equal(CityIndex.sanitizeRadius(0), 1);
  assert.equal(CityIndex.sanitizeRadius(10000), 500);
  assert.equal(CityIndex.sanitizeRadius('not-a-number'), 25);
  assert.equal(CityIndex.sanitizeRadius('not-a-number', 42), 42);
});
