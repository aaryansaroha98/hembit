import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a base64 data URL to Cloudinary.
 * @param {string} dataUrl  – full data:mime;base64,... string
 * @param {string} [folder] – optional Cloudinary folder
 * @returns {Promise<{url: string, mime: string}>}
 */
export async function uploadToCloudinary(dataUrl, folder = 'hembit') {
  const isVideo = dataUrl.startsWith('data:video/');
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder,
    resource_type: isVideo ? 'video' : 'image',
  });
  return {
    url: result.secure_url,
    mime: isVideo ? `video/${result.format}` : `image/${result.format}`,
  };
}

export default cloudinary;
