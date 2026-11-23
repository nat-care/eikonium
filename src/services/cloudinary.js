const cloudName = 'dnjszpw4m';
const imagePreset = import.meta.env.VITE_CLOUDINARY_IMAGE_PRESET;
const metadataPreset = import.meta.env.VITE_CLOUDINARY_METADATA_PRESET;

export const uploadsConfigured = Boolean(imagePreset && metadataPreset);

async function upload(file, resourceType, preset) {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', preset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    { method: 'POST', body: form },
  );

  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error(
      result.error?.message || `Cloudinary ${resourceType} upload failed.`,
    );
  }

  return result.secure_url;
}

export async function uploadArtworkMetadata({ name, description, file }) {
  if (!uploadsConfigured) {
    throw new Error('Set both Cloudinary upload presets in .env.local.');
  }

  const image = await upload(file, 'image', imagePreset);
  const metadata = new File(
    [JSON.stringify({ name, description, image })],
    'metadata.json',
    { type: 'application/json' },
  );

  return upload(metadata, 'raw', metadataPreset);
}