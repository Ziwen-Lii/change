import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUpRight,
  Download, 
  Share2, 
  Trash2, 
  Play, 
  Pause, 
  Check, 
  AlertCircle, 
  Loader2, 
  Edit2, 
  Plus, 
  FileMusic, 
  FileImage, 
  FileText, 
  FileSpreadsheet, 
  Video, 
  ChevronDown, 
  Music, 
  Image as ImageIcon, 
  Mic, 
  ClipboardCopy, 
  Settings2, 
  X, 
  Sliders, 
  Palette, 
  HardDriveDownload, 
  Gauge, 
  BookOpen, 
  HelpCircle, 
  Smartphone, 
  Shield, 
  Zap, 
  QrCode, 
  Table, 
  Stamp, 
  Code2, 
  ScanLine, 
  Copy, 
  ExternalLink, 
  Eye, 
  Layers, 
  FileCode
} from 'lucide-react';
import { 
  SUPPORTED_AUDIO_FORMATS, 
  SUPPORTED_IMAGE_FORMATS, 
  SUPPORTED_VIDEO_FORMATS, 
  SUPPORTED_PDF_FORMATS, 
  SUPPORTED_DOCX_FORMATS, 
  SUPPORTED_TABLE_FORMATS, 
  getFileTypeCategory, 
  convertImage, 
  convertAudio, 
  convertVideo, 
  convertPDF, 
  convertDocx, 
  convertTable, 
  convertImagesToPDF, 
  convertBase64ToImage, 
  generateQRCode, 
  decodeQRCode, 
  readTablePreview, 
  formatBytes 
} from './utils/converter';

const THEMES = {
  dark: {
    id: 'dark',
    name: '暗夜曜黑',
    badge: '默认',
    bg: 'bg-[#090d14]',
    navbarBg: 'bg-[#090d14]/90',
    border: 'border-zinc-800',
    cardBg: 'bg-zinc-900/60',
    cardHover: 'hover:bg-zinc-900/90',
    btnPrimary: 'bg-white hover:bg-zinc-200 text-black font-semibold',
    accentColor: '#ffffff',
    textMuted: 'text-zinc-300',
    textDim: 'text-zinc-400',
  },
  slate: {
    id: 'slate',
    name: '深空蓝灰',
    badge: '沉浸',
    bg: 'bg-[#0f172a]',
    navbarBg: 'bg-[#0f172a]/90',
    border: 'border-slate-800',
    cardBg: 'bg-slate-900/70',
    cardHover: 'hover:bg-slate-900',
    btnPrimary: 'bg-indigo-500 hover:bg-indigo-400 text-white font-semibold',
    accentColor: '#6366f1',
    textMuted: 'text-slate-200',
    textDim: 'text-slate-300',
  },
  emerald: {
    id: 'emerald',
    name: '极客暗绿',
    badge: '复古',
    bg: 'bg-[#061412]',
    navbarBg: 'bg-[#061412]/90',
    border: 'border-emerald-950',
    cardBg: 'bg-[#0a1e1b]/60',
    cardHover: 'hover:bg-[#0a1e1b]/90',
    btnPrimary: 'bg-emerald-500 hover:bg-emerald-400 text-black font-semibold',
    accentColor: '#10b981',
    textMuted: 'text-emerald-200',
    textDim: 'text-emerald-300/80',
  },
  light: {
    id: 'light',
    name: '素雅纯白',
    badge: '明亮',
    bg: 'bg-[#f1f5f9]',
    navbarBg: 'bg-white/95',
    border: 'border-slate-300',
    cardBg: 'bg-white',
    cardHover: 'hover:bg-slate-50',
    btnPrimary: 'bg-slate-900 hover:bg-black text-white font-semibold',
    accentColor: '#0f172a',
    textMuted: 'text-slate-700',
    textDim: 'text-slate-600',
  }
};

