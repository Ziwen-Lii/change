import React, { useState, useRef } from 'react';
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
  Camera,
  ClipboardCopy,
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';
import { 
  SUPPORTED_AUDIO_FORMATS, 
  SUPPORTED_IMAGE_FORMATS, 
  getFileTypeCategory, 
  convertImage, 
  convertAudio, 
  formatBytes 
} from './utils/converter';

export default function App() {
  const [items, setItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [clipboardFeedback, setClipboardFeedback] = useState('');
  
  // Specific input refs
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
        status: 'idle', // idle, converting, success, error
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

  const handleConvert = async (item) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'converting', progress: 5, error: null } : i));

    try {
      let result;
      if (item.category === 'image') {
        result = await convertImage(item.file, item.targetFormat);
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

  // Clipboard Paste Handler
  const handlePasteClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) {
        setClipboardFeedback('当前环境不支持直接读取');
        setTimeout(() => setClipboardFeedback(''), 2500);
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
        setClipboardFeedback(`已读入 ${files.length} 个文件`);
      } else {
        setClipboardFeedback('剪贴板中无音频或图片');
      }
    } catch {
      setClipboardFeedback('剪贴板访问受限');
    }
    setTimeout(() => setClipboardFeedback(''), 2500);
  };

  return (
    <div className="min-h-screen bg-[#090d14] text-zinc-100 font-sans antialiased flex flex-col selection:bg-zinc-800 selection:text-white">
      
      {/* Top Studio Navbar */}
      <header className="h-16 border-b border-zinc-800/80 px-6 sm:px-10 flex items-center justify-between backdrop-blur-md bg-[#090d14]/90 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-extrabold text-sm tracking-tighter shadow-sm">
            CV
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
              Convert Studio
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                PRO
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition"
            >
              清空队列
            </button>
          )}
          <button
            onClick={() => genericInputRef.current?.click()}
            className="text-xs font-medium bg-white hover:bg-zinc-100 text-black px-3.5 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>导入文件</span>
          </button>
        </div>
      </header>

      {/* Hidden File Inputs for Different Entrypoints */}
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

        {/* Unified Drag & Drop Upload Portal */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => genericInputRef.current?.click()}
          className={`relative rounded-2xl border border-dashed p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragging 
              ? 'border-zinc-300 bg-zinc-900/60 shadow-inner' 
              : 'border-zinc-800/90 hover:border-zinc-700 bg-zinc-900/20 hover:bg-zinc-900/40'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mb-3.5 shadow-sm">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-200 mb-1">
            拖拽文件至任意区域，或点击选择
          </h2>
          <p className="text-xs text-zinc-500 font-normal">
            全格式自适应解析 · 离线转换 · 自由重命名
          </p>
        </div>

        {/* Dedicated Specialized Entrypoint Hub (Audio / Image / Voice / Clipboard) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Audio Entry */}
          <button
            onClick={() => audioInputRef.current?.click()}
            className="flex flex-col items-start p-3.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition text-left group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 mb-2.5 group-hover:text-white transition">
              <Music className="w-4 h-4" />
            </div>
            <div className="font-medium text-xs text-zinc-200 group-hover:text-white">音频转换</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">MP3 / WAV / M4A / FLAC</div>
          </button>

          {/* Image Entry */}
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex flex-col items-start p-3.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition text-left group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 mb-2.5 group-hover:text-white transition">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="font-medium text-xs text-zinc-200 group-hover:text-white">图像转换</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">PNG / JPG / WebP / ICO</div>
          </button>

          {/* Voice Memo / Mobile Files Entry */}
          <button
            onClick={() => audioInputRef.current?.click()}
            className="flex flex-col items-start p-3.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition text-left group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 mb-2.5 group-hover:text-white transition">
              <Mic className="w-4 h-4" />
            </div>
            <div className="font-medium text-xs text-zinc-200 group-hover:text-white">录音机 / 备忘录</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">手机 .m4a 导入与转码</div>
          </button>

          {/* Clipboard Entry */}
          <button
            onClick={handlePasteClipboard}
            className="flex flex-col items-start p-3.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition text-left group active:scale-[0.98] relative"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 mb-2.5 group-hover:text-white transition">
              <ClipboardCopy className="w-4 h-4" />
            </div>
            <div className="font-medium text-xs text-zinc-200 group-hover:text-white">剪贴板读取</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              {clipboardFeedback || '读取拷贝的媒体数据'}
            </div>
          </button>

        </div>

        {/* Active Task Queue */}
        {items.length > 0 && (
          <div className="flex flex-col gap-4 mt-2">
            
            {/* Header Control Row */}
            <div className="flex items-center justify-between py-1 border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  任务列表 ({items.length})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleConvertAll}
                  className="text-xs font-medium bg-white hover:bg-zinc-100 text-black px-3.5 py-1.5 rounded-lg transition active:scale-95 shadow-sm"
                >
                  全部转换
                </button>
              </div>
            </div>

            {/* List of File Cards */}
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div 
                  key={item.id}
                  className="group rounded-xl bg-zinc-900/40 border border-zinc-800/90 p-4 transition-all hover:border-zinc-700/90 flex flex-col gap-3"
                >
                  {/* Top section: Info, Rename, Format Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Left: Icon + File Name & Rename */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
                        {item.category === 'audio' ? (
                          <FileMusic className="w-4 h-4 text-zinc-300" />
                        ) : (
                          <FileImage className="w-4 h-4 text-zinc-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Filename with inline edit */}
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
                                className="bg-zinc-950 border border-zinc-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-zinc-400 w-full"
                              />
                              <button
                                onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, isEditingName: false } : i))}
                                className="p-1 text-zinc-400 hover:text-white"
                                title="确认"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group/name">
                              <span 
                                className="text-xs font-medium text-zinc-200 truncate cursor-pointer hover:text-white"
                                title="点击修改导出文件名"
                                onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, isEditingName: true } : i))}
                              >
                                {item.customName || item.rawBaseName}
                              </span>
                              <span className="text-[11px] text-zinc-500 uppercase">
                                .{item.originalExt}
                              </span>
                              <button
                                onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, isEditingName: true } : i))}
                                className="opacity-0 group-hover/name:opacity-100 p-0.5 text-zinc-500 hover:text-zinc-300 transition"
                                title="重命名"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {formatBytes(item.size)}
                          {item.status === 'success' && (
                            <span className="text-zinc-300"> ➔ {getOutputFilename(item)} ({formatBytes(item.resultSize)})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Target Selector & Action controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-zinc-800/40 sm:border-0">
                      
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
                          className="appearance-none bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-medium rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:border-zinc-500 cursor-pointer transition"
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
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2 top-2.5 pointer-events-none" />
                      </div>

                      {/* State Action Buttons */}
                      {item.status === 'idle' && (
                        <button
                          onClick={() => handleConvert(item)}
                          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg transition active:scale-95 font-medium"
                        >
                          转换
                        </button>
                      )}

                      {item.status === 'converting' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-300" />
                          <span>{item.category === 'audio' ? `${item.progress}%` : '处理中'}</span>
                        </div>
                      )}

                      {item.status === 'error' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-red-400 flex items-center gap-1" title={item.error}>
                            <AlertCircle className="w-3 h-3" />
                            失败
                          </span>
                          <button
                            onClick={() => handleConvert(item)}
                            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded"
                          >
                            重试
                          </button>
                        </div>
                      )}

                      {item.status === 'success' && (
                        <div className="flex items-center gap-1.5">
                          {/* Audio preview */}
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
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                                title="试听"
                              >
                                {item.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}

                          {/* Share button */}
                          <button
                            onClick={() => handleShare(item)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                            title="系统转发 / 分享"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Download button */}
                          <button
                            onClick={() => handleDownload(item)}
                            className="text-xs bg-white hover:bg-zinc-100 text-black font-medium px-3 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1"
                            title="保存到本地"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>导出</span>
                          </button>
                        </div>
                      )}

                      {/* Remove item */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-zinc-600 hover:text-zinc-300 transition rounded"
                        title="移除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </div>

                  {/* Converting Progress Bar */}
                  {item.status === 'converting' && (
                    <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                      <div 
                        className="bg-zinc-300 h-full transition-all duration-200"
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
    </div>
  );
}
