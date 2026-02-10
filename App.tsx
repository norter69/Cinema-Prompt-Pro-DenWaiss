
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ShotType, MovementGroup, Movement } from './types';
import { SHOT_CONFIGS, MOVEMENTS } from './constants';
import { GeminiService, ReferenceImage } from './geminiService';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

// Helper functions for audio processing
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const App: React.FC = () => {
  const [shotType, setShotType] = useState<ShotType>(ShotType.MEDIUM);
  const [content, setContent] = useState<string>("");
  const [translatedDraftContent, setTranslatedDraftContent] = useState<string>("");
  const [selectedMovementIds, setSelectedMovementIds] = useState<string[]>(["STATIC_LOCKED"]);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string>("");
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);
  
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const gemini = useMemo(() => new GeminiService(), []);

  // Sync draft prompt - ensuring English terms
  useEffect(() => {
    const shotConfig = SHOT_CONFIGS[shotType];
    const selectedMovements = MOVEMENTS.filter(m => selectedMovementIds.includes(m.id));
    
    if (shotConfig && selectedMovements.length > 0) {
      if (isAiGenerated) return;

      const displayContent = translatedDraftContent || (/[а-яА-ЯёЁ]/.test(content) ? "..." : content.trim());
      const contentPart = displayContent && displayContent !== "..." ? ` featuring ${displayContent}` : "";
      const movementDesc = selectedMovements.map(m => m.description).join(' ');
      
      setEnhancedPrompt(`${shotConfig.shot} using a ${shotConfig.lens}${contentPart}. ${movementDesc}`);
    }
  }, [shotType, translatedDraftContent, content, selectedMovementIds, isAiGenerated]);

  // Debounced auto-translation for the draft preview
  useEffect(() => {
    const isRussian = /[а-яА-ЯёЁ]/.test(content);
    
    if (!content.trim()) {
      setTranslatedDraftContent("");
      return;
    }

    if (!isRussian) {
      setTranslatedDraftContent(content.trim());
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const translated = await gemini.translateToEnglish(content);
        setTranslatedDraftContent(translated);
      } catch (e) {
        console.error("Auto-draft translation failed", e);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [content, gemini]);

  const handleTranslateInput = async () => {
    if (!content.trim()) return;
    setIsTranslating(true);
    try {
      const translated = await gemini.translateToEnglish(content);
      setContent(translated);
      setTranslatedDraftContent(translated);
    } catch (err) {
      console.error("Translation failed", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleMovement = (id: string) => {
    setSelectedMovementIds(prev => {
      if (id === 'STATIC_LOCKED') return ['STATIC_LOCKED'];
      
      const isSelected = prev.includes(id);
      let next: string[];
      
      if (isSelected) {
        next = prev.filter(mid => mid !== id);
        if (next.length === 0) return ['STATIC_LOCKED'];
        return next;
      } else {
        // If selecting a movement and static is currently selected, replace static
        next = prev.filter(mid => mid !== 'STATIC_LOCKED');
        return [...next, id];
      }
    });
    setIsAiGenerated(false);
  };

  const handleEnhanceWithAI = async () => {
    if (!content.trim() && !referenceImage) return;
    setIsEnhancing(true);
    try {
      const result = await gemini.generateEnhancedPrompt(shotType, content, selectedMovementIds, referenceImage);
      setEnhancedPrompt(result);
      setIsAiGenerated(true); 
    } catch (err) {
      console.error("Enhancement failed", err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const startRecording = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputAudioContext;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
            setIsRecording(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setContent(prev => prev + text);
            }
          },
          onerror: (e) => console.error('Live API Error:', e),
          onclose: () => setIsRecording(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: 'You are a transcriber. Convert audio into clear text. 100% precision.'
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = () => {
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    setIsRecording(false);
  };

  const toggleRecording = () => isRecording ? stopRecording() : startRecording();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setReferenceImage({ data: base64String, mimeType: file.type });
      setImagePreviewUrl(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setReferenceImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopy = () => navigator.clipboard.writeText(enhancedPrompt);

  const groupedMovements = useMemo(() => {
    const groups: Record<string, Movement[]> = {};
    MOVEMENTS.forEach(m => {
      if (!groups[m.group]) groups[m.group] = [];
      groups[m.group].push(m);
    });
    return groups;
  }, []);

  const needsTranslation = useMemo(() => /[а-яА-ЯёЁ]/.test(content), [content]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-200 selection:bg-amber-500/30">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase tracking-tighter text-nowrap">CINEPROMPT PRO</h1>
          </div>
          <div className="flex gap-4">
             <button 
              onClick={handleEnhanceWithAI} 
              disabled={isEnhancing || (!content.trim() && !referenceImage)}
              className={`px-4 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border shadow-lg shadow-amber-500/20 active:scale-95 ${
                isEnhancing || (!content.trim() && !referenceImage)
                  ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed' 
                  : 'bg-amber-500 hover:bg-amber-400 text-black border-amber-600'
              }`}
            >
              {isEnhancing ? 'Генерация...' : 'Улучшить + Перевод (AI)'}
              {!isEnhancing && (
                <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-amber-500 tracking-widest uppercase flex items-center gap-2">
                <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                Описание сцены
              </h2>
              <div className="flex gap-2">
                {needsTranslation && (
                  <button
                    onClick={handleTranslateInput}
                    disabled={isTranslating}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border ${
                      isTranslating 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-500' 
                        : 'bg-blue-500/10 border-blue-500/40 text-blue-400 hover:bg-blue-500/20'
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    {isTranslating ? 'Перевод...' : 'Перевести на English'}
                  </button>
                )}
                <button
                  onClick={toggleRecording}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border ${
                    isRecording 
                      ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' 
                      : 'bg-red-600 border-red-700 text-white hover:bg-red-500'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-white'}`} />
                  {isRecording ? 'Идет запись...' : 'Голосовой ввод'}
                </button>
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setIsAiGenerated(false);
              }}
              placeholder="Опишите сцену... Используйте кнопку 'Перевести', чтобы превратить русский текст в профессиональный английский промпт."
              className="w-full h-28 bg-zinc-950 border border-zinc-800 rounded-lg p-4 focus:ring-2 focus:ring-amber-500/50 resize-none text-zinc-300 transition-all placeholder:text-zinc-700 custom-scrollbar"
            />
          </section>

          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-amber-500 tracking-widest uppercase mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
              Визуальный референс
            </h2>
            <div className="flex items-center gap-6">
              {!imagePreviewUrl ? (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-zinc-800 rounded-xl p-8 hover:border-amber-500/50 hover:bg-zinc-800/30 transition-all text-center group"
                >
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-zinc-500 group-hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-zinc-400 text-sm font-medium">Загрузить изображение</p>
                </button>
              ) : (
                <div className="relative group w-full max-w-xs">
                  <img src={imagePreviewUrl} alt="Reference" className="w-full h-48 object-cover rounded-xl border border-amber-500/50 shadow-2xl" />
                  <button 
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 z-10"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>
          </section>

          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-amber-500 tracking-widest uppercase mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
              План и оптика
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.values(ShotType).map((type) => {
                const config = SHOT_CONFIGS[type];
                const isActive = shotType === type;
                const labels: Record<ShotType, string> = {
                  [ShotType.CLOSEUP]: 'Крупный план',
                  [ShotType.MEDIUM]: 'Средний план',
                  [ShotType.FULLBODY]: 'Общий план'
                };
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setShotType(type);
                      setIsAiGenerated(false);
                    }}
                    className={`relative p-4 rounded-lg border text-left transition-all group ${
                      isActive ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className={`text-xs font-bold uppercase mb-1 ${isActive ? 'text-amber-500' : 'text-zinc-500'}`}>
                      {labels[type]}
                    </div>
                    <div className="text-sm font-semibold text-white leading-tight mb-1">{config.lens}</div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-amber-500 tracking-widest uppercase mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
              Движение камеры (можно несколько)
            </h2>
            <div className="space-y-6">
              {(Object.entries(groupedMovements) as [string, Movement[]][]).map(([groupName, groupMovements]) => (
                <div key={groupName}>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-1 border-l-2 border-zinc-800 ml-1 pl-3">{groupName}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {groupMovements.map((m) => {
                      const isActive = selectedMovementIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleMovement(m.id)}
                          className={`px-3 py-2.5 rounded-md border text-xs font-medium transition-all text-center ${
                            isActive ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/10' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col group/prompt">
              <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Итоговый промпт {isAiGenerated ? '✨ (AI / English)' : '(Draft / English)'}
                </span>
                {isEnhancing && (
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce"></span>
                  </div>
                )}
              </div>
              <div className={`p-6 italic text-base leading-relaxed font-medium font-serif bg-gradient-to-br from-zinc-900 to-black min-h-[220px] transition-all duration-500 ${isEnhancing ? 'opacity-50 blur-[2px]' : 'opacity-100'} ${isAiGenerated ? 'text-amber-200/90 drop-shadow-sm' : 'text-zinc-600'}`}>
                {enhancedPrompt ? `"${enhancedPrompt}"` : "Опишите кадр..."}
              </div>
              <div className="p-4 bg-zinc-900/80 border-t border-zinc-800">
                <button 
                  onClick={handleCopy}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border border-zinc-700 active:scale-[0.98]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Скопировать промпт
                </button>
              </div>
            </div>

            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Статус</h4>
              <div className="space-y-3 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">Язык вывода</span>
                  <span className="text-amber-500 font-bold px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20 uppercase">English Only</span>
                </div>
                {needsTranslation && (
                  <div className="p-2 bg-amber-500/5 rounded border border-amber-500/20 text-amber-500/80 leading-snug">
                    Обнаружен русский текст. Черновик переводится автоматически (English Draft).
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">Движений выбрано</span>
                  <span className="text-zinc-400 font-medium">{selectedMovementIds.includes('STATIC_LOCKED') ? '1 (Static)' : selectedMovementIds.length}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-zinc-800 space-y-4">
                <p className="text-[11px] text-zinc-400 leading-relaxed italic text-center">
                  Спасибо, что пользуешься! Если зашло — подпишись на мой Telegram или YouTube, буду благодарен ❤️
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <a 
                    href="https://www.youtube.com/@realsbond" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-[#FF0000] hover:bg-[#CC0000] text-white rounded-lg transition-all text-[11px] font-bold shadow-lg shadow-red-500/10"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    YouTube
                  </a>
                  <a 
                    href="https://t.me/youtube_bez_sueti" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-[#0088cc] hover:bg-[#0077b3] text-white rounded-lg transition-all text-[11px] font-bold shadow-lg shadow-blue-500/10"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.13-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                    </svg>
                    Telegram
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-10 text-center text-zinc-700 text-[10px] tracking-[0.2em] uppercase font-bold">
        CINEPROMPT PRO &copy; 2024
      </footer>
    </div>
  );
};

export default App;
