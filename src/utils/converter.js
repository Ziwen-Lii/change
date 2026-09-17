import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import jsPDF from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

let ffmpegInstance = null;
let loadPromise = null;

export const SUPPORTED_AUDIO_FORMATS = [
  { ext: 'mp3', label: 'MP3 (通用)', mime: 'audio/mpeg' },
  { ext: 'wav', label: 'WAV (无损)', mime: 'audio/wav' },
  { ext: 'm4a', label: 'M4A (Apple AAC)', mime: 'audio/mp4' },
  { ext: 'aac', label: 'AAC', mime: 'audio/aac' },
  { ext: 'ogg', label: 'OGG', mime: 'audio/ogg' },
  { ext: 'flac', label: 'FLAC (高保真)', mime: 'audio/flac' },
  { ext: 'opus', label: 'OPUS', mime: 'audio/opus' },
  { ext: 'wma', label: 'WMA', mime: 'audio/x-ms-wma' },
];

export const SUPPORTED_IMAGE_FORMATS = [
  { ext: 'png', label: 'PNG (透明保真)', mime: 'image/png' },
  { ext: 'jpeg', label: 'JPG / JPEG', mime: 'image/jpeg' },
  { ext: 'webp', label: 'WebP (高压缩)', mime: 'image/webp' },
  { ext: 'bmp', label: 'BMP', mime: 'image/bmp' },
  { ext: 'ico', label: 'ICO (图标)', mime: 'image/x-icon' },
  { ext: 'pdf', label: 'PDF (单页文档)', mime: 'application/pdf' },
  { ext: 'base64', label: 'Base64 (编码文本)', mime: 'text/plain' },
];

export const SUPPORTED_VIDEO_FORMATS = [
  { ext: 'mp3', label: '提取纯音频 (MP3)', mime: 'audio/mpeg' },
  { ext: 'm4a', label: '提取纯音频 (M4A)', mime: 'audio/mp4' },
  { ext: 'wav', label: '提取纯音频 (WAV)', mime: 'audio/wav' },
  { ext: 'gif', label: '转动图 GIF (表情包)', mime: 'image/gif' },
];

export const SUPPORTED_PDF_FORMATS = [
  { ext: 'png', label: '逐页导出为高清 PNG', mime: 'image/png' },
  { ext: 'jpeg', label: '逐页导出为 JPG', mime: 'image/jpeg' },
  { ext: 'txt', label: '提取纯文本 (TXT)', mime: 'text/plain' },
];

export const SUPPORTED_TABLE_FORMATS = [
  { ext: 'json', label: '转换为 JSON 数据', mime: 'application/json' },
  { ext: 'csv', label: '转换为 CSV 表格', mime: 'text/csv' },
  { ext: 'xlsx', label: '转换为 Excel (.xlsx)', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
];

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
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.min(Math.max(Math.round(progress * 100), 0), 100));
      });
    }

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

export function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileTypeCategory(file) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  const audioExts = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'opus', 'wma', 'aiff', 'amr'];
  const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'ico', 'heic', 'heif', 'tiff'];
  const videoExts = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'];
  const tableExts = ['xlsx', 'xls', 'csv', 'json'];
  const pdfExts = ['pdf'];

  const ext = name.split('.').pop();
  if (type === 'application/pdf' || pdfExts.includes(ext)) {
    return 'pdf';
  }
  if (tableExts.includes(ext) || type === 'text/csv' || type === 'application/json') {
    return 'table';
  }
  if (type.startsWith('video/') || videoExts.includes(ext)) {
    return 'video';
  }
  if (type.startsWith('audio/') || audioExts.includes(ext)) {
    return 'audio';
  }
  if (type.startsWith('image/') || imageExts.includes(ext)) {
    return 'image';
  }
  return 'unknown';
}

/**
 * Convert Image using Canvas, Base64 export, or single-page PDF
 */
