import { supabase } from '../lib/supabaseClient';
import cleanupStorage from './cleanupStorage';

/**
 * Download a file from Supabase Storage using a short lived signed URL.
 * Falls back to the provided URL if a signed link cannot be generated.
 */
export default async function downloadFile(url, filename = 'file.pdf') {
  try {
    console.log('Download started for', filename);
    let downloadUrl = url;

    // Attempt to generate a signed URL if the file comes from Supabase Storage
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
    const publicPrefix = `${supabaseUrl}/storage/v1/object/public/`;

    if (supabaseUrl && typeof url === 'string' && url.startsWith(publicPrefix)) {
      const path = url.replace(publicPrefix, '');
      const [bucket, ...fileParts] = path.split('/');
      const filePath = fileParts.join('/');

      if (bucket && filePath) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 60);

        if (!error && data?.signedUrl) {
          downloadUrl = data.signedUrl;
        }
      }
    }

    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Failed to fetch file');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    cleanupStorage();
    console.log('Download finished for', filename);
  } catch (err) {
    console.error('Error downloading file:', err);
  }
}
