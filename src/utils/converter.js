let ffmpegInstance = null;
let loadPromise = null;

export const SUPPORTED_AUDIO_FORMATS = [
  { ext: 'mp3', label: 'MP3 (通用高保真)', mime: 'audio/mpeg' },
  { ext: 'wav', label: 'WAV (无损原始PCM)', mime: 'audio/wav' },
  { ext: 'm4a', label: 'M4A (Apple AAC)', mime: 'audio/mp4' },
  { ext: 'aac', label: 'AAC (高效编码)', mime: 'audio/aac' },
  { ext: 'ogg', label: 'OGG (开源音频)', mime: 'audio/ogg' },
  { ext: 'flac', label: 'FLAC (母带级无损)', mime: 'audio/flac' },
  { ext: 'opus', label: 'OPUS (低延迟网络音频)', mime: 'audio/opus' },
  { ext: 'wma', label: 'WMA (Windows音频)', mime: 'audio/x-ms-wma' },
];

export const SUPPORTED_IMAGE_FORMATS = [
  { ext: 'png', label: 'PNG (透明高保真)', mime: 'image/png' },
  { ext: 'jpeg', label: 'JPG / JPEG (常用压缩)', mime: 'image/jpeg' },
  { ext: 'webp', label: 'WebP (现代高效压缩)', mime: 'image/webp' },
  { ext: 'bmp', label: 'BMP (位图)', mime: 'image/bmp' },
  { ext: 'ico', label: 'ICO (网站图标 64x64)', mime: 'image/x-icon' },
  { ext: 'pdf', label: 'PDF (单页文档)', mime: 'application/pdf' },
  { ext: 'base64', label: 'Base64 (文本数据)', mime: 'text/plain' },
];

export const SUPPORTED_VIDEO_FORMATS = [
  { ext: 'mp3', label: '提取纯音频 (MP3 320k)', mime: 'audio/mpeg' },
  { ext: 'm4a', label: '提取纯音频 (M4A / AAC)', mime: 'audio/mp4' },
  { ext: 'wav', label: '提取纯音频 (WAV 无损)', mime: 'audio/wav' },
  { ext: 'gif', label: '转微信动图表情包 (GIF)', mime: 'image/gif' },
];