export default function App() {
  const [items, setItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [clipboardFeedback, setClipboardFeedback] = useState('');
  
  // Modals
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [watermarkModalOpen, setWatermarkModalOpen] = useState(false);
  const [base64ModalOpen, setBase64ModalOpen] = useState(false);
  const [tablePreviewModalOpen, setTablePreviewModalOpen] = useState(false);
  const [tablePreviewData, setTablePreviewData] = useState({ title: '', headers: [], rows: [] });

  // QR State
  const [qrTab, setQrTab] = useState('generate'); // generate | scan
  const [qrText, setQrText] = useState('https://github.com');
  const [qrColor, setQrColor] = useState('#000000');
  const [qrMargin, setQrMargin] = useState(2);
  const [qrLivePreview, setQrLivePreview] = useState('');
  const [scannedResult, setScannedResult] = useState('');
  const [scanError, setScanError] = useState('');
  const qrScanInputRef = useRef(null);

  // Watermark State
  const [watermarkText, setWatermarkText] = useState('仅用于认证 防盗专用');
  const [watermarkMode, setWatermarkMode] = useState('corner'); // corner | tile
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.35);
  const [watermarkColor, setWatermarkColor] = useState('#ffffff');
  const [watermarkFontSize, setWatermarkFontSize] = useState(24);
  const watermarkCanvasRef = useRef(null);

  // Base64 State
  const [base64Tab, setBase64Tab] = useState('img2b64'); // img2b64 | b642img
  const [b64Result, setB64Result] = useState('');
  const [b64Input, setB64Input] = useState('');
  const [b64CopyFeedback, setB64CopyFeedback] = useState('');

  // Settings State
  const [themeId, setThemeId] = useState(() => localStorage.getItem('cs_theme') || 'dark');
  const [imageQuality, setImageQuality] = useState(() => parseFloat(localStorage.getItem('cs_img_quality') || '0.92'));
  const [autoDownload, setAutoDownload] = useState(() => localStorage.getItem('cs_auto_download') === 'true');

  const currentTheme = THEMES[themeId] || THEMES.dark;
  const isLightTheme = themeId === 'light';

  useEffect(() => {
    localStorage.setItem('cs_theme', themeId);
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem('cs_img_quality', imageQuality.toString());
  }, [imageQuality]);

  useEffect(() => {
    localStorage.setItem('cs_auto_download', autoDownload.toString());
  }, [autoDownload]);

  // Live generate QR preview
  useEffect(() => {
    if (qrModalOpen && qrTab === 'generate' && qrText.trim()) {
      generateQRCode(qrText.trim(), { darkColor: qrColor, margin: qrMargin })
        .then(res => setQrLivePreview(res.url))
        .catch(() => {});
    }
  }, [qrModalOpen, qrTab, qrText, qrColor, qrMargin]);

  // Draw live Watermark preview on canvas
  useEffect(() => {
    if (!watermarkModalOpen) return;
    const canvas = watermarkCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Background gradient for preview
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle guide text
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('【水印实时预览画布 400x260】', width / 2, height / 2 - 10);

    // Apply Watermark
    ctx.save();
    ctx.globalAlpha = watermarkOpacity;
    ctx.fillStyle = watermarkColor;
    ctx.font = `bold ${watermarkFontSize}px sans-serif`;

    if (watermarkMode === 'tile') {
      ctx.rotate(-Math.PI / 6);
      const stepX = watermarkFontSize * 8;
      const stepY = watermarkFontSize * 4;
      for (let x = -width; x < width * 2; x += stepX) {
        for (let y = -height; y < height * 2; y += stepY) {
          ctx.fillText(watermarkText, x, y);
        }
      }
    } else {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.fillText(watermarkText, width - 20, height - 16);
    }
    ctx.restore();
  }, [watermarkModalOpen, watermarkText, watermarkMode, watermarkOpacity, watermarkColor, watermarkFontSize]);

  // Input refs
  const genericInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const docxInputRef = useRef(null);
  const tableInputRef = useRef(null);

  const addFiles = (fileList, forceCategory = null) => {
    const newItems = Array.from(fileList).map(file => {
      let category = forceCategory || getFileTypeCategory(file);
      const originalExt = file.name.split('.').pop().toLowerCase();
      const rawBaseName = file.name.replace(/\.[^/.]+$/, '');
      
      let defaultTarget = 'mp3';
      if (category === 'audio') {
        defaultTarget = originalExt === 'mp3' ? 'wav' : 'mp3';
      } else if (category === 'image') {
        defaultTarget = originalExt === 'png' ? 'webp' : 'png';
      } else if (category === 'video') {
        defaultTarget = 'mp3';
      } else if (category === 'pdf') {
        defaultTarget = 'png_zip';
      } else if (category === 'docx') {
        defaultTarget = 'pdf';
      } else if (category === 'table') {
        defaultTarget = originalExt === 'csv' ? 'xlsx' : 'csv';
      }

      return {
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        rawBaseName,
        customName: rawBaseName,
        isEditingName: false,
        size: file.size,
        category,
        originalExt,
        targetFormat: defaultTarget,
        status: 'idle',
        progress: 0,
        resultUrl: null,
        resultBlob: null,
        resultSize: 0,
        error: null,
        isPlaying: false,
      };
    });

    setItems(prev => [...newItems, ...prev]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const getOutputFilename = (item) => {
    let finalExt = item.targetFormat;
    if (finalExt === 'jpeg') finalExt = 'jpg';
    if (finalExt === 'png_zip' || finalExt === 'jpg_zip') finalExt = 'zip';
    if (finalExt === 'base64') finalExt = 'txt';
    const base = (item.customName || item.rawBaseName).trim() || 'output';
    return `${base}.${finalExt}`;
  };

  const handleDownload = (item) => {
    if (!item.resultUrl) return;
    const filename = getOutputFilename(item);
    const a = document.createElement('a');
    a.href = item.resultUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConvert = async (item) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'converting', progress: 5, error: null } : i));

    try {
      let result;
      if (item.category === 'image') {
        result = await convertImage(item.file, item.targetFormat, { quality: imageQuality });
      } else if (item.category === 'audio') {
        result = await convertAudio(item.file, item.targetFormat, (prog) => {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: prog } : i));
        });
      } else if (item.category === 'video') {
        result = await convertVideo(item.file, item.targetFormat, (prog) => {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: prog } : i));
        });
      } else if (item.category === 'pdf') {
        result = await convertPDF(item.file, item.targetFormat);
      } else if (item.category === 'docx') {
        result = await convertDocx(item.file, item.targetFormat);
      } else if (item.category === 'table') {
        result = await convertTable(item.file, item.targetFormat);
      } else {
        throw new Error('暂不支持该格式的自动转换');
      }

      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        status: 'success',
        progress: 100,
        resultUrl: result.url,
        resultBlob: result.blob,
        resultSize: result.size
      } : i));

      if (autoDownload && result.url) {
        const dummyItem = { ...item, resultUrl: result.url };
        handleDownload(dummyItem);
      }

    } catch (err) {
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        status: 'error',
        error: err.message || '转换异常'
      } : i));
    }
  };

  const handleConvertAll = () => {
    items.filter(i => i.status === 'idle' || i.status === 'error').forEach(item => {
      handleConvert(item);
    });
  };

  // Convert multiple selected images into a single PDF
  const handleMergeImagesToPDF = async () => {
    const imgItems = items.filter(i => i.category === 'image');
    if (imgItems.length === 0) {
      alert('队列中暂无图片文件，请先添加图片！');
      return;
    }

    try {
      const files = imgItems.map(i => i.file);
      const result = await convertImagesToPDF(files);
      const pdfItem = {
        id: Math.random().toString(36).substring(2, 9),
        file: result.file,
        name: result.file.name,
        rawBaseName: 'merged_document',
        customName: '合成多图文档',
        isEditingName: false,
        size: result.size,
        category: 'pdf',
        originalExt: 'pdf',
        targetFormat: 'pdf',
        status: 'success',
        progress: 100,
        resultUrl: result.url,
        resultBlob: result.blob,
        resultSize: result.size,
        error: null,
        isPlaying: false,
      };
      setItems(prev => [pdfItem, ...prev]);
    } catch (err) {
      alert(`合成 PDF 失败: ${err.message}`);
    }
  };

  // Apply visual watermark to images in queue
  const handleApplyWatermark = async () => {
    const imgItems = items.filter(i => i.category === 'image');
    if (imgItems.length === 0) {
      alert('当前队列暂无图片，请先上传图片！');
      return;
    }
    setWatermarkModalOpen(false);

    for (const item of imgItems) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'converting', progress: 50 } : i));
      try {
        const result = await convertImage(item.file, 'png', {
          quality: 0.95,
          watermark: {
            text: watermarkText,
            mode: watermarkMode,
            opacity: watermarkOpacity,
            color: watermarkColor,
            size: watermarkFontSize,
          }
        });
        setItems(prev => prev.map(i => i.id === item.id ? {
          ...i,
          customName: `${item.customName}_水印`,
          status: 'success',
          progress: 100,
          resultUrl: result.url,
          resultBlob: result.blob,
          resultSize: result.size
        } : i));
      } catch (err) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: err.message } : i));
      }
    }
  };

  // Scan / Decode QR code from uploaded image
  const handleScanQRFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError('');
    setScannedResult('');
    try {
      const text = await decodeQRCode(file);
      setScannedResult(text);
    } catch (err) {
      setScanError(err.message || '未能解析出二维码，请确保图像清晰');
    }
    e.target.value = '';
  };

  // Preview table data
  const handlePreviewTable = async (item) => {
    try {
      const preview = await readTablePreview(item.file);
      if (preview.rows.length === 0) {
        alert('表格数据为空');
        return;
      }
      setTablePreviewData(preview);
      setTablePreviewModalOpen(true);
    } catch (err) {
      alert('解析表格失败: ' + err.message);
    }
  };

  const handleShare = async (item) => {
    if (!item.resultBlob) return;
    const filename = getOutputFilename(item);
    const file = new File([item.resultBlob], filename, { type: item.resultBlob.type });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      }
    } else {
      handleDownload(item);
    }
  };

  const togglePlayAudio = (item) => {
    const audioEl = document.getElementById(`audio-player-${item.id}`);
    if (!audioEl) return;

    if (item.isPlaying) {
      audioEl.pause();
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isPlaying: false } : i));
    } else {
      audioEl.play();
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isPlaying: true } : i));
    }
  };

  const removeItem = (id) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item && item.resultUrl) {
        URL.revokeObjectURL(item.resultUrl);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach(item => {
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    });
    setItems([]);
  };

  const handlePasteClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) {
        setClipboardFeedback('环境限制');
        setTimeout(() => setClipboardFeedback(''), 2000);
        return;
      }
      const data = await navigator.clipboard.read();
      const files = [];
      for (const item of data) {
        for (const type of item.types) {
          if (
            type.startsWith('image/') || 
            type.startsWith('audio/') || 
            type.startsWith('video/') || 
            type.includes('pdf') || 
            type.includes('document') || 
            type.includes('sheet') || 
            type === 'text/csv'
          ) {
            const blob = await item.getType(type);
            let ext = 'bin';
            if (type.includes('pdf')) ext = 'pdf';
            else if (type.includes('word') || type.includes('docx')) ext = 'docx';
            else if (type.includes('sheet') || type.includes('excel')) ext = 'xlsx';
            else if (type === 'text/csv') ext = 'csv';
            else ext = type.split('/')[1] || 'bin';
            files.push(new File([blob], `clipboard_${Date.now()}.${ext}`, { type }));
          }
        }
      }
      if (files.length > 0) {
        addFiles(files);
        setClipboardFeedback(`已载入 ${files.length} 个`);
      } else {
        setClipboardFeedback('无可用文件');
      }
    } catch {
      setClipboardFeedback('权限受限');
    }
    setTimeout(() => setClipboardFeedback(''), 2000);
  };

  useEffect(() => {
    const handleGlobalPaste = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        addFiles(Array.from(e.clipboardData.files));
        setClipboardFeedback(`已载入 ${e.clipboardData.files.length} 个文件`);
        setTimeout(() => setClipboardFeedback(''), 2000);
      }
    };
    window.addEventListener('paste', handleGlobalPaste);

    const params = new URLSearchParams(window.location.search);
    if (params.get('paste') === '1') {
      setTimeout(() => {
        handlePasteClipboard();
      }, 400);
    }

    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const renderFormatOptions = (item) => {
    if (item.category === 'audio') {
      return SUPPORTED_AUDIO_FORMATS.map(f => <option key={f.ext} value={f.ext}>{f.label}</option>);
    }
    if (item.category === 'image') {
      return SUPPORTED_IMAGE_FORMATS.map(f => <option key={f.ext} value={f.ext}>{f.label}</option>);
    }
    if (item.category === 'video') {
      return SUPPORTED_VIDEO_FORMATS.map(f => <option key={f.ext} value={f.ext}>{f.label}</option>);
    }
    if (item.category === 'pdf') {
      return SUPPORTED_PDF_FORMATS.map(f => <option key={f.ext} value={f.ext}>{f.label}</option>);
    }
    if (item.category === 'docx') {
      return SUPPORTED_DOCX_FORMATS.map(f => <option key={f.ext} value={f.ext}>{f.label}</option>);
    }
    if (item.category === 'table') {
      return SUPPORTED_TABLE_FORMATS.map(f => <option key={f.ext} value={f.ext}>{f.label}</option>);
    }
    return <option value={item.originalExt}>{item.originalExt.toUpperCase()}</option>;
  };

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${isLightTheme ? 'text-zinc-900' : 'text-zinc-100'} font-sans antialiased flex flex-col transition-colors duration-300`}>
      
      {/* Top Studio Navbar */}
      <header className={`h-16 border-b ${currentTheme.border} px-6 sm:px-10 flex items-center justify-between backdrop-blur-md ${currentTheme.navbarBg} sticky top-0 z-40`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${isLightTheme ? 'bg-black text-white' : 'bg-white text-black'} flex items-center justify-center font-extrabold text-sm tracking-tighter shadow-sm`}>
            CV
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight flex items-center gap-2">
              <span>Convert Studio</span>
              <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${isLightTheme ? 'bg-slate-200 text-slate-700' : 'bg-zinc-800 text-zinc-400'}`}>
                SWISS KNIFE
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={clearAll}
              className={`text-xs ${currentTheme.textMuted} hover:${isLightTheme ? 'text-black' : 'text-white'} px-3 py-1.5 rounded-lg transition`}
            >
              清空
            </button>
          )}

          <button
            onClick={() => setDocsOpen(true)}
            className={`p-1.5 rounded-lg border ${currentTheme.border} ${isLightTheme ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-zinc-800 text-zinc-300'} transition active:scale-95`}
            title="使用手册与格式支持"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className={`p-1.5 rounded-lg border ${currentTheme.border} ${isLightTheme ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-zinc-800 text-zinc-300'} transition active:scale-95`}
            title="偏好设置与配色"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => genericInputRef.current?.click()}
            className={`text-xs font-medium ${currentTheme.btnPrimary} px-3.5 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1.5 shadow-sm`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>导入文件</span>
          </button>
        </div>
      </header>

      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={genericInputRef} 
        multiple 
        accept="image/*,audio/*,video/*,.pdf,.docx,.xlsx,.xls,.csv,.json,.m4a,.aac,.opus,.flac,.wav,.ogg,.wma,.ico,.webp,.svg,.bmp,.mp4,.mov,.webm"
        className="hidden" 
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input 
        type="file" 
        ref={audioInputRef} 
        multiple 
        accept="audio/*,.m4a,.aac,.opus,.flac,.wav,.ogg,.wma"
        className="hidden" 
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files, 'audio');
          e.target.value = '';
        }}
      />
      <input 
        type="file" 
        ref={imageInputRef} 
        multiple 
        accept="image/*,.ico,.webp,.svg,.bmp,.heic,.heif,.tiff"
        className="hidden" 
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files, 'image');
          e.target.value = '';
        }}
      />
      <input 
        type="file" 
        ref={videoInputRef} 
        multiple 
        accept="video/*,.mp4,.mov,.webm,.mkv,.avi"
        className="hidden" 
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files, 'video');
          e.target.value = '';
        }}
      />
      <input 
        type="file" 
        ref={pdfInputRef} 
        multiple 
        accept=".pdf,application/pdf"
        className="hidden" 
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files, 'pdf');
          e.target.value = '';
        }}
      />
      <input 
        type="file" 
        ref={docxInputRef} 
        multiple 
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden" 
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files, 'docx');
          e.target.value = '';
        }}
      />
      <input 
        type="file" 
        ref={tableInputRef} 
        multiple 
        accept=".xlsx,.xls,.csv,.json"
        className="hidden" 
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files, 'table');
          e.target.value = '';
        }}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">

        {/* Drag & Drop Upload Portal */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => genericInputRef.current?.click()}
          className={`relative rounded-2xl border border-dashed p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragging 
              ? `${isLightTheme ? 'border-black bg-slate-100' : 'border-zinc-300 bg-zinc-900/60'}` 
              : `${currentTheme.border} ${currentTheme.cardBg} ${currentTheme.cardHover}`
          }`}
        >
          <div className={`w-12 h-12 rounded-xl border ${currentTheme.border} flex items-center justify-center mb-3.5 shadow-sm ${isLightTheme ? 'bg-white text-slate-800' : 'bg-zinc-900 text-zinc-300'}`}>
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold mb-1">
            拖拽文件至此处，或点击浏览选择
          </h2>
          <p className={`text-xs ${isLightTheme ? 'text-slate-600' : 'text-zinc-300'} font-medium`}>
            全格式音频/图像/视频互转 · PDF与Word互转 · 表格互转 · 100% 浏览器本地运算
          </p>
        </div>

        {/* 12-Card Complete Tool Matrix (Clean 3-Row Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Row 1: Media Core */}
          <button
            onClick={() => audioInputRef.current?.click()}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <Music className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">音频转换</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>MP3 / WAV / M4A / FLAC</div>
          </button>

          <button
            onClick={() => imageInputRef.current?.click()}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">图像转换</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>PNG / JPG / WebP / ICO</div>
          </button>

          <button
            onClick={() => videoInputRef.current?.click()}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <Video className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">视频抽音频 / GIF</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>MP4/MOV 提音频或转动图</div>
          </button>

          <button
            onClick={() => audioInputRef.current?.click()}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <Mic className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">录音机导入</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>手机 .m4a 快速转码</div>
          </button>

          {/* Row 2: Document & Office */}
          <button
            onClick={() => pdfInputRef.current?.click()}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <FileText className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">PDF 解析 / 转Word</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>全页转图ZIP / 转Word / TXT</div>
          </button>

          <button
            onClick={() => docxInputRef.current?.click()}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <FileCode className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">Word (.docx) 转 PDF</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>本地渲染为标准 PDF/HTML</div>
          </button>

          <button
            onClick={() => imageInputRef.current?.click()}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <FileImage className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">多图合成 PDF</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>发票/照片拼单份 A4</div>
          </button>

          <button
            onClick={() => tableInputRef.current?.click()}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <Table className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">Excel / CSV / JSON</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>表格与数据互转与预览</div>
          </button>

          {/* Row 3: Security & Utility */}
          <button
            onClick={() => setWatermarkModalOpen(true)}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <Stamp className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">图片防盗水印</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>角标 / 45°密集防盗平铺</div>
          </button>

          <button
            onClick={() => setQrModalOpen(true)}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <QrCode className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">二维码生成与识别</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>双向：做码 + 传图扫码</div>
          </button>

          <button
            onClick={() => setBase64ModalOpen(true)}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <Code2 className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">Base64 ↔ 图片互转</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>图片转代码 / 代码还原图</div>
          </button>

          <button
            onClick={() => setDocsOpen(true)}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="font-semibold text-xs">功能说明与技巧</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>iOS桌面App / 格式全览</div>
          </button>

        </div>

        {/* Task Queue */}
        {items.length > 0 && (
          <div className="flex flex-col gap-4 mt-2">
            
            <div className={`flex items-center justify-between py-1 border-b ${currentTheme.border} pb-3`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${currentTheme.textMuted}`}>
                  任务列表 ({items.length})
                </span>
                {items.filter(i => i.category === 'image').length >= 2 && (
                  <button
                    onClick={handleMergeImagesToPDF}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 transition active:scale-95"
                  >
                    + 将所有图片合并为单份 PDF
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleConvertAll}
                  className={`text-xs font-medium ${currentTheme.btnPrimary} px-3.5 py-1.5 rounded-lg transition active:scale-95 shadow-sm`}
                >
                  全部转换
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div 
                  key={item.id}
                  className={`group rounded-xl ${currentTheme.cardBg} border ${currentTheme.border} p-4 transition-all flex flex-col gap-3 shadow-sm`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-lg border ${currentTheme.border} flex items-center justify-center shrink-0 ${isLightTheme ? 'bg-slate-100 text-slate-700' : 'bg-zinc-900 text-zinc-300'}`}>
                        {item.category === 'audio' && <FileMusic className="w-4 h-4" />}
                        {item.category === 'image' && <FileImage className="w-4 h-4" />}
                        {item.category === 'video' && <Video className="w-4 h-4" />}
                        {item.category === 'pdf' && <FileText className="w-4 h-4" />}
                        {item.category === 'docx' && <FileCode className="w-4 h-4" />}
                        {item.category === 'table' && <FileSpreadsheet className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {item.isEditingName ? (
                            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                              <input
                                type="text"
                                value={item.customName}
                                autoFocus
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setItems(prev => prev.map(i => i.id === item.id ? { ...i, customName: val } : i));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setItems(prev => prev.map(i => i.id === item.id ? { ...i, isEditingName: false } : i));
                                  }
                                }}
                                className={`border ${currentTheme.border} rounded px-2 py-0.5 text-xs focus:outline-none w-full ${isLightTheme ? 'bg-white text-black' : 'bg-zinc-950 text-white'}`}
                              />
                              <button
                                onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, isEditingName: false } : i))}
                                className="p-1 text-zinc-400 hover:text-zinc-200"
                                title="确认"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group/name">
                              <span 
                                className={`text-xs font-semibold truncate cursor-pointer hover:underline ${isLightTheme ? 'text-slate-900' : 'text-white'}`}
                                title="点击修改文件名"
                                onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, isEditingName: true } : i))}
                              >
                                {item.customName || item.rawBaseName}
                              </span>
                              <span className={`text-[11px] font-mono font-medium uppercase ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'}`}>
                                .{item.originalExt}
                              </span>
                              <button
                                onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, isEditingName: true } : i))}
                                className={`opacity-0 group-hover/name:opacity-100 p-0.5 ${currentTheme.textDim} hover:${isLightTheme ? 'text-black' : 'text-white'} transition`}
                                title="重命名"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className={`text-[11px] font-medium mt-0.5 ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} flex items-center gap-2`}>
                          <span>{formatBytes(item.size)}</span>
                          {item.category === 'table' && (
                            <button
                              onClick={() => handlePreviewTable(item)}
                              className="text-indigo-400 hover:underline flex items-center gap-0.5"
                            >
                              <Eye className="w-3 h-3" />
                              <span>预览数据</span>
                            </button>
                          )}
                          {item.status === 'success' && (
                            <span className={isLightTheme ? 'text-slate-900 font-semibold' : 'text-zinc-200 font-semibold'}>
                              ➔ {getOutputFilename(item)} ({formatBytes(item.resultSize)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 ${currentTheme.border}`}>
                      
                      {/* Format Selector */}
                      <div className="relative">
                        <select
                          value={item.targetFormat}
                          disabled={item.status === 'converting'}
                          onChange={(e) => {
                            setItems(prev => prev.map(i => i.id === item.id ? { 
                              ...i, 
                              targetFormat: e.target.value,
                              status: 'idle',
                              resultUrl: null,
                              resultBlob: null 
                            } : i));
                          }}
                          className={`appearance-none border ${currentTheme.border} text-xs font-medium rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none cursor-pointer transition ${isLightTheme ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-200'}`}
                        >
                          {renderFormatOptions(item)}
                        </select>
                        <ChevronDown className={`w-3.5 h-3.5 ${currentTheme.textDim} absolute right-2 top-2.5 pointer-events-none`} />
                      </div>

                      {item.status === 'idle' && (
                        <button
                          onClick={() => handleConvert(item)}
                          className={`text-xs border ${currentTheme.border} px-3 py-1.5 rounded-lg transition active:scale-95 font-medium ${isLightTheme ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}
                        >
                          转换
                        </button>
                      )}

                      {item.status === 'converting' && (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${currentTheme.textMuted} font-medium`}>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{item.progress}%</span>
                        </div>
                      )}

                      {item.status === 'error' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-red-500 flex items-center gap-1" title={item.error}>
                            <AlertCircle className="w-3 h-3" />
                            失败
                          </span>
                          <button
                            onClick={() => handleConvert(item)}
                            className={`text-xs border ${currentTheme.border} px-2 py-1 rounded`}
                          >
                            重试
                          </button>
                        </div>
                      )}

                      {item.status === 'success' && (
                        <div className="flex items-center gap-1.5">
                          {(item.category === 'audio' || (item.category === 'video' && item.targetFormat !== 'gif')) && item.resultUrl && (
                            <>
                              <audio 
                                id={`audio-player-${item.id}`} 
                                src={item.resultUrl} 
                                onEnded={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, isPlaying: false } : i))}
                                className="hidden" 
                              />
                              <button
                                onClick={() => togglePlayAudio(item)}
                                className={`p-1.5 rounded-lg border ${currentTheme.border} transition ${isLightTheme ? 'bg-slate-100 hover:bg-slate-200' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                                title="试听"
                              >
                                {item.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleShare(item)}
                            className={`p-1.5 rounded-lg border ${currentTheme.border} transition ${isLightTheme ? 'bg-slate-100 hover:bg-slate-200' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                            title="系统转发 / 分享"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownload(item)}
                            className={`text-xs ${currentTheme.btnPrimary} font-medium px-3 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1 shadow-sm`}
                            title="保存到本地"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>导出</span>
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => removeItem(item.id)}
                        className={`p-1.5 ${currentTheme.textDim} hover:${isLightTheme ? 'text-red-600' : 'text-zinc-200'} transition rounded`}
                        title="移除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </div>

                  {item.status === 'converting' && (
                    <div className={`w-full ${isLightTheme ? 'bg-slate-200' : 'bg-zinc-800'} rounded-full h-1 overflow-hidden`}>
                      <div 
                        className={`h-full transition-all duration-200 ${isLightTheme ? 'bg-black' : 'bg-white'}`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* QR Code Maker & Scanner Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl border ${currentTheme.border} ${isLightTheme ? 'bg-white text-slate-900' : 'bg-[#0f141f] text-zinc-100'} max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150`}>
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm">二维码双向工作台</h3>
              </div>
              <button onClick={() => setQrModalOpen(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className={`flex gap-2 p-1 rounded-xl ${isLightTheme ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'} border`}>
              <button
                onClick={() => setQrTab('generate')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${qrTab === 'generate' ? (isLightTheme ? 'bg-white text-slate-900 shadow' : 'bg-white text-black shadow') : (isLightTheme ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-white')}`}
              >
                生成二维码图片
              </button>
              <button
                onClick={() => setQrTab('scan')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${qrTab === 'scan' ? (isLightTheme ? 'bg-white text-slate-900 shadow' : 'bg-white text-black shadow') : (isLightTheme ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-white')}`}
              >
                扫描/解析二维码图片
              </button>
            </div>

            {qrTab === 'generate' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold">输入网址或任意文本：</label>
                  <textarea
                    value={qrText}
                    rows={2}
                    onChange={(e) => setQrText(e.target.value)}
                    placeholder="https://..."
                    className={`w-full text-xs p-2.5 rounded-xl border mt-1 ${currentTheme.border} focus:outline-none ${isLightTheme ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-white'}`}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">前景色：</span>
                    <input
                      type="color"
                      value={qrColor}
                      onChange={(e) => setQrColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">边框留白：</span>
                    <select
                      value={qrMargin}
                      onChange={(e) => setQrMargin(parseInt(e.target.value))}
                      className={`text-xs ${isLightTheme ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white'} rounded-lg p-1.5`}
                    >
                      <option value={1}>紧凑 (1)</option>
                      <option value={2}>标准 (2)</option>
                      <option value={4}>宽边 (4)</option>
                    </select>
                  </div>
                </div>

                {qrLivePreview && (
                  <div className={`flex justify-center p-3 ${isLightTheme ? 'bg-slate-50 border border-slate-200' : 'bg-white'} rounded-xl shadow-inner`}>
                    <img src={qrLivePreview} alt="QR Code" className="w-36 h-36" />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!qrLivePreview) return;
                      const a = document.createElement('a');
                      a.href = qrLivePreview;
                      a.download = 'qrcode.png';
                      a.click();
                    }}
                    className={`flex-1 py-2 rounded-xl border ${currentTheme.border} font-medium text-xs transition active:scale-95`}
                  >
                    直接保存下载
                  </button>
                  <button
                    onClick={async () => {
                      if (!qrText.trim()) return;
                      const res = await generateQRCode(qrText.trim(), { darkColor: qrColor, margin: qrMargin });
                      addFiles([res.file], 'image');
                      setQrModalOpen(false);
                    }}
                    className={`flex-1 py-2 rounded-xl ${currentTheme.btnPrimary} font-medium text-xs transition active:scale-95 shadow`}
                  >
                    加入转换队列
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={qrScanInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleScanQRFile}
                />
                <div
                  onClick={() => qrScanInputRef.current?.click()}
                  className={`border-2 border-dashed ${isLightTheme ? 'border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-slate-100' : 'border-zinc-700 hover:border-indigo-400 bg-zinc-900/40 hover:bg-zinc-900/70'} p-6 rounded-2xl text-center cursor-pointer transition`}
                >
                  <ScanLine className="w-8 h-8 mx-auto text-indigo-400 mb-2" />
                  <p className={`text-xs font-semibold ${isLightTheme ? 'text-slate-800' : 'text-white'}`}>点击上传含二维码的截图或照片</p>
                  <p className={`text-[11px] ${isLightTheme ? 'text-slate-500' : 'text-zinc-400'} mt-1`}>本地毫秒级纯离线解析 · 零上传</p>
                </div>

                {scannedResult && (
                  <div className={`p-3.5 rounded-xl ${isLightTheme ? 'bg-slate-50 border-emerald-500/50' : 'bg-zinc-900 border-emerald-500/40'} border space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-500">解析成功内容：</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(scannedResult);
                          alert('已复制到剪贴板！');
                        }}
                        className={`text-[11px] ${isLightTheme ? 'text-indigo-600 hover:text-indigo-800' : 'text-indigo-300 hover:text-white'} flex items-center gap-1 font-medium`}
                      >
                        <Copy className="w-3 h-3" />
                        <span>复制内容</span>
                      </button>
                    </div>
                    <div className={`text-xs font-mono break-all p-2.5 rounded ${isLightTheme ? 'bg-white border border-slate-200 text-slate-900' : 'bg-black/40 text-white'} select-all`}>
                      {scannedResult}
                    </div>
                    {scannedResult.startsWith('http') && (
                      <a
                        href={scannedResult}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:underline pt-1 font-semibold"
                      >
                        <span>在浏览器中打开链接</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {scanError && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{scanError}</span>
                  </p>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Watermark Modal */}
      {watermarkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl border ${currentTheme.border} ${isLightTheme ? 'bg-white text-slate-900' : 'bg-[#0f141f] text-zinc-100'} max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150`}>
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Stamp className="w-4 h-4 text-emerald-400" />
                <span>图片防盗专属水印</span>
              </div>
              <button onClick={() => setWatermarkModalOpen(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold">水印文字内容：</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="如：仅供办证认证使用..."
                  className={`w-full text-xs p-2 rounded-xl border mt-1 ${currentTheme.border} focus:outline-none ${isLightTheme ? 'bg-slate-50 text-black' : 'bg-zinc-950 text-white'}`}
                />
              </div>

              {/* Watermark live canvas preview */}
              <div className={`flex justify-center rounded-xl overflow-hidden border ${isLightTheme ? 'border-slate-200 bg-slate-100' : 'border-zinc-800 bg-black/40'} shadow-inner`}>
                <canvas ref={watermarkCanvasRef} width={400} height={200} className="w-full h-36 object-contain" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-semibold">排版模式：</span>
                  <select
                    value={watermarkMode}
                    onChange={(e) => setWatermarkMode(e.target.value)}
                    className={`w-full mt-1 ${isLightTheme ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white'} rounded-lg p-1.5 text-xs`}
                  >
                    <option value="corner">右下角专属角标</option>
                    <option value="tile">45°对角线密集防盗平铺</option>
                  </select>
                </div>

                <div>
                  <span className="font-semibold">水印颜色：</span>
                  <select
                    value={watermarkColor}
                    onChange={(e) => setWatermarkColor(e.target.value)}
                    className={`w-full mt-1 ${isLightTheme ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white'} rounded-lg p-1.5 text-xs`}
                  >
                    <option value="#ffffff">亮白</option>
                    <option value="#000000">纯黑</option>
                    <option value="#ef4444">警示红</option>
                    <option value="#eab308">防伪金黄</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex justify-between">
                    <span className="font-semibold">透明度：</span>
                    <span className="font-mono">{Math.round(watermarkOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full mt-1.5 accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between">
                    <span className="font-semibold">字号大小：</span>
                    <span className="font-mono">{watermarkFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="48"
                    step="2"
                    value={watermarkFontSize}
                    onChange={(e) => setWatermarkFontSize(parseInt(e.target.value))}
                    className="w-full mt-1.5 accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleApplyWatermark}
              className={`w-full py-2.5 rounded-xl ${currentTheme.btnPrimary} font-medium text-xs transition active:scale-95 shadow`}
            >
              为队列中的全部图片加盖水印
            </button>
          </div>
        </div>
      )}

      {/* Base64 Converter Modal */}
      {base64ModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl border ${currentTheme.border} ${isLightTheme ? 'bg-white text-slate-900' : 'bg-[#0f141f] text-zinc-100'} max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150`}>
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm">Base64 ↔ 图片双向转换器</h3>
              </div>
              <button onClick={() => setBase64ModalOpen(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`flex gap-2 p-1 rounded-xl ${isLightTheme ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'} border`}>
              <button
                onClick={() => setBase64Tab('img2b64')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${base64Tab === 'img2b64' ? (isLightTheme ? 'bg-white text-slate-900 shadow' : 'bg-white text-black shadow') : (isLightTheme ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-white')}`}
              >
                图片 ➔ Base64 文本
              </button>
              <button
                onClick={() => setBase64Tab('b642img')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${base64Tab === 'b642img' ? (isLightTheme ? 'bg-white text-slate-900 shadow' : 'bg-white text-black shadow') : (isLightTheme ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-white')}`}
              >
                Base64 文本 ➔ 还原为图片
              </button>
            </div>

            {base64Tab === 'img2b64' ? (
              <div className="space-y-3">
                <input
                  type="file"
                  id="b64-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const res = await convertImage(f, 'base64');
                    const text = await res.blob.text();
                    setB64Result(text);
                  }}
                />
                <button
                  onClick={() => document.getElementById('b64-upload')?.click()}
                  className={`w-full py-4 border-2 border-dashed ${isLightTheme ? 'border-slate-300 hover:border-indigo-500 bg-slate-50 text-slate-700' : 'border-zinc-700 hover:border-indigo-400 bg-zinc-900/40 text-zinc-300'} rounded-xl text-center text-xs transition font-medium`}
                >
                  点击选取或拖拽图片以提取 Base64
                </button>

                {b64Result && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className={isLightTheme ? 'text-slate-600' : 'text-zinc-400'}>代码长度: {b64Result.length} 字符</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(b64Result);
                          setB64CopyFeedback('已复制完整代码！');
                          setTimeout(() => setB64CopyFeedback(''), 2000);
                        }}
                        className={`${isLightTheme ? 'text-indigo-600 hover:text-indigo-800' : 'text-indigo-400 hover:text-indigo-300'} font-semibold flex items-center gap-1`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{b64CopyFeedback || '一键复制完整 DataURL'}</span>
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={5}
                      value={b64Result}
                      className={`w-full p-2.5 rounded-xl ${isLightTheme ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/60 border-zinc-800 text-zinc-300'} border font-mono text-[10px] select-all`}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold">粘贴以 data:image/ 或纯 base64 开头的代码：</label>
                  <textarea
                    rows={4}
                    value={b64Input}
                    onChange={(e) => setB64Input(e.target.value)}
                    placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
                    className={`w-full p-2.5 rounded-xl ${isLightTheme ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-black/60 border-zinc-800 text-white'} border font-mono text-xs mt-1 focus:outline-none focus:border-indigo-500`}
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!b64Input.trim()) return;
                    try {
                      const res = await convertBase64ToImage(b64Input);
                      addFiles([res.file], 'image');
                      setBase64ModalOpen(false);
                      setB64Input('');
                    } catch (err) {
                      alert('解析 Base64 失败: ' + err.message);
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl ${currentTheme.btnPrimary} font-medium text-xs transition active:scale-95 shadow`}
                >
                  解析并加入转换队列
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Table Data Preview Modal */}
      {tablePreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl border ${currentTheme.border} ${isLightTheme ? 'bg-white text-slate-900' : 'bg-[#0f141f] text-zinc-100'} max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150`}>
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-sm truncate max-w-md">表格即时预览: {tablePreviewData.title}</h3>
              </div>
              <button onClick={() => setTablePreviewModalOpen(false)} className={`p-1 rounded-lg ${currentTheme.textDim} hover:${isLightTheme ? 'text-black' : 'text-white'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`max-h-80 overflow-auto border ${isLightTheme ? 'border-slate-200' : 'border-zinc-800'} rounded-xl`}>
              <table className="w-full text-xs text-left">
                <thead className={`${isLightTheme ? 'bg-slate-100' : 'bg-zinc-800/80'} sticky top-0`}>
                  <tr>
                    {tablePreviewData.headers.map((h, i) => (
                      <th key={i} className={`p-2.5 border-b ${isLightTheme ? 'border-slate-200 text-slate-800' : 'border-zinc-700 text-zinc-200'} font-semibold truncate`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tablePreviewData.rows.map((row, rIndex) => (
                    <tr key={rIndex} className={`${isLightTheme ? 'hover:bg-slate-50 border-b border-slate-100' : 'hover:bg-zinc-800/40 border-b border-zinc-800/50'}`}>
                      {tablePreviewData.headers.map((h, cIndex) => (
                        <td key={cIndex} className={`p-2 ${isLightTheme ? 'text-slate-700' : 'text-zinc-300'} truncate max-w-xs`}>
                          {String(row[h] !== undefined ? row[h] : '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`flex justify-between items-center text-xs ${isLightTheme ? 'text-slate-500' : 'text-zinc-400'} pt-1`}>
              <span>仅展示前 15 行数据作为采样预览</span>
              <button
                onClick={() => setTablePreviewModalOpen(false)}
                className={`px-4 py-1.5 rounded-lg ${currentTheme.btnPrimary} font-medium`}
              >
                关闭
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Settings Modal Drawer */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl border ${currentTheme.border} ${isLightTheme ? 'bg-white text-slate-900' : 'bg-[#0f141f] text-zinc-100'} max-w-md w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150`}>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                <h3 className="font-semibold text-sm">偏好设置</h3>
              </div>
              <button 
                onClick={() => setSettingsOpen(false)}
                className={`p-1 rounded-lg ${currentTheme.textDim} hover:${isLightTheme ? 'text-black' : 'text-white'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-zinc-400" />
                <span>主题配色方案</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {Object.values(THEMES).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setThemeId(t.id)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      themeId === t.id 
                        ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-indigo-500/5' 
                        : `${currentTheme.border} hover:border-zinc-600`
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{t.name}</div>
                      <div className={`text-[10px] ${currentTheme.textDim} mt-0.5`}>{t.badge}</div>
                    </div>
                    {themeId === t.id && (
                      <Check className="w-4 h-4 text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-800/40">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                  <span>图片转换画质</span>
                </label>
                <span className="font-mono font-medium">{Math.round(imageQuality * 100)}%</span>
              </div>
              <input 
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={imageQuality}
                onChange={(e) => setImageQuality(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 rounded-lg bg-zinc-800"
              />
              <div className={`flex justify-between text-[10px] ${currentTheme.textDim}`}>
                <span>较小体积 (50%)</span>
                <span>平衡 (90%)</span>
                <span>极高画质 (100%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
              <div>
                <div className="text-xs font-medium flex items-center gap-1.5">
                  <HardDriveDownload className="w-3.5 h-3.5 text-zinc-400" />
                  <span>转换完成后自动保存</span>
                </div>
                <div className={`text-[11px] ${currentTheme.textDim} mt-0.5`}>
                  单任务转换成功后立即自动下载
                </div>
              </div>
              <button
                onClick={() => setAutoDownload(!autoDownload)}
                className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                  autoDownload ? 'bg-indigo-600' : 'bg-zinc-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  autoDownload ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSettingsOpen(false)}
                className={`w-full py-2 rounded-xl ${currentTheme.btnPrimary} font-medium text-xs transition shadow-sm`}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Documentation / Guide Modal */}
      {docsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl border ${currentTheme.border} ${isLightTheme ? 'bg-white text-slate-900' : 'bg-[#0f141f] text-zinc-100'} max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm">功能说明与全能指南</h3>
              </div>
              <button 
                onClick={() => setDocsOpen(false)}
                className={`p-1 rounded-lg ${currentTheme.textDim} hover:${isLightTheme ? 'text-black' : 'text-white'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed">
              <div className={`p-4 rounded-xl border ${currentTheme.border} ${isLightTheme ? 'bg-slate-50' : 'bg-zinc-900/80'} space-y-2`}>
                <div className={`font-bold flex items-center gap-1.5 text-sm ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <span>iPhone / iPad 快捷技巧</span>
                </div>
                <ul className={`space-y-2 ${isLightTheme ? 'text-slate-800' : 'text-zinc-200'} pl-0.5`}>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <div>
                      <strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>桌面 App 体验：</strong>
                      在 Safari 点击底部【分享】➡️【添加到主屏幕】，即成为全屏沉浸独立 App。
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <div>
                      <strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>导入录音机：</strong>
                      在「语音备忘录」点录音「···」选择【存储到“文件”】，回到转换器直接导入转码。
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <div>
                      <strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>转发至微信/备忘录：</strong>
                      转换完成后点击【分享】图标，直接唤起 iOS 原生分享面板。
                    </div>
                  </li>
                </ul>
              </div>

              <div className={`p-4 rounded-xl border ${currentTheme.border} ${isLightTheme ? 'bg-slate-50' : 'bg-zinc-900/80'} space-y-2`}>
                <div className={`font-bold flex items-center gap-1.5 text-sm ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>12 大全能实用功能矩阵</span>
                </div>
                <div className={`space-y-2 ${isLightTheme ? 'text-slate-800' : 'text-zinc-200'} pl-0.5`}>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <div><strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>PDF 解析与转 Word：</strong>所有页转高清图打包 ZIP、导出 Word (.docx) 或提文本。</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <div><strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>Word (.docx) 转 PDF：</strong>本地解析渲染排版，导出标准 PDF / HTML 文档。</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <div><strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>表格数据互转：</strong>Excel (.xlsx)、CSV、JSON 自由双向互转与前排数据采样预览。</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <div><strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>二维码双向工作台：</strong>离线生成高清矢量二维码，支持上传任意图片智能解码。</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <div><strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>图片防盗水印：</strong>右下角角标与 45°密集防盗平铺，带实时画布预览。</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <div><strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>Base64 ↔ 图片互转：</strong>图片转代码一键复制，代码还原图片一键下载。</div>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${currentTheme.border} ${isLightTheme ? 'bg-slate-50' : 'bg-zinc-900/80'} space-y-2`}>
                <div className={`font-bold flex items-center gap-1.5 text-sm ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>隐私安全与无服务器保障</span>
                </div>
                <ul className={`space-y-2 ${isLightTheme ? 'text-slate-800' : 'text-zinc-200'} pl-0.5`}>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <div><strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>自定义导出名：</strong>点击任务卡片上的文件名即可原地重命名。</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <div><strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>100% 浏览器内运行：</strong>音视频转码、PDF/Word排版、表格处理全部在本地内存执行，零数据外流。</div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setDocsOpen(false)}
                className={`w-full py-2 rounded-xl ${currentTheme.btnPrimary} font-medium text-xs transition shadow-sm`}
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
