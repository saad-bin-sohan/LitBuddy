// backend/models/cityIndexModel.js
const mongoose = require('mongoose');

const CityIndexSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    countryCode: { type: String, default: '' },
    countryName: { type: String, default: '' },
    admin1: { type: String, default: '' },

    cityName: { type: String, default: '' },
    citySlug: { type: String, default: '', index: true },

    // Human-friendly lat/lng copy
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },

    // GeoJSON point (always [lng, lat])
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },

    // User's preferred search radius (km)
    preferredSearchRadiusKm: { type: Number, default: 50 },
  },
  { timestamps: true }
);

// IMPORTANT: 2dsphere index must be on the GeoJSON field itself, not on "coordinates".
CityIndexSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('CityIndex', CityIndexSchema);
