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
  Info
} from 'lucide-react';
import { 
  SUPPORTED_AUDIO_FORMATS, 
  SUPPORTED_IMAGE_FORMATS, 
  getFileTypeCategory, 
  convertImage, 
  convertAudio, 
  formatBytes 
} from './utils/converter';

// Color themes configuration
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);

  // Settings State with LocalStorage persistence
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

  // Input refs
  const genericInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const imageInputRef = useRef(null);

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
    const finalExt = item.targetFormat === 'jpeg' ? 'jpg' : item.targetFormat;
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
      } else {
        throw new Error('不支持的文件格式');
      }

      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        status: 'success',
        progress: 100,
        resultUrl: result.url,
        resultBlob: result.blob,
        resultSize: result.size
      } : i));

      // Auto download if enabled in settings
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
          if (type.startsWith('image/') || type.startsWith('audio/')) {
            const blob = await item.getType(type);
            const ext = type.split('/')[1] || 'bin';
            files.push(new File([blob], `clipboard_${Date.now()}.${ext}`, { type }));
          }
        }
      }
      if (files.length > 0) {
        addFiles(files);
        setClipboardFeedback(`已载入 ${files.length} 个`);
      } else {
        setClipboardFeedback('无可用数据');
      }
    } catch {
      setClipboardFeedback('权限受限');
    }
    setTimeout(() => setClipboardFeedback(''), 2000);
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
                PRO
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

          {/* Docs / Guide Button */}
          <button
            onClick={() => setDocsOpen(true)}
            className={`p-1.5 rounded-lg border ${currentTheme.border} ${isLightTheme ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-zinc-800 text-zinc-300'} transition active:scale-95`}
            title="使用手册与格式支持"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className={`p-1.5 rounded-lg border ${currentTheme.border} ${isLightTheme ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-zinc-800 text-zinc-300'} transition active:scale-95`}
            title="偏好设置与配色"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Add file button */}
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
        accept="image/*,audio/*,.m4a,.aac,.opus,.flac,.wav,.ogg,.wma,.ico,.webp,.svg,.bmp"
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
            全格式自适应解析 · 离线转换 · 原地重命名
          </p>
        </div>

        {/* Specialized Entry Hub */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          
          <button
            onClick={() => audioInputRef.current?.click()}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <Music className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">音频转换</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>MP3 / WAV / M4A</div>
          </button>

          <button
            onClick={() => imageInputRef.current?.click()}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">图像转换</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>PNG / JPG / WebP</div>
          </button>

          <button
            onClick={() => audioInputRef.current?.click()}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <Mic className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">录音机导入</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>手机 .m4a 转 MP3</div>
          </button>

          <button
            onClick={handlePasteClipboard}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <ClipboardCopy className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">剪贴板直读</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>
              {clipboardFeedback || '读取剪贴板数据'}
            </div>
          </button>

          <button
            onClick={() => setDocsOpen(true)}
            className={`flex flex-col items-start p-3.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardHover} border ${currentTheme.border} transition text-left group active:scale-[0.98] shadow-sm col-span-2 sm:col-span-1`}
          >
            <div className={`w-8 h-8 rounded-lg border ${currentTheme.border} flex items-center justify-center mb-2.5 transition ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'bg-zinc-800 text-white'}`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="font-semibold text-xs">使用手册</div>
            <div className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'} font-medium mt-0.5`}>格式支持与技巧</div>
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
                        {item.category === 'audio' ? (
                          <FileMusic className="w-4 h-4" />
                        ) : (
                          <FileImage className="w-4 h-4" />
                        )}
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

                        <div className={`text-[11px] font-medium mt-0.5 ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'}`}>
                          {formatBytes(item.size)}
                          {item.status === 'success' && (
                            <span className={isLightTheme ? 'text-slate-900 font-semibold' : 'text-zinc-200 font-semibold'}> ➔ {getOutputFilename(item)} ({formatBytes(item.resultSize)})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 ${currentTheme.border}`}>
                      
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
                          {item.category === 'audio' ? (
                            SUPPORTED_AUDIO_FORMATS.map(f => (
                              <option key={f.ext} value={f.ext}>{f.label}</option>
                            ))
                          ) : (
                            SUPPORTED_IMAGE_FORMATS.map(f => (
                              <option key={f.ext} value={f.ext}>{f.label}</option>
                            ))
                          )}
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
                          <span>{item.category === 'audio' ? `${item.progress}%` : '处理中'}</span>
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
                          {item.category === 'audio' && item.resultUrl && (
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

      {/* Settings Modal Drawer */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl border ${currentTheme.border} ${isLightTheme ? 'bg-white text-slate-900' : 'bg-[#0f141f] text-zinc-100'} max-w-md w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150`}>
            
            {/* Modal Header */}
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

            {/* 1. Theme Selection */}
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

            {/* 2. Image Compression Quality */}
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

            {/* 3. Auto Download Switch */}
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

            {/* Modal Footer */}
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
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm">功能说明与使用指南</h3>
              </div>
              <button 
                onClick={() => setDocsOpen(false)}
                className={`p-1 rounded-lg ${currentTheme.textDim} hover:${isLightTheme ? 'text-black' : 'text-white'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Guide Content Sections */}
            <div className="space-y-4 text-xs leading-relaxed">
              
              {/* Section 1: Mobile iOS */}
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
                      在「语音备忘录」点录音「···」选择【存储到“文件”】，回到转换器点【录音机导入】直接选取转码。
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <div>
                      <strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>转发至微信/备忘录：</strong>
                      转换完成后点击【分享】图标，直接唤起 iOS 系统分享面板。
                    </div>
                  </li>
                </ul>
              </div>

              {/* Section 2: Format Matrix */}
              <div className={`p-4 rounded-xl border ${currentTheme.border} ${isLightTheme ? 'bg-slate-50' : 'bg-zinc-900/80'} space-y-2`}>
                <div className={`font-bold flex items-center gap-1.5 text-sm ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>支持转换格式</span>
                </div>
                <div className={`space-y-2 ${isLightTheme ? 'text-slate-800' : 'text-zinc-200'} pl-0.5`}>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <div>
                      <strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>音频引擎：</strong>
                      MP3, WAV, M4A(AAC), AAC, FLAC(无损), OGG, OPUS, WMA
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <div>
                      <strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>图像引擎：</strong>
                      PNG, JPG/JPEG, WebP, BMP, ICO(网站图标)
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Filename & Privacy */}
              <div className={`p-4 rounded-xl border ${currentTheme.border} ${isLightTheme ? 'bg-slate-50' : 'bg-zinc-900/80'} space-y-2`}>
                <div className={`font-bold flex items-center gap-1.5 text-sm ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>私密安全与导出管理</span>
                </div>
                <ul className={`space-y-2 ${isLightTheme ? 'text-slate-800' : 'text-zinc-200'} pl-0.5`}>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <div>
                      <strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>自定义导出名：</strong>
                      点击卡片上的文件名即可原地重命名，导出时自动以此命名。
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <div>
                      <strong className={`font-semibold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>无服务器运算：</strong>
                      转码全程在浏览器本地内存运行，文件永不上传任何外部服务器。
                    </div>
                  </li>
                </ul>
              </div>

            </div>

            {/* Modal Footer */}
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
