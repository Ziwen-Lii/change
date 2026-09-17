import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileAudio, 
  FileImage, 
  FileQuestion, 
  ArrowRight, 
  Download, 
  Share2, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  Smartphone, 
  ClipboardCopy, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  HelpCircle,
  Play,
  Pause
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
  const [iosTipOpen, setIosTipOpen] = useState(false);
  const [clipboardStatus, setClipboardStatus] = useState('');
  const fileInputRef = useRef(null);

  // Auto detect if user is on iOS
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Handle file addition
  const addFiles = (fileList) => {
    const newItems = Array.from(fileList).map(file => {
      const category = getFileTypeCategory(file);
      const originalExt = file.name.split('.').pop().toLowerCase();
      
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
        size: file.size,
        category,
        originalExt,
        targetFormat: defaultTarget,
        status: 'idle', // idle, converting, success, error
        progress: 0,
        resultUrl: null,
        resultFile: null,
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

  // Clipboard paste support (Mobile & PC)
  const handlePasteClipboard = async () => {
    try {
      setClipboardStatus('正在读取剪贴板...');
      if (!navigator.clipboard || !navigator.clipboard.read) {
        // Fallback for text or older browsers
        alert('您的浏览器不支持直接读取文件剪贴板，请使用选择文件或拖拽上传。');
        setClipboardStatus('');
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      const files = [];

      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/') || type.startsWith('audio/')) {
            const blob = await item.getType(type);
            const ext = type.split('/')[1] || 'bin';
            const file = new File([blob], `clipboard_${Date.now()}.${ext}`, { type });
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        addFiles(files);
        setClipboardStatus(`已粘贴 ${files.length} 个文件`);
      } else {
        setClipboardStatus('剪贴板中未发现图片或音频数据');
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
      setClipboardStatus('未能读取剪贴板，请允许访问或改用【选取文件】');
    }
    setTimeout(() => setClipboardStatus(''), 3000);
  };

  // Convert single item
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
        throw new Error('未知的格式类型，仅支持常见音视频与图片');
      }

      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        status: 'success',
        progress: 100,
        resultUrl: result.url,
        resultFile: result.file,
        resultSize: result.size
      } : i));
    } catch (err) {
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        status: 'error',
        error: err.message || '转换失败'
      } : i));
    }
  };

  // Convert all idle items
  const handleConvertAll = () => {
    items.filter(i => i.status === 'idle' || i.status === 'error').forEach(item => {
      handleConvert(item);
    });
  };

  // Trigger Native Share API (iOS / Android / Mac)
  const handleShare = async (item) => {
    if (!item.resultFile) return;

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [item.resultFile] })) {
      try {
        await navigator.share({
          files: [item.resultFile],
          title: item.resultFile.name,
          text: '通过极速格式转换器生成',
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share error:', err);
        }
      }
    } else {
      // Fallback: trigger download
      handleDownload(item);
    }
  };

  // Direct download
  const handleDownload = (item) => {
    if (!item.resultUrl) return;
    const a = document.createElement('a');
    a.href = item.resultUrl;
    a.download = item.resultFile ? item.resultFile.name : `converted_${item.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Audio preview playback toggle
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/40 text-slate-100 flex flex-col items-center px-4 py-6 sm:py-10">
      
      {/* App Header */}
      <header className="w-full max-w-3xl flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-indigo-400/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              极速格式转换器
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                0服务器·离线
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">音视频与图片本地安全互转 · 无文件大小限制</p>
          </div>
        </div>

        <button 
          onClick={() => setIosTipOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700/60 transition-colors shadow-sm"
        >
          <Smartphone className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">iOS / 手机使用技巧</span>
          <span className="sm:hidden">手机技巧</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-3xl space-y-6">

        {/* Upload Dropzone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center cursor-pointer transition-all duration-300 bg-slate-900/60 backdrop-blur-xl ${
            isDragging 
              ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01]' 
              : 'border-slate-700/80 hover:border-indigo-500/60 hover:bg-slate-850/60'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            accept="image/*,audio/*,.m4a,.aac,.opus,.flac,.wav,.ogg,.wma,.ico,.webp,.svg,.bmp"
            className="hidden" 
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Upload className="w-8 h-8 transition-transform group-hover:-translate-y-0.5" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-semibold text-white">
                点击选择文件，或将音频/图片拖至此处
              </p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                支持 MP3、WAV、M4A、AAC、FLAC、OGG 及 JPG、PNG、WebP、BMP、ICO
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar for Mobile (Paste Clipboard, iOS tips, test samples) */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePasteClipboard}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 border border-slate-700 transition active:scale-95 shadow-sm"
              title="读取剪贴板中的图片或录音"
            >
              <ClipboardCopy className="w-4 h-4 text-emerald-400" />
              <span>从剪贴板粘贴</span>
            </button>

            {/* Quick Demo samples for fast testing */}
            <button
              onClick={async () => {
                const res = await fetch('/sample-test.bmp');
                const blob = await res.blob();
                const file = new File([blob], 'sample-test.bmp', { type: 'image/bmp' });
                addFiles([file]);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 border border-slate-700/50 transition active:scale-95"
            >
              🧪 测试图片 (BMP)
            </button>

            <button
              onClick={async () => {
                const res = await fetch('/sample-test.wav');
                const blob = await res.blob();
                const file = new File([blob], 'sample-test.wav', { type: 'audio/wav' });
                addFiles([file]);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 border border-slate-700/50 transition active:scale-95"
            >
              🧪 测试音频 (WAV)
            </button>
            <button
              onClick={handlePasteClipboard}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 border border-slate-700 transition active:scale-95 shadow-sm"
              title="读取剪贴板中的图片或录音"
            >
              <ClipboardCopy className="w-4 h-4 text-emerald-400" />
              <span>从剪贴板粘贴</span>
            </button>
            {clipboardStatus && (
              <span className="text-indigo-300 animate-fade-in font-medium">{clipboardStatus}</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% 浏览器内运算 · 数据永不离开本机</span>
          </div>
        </div>

        {/* Action Header when items exist */}
        {items.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-sm font-semibold text-slate-300">
              待转换任务 ({items.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleConvertAll}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>全部一键转换</span>
              </button>
              <button
                onClick={clearAll}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 border border-slate-700/60 transition"
                title="清空列表"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* File Cards List */}
        <div className="space-y-3">
          {items.map(item => (
            <div 
              key={item.id} 
              className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 shadow-sm flex flex-col gap-3 transition hover:border-slate-700"
            >
              {/* Top row: Icon, Name, Target Format Selector, Actions */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0">
                    {item.category === 'audio' ? (
                      <FileAudio className="w-5 h-5 text-indigo-400" />
                    ) : item.category === 'image' ? (
                      <FileImage className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <FileQuestion className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatBytes(item.size)} · <span className="uppercase text-slate-300 font-semibold">{item.originalExt}</span>
                    </p>
                  </div>
                </div>

                {/* Target Selector */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 hidden sm:inline">转换为:</span>
                  <select
                    value={item.targetFormat}
                    disabled={item.status === 'converting'}
                    onChange={(e) => {
                      setItems(prev => prev.map(i => i.id === item.id ? { 
                        ...i, 
                        targetFormat: e.target.value,
                        status: 'idle',
                        resultUrl: null,
                        resultFile: null 
                      } : i));
                    }}
                    className="bg-slate-800 text-indigo-300 border border-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar (during conversion) */}
              {item.status === 'converting' && (
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {/* Bottom row: Conversion status & Result download / share */}
              <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-800/60">
                <div>
                  {item.status === 'idle' && (
                    <span className="text-slate-400">准备就绪</span>
                  )}
                  {item.status === 'converting' && (
                    <span className="text-indigo-400 flex items-center gap-1.5 font-medium animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {item.category === 'audio' ? `FFmpeg 转换中... (${item.progress}%)` : '转换处理中...'}
                    </span>
                  )}
                  {item.status === 'success' && (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      已完成 ({formatBytes(item.resultSize)})
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {item.error}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'idle' && (
                    <button
                      onClick={() => handleConvert(item)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition active:scale-95 flex items-center gap-1"
                    >
                      <span>开始转换</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {item.status === 'error' && (
                    <button
                      onClick={() => handleConvert(item)}
                      className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition active:scale-95"
                    >
                      重试
                    </button>
                  )}

                  {item.status === 'success' && (
                    <>
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
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 flex items-center gap-1"
                            title="试听转换后的音频"
                          >
                            {item.isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-indigo-400" />}
                            <span>{item.isPlaying ? '暂停' : '试听'}</span>
                          </button>
                        </>
                      )}

                      {/* Share / Forward to other Apps (iOS, Android, Mac) */}
                      <button
                        onClick={() => handleShare(item)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-medium transition active:scale-95 flex items-center gap-1"
                        title="转发/分享到微信、备忘录、隔空投送等"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>转发 / 分享</span>
                      </button>

                      {/* Direct Local Download */}
                      <button
                        onClick={() => handleDownload(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm shadow-emerald-600/30 transition active:scale-95 flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>保存下载</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* iOS & Mobile Usage Guide Modal */}
      {iosTipOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                iPhone / iPad 使用指南
              </h3>
              <button 
                onClick={() => setIosTipOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="font-semibold text-indigo-300 mb-1">📲 1. 添加到桌面变成 App</p>
                <p className="text-slate-400">
                  在 Safari 浏览器中点击底部【分享】按钮 ➡️ 选择【添加到主屏幕】，即可像原生 App 一样全屏无地址栏运行。
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="font-semibold text-indigo-300 mb-1">🎙️ 2. 如何导入「语音备忘录」录音？</p>
                <p className="text-slate-400">
                  打开语音备忘录 ➡️ 点击录音的「···」 ➡️ 选择【存储到“文件”】。回到本工具点击【选择文件】➡️【选取文件】，即可直接选入 .m4a 录音转成 MP3！
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="font-semibold text-indigo-300 mb-1">📤 3. 转发到微信 / 备忘录 / 其他 App</p>
                <p className="text-slate-400">
                  转换完成后，点击【转发 / 分享】按钮，会自动唤起 iOS 系统的分享面板，直接发给微信好友或隔空投送。
                </p>
              </div>
            </div>

            <button
              onClick={() => setIosTipOpen(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto pt-10 pb-4 text-center text-xs text-slate-500">
        <p>基于 WebAssembly + Canvas 驱动 · 100% 客户端本地计算 · 零服务器依赖</p>
      </footer>
    </div>
  );
}