export const SUPPORTED_PDF_FORMATS = [
  { ext: 'png_zip', label: '逐页导出为高清 PNG (打包ZIP)', mime: 'application/zip' },
  { ext: 'jpg_zip', label: '逐页导出为 JPG (打包ZIP)', mime: 'application/zip' },
  { ext: 'docx', label: '提取排版并转为 Word (.docx)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { ext: 'txt', label: '提取纯文本 (TXT)', mime: 'text/plain' },
];

export const SUPPORTED_DOCX_FORMATS = [
  { ext: 'pdf', label: '排版渲染为 PDF 文档', mime: 'application/pdf' },
  { ext: 'html', label: '转换为 HTML 网页', mime: 'text/html' },
  { ext: 'txt', label: '提取纯文本 (TXT)', mime: 'text/plain' },
];

export const SUPPORTED_TABLE_FORMATS = [
  { ext: 'json', label: '转换为 JSON 结构化数据', mime: 'application/json' },
  { ext: 'csv', label: '转换为 CSV 逗号分隔表格', mime: 'text/csv' },
  { ext: 'xlsx', label: '转换为 Excel 表格 (.xlsx)', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
];

/**
 * Lazily load and initialize FFmpeg WebAssembly on-demand
 */
export async function getFFmpeg(onProgress) {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    const ffmpeg = new FFmpeg();
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.min(Math.max(Math.round(progress * 100), 0), 100));
      });
    }

    const baseURL = 'https://registry.npmmirror.com/@ffmpeg/core/0.12.6/files/dist/esm';
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    } catch {
      const fbURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${fbURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${fbURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    }

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
  const docxExts = ['docx'];
  const pdfExts = ['pdf'];
  const tableExts = ['xlsx', 'xls', 'csv', 'json'];

  const ext = name.split('.').pop();
  if (type === 'application/pdf' || pdfExts.includes(ext)) {
    return 'pdf';
  }
  if (docxExts.includes(ext) || type.includes('wordprocessingml')) {
    return 'docx';
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
 * Convert Image using Canvas, Base64, Watermark, and multi-format support
 */
export async function convertImage(file, targetFormat, options = {}) {
  const quality = options.quality !== undefined ? options.quality : 0.92;
  const watermark = options.watermark || null; // { text, mode: 'corner' | 'tile', opacity, color, size }
  const resize = options.resize || null; // { width, height }

  if (targetFormat === 'pdf') {
    return convertImagesToPDF([file]);
  }

  // Handle Base64 output directly
  if (targetFormat === 'base64') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result;
        const blob = new Blob([base64String], { type: 'text/plain;charset=utf-8' });
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const convertedFile = new File([blob], `${baseName}_base64.txt`, { type: 'text/plain' });
        resolve({
          file: convertedFile,
          blob,
          url: URL.createObjectURL(blob),
          size: blob.size,
          dataUrl: base64String,
        });
      };
      reader.onerror = (e) => reject(e);
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
        width = 64;
        height = 64;
      } else if (resize && resize.width && resize.height) {
        width = resize.width;
        height = resize.height;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Watermark handling
      if (watermark && watermark.text) {
        ctx.save();
        const text = watermark.text;
        const fontSize = watermark.size || Math.max(18, Math.floor(width / 24));
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const color = watermark.color || '#ffffff';
        const opacity = watermark.opacity !== undefined ? watermark.opacity : 0.35;
        
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;

        if (watermark.mode === 'tile') {
          // Diagonal repeating watermark (Tile)
          ctx.rotate(-Math.PI / 6);
          const stepX = fontSize * 10;
          const stepY = fontSize * 5;
          for (let x = -width; x < width * 2; x += stepX) {
            for (let y = -height; y < height * 2; y += stepY) {
              ctx.fillText(text, x, y);
            }
          }
        } else {
          // Bottom right corner watermark with shadow
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 4;
          ctx.fillText(text, width - 24, height - 20);
        }
        ctx.restore();
      }

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
            blob,
            url: URL.createObjectURL(blob),
            size: blob.size,
          });
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片文件损坏或格式不受支持'));
    };

    img.src = url;
  });
}

/**
 * Convert Base64 string back to an Image File
 */
export async function convertBase64ToImage(base64String, filename = 'recovered_image.png') {
  const cleanBase64 = base64String.trim();
  const res = await fetch(cleanBase64.startsWith('data:') ? cleanBase64 : `data:image/png;base64,${cleanBase64}`);
  const blob = await res.blob();
  const file = new File([blob], filename, { type: blob.type || 'image/png' });
  return {
    file,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
  };
}

/**
 * Convert Audio using FFmpeg WASM with high bitrate
 */
