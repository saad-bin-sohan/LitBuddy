// backend/controllers/profileController.js

const User = require('../models/userModel');
const CityIndex = require('../models/cityIndexModel');
const slugify = require('../utils/slugify');

function sanitizeRadius(val, def = 25) {
  const n = Number(val);
  if (!Number.isFinite(n)) return def;
  return Math.max(1, Math.min(500, n));
}

exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ci = await CityIndex.findOne({ user: user._id }).lean();

    const location = ci
      ? {
          lat: ci.lat ?? (ci.location?.coordinates?.[1] ?? null),
          lng: ci.lng ?? (ci.location?.coordinates?.[0] ?? null),
          cityName: ci.cityName || '',
          admin1: ci.admin1 || '',
          countryCode: ci.countryCode || '',
          countryName: ci.countryName || '',
          citySlug: ci.citySlug || '',
          preferredSearchRadiusKm: ci.preferredSearchRadiusKm ?? 25,
        }
      : null;

    return res.json({ ...user.toObject(), location });
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// backend/controllers/profileController.js

exports.updateUserProfile = async (req, res) => {
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
    ];
    const updates = {};
    for (const k of allowed) {
      if (k in req.body) updates[k] = req.body[k];
    }

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

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Handle location upsert if present
    if (req.body.location) {
      const {
        lat,
        lng,
        cityName,
        admin1,
        countryCode,
        countryName,
        preferredSearchRadiusKm,
      } = req.body.location || {};

      const validLatLng =
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180;

      const citySlug =
        cityName && countryCode
          ? `${slugify(cityName)}-${String(countryCode).toLowerCase()}`
          : undefined;

      const upsertDoc = {
        user: user._id,
        cityName: cityName || '',
        admin1: admin1 || '',
        countryCode: (countryCode || '').toUpperCase(),
        countryName: countryName || '',
        citySlug,
      };

      if (validLatLng) {
        upsertDoc.lat = lat;
        upsertDoc.lng = lng;
        upsertDoc.location = { type: 'Point', coordinates: [lng, lat] };
      }

      if (preferredSearchRadiusKm != null) {
        upsertDoc.preferredSearchRadiusKm = sanitizeRadius(
          preferredSearchRadiusKm
        );
      }

      await CityIndex.findOneAndUpdate(
        { user: user._id },
        upsertDoc,
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    }

    const ci = await CityIndex.findOne({ user: user._id }).lean();
    const location = ci
      ? {
          lat: ci.lat ?? (ci.location?.coordinates?.[1] ?? null),
          lng: ci.lng ?? (ci.location?.coordinates?.[0] ?? null),
          cityName: ci.cityName || '',
          admin1: ci.admin1 || '',
          countryCode: ci.countryCode || '',
          countryName: ci.countryName || '',
          citySlug: ci.citySlug || '',
          preferredSearchRadiusKm: ci.preferredSearchRadiusKm ?? 25,
        }
      : null;

    res.json({ ...user.toObject(), location });
  } catch (err) {
    console.error('updateUserProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      'name displayName bio quote profilePhotos favoriteBooks favoriteSongs preferences answers'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ci = await CityIndex.findOne({ user: user._id }).lean();
    const locationPublic = ci
      ? {
          cityName: ci.cityName || '',
          admin1: ci.admin1 || '',
          countryCode: ci.countryCode || '',
          countryName: ci.countryName || '',
          citySlug: ci.citySlug || '',
        }
      : null;

    res.json({ ...user.toObject(), location: locationPublic });
  } catch (err) {
    console.error('getPublicProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
