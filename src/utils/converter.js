import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

let ffmpegInstance = null;
let loadPromise = null;

export const SUPPORTED_AUDIO_FORMATS = [
  { ext: 'mp3', label: 'MP3 (通用主流)', mime: 'audio/mpeg' },
  { ext: 'wav', label: 'WAV (无损原始)', mime: 'audio/wav' },
  { ext: 'm4a', label: 'M4A (Apple AAC)', mime: 'audio/mp4' },
  { ext: 'aac', label: 'AAC (高效编码)', mime: 'audio/aac' },
  { ext: 'ogg', label: 'OGG (开源格式)', mime: 'audio/ogg' },
  { ext: 'flac', label: 'FLAC (高品质无损)', mime: 'audio/flac' },
  { ext: 'opus', label: 'OPUS (现代低延迟)', mime: 'audio/opus' },
  { ext: 'wma', label: 'WMA (Windows音频)', mime: 'audio/x-ms-wma' },
];

export const SUPPORTED_IMAGE_FORMATS = [
  { ext: 'png', label: 'PNG (透明高保真)', mime: 'image/png' },
  { ext: 'jpeg', label: 'JPG / JPEG (常用压缩)', mime: 'image/jpeg' },
  { ext: 'webp', label: 'WebP (现代超高压缩)', mime: 'image/webp' },
  { ext: 'bmp', label: 'BMP (位图)', mime: 'image/bmp' },
  { ext: 'ico', label: 'ICO (网站图标)', mime: 'image/x-icon' },
];

/**
 * Lazily load and initialize FFmpeg WebAssembly
 */
export async function getFFmpeg(onProgress) {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    
    if (onProgress) {
      ffmpeg.on('progress', ({ progress, time }) => {
        onProgress(Math.min(Math.max(Math.round(progress * 100), 0), 100));
      });
    }

    // Load from reliable CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

/**
 * Format bytes to readable string (KB, MB)
 */
export function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Helper to determine file category
 */
export function getFileTypeCategory(file) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  const audioExts = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'opus', 'wma', 'aiff', 'amr'];
  const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'ico', 'heic', 'heif', 'tiff'];

  const ext = name.split('.').pop();
  if (type.startsWith('audio/') || audioExts.includes(ext)) {
    return 'audio';
  }
  if (type.startsWith('image/') || imageExts.includes(ext)) {
    return 'image';
  }
  return 'unknown';
}

/**
 * Convert Image using HTML5 Canvas
 */
export async function convertImage(file, targetFormat, options = { quality: 0.92, icoSize: 64 }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (targetFormat === 'ico') {
        width = options.icoSize || 64;
        height = options.icoSize || 64;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // If converting to JPEG, draw white background first to handle transparent PNGs
      if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      let mimeType = `image/${targetFormat}`;
      if (targetFormat === 'jpg') mimeType = 'image/jpeg';
      if (targetFormat === 'ico') mimeType = 'image/x-icon';

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('图片格式转换失败'));
            return;
          }
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const newFileName = `${baseName}.${targetFormat === 'jpeg' ? 'jpg' : targetFormat}`;
          const convertedFile = new File([blob], newFileName, { type: mimeType });
          resolve({
            file: convertedFile,
            url: URL.createObjectURL(blob),
            size: blob.size,
          });
        },
        mimeType,
        options.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片解析失败，可能是损坏或不受支持的格式'));
    };

    img.src = url;
  });
}

/**
 * Convert Audio using FFmpeg WASM
 */
export async function convertAudio(file, targetFormat, onProgress) {
  const ffmpeg = await getFFmpeg(onProgress);

  const inputExt = file.name.split('.').pop().toLowerCase() || 'm4a';
  const inputName = `input_${Date.now()}.${inputExt}`;
  const outputName = `output_${Date.now()}.${targetFormat}`;

  try {
    const fileData = await fetchFile(file);
    await ffmpeg.writeFile(inputName, fileData);

    // Run conversion
    const args = ['-i', inputName];

    // Format specific optimizations
    if (targetFormat === 'mp3') {
      args.push('-c:a', 'libmp3lame', '-q:a', '2'); // High quality variable bitrate
    } else if (targetFormat === 'aac' || targetFormat === 'm4a') {
      args.push('-c:a', 'aac', '-b:a', '192k');
    } else if (targetFormat === 'wav') {
      args.push('-c:a', 'pcm_s16le');
    } else if (targetFormat === 'ogg') {
      args.push('-c:a', 'libvorbis', '-q:a', '5');
    } else if (targetFormat === 'flac') {
      args.push('-c:a', 'flac');
    }

    args.push(outputName);

    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    const mimeObj = SUPPORTED_AUDIO_FORMATS.find((f) => f.ext === targetFormat);
    const mimeType = mimeObj ? mimeObj.mime : 'application/octet-stream';

    const blob = new Blob([data.buffer], { type: mimeType });
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newFileName = `${baseName}.${targetFormat}`;
    const convertedFile = new File([blob], newFileName, { type: mimeType });

    // Cleanup memory in FFmpeg FS
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    return {
      file: convertedFile,
      url: URL.createObjectURL(blob),
      size: blob.size,
    };
  } catch (err) {
    console.error('Audio conversion error:', err);
    throw new Error(`音频转换失败: ${err.message || err}`);
  }
}
