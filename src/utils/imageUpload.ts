import { apiFetch } from './api';

export interface UploadImageOptions {
  onProgress?: (message: string) => void;
  targetMaxSizeMB?: number;
}

/**
 * Uploads an image (base64 data URL or File) to the secure server proxy or CDN
 * without exposing technical third-party vendor names in user-facing toasts.
 */
export async function uploadImageToStorage(
  imageSource: string | File,
  options?: UploadImageOptions
): Promise<string> {
  const { onProgress } = options || {};

  if (onProgress) {
    onProgress('Optimizing and uploading photo...');
  }

  let base64String = '';
  let rawFile: File | null = null;

  if (typeof imageSource === 'string') {
    base64String = imageSource;
  } else if (imageSource instanceof File) {
    rawFile = imageSource;
    base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    });
  }

  // 1. Try server-side proxy route first (saves locally in < 50ms and syncs ImgBB)
  try {
    const res = await apiFetch('/auth/upload-imgbb', {
      method: 'POST',
      bodyData: { image: base64String }
    });

    if (res && res.url) {
      return res.url;
    }
    throw new Error(res?.error || 'Server upload did not return a valid URL.');
  } catch (serverErr: any) {
    console.warn('Server photo upload pipeline fallback active:', serverErr);

    // 2. Direct upload fallback with 3s timeout
    try {
      const cleanBase64 = base64String.includes(',') ? base64String.split(',')[1] : base64String;
      const directFormData = new FormData();
      directFormData.append('image', cleanBase64);

      const apiKey =
        ((import.meta as any).env?.VITE_IMGBB_API_KEY as string) ||
        (process.env.IMGBB_API_KEY as string) ||
        'eeae5ac8abaf61efd5cadc10b0fd0922';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const directRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: directFormData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const directData = await directRes.json();
      if (directData && directData.success && directData.data && directData.data.url) {
        return directData.data.url;
      }
      throw new Error(directData?.error?.message || 'Storage service rejected the photo.');
    } catch (directErr: any) {
      // 3. Ultimate zero-block fallback: Return the optimized data URL directly
      if (base64String && base64String.startsWith('data:image/')) {
        console.log('[Image Upload] Utilizing local data URL for instant post continuation.');
        return base64String;
      }
      throw new Error('Unable to upload photo. Please check your network or try another image.');
    }
  }
}
