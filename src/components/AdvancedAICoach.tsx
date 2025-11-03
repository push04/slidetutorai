import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic, MicOff, Send, VolumeX, Bot, User, Loader2, Trash2,
  Brain, MessageSquare, Settings as SettingsIcon
} from 'lucide-react';
import { Card, CardContent } from './enhanced/Card';
import { Button } from './enhanced/Button';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VADState {
  isDetecting: boolean;
  silenceTimer: NodeJS.Timeout | null;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
}

const SILENCE_DURATION = 1500; // ms of silence before stopping

export function AdvancedAICoach() {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const vadStateRef = useRef<VADState>({
    isDetecting: false,
    silenceTimer: null,
    audioContext: null,
    analyser: null,
  });
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputTextRef = useRef<string>(''); // Track latest input for always-on mode

  // Initialize API key and audio capabilities
  useEffect(() => {
    const envKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (envKey && envKey !== '') {
      setApiKey(envKey);
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      
      // Load voices
      if (synthRef.current.getVoices().length === 0) {
        synthRef.current.addEventListener('voiceschanged', () => {
          console.log('Voices loaded:', synthRef.current?.getVoices().length);
        });
      }
    }

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Continuous listening for always-on mode
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
        const results = Array.from(event.results);
        const latest = results[results.length - 1];
        const transcript = (latest as any)[0].transcript;
        
        if ((latest as any).isFinal) {
          const newText = inputTextRef.current + ' ' + transcript;
          inputTextRef.current = newText.trim();
          setInputText(newText.trim());
          
          // Reset VAD silence timer on speech
          if (vadStateRef.current.silenceTimer) {
            clearTimeout(vadStateRef.current.silenceTimer);
          }
          
          // Start silence detection timer - capture current text in closure
          vadStateRef.current.silenceTimer = setTimeout(() => {
            const textToSend = inputTextRef.current.trim();
            if (alwaysOn && textToSend) {
              // Use the ref value to avoid stale closure
              sendMessageWithText(textToSend);
            }
          }, SILENCE_DURATION);
        } else {
          const base = inputTextRef.current.split(' ').slice(0, -1).join(' ');
          const newText = base ? `${base} ${transcript}` : transcript;
          setInputText(newText);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'no-speech') {
          // Restart in always-on mode
          if (alwaysOn) {
            setTimeout(() => {
              if (recognitionRef.current && alwaysOn) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.log('Recognition already started');
                }
              }
            }, 100);
          }
        } else if (event.error !== 'aborted') {
          toast.error(`Voice error: ${event.error}`);
          setIsListening(false);
          setAlwaysOn(false);
        }
      };

      recognitionRef.current.onend = () => {
        // Auto-restart in always-on mode
        if (alwaysOn && !isSpeaking) {
          setTimeout(() => {
            if (recognitionRef.current && alwaysOn && !isSpeaking) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log('Recognition restart failed, already running');
              }
            }
          }, 100);
        } else {
          setIsListening(false);
        }
      };
    }

    // Welcome message
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: "Hello! I'm your AI Learning Coach. I'm here to teach, explain, and guide you through any topic you want to learn. Whether it's math, science, history, programming, or anything else - just ask! I'll explain things like a patient teacher would. What would you like to learn today?",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Recognition stop error:', e);
        }
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (vadStateRef.current.silenceTimer) {
        clearTimeout(vadStateRef.current.silenceTimer);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (vadStateRef.current.audioContext) {
        vadStateRef.current.audioContext.close();
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Toggle always-on voice mode
  const toggleAlwaysOnMode = useCallback(async () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (alwaysOn) {
      // Turning off
      setAlwaysOn(false);
      setIsListening(false);
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Stop error:', e);
      }
      toast.success('Always-on voice mode disabled');
    } else {
      // Turning on
      setAlwaysOn(true);
      setIsListening(true);
      try {
        recognitionRef.current.start();
        toast.success('Always-on voice mode enabled! Speak naturally, I\'m listening...');
      } catch (e) {
        console.log('Start error (may already be running):', e);
      }
    }
  }, [alwaysOn]);

  // Toggle push-to-talk mode
  const togglePushToTalk = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported.');
      return;
    }

    if (isListening && !alwaysOn) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else if (!alwaysOn) {
      setInputText('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('Listening... Speak now!');
      } catch (e) {
        console.log('Already listening');
      }
    }
  };

  // Text-to-speech with teacher voice
  const speak = useCallback((text: string) => {
    if (!synthRef.current) {
      toast.error('Text-to-speech not supported.');
      return;
    }

    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85; // Slower, more deliberate teaching pace
    utterance.pitch = 1.0;
    utterance.volume = 1;

    // Prefer teacher-like voices
    const voices = synthRef.current.getVoices();
    const teacherVoice = voices.find(v => 
      v.lang.startsWith('en') && (
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('karen')
      )
    ) || voices.find(v => v.lang.startsWith('en-US')) || voices[0];
    
    if (teacherVoice) {
      utterance.voice = teacherVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      // Pause listening while speaking
      if (alwaysOn && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Pause listening error:', e);
        }
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      // Resume listening in always-on mode
      if (alwaysOn && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.log('Resume listening error:', e);
          }
        }, 500);
      }
    };

    utterance.onerror = (e) => {
      console.error('Speech error:', e);
      setIsSpeaking(false);
    };

    synthRef.current.speak(utterance);
  }, [alwaysOn]);

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Helper to send message with specific text (for always-on mode)
  const sendMessageWithText = useCallback(async (messageText: string) => {
    if (!messageText) return;

    if (!apiKey) {
      toast.error('API key not configured');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    inputTextRef.current = ''; // Clear ref
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content
      }));

      // Teacher-like system prompt
      const teacherPrompt = {
        role: 'system' as const,
        content: `You are an expert AI Learning Coach and Teacher. Your goal is to help students learn effectively through clear explanations and patient guidance.

🎓 TEACHING PRINCIPLES:
• Explain concepts clearly and simply, like a patient teacher
• Break down complex topics into easy-to-understand parts
• Use analogies and real-world examples to illustrate ideas
• Be encouraging and supportive - celebrate understanding
• Ask clarifying questions to ensure comprehension
• Build on what the student already knows
• Make learning engaging and interesting

📚 EXPLANATION STYLE:
• Start with the big picture before diving into details
• Use conversational, friendly language
• Provide step-by-step explanations when needed
• Give examples and counter-examples
• Highlight key points clearly
• End with a brief summary of main ideas

💡 GENERAL KNOWLEDGE:
• You can teach ANY subject: math, science, history, languages, programming, arts, etc.
• Draw from your broad knowledge base
• Provide accurate, helpful information
• Admit when you're unsure rather than making things up

Remember: You're a teacher, not just an answer bot. Help students truly understand!`
      };

      // NOTE: This is a client-side API call which exposes the API key in the browser.
      // For production use, this should be proxied through a secure backend endpoint.
      // The current implementation is acceptable for a demo/prototype but not for production.
      
      // Try multiple free models with fallback (2025 verified working models)
      const freeModels = [
        'meta-llama/llama-3.3-70b-instruct:free',
        'deepseek/deepseek-r1:free',
        'meta-llama/llama-3.1-8b-instruct:free',
        'mistralai/mistral-7b-instruct:free',
        'google/gemini-2.0-flash-exp:free'
      ];

      let lastError: any = null;
      let data: any = null;

      for (const model of freeModels) {
        try {
          console.log(`Trying model: ${model}`);
          
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
              messages: [teacherPrompt, ...conversationHistory, { role: 'user', content: messageText }],
              temperature: 0.7,
              max_tokens: 2048,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.warn(`Model ${model} failed:`, response.status, errorData);
            lastError = errorData;
            continue; // Try next model
          }

          data = await response.json();
          
          if (data.choices && data.choices.length > 0) {
            console.log(`✓ Successfully using model: ${model}`);
            break; // Success! Exit loop
          } else {
            console.warn(`Model ${model} returned no choices`);
            continue;
          }
        } catch (err) {
          console.warn(`Model ${model} error:`, err);
          lastError = err;
          continue; // Try next model
        }
      }

      // If all models failed, throw error
      if (!data || !data.choices || data.choices.length === 0) {
        console.error('All AI models failed. Last error:', lastError);
        throw new Error('All AI models are currently unavailable. Please try again in a moment.');
      }
      
      console.log('OpenRouter API Response:', data);
      const aiResponse = data.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (autoSpeak && !isSpeaking) {
        speak(aiResponse);
      }
    } catch (error: any) {
      console.error('AI response error:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast.error(`AI Error: ${errorMessage}. Check console for details.`, { duration: 5000 });
      
      // Add error message to chat
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Error: ${errorMessage}\n\nPlease check:\n• Your API key is valid\n• You have internet connection\n• OpenRouter service is available\n\nTry again in a moment.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, messages, autoSpeak, speak, isSpeaking]);

  // Send message to AI
  const handleSendMessage = useCallback(async () => {
    const message = inputText.trim();
    if (!message) {
      if (!alwaysOn) {
        toast.error('Please enter a message or use voice');
      }
      return;
    }

    // Use the helper function
    inputTextRef.current = '';
    await sendMessageWithText(message);
  }, [inputText, sendMessageWithText]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([{
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: "Conversation cleared! What would you like to learn about next?",
      timestamp: new Date(),
    }]);
    stopSpeaking();
    toast.success('Conversation cleared');
  };

  if (!apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card variant="gradient" className="max-w-md w-full">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">AI Coach Not Configured</h2>
              <p className="text-muted-foreground">
                API key is required but not found in environment variables.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Learning Coach</h1>
              <p className="text-sm text-muted-foreground">Your Personal Teacher for Everything</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="max-w-7xl mx-auto mb-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Voice & Speech Settings
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Always-On Voice Mode</p>
                    <p className="text-sm text-muted-foreground">Continuous listening like human conversation</p>
                  </div>
                  <button
                    onClick={toggleAlwaysOnMode}
                    className={cn(
                      'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                      alwaysOn ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg',
                      alwaysOn ? 'translate-x-7' : 'translate-x-1'
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Auto-Speak Responses</p>
                    <p className="text-sm text-muted-foreground">AI will speak answers automatically</p>
                  </div>
                  <button
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    className={cn(
                      'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                      autoSpeak ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg',
                      autoSpeak ? 'translate-x-7' : 'translate-x-1'
                    )} />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Split-Screen Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
        
        {/* LEFT PANEL - Input */}
        <Card className="flex flex-col h-full">
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Your Input
              </h2>
              
              {alwaysOn && (
                <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  Always Listening
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex-1 flex flex-col">
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  inputTextRef.current = e.target.value;
                }}
                onKeyDown={handleKeyPress}
                placeholder="Type your question or click the microphone to speak..."
                className="flex-1 w-full p-4 bg-muted/30 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-lg"
              />

              {/* Control Buttons */}
              <div className="flex gap-2 mt-4">
                {!alwaysOn && (
                  <Button
                    variant={isListening ? "primary" : "outline"}
                    onClick={togglePushToTalk}
                    className="flex-1"
                    disabled={alwaysOn}
                  >
                    {isListening ? (
                      <><MicOff className="w-4 h-4 mr-2" /> Stop Listening</>
                    ) : (
                      <><Mic className="w-4 h-4 mr-2" /> Push to Talk</>
                    )}
                  </Button>
                )}
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Thinking...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Send</>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={clearConversation}
                  title="Clear conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                {isSpeaking && (
                  <Button
                    variant="danger"
                    onClick={stopSpeaking}
                  >
                    <VolumeX className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT PANEL - AI Response */}
        <Card className="flex flex-col h-full">
          <CardContent className="p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-secondary" />
              AI Teacher Response
            </h2>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3 animate-fade-in-up',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-foreground border border-border'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    <p className="text-xs opacity-60 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Bar */}
      <div className="max-w-7xl mx-auto mt-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                isListening || alwaysOn ? 'bg-green-500 animate-pulse' : 'bg-muted'
              )} />
              {isListening || alwaysOn ? 'Listening' : 'Not listening'}
            </span>
            <span className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                isSpeaking ? 'bg-blue-500 animate-pulse' : 'bg-muted'
              )} />
              {isSpeaking ? 'Speaking' : 'Silent'}
            </span>
          </div>
          
          <span>
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AdvancedAICoach;