export async function convertImage(file, targetFormat, options = { quality: 0.92, icoSize: 64, watermark: '' }) {
  if (targetFormat === 'pdf') {
    return convertImagesToPDF([file]);
  }

  if (targetFormat === 'base64') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const convertedFile = new File([blob], `${baseName}_base64.txt`, { type: 'text/plain' });
        resolve({
          file: convertedFile,
          blob,
          url: URL.createObjectURL(blob),
          size: blob.size,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

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

      if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Apply watermark if configured
      if (options.watermark) {
        ctx.save();
        ctx.font = `bold ${Math.max(16, Math.floor(width / 25))}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        const text = options.watermark;
        ctx.strokeText(text, width - 20, height - 20);
        ctx.fillText(text, width - 20, height - 20);
        ctx.restore();
      }

      let mimeType = `image/${targetFormat}`;
      if (targetFormat === 'jpg') mimeType = 'image/jpeg';
      if (targetFormat === 'ico') mimeType = 'image/x-icon';

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('转换失败'));
            return;
          }
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const newFileName = `${baseName}.${targetFormat === 'jpeg' ? 'jpg' : targetFormat}`;
          const convertedFile = new File([blob], newFileName, { type: mimeType });
          resolve({
            file: convertedFile,
            blob,
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
      reject(new Error('文件损坏或格式不受支持'));
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

    const args = ['-i', inputName];
    if (targetFormat === 'mp3') {
      args.push('-c:a', 'libmp3lame', '-q:a', '2');
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

    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    return {
      file: convertedFile,
      blob,
      url: URL.createObjectURL(blob),
      size: blob.size,
    };
  } catch (err) {
    console.error('Audio conversion error:', err);
    throw new Error(`转换失败: ${err.message || err}`);
  }
}

/**
 * Process Video: Extract Audio or Convert to GIF
 */
export async function convertVideo(file, targetFormat, onProgress) {
  const ffmpeg = await getFFmpeg(onProgress);
  const inputExt = file.name.split('.').pop().toLowerCase() || 'mp4';
  const inputName = `vin_${Date.now()}.${inputExt}`;
  const outputName = `vout_${Date.now()}.${targetFormat}`;

  try {
    const fileData = await fetchFile(file);
    await ffmpeg.writeFile(inputName, fileData);

    const args = ['-i', inputName];

    if (targetFormat === 'gif') {
      args.push('-vf', 'fps=12,scale=480:-1:flags=lanczos', '-t', '10');
    } else if (targetFormat === 'mp3') {
      args.push('-vn', '-c:a', 'libmp3lame', '-q:a', '2');
    } else if (targetFormat === 'm4a') {
      args.push('-vn', '-c:a', 'aac', '-b:a', '192k');
    } else if (targetFormat === 'wav') {
      args.push('-vn', '-c:a', 'pcm_s16le');
    }

    args.push(outputName);
    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    const mimeObj = SUPPORTED_VIDEO_FORMATS.find((f) => f.ext === targetFormat);
    const mimeType = mimeObj ? mimeObj.mime : 'application/octet-stream';

    const blob = new Blob([data.buffer], { type: mimeType });
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newFileName = `${baseName}.${targetFormat}`;
    const convertedFile = new File([blob], newFileName, { type: mimeType });

    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    return {
      file: convertedFile,
      blob,
      url: URL.createObjectURL(blob),
      size: blob.size,
    };
  } catch (err) {
    console.error('Video conversion error:', err);
    throw new Error(`视频处理失败: ${err.message || err}`);
  }
}

/**
 * Convert Multiple/Single Images into an A4 PDF
 */
export async function convertImagesToPDF(imageFiles) {
  const pdfDoc = await PDFDocument.create();

  for (const file of imageFiles) {
    const arrayBuffer = await file.arrayBuffer();
    let image;
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

    if (isPng) {
      image = await pdfDoc.embedPng(arrayBuffer).catch(async () => {
        const bmpBlob = await convertImage(file, 'jpeg');
        const buf = await bmpBlob.blob.arrayBuffer();
        return await pdfDoc.embedJpg(buf);
      });
    } else {
      image = await pdfDoc.embedJpg(arrayBuffer).catch(async () => {
        const bmpBlob = await convertImage(file, 'jpeg');
        const buf = await bmpBlob.blob.arrayBuffer();
        return await pdfDoc.embedJpg(buf);
      });
    }

    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width: imgW, height: imgH } = image;
    
    const maxWidth = 555;
    const maxHeight = 801;
    const scale = Math.min(maxWidth / imgW, maxHeight / imgH, 1);
    const renderW = imgW * scale;
    const renderH = imgH * scale;

    const x = (595.28 - renderW) / 2;
    const y = (841.89 - renderH) / 2;

    page.drawImage(image, {
      x,
      y,
      width: renderW,
      height: renderH,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const firstFileName = imageFiles[0]?.name?.replace(/\.[^/.]+$/, '') || 'document';
  const outName = `${firstFileName}.pdf`;
  const convertedFile = new File([blob], outName, { type: 'application/pdf' });

  return {
    file: convertedFile,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
  };
}

/**
 * Process PDF: Extract text or render first page to Image
 */
export async function convertPDF(file, targetFormat) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  if (targetFormat === 'txt') {
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `--- 第 ${i} 页 ---\n${pageText}\n\n`;
    }
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const convertedFile = new File([blob], `${baseName}.txt`, { type: 'text/plain' });
    return {
      file: convertedFile,
      blob,
      url: URL.createObjectURL(blob),
      size: blob.size,
    };
  }

  // Render Page 1 to Image
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  if (targetFormat === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise((resolve, reject) => {
    const mimeType = targetFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('PDF 渲染失败'));
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const newName = `${baseName}_p1.${targetFormat === 'jpeg' ? 'jpg' : 'png'}`;
      const convertedFile = new File([blob], newName, { type: mimeType });
      resolve({
        file: convertedFile,
        blob,
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    }, mimeType, 0.95);
  });
}

/**
 * Excel / CSV / JSON Table Data Conversion
 */
export async function convertTable(file, targetFormat) {
  const originalExt = file.name.split('.').pop().toLowerCase();
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  let workbook;

  if (originalExt === 'json') {
    const text = await file.text();
    const jsonData = JSON.parse(text);
    const worksheet = XLSX.utils.json_to_sheet(Array.isArray(jsonData) ? jsonData : [jsonData]);
    workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  } else {
    const data = await file.arrayBuffer();
    workbook = XLSX.read(data, { type: 'array' });
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  if (targetFormat === 'json') {
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    const jsonStr = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const convertedFile = new File([blob], `${baseName}.json`, { type: 'application/json' });
    return {
      file: convertedFile,
      blob,
      url: URL.createObjectURL(blob),
      size: blob.size,
    };
  }

  if (targetFormat === 'csv') {
    const csvStr = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8' });
    const convertedFile = new File([blob], `${baseName}.csv`, { type: 'text/csv' });
    return {
      file: convertedFile,
      blob,
      url: URL.createObjectURL(blob),
      size: blob.size,
    };
  }

  if (targetFormat === 'xlsx') {
    const outBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const convertedFile = new File([blob], `${baseName}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return {
      file: convertedFile,
      blob,
      url: URL.createObjectURL(blob),
      size: blob.size,
    };
  }

  throw new Error('未知的表格转换格式');
}

/**
 * Generate QR Code
 */
export async function generateQRCode(text) {
  const dataUrl = await QRCode.toDataURL(text, {
    width: 600,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], 'qrcode.png', { type: 'image/png' });
  return {
    file,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
  };
}
