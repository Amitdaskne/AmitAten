/**
 * Uploads a file to Cloudinary using the provided credentials and returns the secure URL.
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = 'dlsiskxua';
  const uploadPreset = 'ml_default';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Cloudinary upload error response:', errorText);
    throw new Error('Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
}
