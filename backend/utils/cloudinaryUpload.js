// backend/utils/cloudinaryUpload.js
//
// Wraps the Cloudinary Node.js SDK for uploading base64 images.
// Requires three env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
// CLOUDINARY_API_SECRET.
//
// If the env vars are not set (local dev without Cloudinary), the function
// returns the original base64 string unchanged so development still works.

const { v2: cloudinary } = require('cloudinary');
const { logger } = require('./logger');

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (cloud && key && secret) {
    cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret });
    configured = true;
  }
}

/**
 * uploadBase64ToCloudinary(dataUrl, folder)
 *
 * Uploads a base64 data URL to Cloudinary and returns the secure HTTPS URL.
 * If Cloudinary is not configured (missing env vars), returns the dataUrl
 * unchanged so local development works without cloud credentials.
 *
 * @param {string} dataUrl  - base64 data URL (data:image/jpeg;base64,...)
 *                            OR an existing HTTPS URL (passed through unchanged)
 * @param {string} folder   - Cloudinary folder name (e.g. 'litbuddy/profiles')
 * @returns {Promise<string>} - Cloudinary HTTPS URL or original value
 */
async function uploadBase64ToCloudinary(dataUrl, folder = 'litbuddy/profiles') {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;

  // Already an HTTPS URL — already uploaded, return unchanged
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }

  // Not a base64 data URL — return unchanged
  if (!dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  ensureConfigured();

  if (!configured) {
    // Cloudinary not configured — local dev fallback: store base64 as-is
    logger.warn(
      'cloudinary.not_configured',
      'CLOUDINARY_* env vars missing; profilePhoto stored as base64 (dev mode)'
    );
    return dataUrl;
  }

  try {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder,
      resource_type: 'image',
      // Limit uploads to 5 MB to prevent oversized images
      chunk_size: 5 * 1024 * 1024,
    });
    return result.secure_url;
  } catch (err) {
    logger.error({ err }, 'cloudinary.upload_failed');
    // On upload failure, return the original dataUrl so the profile update
    // doesn't fail entirely — the base64 will still be stored as a fallback
    return dataUrl;
  }
}

module.exports = { uploadBase64ToCloudinary };
