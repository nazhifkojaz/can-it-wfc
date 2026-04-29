export const CLOUDINARY_CONFIG = {
  CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
  UPLOAD_PRESET: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'can-it-wfc-avatars',
  UPLOAD_URL: `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,

  // Validation
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],

  // Transformations (for display)
  AVATAR_TRANSFORM: 'w_200,h_200,c_fill,g_face,q_auto,f_auto',
};


// Helper to validate file before upload
export const validateAvatarFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > CLOUDINARY_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size must be less than 2MB',
    };
  }

  if (!CLOUDINARY_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload an image file (JPG, PNG, WebP, or GIF)',
    };
  }

  return { valid: true };
};