export async function convertAudio(file, targetFormat, onProgress) {
  const { fetchFile } = await import('@ffmpeg/util');
  const ffmpeg = await getFFmpeg(onProgress);
  const inputExt = file.name.split('.').pop().toLowerCase() || 'm4a';
  const inputName = `input_${Date.now()}.${inputExt}`;
  const outputName = `output_${Date.now()}.${targetFormat}`;

  try {
    const fileData = await fetchFile(file);
    await ffmpeg.writeFile(inputName, fileData);

    const args = ['-i', inputName];
    if (targetFormat === 'mp3') {
      args.push('-c:a', 'libmp3lame', '-b:a', '320k');
    } else if (targetFormat === 'aac' || targetFormat === 'm4a') {
      args.push('-c:a', 'aac', '-b:a', '256k');
    } else if (targetFormat === 'wav') {
      args.push('-c:a', 'pcm_s16le');
    } else if (targetFormat === 'ogg') {
      args.push('-c:a', 'libvorbis', '-q:a', '6');
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
    throw new Error(`音频转换失败: ${err.message || err}`);
  }
}

/**
 * Process Video: Extract Audio or High Quality Palette-based GIF
 */
export async function convertVideo(file, targetFormat, onProgress) {
  const { fetchFile } = await import('@ffmpeg/util');
  const ffmpeg = await getFFmpeg(onProgress);
  const inputExt = file.name.split('.').pop().toLowerCase() || 'mp4';
  const inputName = `vin_${Date.now()}.${inputExt}`;
  const outputName = `vout_${Date.now()}.${targetFormat}`;

  try {
    const fileData = await fetchFile(file);
    await ffmpeg.writeFile(inputName, fileData);

    const args = ['-i', inputName];

    if (targetFormat === 'gif') {
      // 2-pass high quality palette GIF with lanczos scaling
      args.push('-vf', 'fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer', '-t', '10');
    } else if (targetFormat === 'mp3') {
      args.push('-vn', '-c:a', 'libmp3lame', '-b:a', '320k');
    } else if (targetFormat === 'm4a') {
      args.push('-vn', '-c:a', 'aac', '-b:a', '256k');
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
    throw new Error(`视频转换失败: ${err.message || err}`);
  }
}

/**
 * Convert Multiple Images into a Single Clean A4 PDF
 */
export async function convertImagesToPDF(imageFiles, options = {}) {
  const { PDFDocument } = await import('pdf-lib');
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
    
    const margin = options.margin !== undefined ? options.margin : 24;
    const maxWidth = 595.28 - margin * 2;
    const maxHeight = 841.89 - margin * 2;
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
  const firstFileName = imageFiles[0]?.name?.replace(/\.[^/.]+$/, '') || 'merged_document';
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
 * Comprehensive PDF Conversion:
 * 1. Convert ALL pages to PNG / JPG, packaged as a ZIP archive!
 * 2. Convert to real Word .docx using `docx` library!
 * 3. Extract text to TXT
 */
export async function convertPDF(file, targetFormat) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://registry.npmmirror.com/pdfjs-dist/${pdfjsLib.version}/files/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const numPages = pdf.numPages;

  // 1. Convert to TXT
  if (targetFormat === 'txt') {
    let fullText = '';
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `=== 第 ${i} / ${numPages} 页 ===\n\n${pageText}\n\n`;
    }
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const convertedFile = new File([blob], `${baseName}.txt`, { type: 'text/plain' });
    return {
      file: convertedFile,
      blob,
      url: URL.createObjectURL(blob),
      size: blob.size,
    };
  }

  // 2. Convert to Word (.docx)
  if (targetFormat === 'docx') {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
    const docParagraphs = [];
    docParagraphs.push(
      new Paragraph({
        text: `${baseName}`,
        heading: HeadingLevel.HEADING_1,
      })
    );

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      docParagraphs.push(
        new Paragraph({
          text: `--- 第 ${i} 页 ---`,
          heading: HeadingLevel.HEADING_3,
        })
      );

      let currentLine = '';
      for (const item of textContent.items) {
        if (item.hasEOL) {
          currentLine += item.str;
          docParagraphs.push(new Paragraph({ children: [new TextRun(currentLine)] }));
          currentLine = '';
        } else {
          currentLine += item.str + ' ';
        }
      }
      if (currentLine.trim()) {
        docParagraphs.push(new Paragraph({ children: [new TextRun(currentLine)] }));
      }
    }

    const doc = new Document({
      sections: [{ properties: {}, children: docParagraphs }],
    });

    const docxBlob = await Packer.toBlob(doc);
    const convertedFile = new File([docxBlob], `${baseName}.docx`, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    return {
      file: convertedFile,
      blob: docxBlob,
      url: URL.createObjectURL(docxBlob),
      size: docxBlob.size,
    };
  }

  // 3. Convert ALL pages to Images (PNG / JPG) and package into a ZIP
  const isJpg = targetFormat === 'jpeg' || targetFormat === 'jpg' || targetFormat === 'jpg_zip';
  const imgExt = isJpg ? 'jpg' : 'png';
  const mimeType = isJpg ? 'image/jpeg' : 'image/png';

  // If only 1 page, export directly as image; if multiple, package into zip!
  if (numPages === 1 && (targetFormat === 'png' || targetFormat === 'jpeg')) {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (isJpg) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    await page.render({ canvasContext: ctx, viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const outName = `${baseName}.${imgExt}`;
        const convertedFile = new File([blob], outName, { type: mimeType });
        resolve({
          file: convertedFile,
          blob,
          url: URL.createObjectURL(blob),
          size: blob.size,
        });
      }, mimeType, 0.95);
    });
  }

  // Multi-page export with JSZip
  const JSZipModule = await import('jszip');
  const JSZip = JSZipModule.default || JSZipModule;
  const zip = new JSZip();
  const folder = zip.folder(`${baseName}_pages`);

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (isJpg) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL(mimeType, 0.95);
    const base64Data = dataUrl.split(',')[1];
    folder.file(`page_${String(i).padStart(3, '0')}.${imgExt}`, base64Data, { base64: true });
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const outName = `${baseName}_共${numPages}页.zip`;
  const convertedFile = new File([zipBlob], outName, { type: 'application/zip' });

  return {
    file: convertedFile,
    blob: zipBlob,
    url: URL.createObjectURL(zipBlob),
    size: zipBlob.size,
  };
}

