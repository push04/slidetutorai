import { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Send, Volume2, VolumeX, Bot, User, Loader2, Trash2,
  Globe, Sparkles, MessageSquare, ChevronDown, Check, Copy, Download,
  Zap, BookOpen, Lightbulb, Calculator, Code, FileText
} from 'lucide-react';
import { Card, CardContent } from './enhanced/Card';
import { Button } from './enhanced/Button';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Language {
  code: string;
  name: string;
  flag: string;
  voiceLang: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧', voiceLang: 'en-US' },
  { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳', voiceLang: 'hi-IN' },
  { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸', voiceLang: 'es-ES' },
  { code: 'fr', name: 'Français (French)', flag: '🇫🇷', voiceLang: 'fr-FR' },
  { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪', voiceLang: 'de-DE' },
  { code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳', voiceLang: 'zh-CN' },
  { code: 'ja', name: '日本語 (Japanese)', flag: '🇯🇵', voiceLang: 'ja-JP' },
  { code: 'ko', name: '한국어 (Korean)', flag: '🇰🇷', voiceLang: 'ko-KR' },
  { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦', voiceLang: 'ar-SA' },
  { code: 'pt', name: 'Português (Portuguese)', flag: '🇧🇷', voiceLang: 'pt-BR' },
  { code: 'ru', name: 'Русский (Russian)', flag: '🇷🇺', voiceLang: 'ru-RU' },
  { code: 'it', name: 'Italiano (Italian)', flag: '🇮🇹', voiceLang: 'it-IT' },
  { code: 'tr', name: 'Türkçe (Turkish)', flag: '🇹🇷', voiceLang: 'tr-TR' },
  { code: 'pl', name: 'Polski (Polish)', flag: '🇵🇱', voiceLang: 'pl-PL' },
  { code: 'nl', name: 'Nederlands (Dutch)', flag: '🇳🇱', voiceLang: 'nl-NL' },
];

const QUICK_PROMPTS = [
  { icon: BookOpen, text: 'Explain this concept simply', category: 'Learning' },
  { icon: Lightbulb, text: 'Give me practice problems', category: 'Practice' },
  { icon: Calculator, text: 'Help me solve this step-by-step', category: 'Problem Solving' },
  { icon: Code, text: 'Explain this code/formula', category: 'Technical' },
  { icon: FileText, text: 'Summarize this topic', category: 'Summary' },
  { icon: Zap, text: 'Quick quiz me on this', category: 'Quiz' },
];

const SILENCE_DURATION = 1500;

export function ProfessionalAICoach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(LANGUAGES[0]);
  const [showLanguages, setShowLanguages] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [apiKey, setApiKey] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputTextRef = useRef<string>('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const envKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (envKey && envKey !== '') {
      setApiKey(envKey);
    }

    // Load conversation history from localStorage
    try {
      const saved = localStorage.getItem('ai-coach-messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
        const results = Array.from(event.results);
        const latest = results[results.length - 1];
        const transcript = (latest as any)[0].transcript;
        
        if ((latest as any).isFinal) {
          const newText = inputTextRef.current + ' ' + transcript;
          inputTextRef.current = newText.trim();
          setInputText(newText.trim());
          
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          silenceTimerRef.current = setTimeout(() => {
            const textToSend = inputTextRef.current.trim();
            if (alwaysOn && textToSend) {
              sendMessage(textToSend);
            }
          }, SILENCE_DURATION);
        } else {
          const base = inputTextRef.current.split(' ').slice(0, -1).join(' ');
          const newText = base ? `${base} ${transcript}` : transcript;
          setInputText(newText);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'no-speech' && alwaysOn) {
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch (e) {}
          }, 100);
        } else if (event.error !== 'aborted') {
          console.error('Speech recognition error:', event.error);
        }
      };

      recognitionRef.current.onend = () => {
        if (alwaysOn && isListening) {
          try {
            recognitionRef.current?.start();
          } catch (e) {}
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage.voiceLang;
    }
  }, [selectedLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Save or clear conversation history in localStorage
    try {
      if (messages.length > 0) {
        localStorage.setItem('ai-coach-messages', JSON.stringify(messages));
      } else {
        localStorage.removeItem('ai-coach-messages');
      }
    } catch (error) {
      console.error('Failed to save/clear conversation history:', error);
    }
  }, [messages, streamingMessage]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    if (!apiKey || apiKey.trim() === '') {
      toast.error('⚠️ OpenRouter API key not found! Please set VITE_OPENROUTER_API_KEY in your environment.', {
        duration: 5000,
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    inputTextRef.current = '';
    setIsLoading(true);
    setStreamingMessage('');
    setShowQuickPrompts(false);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const freeModels = [
        'meta-llama/llama-3.3-70b-instruct:free',
        'deepseek/deepseek-r1:free',
        'google/gemini-2.0-flash-exp:free',
        'qwen/qwen-2.5-72b-instruct:free',
        'meta-llama/llama-3.1-70b-instruct:free',
        'mistralai/mistral-7b-instruct:free',
        'meta-llama/llama-3.1-8b-instruct:free',
        'qwen/qwen-2.5-7b-instruct:free',
        'google/gemma-2-9b-it:free',
        'microsoft/phi-4:free',
      ];

      const systemPrompt = {
        role: 'system',
        content: `You are an expert AI tutor for SlideTutor AI. Respond in ${selectedLanguage.name}.

🎯 Teaching Philosophy:
• Use the Socratic method - guide students to discover answers
• Break complex concepts into digestible steps
• Provide real-world examples and analogies
• Encourage critical thinking with thought-provoking questions
• Be patient, supportive, and encouraging
• Adapt to the student's learning level

💬 Communication Style:
• Clear, concise, and engaging responses
• Use markdown for better readability
• Include examples when helpful
• Ask clarifying questions when needed

📚 Subject Coverage:
• Math, Science, History, Languages, Programming, Arts, and MORE
• Provide accurate, helpful information
• Admit when unsure rather than making things up

⚡ Quick Response Mode:
• Keep responses focused and actionable
• Prioritize understanding over length
• Use bullet points for clarity

Remember: You're empowering students to truly understand and master topics!`
      };

      let responseReceived = false;
      let fullResponse = '';
      let lastError: { status: number; message: string } | null = null;

      for (const model of freeModels) {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.origin,
              'X-Title': 'SlideTutor AI Coach',
            },
            body: JSON.stringify({
              model: model,
              messages: [
                systemPrompt, 
                ...messages.map(m => ({ role: m.role, content: m.content })), 
                { role: 'user', content: messageText }
              ],
              temperature: 0.7,
              max_tokens: 2048,
              stream: true, // Enable streaming for faster responses
            }),
            signal: abortControllerRef.current.signal,
          });

          if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            console.warn(`Model ${model} failed with status ${response.status}:`, errorBody);
            
            // Capture 401 errors specially
            if (response.status === 401) {
              lastError = { status: 401, message: errorBody };
            }
            continue;
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      fullResponse += content;
                      setStreamingMessage(fullResponse);
                      responseReceived = true;
                    }
                  } catch (e) {
                    // Ignore parsing errors for incomplete chunks
                  }
                }
              }
            }

            if (responseReceived) {
              break;
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            throw err;
          }
          continue;
        }
      }

      if (!responseReceived || !fullResponse) {
        // Provide specific error message for 401 (invalid API key)
        if (lastError && lastError.status === 401) {
          throw new Error('🔑 Invalid API Key!\n\nYour OpenRouter API key is not valid. Please:\n\n1. Go to https://openrouter.ai/\n2. Sign up or log in\n3. Generate a new API key\n4. Set it in your Replit Secrets as VITE_OPENROUTER_API_KEY\n5. Restart the workflow\n\nNeed help? Visit OpenRouter documentation.');
        }
        
        throw new Error('❌ Unable to get AI response. Please check:\n1. Your API key is valid\n2. You have internet connection\n3. OpenRouter service is available\n\nTry again in a moment!');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingMessage('');

      if (autoSpeak && synthRef.current) {
        speakText(fullResponse);
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('AI response error:', error);
        toast.error(error.message || 'Failed to get AI response');
      }
      setStreamingMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeForSpeech = (text: string) => {
    return text
      .replace(/```[\s\S]*?```/g, ' code block. ')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(normalizeForSpeech(text));
    utterance.lang = selectedLanguage.voiceLang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith(selectedLanguage.code));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  };

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in this browser', {
        duration: 4000,
        icon: '🌐',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setAlwaysOn(false);
    } else {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        toast.error('Please allow microphone access to use voice features', {
          duration: 5000,
          icon: '🎤',
        });
        return;
      }
      
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('🎤 Listening... Speak naturally!', {
          duration: 3000,
          icon: '✨',
        });
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast.error('Failed to start voice recognition. Please try again.', {
          duration: 4000,
        });
      }
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const clearConversation = () => {
    if (messages.length > 0 && !confirm('Clear conversation history? This cannot be undone.')) {
      return;
    }
    setMessages([]);
    setStreamingMessage('');
    setShowQuickPrompts(true);
    toast.success('Conversation cleared');
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard!');
  };

  const exportConversation = () => {
    const text = messages.map(m => `${m.role.toUpperCase()}: ${m.content}\n---\n`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-coach-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conversation exported!');
  };

  const useQuickPrompt = (promptText: string) => {
    setInputText(promptText);
    inputTextRef.current = promptText;
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* API Key Warning Banner */}
        {(!apiKey || apiKey.trim() === '') && (
          <div className="glass-card p-5 rounded-2xl border-2 border-yellow-500/50 bg-yellow-500/10 mb-6 animate-in fade-in slide-in-from-top duration-500">
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-3xl">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-yellow-500 mb-2">API Key Not Configured</h3>
                <p className="text-sm text-foreground/80 mb-3">
                  To use the AI Coach, you need to set up your OpenRouter API key:
                </p>
                <ol className="text-sm text-foreground space-y-2 ml-4 list-decimal marker:text-yellow-500 marker:font-bold">
                  <li>Visit <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">openrouter.ai</a> and create a free account</li>
                  <li>Generate a new API key from your dashboard</li>
                  <li>Add it to Replit Secrets as <code className="px-2 py-1 bg-muted rounded font-mono text-xs font-bold">VITE_OPENROUTER_API_KEY</code></li>
                  <li>Restart the workflow to apply changes</li>
                </ol>
              </div>
            </div>
          </div>
        )}
        
        {/* Ultra-Professional Header */}
        <div className="glass-card rounded-3xl border border-border/40 p-6 mb-6 bg-gradient-to-br from-primary/5 via-purple-500/5 to-blue-500/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-purple-500/10 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-500 to-blue-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-blue-500 flex items-center justify-center shadow-2xl">
                    <Sparkles className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent">
                    Professional AI Coach
                  </h1>
                  <p className="text-muted-foreground mt-1">Advanced AI tutor with real-time streaming • 15 Languages • 10+ Free AI Models</p>
                </div>
              </div>

              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguages(!showLanguages)}
                  className="flex items-center gap-3 px-5 py-3 glass-card border border-border/40 rounded-xl hover:border-primary/50 transition-all hover:scale-105"
                >
                  <Globe className="w-5 h-5 text-primary" />
                  <span className="text-2xl">{selectedLanguage.flag}</span>
                  <span className="font-semibold text-foreground">{selectedLanguage.name}</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showLanguages && "rotate-180")} />
                </button>

                {showLanguages && (
                  <div className="absolute top-full right-0 mt-2 w-72 glass-card border border-border/40 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto scrollbar-thin">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setShowLanguages(false);
                          toast.success(`Language: ${lang.name}`);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-all",
                          selectedLanguage.code === lang.code && "bg-primary/20 border-l-4 border-primary"
                        )}
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <span className="flex-1 text-left font-medium text-foreground">{lang.name}</span>
                        {selectedLanguage.code === lang.code && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Control Panel */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 glass-card border border-border/40 rounded-xl">
                <Volume2 className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium text-foreground">Auto-speak</label>
                <button
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-all",
                    autoSpeak ? "bg-gradient-to-r from-primary to-purple-500" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-lg",
                      autoSpeak && "translate-x-5"
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 glass-card border border-border/40 rounded-xl">
                <Mic className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium text-foreground">Always-on Voice</label>
                <button
                  onClick={() => {
                    setAlwaysOn(!alwaysOn);
                    if (!alwaysOn && !isListening) {
                      toggleListening();
                    }
                  }}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-all",
                    alwaysOn ? "bg-gradient-to-r from-primary to-purple-500" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-lg",
                      alwaysOn && "translate-x-5"
                    )}
                  />
                </button>
              </div>

              <Button
                onClick={exportConversation}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={messages.length === 0}
              >
                <Download className="w-4 h-4" />
                Export
              </Button>

              <Button
                onClick={clearConversation}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Prompts */}
        {showQuickPrompts && messages.length === 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Start Templates
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {QUICK_PROMPTS.map((prompt, idx) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => useQuickPrompt(prompt.text)}
                    className="glass-card border border-border/40 rounded-xl p-4 hover:border-primary/50 hover:bg-primary/5 transition-all hover:scale-105 text-left group"
                  >
                    <Icon className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                    <div className="text-sm font-semibold text-foreground">{prompt.text}</div>
                    <div className="text-xs text-muted-foreground mt-1">{prompt.category}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Messages */}
        <Card className="mb-6 h-[calc(100vh-500px)] flex flex-col">
          <CardContent className="p-6 flex-1 overflow-y-auto scrollbar-thin">
            {messages.length === 0 && !streamingMessage ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center mb-6 animate-pulse">
                  <MessageSquare className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Start Learning!</h3>
                <p className="text-muted-foreground max-w-md">
                  Ask me anything in {selectedLanguage.name}. I provide instant, streaming responses!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="flex flex-col gap-2 max-w-[75%]">
                      <div
                        className={cn(
                          "px-6 py-4 rounded-2xl shadow-lg relative group",
                          message.role === 'user'
                            ? "bg-gradient-to-br from-primary to-blue-500 text-white"
                            : "glass-card border border-border/40"
                        )}
                      >
                        {message.role === 'user' ? (
                          <div className="text-white whitespace-pre-wrap">
                            {message.content}
                          </div>
                        ) : (
                          <div className="prose prose-sm prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                              components={{
                                code: ({node, inline, className, children, ...props}: any) => {
                                  return !inline ? (
                                    <pre className={cn("rounded-lg p-3 bg-muted/30 overflow-x-auto my-2", className)}>
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                  ) : (
                                    <code className="px-1.5 py-0.5 rounded bg-muted/30 text-primary" {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                a: ({children, href}: any) => (
                                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    {children}
                                  </a>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                        {message.role === 'assistant' && (
                          <button
                            onClick={() => copyMessage(message.content)}
                            className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity glass-card border border-border/40 rounded-lg hover:bg-primary/10"
                          >
                            <Copy className="w-4 h-4 text-foreground" />
                          </button>
                        )}
                      </div>
                      <div className={cn(
                        "text-xs opacity-70 px-2",
                        message.role === 'user' ? "text-right text-foreground" : "text-left text-muted-foreground"
                      )}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Streaming Message */}
                {streamingMessage && (
                  <div className="flex gap-4 justify-start animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="glass-card border border-border/40 px-6 py-4 rounded-2xl shadow-lg max-w-[75%]">
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            code: ({node, inline, className, children, ...props}: any) => {
                              return !inline ? (
                                <pre className={cn("rounded-lg p-3 bg-muted/30 overflow-x-auto my-2", className)}>
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              ) : (
                                <code className="px-1.5 py-0.5 rounded bg-muted/30 text-primary" {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {streamingMessage}
                        </ReactMarkdown>
                        <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse"></span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Loading Indicator */}
                {isLoading && !streamingMessage && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="glass-card border border-border/40 px-6 py-4 rounded-2xl shadow-lg">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-muted-foreground">AI is thinking...</span>
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ultra-Fast Input Area */}
        <div className="glass-card rounded-2xl border border-border/40 p-4 bg-gradient-to-br from-background/95 to-primary/5">
          <div className="flex items-center gap-4">
            <Button
              onClick={toggleListening}
              className={cn(
                "w-12 h-12 rounded-full transition-all shadow-lg flex-shrink-0",
                isListening
                  ? "bg-gradient-to-br from-red-500 to-pink-500 animate-pulse shadow-red-500/50"
                  : "bg-gradient-to-br from-primary to-purple-500 hover:shadow-primary/50"
              )}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                inputTextRef.current = e.target.value;
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && inputText.trim()) {
                  e.preventDefault();
                  sendMessage(inputText);
                }
              }}
              placeholder={`Ask me anything in ${selectedLanguage.name}... (Press Enter to send)`}
              className="flex-1 px-6 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              disabled={isLoading}
            />

            {isSpeaking && (
              <Button
                onClick={stopSpeaking}
                variant="outline"
                size="sm"
                className="gap-2 flex-shrink-0"
              >
                <VolumeX className="w-4 h-4" />
              </Button>
            )}

            <Button
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-500 shadow-lg hover:shadow-xl transition-all hover:scale-110 flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalAICoach;
