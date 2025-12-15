import React, { useState, useRef, useEffect } from 'react';
import { generateSpeech } from './services/geminiService';
import { parseFile } from './utils/fileParser';
import Button from './components/Button';
import Footer from './components/Footer';
import { TTSStatus } from './types';

// Helper to write string to DataView for WAV header
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Helper to add WAV header to raw PCM data
// Gemini 2.5 Flash TTS typically returns 24kHz, 16-bit mono PCM
const createWavBlob = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8); 
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Write PCM data
  const pcmBytes = new Uint8Array(buffer, 44);
  pcmBytes.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
};

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [status, setStatus] = useState<TTSStatus>(TTSStatus.IDLE);
  const [voice, setVoice] = useState<string>('Puck'); // Default neutral/male-ish
  const [speed, setSpeed] = useState<number>(1.0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false); // State for custom play button
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL when unmounting or changing
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Reset playing state when audio url changes
  useEffect(() => {
    setIsPlaying(false);
  }, [audioUrl]);

  // Apply playback speed whenever it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus(TTSStatus.LOADING);
      const parsedText = await parseFile(file);
      setText(parsedText);
      setStatus(TTSStatus.IDLE);
    } catch (error) {
      console.error(error);
      alert('Không thể đọc file. Vui lòng thử lại với định dạng khác.');
      setStatus(TTSStatus.ERROR);
    } finally {
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConvert = async () => {
    if (!text.trim()) {
      alert('Vui lòng nhập nội dung văn bản!');
      return;
    }

    try {
      setStatus(TTSStatus.LOADING);
      
      // Call Gemini API
      const base64Audio = await generateSpeech(text, voice);
      
      // Convert base64 string to Uint8Array (PCM Data)
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create a valid WAV blob from PCM data
      // Gemini API typically returns 24kHz raw PCM
      const blob = createWavBlob(bytes, 24000);
      
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setStatus(TTSStatus.SUCCESS);
      
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi chuyển đổi giọng nói. Vui lòng kiểm tra API Key hoặc thử lại sau.');
      setStatus(TTSStatus.ERROR);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-300 bg-gradient-to-b from-navy-900 to-navy-800">
      
      {/* Navbar / Header */}
      <header className="py-6 px-4 border-b border-navy-800 bg-navy-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20 flex-shrink-0">
              <i className="fas fa-microphone-alt text-navy-900 text-xl"></i>
            </div>
            <h1 className="text-xl md:text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-gold-200 to-gold-400 tracking-wide uppercase">
              TẠO VĂN BẢN THÀNH GIỌNG NÓI
            </h1>
          </div>
          <div className="text-white font-bold text-base md:text-lg tracking-wide shadow-black drop-shadow-md border-b-2 border-gold-500 pb-1">
            Tạo bởi Gv Nguyễn Văn Thành
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          
          {/* Column 1: Input & Configuration */}
          <div className="space-y-6">
            <div className="bg-navy-800/50 p-6 rounded-2xl border border-navy-800 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gold-400 flex items-center gap-2">
                  <i className="fas fa-keyboard"></i> Nhập liệu
                </h2>
                
                {/* File Upload Trigger */}
                <div className="relative">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".txt,.pdf,.docx,.doc"
                    className="hidden"
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload"
                    className="cursor-pointer text-xs font-bold text-navy-900 bg-gold-500 hover:bg-gold-400 px-3 py-1.5 rounded flex items-center gap-2 transition-colors"
                  >
                    <i className="fas fa-cloud-upload-alt"></i> Tải file (PDF/DOCX)
                  </label>
                </div>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Nhập văn bản hoặc tải file lên đây..."
                className="w-full h-64 bg-navy-900 border border-navy-700 rounded-xl p-4 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/50 transition-all resize-none leading-relaxed"
              ></textarea>
              
              <div className="mt-2 text-right text-xs text-slate-500">
                {text.length} ký tự
              </div>
            </div>

            <div className="bg-navy-800/50 p-6 rounded-2xl border border-navy-800 shadow-xl backdrop-blur-sm space-y-6">
              <h2 className="text-xl font-bold text-gold-400 flex items-center gap-2">
                <i className="fas fa-sliders-h"></i> Cấu hình
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Language Selection - Explicitly requested */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-400">Ngôn ngữ</label>
                  <div className="relative">
                    <select 
                      disabled
                      className="w-full appearance-none bg-navy-900 border border-navy-700 text-gold-500 py-3 px-4 rounded-lg focus:outline-none focus:border-gold-500/50 opacity-80 cursor-not-allowed"
                      value="vi"
                    >
                      <option value="vi">Tiếng Việt (Vietnam)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gold-500">
                      <i className="fas fa-check text-xs"></i>
                    </div>
                  </div>
                </div>

                {/* Voice Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-400">Giọng đọc</label>
                  <div className="relative">
                    <select 
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      className="w-full appearance-none bg-navy-900 border border-navy-700 text-slate-200 py-3 px-4 rounded-lg focus:outline-none focus:border-gold-500/50 transition-colors"
                    >
                      <option value="Puck">Nam (Trầm)</option>
                      <option value="Kore">Nữ (Dịu dàng)</option>
                      <option value="Fenrir">Nam (Mạnh mẽ)</option>
                      <option value="Ao">Nữ (Tự nhiên)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gold-500">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </div>
                  </div>
                </div>

                {/* Speed Selection */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400">Tốc độ đọc</label>
                  <div className="flex items-center gap-4 bg-navy-900 p-1.5 rounded-lg border border-navy-700">
                     <button 
                        onClick={() => setSpeed(0.75)}
                        className={`flex-1 py-1.5 rounded text-sm font-medium transition-all ${speed === 0.75 ? 'bg-gold-500 text-navy-900' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       Chậm
                     </button>
                     <button 
                        onClick={() => setSpeed(1.0)}
                        className={`flex-1 py-1.5 rounded text-sm font-medium transition-all ${speed === 1.0 ? 'bg-gold-500 text-navy-900' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       Trung bình
                     </button>
                     <button 
                        onClick={() => setSpeed(1.5)}
                        className={`flex-1 py-1.5 rounded text-sm font-medium transition-all ${speed === 1.5 ? 'bg-gold-500 text-navy-900' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       Nhanh
                     </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                 <Button 
                    onClick={handleConvert} 
                    isLoading={status === TTSStatus.LOADING}
                    className="w-full text-lg shadow-gold-500/10"
                  >
                    <i className="fas fa-wand-magic-sparkles"></i>
                    Chuyển đổi sang Giọng nói
                 </Button>
              </div>
            </div>
          </div>

          {/* Column 2: Output & Result */}
          <div className="flex flex-col h-full">
            <div className="bg-navy-800/50 p-8 rounded-2xl border border-navy-800 shadow-xl backdrop-blur-sm flex-grow flex flex-col items-center justify-center text-center relative overflow-hidden group">
              
              {/* Decoration Background */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-navy-900/50 opacity-50 pointer-events-none"></div>
              
              {!audioUrl ? (
                 <div className="z-10 flex flex-col items-center space-y-4 text-slate-600">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                       <i className="fas fa-headphones text-4xl"></i>
                    </div>
                    <p>Kết quả âm thanh sẽ hiển thị tại đây</p>
                 </div>
              ) : (
                <div className="w-full z-10 flex flex-col items-center space-y-8 animate-fade-in-up">
                   
                   <div className="relative">
                      <div className={`absolute -inset-4 bg-gold-500/20 rounded-full blur-xl ${isPlaying ? 'animate-pulse' : ''}`}></div>
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-2xl shadow-gold-500/30 relative">
                         <i className={`fas fa-${isPlaying ? 'volume-up' : 'music'} text-navy-900 text-5xl`}></i>
                         {/* Spinning ring only when playing */}
                         {isPlaying && (
                           <div className="absolute inset-0 border-4 border-white/20 rounded-full border-t-white/80 animate-spin-slow"></div>
                         )}
                      </div>
                   </div>

                   <h3 className="text-2xl font-serif font-bold text-white">Audio đã sẵn sàng!</h3>
                   
                   <div className="w-full bg-navy-900 p-4 rounded-xl border border-gold-500/30 shadow-lg">
                      <audio 
                        ref={audioRef}
                        controls 
                        src={audioUrl} 
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        className="w-full h-10 [&::-webkit-media-controls-panel]:bg-navy-800 [&::-webkit-media-controls-play-button]:text-gold-500"
                      />
                   </div>

                   <div className="flex flex-col gap-3 w-full">
                      <div className="flex gap-4 w-full">
                          {/* Custom Play Button */}
                          <Button 
                            onClick={togglePlayback} 
                            className="flex-1"
                            variant={isPlaying ? 'secondary' : 'primary'}
                          >
                            <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`}></i> 
                            {isPlaying ? 'Dừng' : 'Nghe thử'}
                          </Button>

                          {/* Download Button */}
                          <a 
                            href={audioUrl} 
                            download="vinavoice-gold-output.wav"
                            className="flex-1"
                          >
                            <Button className="w-full" variant="secondary">
                              <i className="fas fa-download"></i> Tải WAV
                            </Button>
                          </a>
                      </div>
                      
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setAudioUrl(null);
                          setStatus(TTSStatus.IDLE);
                          setIsPlaying(false);
                        }}
                        className="w-full bg-transparent border-none text-slate-500 hover:text-gold-400 hover:bg-transparent shadow-none"
                      >
                        <i className="fas fa-redo"></i> Làm mới
                      </Button>
                   </div>
                </div>
              )}
            </div>
            
            {/* Info Card / Ad-hoc info */}
            <div className="mt-6 bg-gradient-to-r from-navy-800 to-navy-900 border border-gold-500/20 p-4 rounded-xl flex items-start gap-4">
              <div className="text-gold-500 mt-1">
                <i className="fas fa-info-circle text-xl"></i>
              </div>
              <div>
                <h4 className="font-bold text-slate-200 text-sm mb-1">Mẹo sử dụng</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Để có chất lượng tốt nhất, hãy chia nhỏ văn bản dài thành các đoạn ngắn. Tốc độ đọc có thể được điều chỉnh trực tiếp trên trình phát sau khi tạo.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default App;