// backend/models/cityIndexModel.js
//
// 2026-09 fix: profile setup crashed with a 500 ("Server error") at Step
// 6/6 for any user who reached Review & Submit without ever setting a
// location -- i.e. the common case of a user who never granted geolocation
// or typed a city. Root cause, in full:
//
//   1. profileController.js built an `upsertDoc` that (correctly) left out
//      `lat`/`lng`/`location` when coordinates were invalid, then called
//      `CityIndex.findOneAndUpdate({user}, upsertDoc, { upsert: true,
//      setDefaultsOnInsert: true })`.
//   2. Because `location.coordinates` was declared as `{ type: [Number],
//      required: true }` with no explicit `default`, Mongoose's SchemaArray
//      silently attaches an implicit `default: () => []` to every array
//      path unless `default: undefined` is set explicitly (this is a
//      long-standing, well-documented Mongoose behaviour -- see
//      mongoosejs.com/docs/faq.html#default-arrays). `location.type` had
//      its own explicit `default: 'Point'`.
//   3. `setDefaultsOnInsert: true` told Mongoose to apply exactly those
//      schema defaults to any path missing from the update, on insert.
//      Since this was a brand-new user (no prior CityIndex document), the
//      upsert took the insert branch and Mongoose added
//      `$setOnInsert: { 'location.type': 'Point', 'location.coordinates':
//      [] }` -- reconstructed and confirmed against the exact pinned
//      mongoose@9.2.2 in package-lock.json, see
//      helpers/setDefaultsOnInsert.js + schema/array.js.
//   4. MongoDB then tried to build the `2dsphere` index entry for the new
//      document and rejected the write outright:
//        MongoServerError: Plan executor error during findAndModify ::
//        caused by :: Can't extract geo keys ... Point must only contain
//        numeric elements, instead got type missing
//      -- because an empty array has no numeric elements at positions 0/1.
//   5. `runValidators` was never passed to that `findOneAndUpdate`, so
//      Mongoose's own `required: true` on `lat`/`lng`/`coordinates` never
//      got a chance to catch this before it reached MongoDB as a raw,
//      unfriendly server error.
//
// This is fixed at two layers, deliberately redundant (defense in depth):
//
//   A. SCHEMA (this file): `location.type` and `location.coordinates` both
//      get `default: undefined` so Mongoose never invents a partial/empty
//      GeoJSON object out of thin air again, for *any* future caller of
//      this model -- not just the one call site that happened to trigger
//      this bug. A custom validator on `coordinates` also now rejects
//      anything that isn't exactly two finite, in-range numbers, so if a
//      future code path *does* try to write bad geo data, it gets a clean,
//      catchable Mongoose `ValidationError` instead of a raw
//      `MongoServerError` -- but only once callers also pass
//      `runValidators: true` (profileController.js now does).
//
//   B. APPLICATION LOGIC (this file's `buildLocationUpdate`, consumed by
//      profileController.js): a CityIndex document, by this schema's own
//      design, represents "a fully specified point" -- `lat`, `lng`, and
//      `location.coordinates` are all `required: true`. So the only two
//      valid states are "no document" (no location set yet) and "a
//      complete, valid document". `buildLocationUpdate` enforces exactly
//      that: it never asks Mongo to create a document with partial/invalid
//      coordinates, and it never overwrites a previously-saved valid point
//      just because a later request happened not to include a fresh one
//      (e.g. saving other profile fields without touching location).
//      Pulling this into a small, pure, exported function (rather than
//      inlining it in the controller) means it can be unit-tested directly
//      without a database connection -- see
//      backend/tests/cityIndexLocation.test.js -- matching the
//      `User.stripBlankUniqueFields` convention already used in
//      userModel.js for the same reason.
//
// See backend/controllers/profileController.js for the call site and
// backend/controllers/matchController.js for how a missing CityIndex
// document is already treated as a normal, expected "no location on file"
// state elsewhere in the app (getDailySuggestions falls back to
// non-distance-filtered results rather than erroring).

const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 500;
const DEFAULT_RADIUS_KM = 25; // matches the default used everywhere else in
// the app (LocationPicker.js, ProfileWizard.js, profileController.js
// response-shaping) -- this schema previously defaulted to 50, which was
// an inconsistency that could only ever surface via setDefaultsOnInsert
// (every real request already sends an explicit preferredSearchRadiusKm).

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function isValidPointCoordinates(v) {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    isFiniteNumber(v[0]) &&
    isFiniteNumber(v[1]) &&
    v[0] >= -180 &&
    v[0] <= 180 &&
    v[1] >= -90 &&
    v[1] <= 90
  );
}

/**
 * Clamps an arbitrary input to a valid search radius, falling back to
 * DEFAULT_RADIUS_KM for anything that isn't a finite number.
 */
function sanitizeRadius(val, def = DEFAULT_RADIUS_KM) {
  const n = Number(val);
  if (!Number.isFinite(n)) return def;
  return Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, n));
}

const CityIndexSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    countryCode: { type: String, default: '' },
    countryName: { type: String, default: '' },
    admin1: { type: String, default: '' },

    cityName: { type: String, default: '' },
    citySlug: { type: String, default: '', index: true },

    // Human-friendly lat/lng copy
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },

    // GeoJSON point (always [lng, lat]).
    //
    // Both `type` and `coordinates` deliberately have `default: undefined`
    // (rather than no `default` key at all) to opt OUT of Mongoose's
    // automatic "arrays default to []" behaviour on `coordinates`, and to
    // stop `type` from being defaulted to 'Point' on its own. Without this,
    // any future `findOneAndUpdate(..., { upsert: true, setDefaultsOnInsert:
    // true })` call that doesn't explicitly supply a *complete* `location`
    // would silently manufacture a malformed GeoJSON object again -- see
    // the file-level comment above for the full incident writeup. A
    // document either has a complete, valid `location` or none at all;
    // there is no legitimate partial state.
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: undefined,
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        default: undefined,
        validate: {
          validator: isValidPointCoordinates,
          message: 'location.coordinates must be exactly [lng, lat] finite numbers within valid ranges',
        },
      },
    },

    // User's preferred search radius (km)
    preferredSearchRadiusKm: {
      type: Number,
      default: DEFAULT_RADIUS_KM,
      min: MIN_RADIUS_KM,
      max: MAX_RADIUS_KM,
    },
  },
  { timestamps: true }
);

// IMPORTANT: 2dsphere index must be on the GeoJSON field itself, not on "coordinates".
CityIndexSchema.index({ location: '2dsphere' });

/**
 * Decides what (if anything) should be written to a user's CityIndex
 * document from the raw `location` object of a profile-update request.
 *
 * Deliberately pure/synchronous -- no DB access -- so it fully captures the
 * "what should happen" decision in one place that both the controller and
 * a unit test can call directly, instead of that logic being re-derived
 * (and risking drifting out of sync) wherever it's needed.
 *
 * @param {Object} rawLocation - `req.body.location` as sent by the client.
 *   All keys optional: { lat, lng, cityName, admin1, countryCode,
 *   countryName, preferredSearchRadiusKm }.
 * @param {Object} ctx
 * @param {Boolean} ctx.hasExisting - whether a CityIndex document already
 *   exists for this user.
 * @return {Object|null}
 *   `null` -- nothing should be written. Coordinates are missing/invalid
 *     and there's no existing document, so there is nothing valid to
 *     persist (creating one would violate this schema's own invariant
 *     that a CityIndex document always represents a real point).
 *   `{ upsert: true, set: {...} }` -- valid coordinates were provided:
 *     create-or-fully-replace the geo + descriptive fields together, as
 *     one atomic, always-internally-consistent `$set`.
 *   `{ upsert: false, set: {...} }` -- coordinates are missing/invalid,
 *     but a document already exists: patch descriptive fields only.
 *     `lat`/`lng`/`location` are deliberately left out of `set` so a
 *     request that simply didn't include fresh coordinates (as opposed to
 *     one that explicitly changed them) can never silently erase a
 *     previously-saved point.
 */
function buildLocationUpdate(rawLocation, ctx = {}) {
  const hasExisting = !!ctx.hasExisting;
  const {
    lat,
    lng,
    cityName,
    admin1,
    countryCode,
    countryName,
    preferredSearchRadiusKm,
  } = rawLocation || {};

  const validLatLng =
    isFiniteNumber(lat) && isFiniteNumber(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  const citySlug =
    cityName && countryCode ? `${slugify(cityName)}-${String(countryCode).toLowerCase()}` : undefined;

  const descriptiveFields = {
    cityName: cityName || '',
    admin1: admin1 || '',
    countryCode: (countryCode || '').toUpperCase(),
    countryName: countryName || '',
    citySlug,
  };

  if (!validLatLng && !hasExisting) {
    return null;
  }

  if (!validLatLng) {
    const set = { ...descriptiveFields };
    if (preferredSearchRadiusKm != null) {
      set.preferredSearchRadiusKm = sanitizeRadius(preferredSearchRadiusKm);
    }
    return { upsert: false, set };
  }

  return {
    upsert: true,
    set: {
      ...descriptiveFields,
      lat,
      lng,
      location: { type: 'Point', coordinates: [lng, lat] },
      preferredSearchRadiusKm: sanitizeRadius(
        preferredSearchRadiusKm != null ? preferredSearchRadiusKm : DEFAULT_RADIUS_KM
      ),
    },
  };
}

const CityIndex = mongoose.model('CityIndex', CityIndexSchema);

// Exposed as statics purely so backend/tests/cityIndexLocation.test.js can
// exercise the real logic directly, matching the
// User.stripBlankUniqueFields / User.undefinedIfBlank convention in
// userModel.js.
CityIndex.buildLocationUpdate = buildLocationUpdate;
CityIndex.sanitizeRadius = sanitizeRadius;
CityIndex.isValidPointCoordinates = isValidPointCoordinates;
CityIndex.DEFAULT_RADIUS_KM = DEFAULT_RADIUS_KM;

module.exports = CityIndex;
