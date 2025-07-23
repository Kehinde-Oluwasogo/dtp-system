const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Local file path
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, options);
    
    // Delete local file after successful upload
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temporary file:', err);
    });
    
    return result;
  } catch (error) {
    // Delete local file if upload fails
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temporary file:', err);
    });
    
    throw error;
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Cloudinary delete options
 * @returns {Promise<Object>} - Cloudinary delete result
 */
const deleteFromCloudinary = async (publicId, options = {}) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, options);
    return result;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

/**
 * Generate signed URL for private resources
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation and other options
 * @returns {string} - Signed URL
 */
const generateSignedUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    sign_url: true,
    ...options
  });
};

/**
 * Get optimized URL with transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} transformations - Cloudinary transformations
 * @returns {string} - Optimized URL
 */
const getOptimizedUrl = (publicId, transformations = {}) => {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    ...transformations
  });
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  generateSignedUrl,
  getOptimizedUrl,
  cloudinaryInstance: cloudinary
};
