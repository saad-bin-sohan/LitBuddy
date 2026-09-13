// backend/controllers/profileController.js
//
// 2026-09 fix: PUT /api/profile (Step 6/6 "Review & Submit" during sign-up)
// returned a 500 "Server error" for any user who reached that step without
// ever setting a location -- i.e. anyone who didn't grant geolocation or
// type a city, which the wizard fully allows (LocationPicker.js's own copy:
// "you can skip this and add it later"). The Render logs showed a raw
// MongoServerError -- "Can't extract geo keys ... Point must only contain
// numeric elements, instead got type missing" -- thrown out of the
// CityIndex upsert a few lines below `User.findByIdAndUpdate` in this same
// function.
//
// Full root-cause writeup (verified against the exact pinned mongoose@9.2.2
// in package-lock.json, not just from memory) lives in the file-level
// comment at the top of backend/models/cityIndexModel.js, which now also
// exports the `buildLocationUpdate` helper this file delegates to instead
// of re-deriving the same "is this a valid point?" decision inline. That
// change also fixes a second, latent issue: the previous code passed a
// bare object (no `$set`) to `findOneAndUpdate`, and relied on
// `setDefaultsOnInsert` to fill in defaults -- which is exactly the
// mechanism that manufactured the broken GeoJSON object in the first
// place. The new version builds one explicit, always-internally-consistent
// `$set` document and never lets a partial/invalid one reach MongoDB.
//
// This function also now treats the CityIndex write as best-effort, the
// same way the Cloudinary photo upload a few lines above already does: if
// it fails for some other reason in the future (a transient DB blip, say),
// the user's core profile fields -- already saved via User.findByIdAndUpdate
// by that point -- are not thrown away along with a misleading "nothing
// was saved" error message.

const User = require('../models/userModel');
const CityIndex = require('../models/cityIndexModel');
const { getLogger, summarizeObject } = require('../utils/logger');
const { uploadBase64ToCloudinary } = require('../utils/cloudinaryUpload');

/**
 * Shapes a lean CityIndex document into the `location` object returned to
 * the profile's own owner (includes lat/lng). Shared by getMyProfile and
 * updateUserProfile so the two response shapes can never drift apart.
 */
function serializeOwnerLocation(ci) {
  if (!ci) return null;
  return {
    lat: ci.lat ?? (ci.location?.coordinates?.[1] ?? null),
    lng: ci.lng ?? (ci.location?.coordinates?.[0] ?? null),
    cityName: ci.cityName || '',
    admin1: ci.admin1 || '',
    countryCode: ci.countryCode || '',
    countryName: ci.countryName || '',
    citySlug: ci.citySlug || '',
    preferredSearchRadiusKm: ci.preferredSearchRadiusKm ?? CityIndex.DEFAULT_RADIUS_KM,
  };
}

/**
 * Shapes a lean CityIndex document into the public-facing `location` object
 * returned from getPublicProfile (no exact coordinates -- city/country only).
 */
function serializePublicLocation(ci) {
  if (!ci) return null;
  return {
    cityName: ci.cityName || '',
    admin1: ci.admin1 || '',
    countryCode: ci.countryCode || '',
    countryName: ci.countryName || '',
    citySlug: ci.citySlug || '',
  };
}