/**
 * Word (.docx) Conversion:
 * 1. Convert to PDF using mammoth + jsPDF
 * 2. Convert to HTML
 * 3. Extract pure text (TXT)
 */
export async function convertDocx(file, targetFormat) {
  const mammothModule = await import('mammoth');
  const mammoth = mammothModule.default || mammothModule;
  const arrayBuffer = await file.arrayBuffer();
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  if (targetFormat === 'txt') {
    const res = await mammoth.extractRawText({ arrayBuffer });
    const blob = new Blob([res.value], { type: 'text/plain;charset=utf-8' });
    const convertedFile = new File([blob], `${baseName}.txt`, { type: 'text/plain' });
    return {
      file: convertedFile,
      blob,
      url: URL.createObjectURL(blob),
      size: blob.size,
    };
  }

  if (targetFormat === 'html') {
    const res = await mammoth.convertToHtml({ arrayBuffer });
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${baseName}</title>
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1, h2, h3 { color: #1e293b; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    td, th { border: 1px solid #cbd5e1; padding: 8px 12px; }
  </style>
</head>
<body>
  ${res.value}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const convertedFile = new File([blob], `${baseName}.html`, { type: 'text/html' });
    return {
      file: convertedFile,
      blob,
      url: URL.createObjectURL(blob),
      size: blob.size,
    };
  }

  if (targetFormat === 'pdf') {
    const { default: jsPDF } = await import('jspdf');
    const res = await mammoth.extractRawText({ arrayBuffer });
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const lines = pdf.splitTextToSize(res.value || '', 515);
    let cursorY = 50;
    const pageHeight = 841.89;

    pdf.setFontSize(11);
    for (let i = 0; i < lines.length; i++) {
      if (cursorY > pageHeight - 50) {
        pdf.addPage();
        cursorY = 50;
      }
      pdf.text(lines[i], 40, cursorY);
      cursorY += 16;
    }

    const pdfBlob = pdf.output('blob');
    const convertedFile = new File([pdfBlob], `${baseName}.pdf`, { type: 'application/pdf' });
    return {
      file: convertedFile,
      blob: pdfBlob,
      url: URL.createObjectURL(pdfBlob),
      size: pdfBlob.size,
    };
  }

  throw new Error('未知的 Word 转换目标格式');
}

/**
 * Excel / CSV / JSON Table Data Conversion
 */
export async function convertTable(file, targetFormat) {
  const XLSX = await import('xlsx');
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
 * Preview Table Data (Sampling first 15 rows)
 */
export async function readTablePreview(file) {
  const XLSX = await import('xlsx');
  const originalExt = file.name.split('.').pop().toLowerCase();
  let jsonData = [];

  if (originalExt === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    jsonData = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
  }

  const sampleRows = jsonData.slice(0, 15);
  const headers = sampleRows.length > 0 ? Object.keys(sampleRows[0]) : [];
  return { title: file.name, headers, rows: sampleRows };
}

/**
 * Generate QR Code
 */
export async function generateQRCode(text, options = {}) {
  const QRCodeModule = await import('qrcode');
  const QRCode = QRCodeModule.default || QRCodeModule;

  const dataUrl = await QRCode.toDataURL(text, {
    width: options.width || 600,
    margin: options.margin || 2,
    color: {
      dark: options.darkColor || '#000000',
      light: options.lightColor || '#ffffff',
    },
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

/**
 * Decode QR Code from Image File
 */
export async function decodeQRCode(file) {
  const jsQRModule = await import('jsqr');
  const jsQR = jsQRModule.default || jsQRModule;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        resolve(code.data);
      } else {
        reject(new Error('未在图片中检测到有效的二维码'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };

    img.src = url;
  });
}