exports.getMyProfile = async (req, res) => {
  const requestLogger = getLogger(req);
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ci = await CityIndex.findOne({ user: user._id }).lean();

    return res.json({ ...user.toObject(), location: serializeOwnerLocation(ci) });
  } catch (err) {
    requestLogger.error(
      {
        err,
        userId: req.user && (req.user.id || req.user._id),
      },
      'profile.get_my_profile_failed'
    );
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUserProfile = async (req, res) => {
  const requestLogger = getLogger(req);
  try {
    const userId = req.user.id;

    // Only allow updating whitelisted fields on User
    const allowed = [
      'name',
      'displayName',
      'bio',
      'quote',
      'profilePhotos',
      'favoriteBooks',
      'favoriteSongs',
      'preferences',
      'answers',
      // Matching-system refresh: gender is now editable (needed for Google
      // sign-ups completing their profile, and for existing users migrating
      // to the wider gender set), plus the new preference fields.
      'gender',
      'genderCustom',
      'interestedIn',
      'ageRangePreference',
      'maxDistanceKm',
    ];
    const updates = {};
    for (const k of allowed) {
      if (k in req.body) updates[k] = req.body[k];
    }

    // Mongoose's per-field min/max validators can't express "min <= max"
    // across two sibling fields, so that cross-field check happens here.
    if (
      updates.ageRangePreference &&
      typeof updates.ageRangePreference.min === 'number' &&
      typeof updates.ageRangePreference.max === 'number' &&
      updates.ageRangePreference.min > updates.ageRangePreference.max
    ) {
      return res.status(400).json({ message: 'ageRangePreference.min cannot be greater than max' });
    }

    requestLogger.info(
      {
        userId,
        changedFields: Object.keys(updates),
        hasLocation: !!req.body.location,
        body: summarizeObject(req.body, { maxDepth: 2 }),
      },
      'profile.update_attempt'
    );

    // Check if required fields for profile setup are already complete in user's profile
    const requiredFields = ['name', 'age', 'gender'];
    const existingUser = await User.findById(userId);
    if (!existingUser) return res.status(404).json({ message: 'User not found' });
    
    const isProfileComplete = requiredFields.every((field) => {
      const value = existingUser[field];
      return value !== undefined && value !== null && value !== '';
    });

    // ✅ Mark setup as complete if required fields are already present
    if (isProfileComplete) {
      updates.hasCompletedSetup = true;
    }

    // Upload any base64 profile photos to Cloudinary, replacing data URLs with
    // HTTPS URLs. Existing HTTPS URLs (already-uploaded photos) pass through.
    if (Array.isArray(updates.profilePhotos) && updates.profilePhotos.length > 0) {
      try {
        updates.profilePhotos = await Promise.all(
          updates.profilePhotos.map((photo) =>
            uploadBase64ToCloudinary(photo, 'litbuddy/profiles')
          )
        );
      } catch (err) {
        // If Cloudinary processing fails entirely, log and continue with originals
        requestLogger.error({ err, userId }, 'profile.cloudinary_batch_upload_failed');
      }
    }

    // Cap photos to 6 entries (matches frontend limit of 6 photos)
    if (Array.isArray(updates.profilePhotos)) {
      updates.profilePhotos = updates.profilePhotos.slice(0, 6);
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    requestLogger.info(
      {
        userId,
        updatedFields: Object.keys(updates),
      },
      'profile.user_updated'
    );

    // Handle the location side-write if the client sent one. This is
    // intentionally best-effort: the User fields above are already saved,
    // so a problem here should never make the whole request look like it
    // failed (mirrors the Cloudinary try/catch above). Under normal
    // operation CityIndex.buildLocationUpdate() never produces anything
    // MongoDB would reject; the try/catch exists for genuinely unexpected
    // failures (e.g. a transient DB error), not as the primary defense.
    let ci = null;
    if (req.body.location) {
      try {
        const existingCi = await CityIndex.findOne({ user: user._id }).lean();
        const locationUpdate = CityIndex.buildLocationUpdate(req.body.location, {
          hasExisting: !!existingCi,
        });

        if (!locationUpdate) {
          ci = existingCi; // nothing to change -- e.g. brand-new user, no coordinates given
          requestLogger.info({ userId }, 'profile.location_skipped_no_coordinates');
        } else {
          ci = await CityIndex.findOneAndUpdate(
            { user: user._id },
            { $set: locationUpdate.set },
            {
              new: true,
              upsert: locationUpdate.upsert,
              setDefaultsOnInsert: true,
              runValidators: true,
              context: 'query',
            }
          ).lean();

          requestLogger.info(
            {
              userId,
              hasValidCoordinates: !!locationUpdate.set.location,
              upserted: locationUpdate.upsert,
              citySlug: locationUpdate.set.citySlug ?? null,
              preferredSearchRadiusKm: locationUpdate.set.preferredSearchRadiusKm ?? null,
            },
            'profile.location_upserted'
          );
        }
      } catch (err) {
        requestLogger.error({ err, userId }, 'profile.location_update_failed');
        // Fall back to whatever location was already on file (possibly
        // null) rather than letting this abort the whole profile save.
        ci = await CityIndex.findOne({ user: user._id }).lean().catch(() => null);
      }
    } else {
      ci = await CityIndex.findOne({ user: user._id }).lean();
    }

    res.json({ ...user.toObject(), location: serializeOwnerLocation(ci) });
  } catch (err) {
    requestLogger.error(
      {
        err,
        userId: req.user && (req.user.id || req.user._id),
      },
      'profile.update_failed'
    );
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPublicProfile = async (req, res) => {
  const requestLogger = getLogger(req);
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      'name displayName bio quote profilePhotos favoriteBooks favoriteSongs preferences answers'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ci = await CityIndex.findOne({ user: user._id }).lean();

    res.json({ ...user.toObject(), location: serializePublicLocation(ci) });
  } catch (err) {
    requestLogger.error(
      {
        err,
        targetUserId: req.params.userId,
      },
      'profile.get_public_profile_failed'
    );
    res.status(500).json({ message: 'Server error' });
  }
};
