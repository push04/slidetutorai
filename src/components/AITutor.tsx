import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, MessageSquare, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent } from './enhanced/Card';
import { Button } from './enhanced/Button';
import { OpenRouterAPI } from '../lib/openrouter';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AITutor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if API key is in env
    const envKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (envKey && envKey !== '') {
      setApiKey(envKey);
      setShowApiKeyInput(false);
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInputText(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast.error(`Voice recognition error: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputText('');
      recognitionRef.current.start();
      setIsListening(true);
      toast.success('Listening... Speak now!');
    }
  };

  const speak = (text: string) => {
    if (!synthRef.current) {
      toast.error('Text-to-speech not supported in this browser.');
      return;
    }

    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('Female')
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error('Error playing speech');
    };

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) {
      toast.error('Please enter a message or use voice input');
      return;
    }

    if (!apiKey) {
      toast.error('Please enter your OpenRouter API key');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      const api = new OpenRouterAPI(apiKey);
      
      const conversationContext = messages
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
        .join('\n\n');

      const context = conversationContext 
        ? `Previous conversation:\n${conversationContext}\n\nCurrent question:`
        : 'First question:';

      const response = await api.answerQuestion(currentInput, context);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (autoSpeak) {
        speak(response);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get AI response. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    stopSpeaking();
    toast.success('Conversation cleared');
  };

  if (showApiKeyInput && !apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card variant="gradient" className="max-w-md w-full">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">AI Tutor Setup</h2>
              <p className="text-muted-foreground">
                Enter your OpenRouter API key to start chatting with your AI tutor
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  OpenRouter API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Get your free API key at{' '}
                  <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    openrouter.ai
                  </a>
                </p>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  if (apiKey.trim()) {
                    setShowApiKeyInput(false);
                    toast.success('API key saved! Start chatting with your AI tutor.');
                  } else {
                    toast.error('Please enter a valid API key');
                  }
                }}
              >
                Start Tutoring Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background animate-fade-in-up">
      <div className="border-b border-border bg-glass-card backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI Tutor</h1>
                <p className="text-sm text-muted-foreground">
                  Your personal AI learning assistant with voice support
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoSpeak(!autoSpeak)}
                className="gap-2"
              >
                {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Auto-speak {autoSpeak ? 'ON' : 'OFF'}
              </Button>
              
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearConversation}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-6 p-6">
          <Card variant="gradient" className="flex flex-col h-full">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Your Input</h2>
                  <p className="text-sm text-muted-foreground">Ask questions via text or voice</p>
                </div>
              </div>
            </div>

            <CardContent className="flex-1 flex flex-col p-6 space-y-4">
              <div className="flex-1 min-h-0">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your question here or use the microphone button to speak..."
                  className="w-full h-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  disabled={isListening || isLoading}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant={isListening ? 'primary' : 'outline'}
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`flex-1 gap-2 ${isListening ? 'animate-pulse' : ''}`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-5 h-5" />
                      Stop Listening
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Voice Input
                    </>
                  )}
                </Button>

                <Button
                  variant="primary"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isLoading || isListening}
                  className="flex-1 gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>

              {isListening && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-center animate-fade-in-up">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-primary">Listening...</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Speak clearly into your microphone</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="gradient" className="flex flex-col h-full">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Conversation</h2>
                  <p className="text-sm text-muted-foreground">AI responses with voice playback</p>
                </div>
              </div>
            </div>

            <CardContent className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center p-8">
                  <div className="max-w-md">
                    <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">Start a Conversation</h3>
                    <p className="text-muted-foreground">
                      Ask me anything! I can help you understand concepts, solve problems, or explain topics in detail.
                    </p>
                    <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        💡 Try: "Explain quantum physics in simple terms"
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        💡 Try: "Help me understand calculus derivatives"
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        💡 Try: "What are the key concepts in machine learning?"
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-primary to-secondary text-white'
                            : 'bg-muted/50 text-foreground border border-border/50'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        
                        {message.role === 'assistant' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => speak(message.content)}
                            className="mt-2 gap-2 text-xs"
                            disabled={isSpeaking}
                          >
                            <Volume2 className="w-3 h-3" />
                            {isSpeaking ? 'Playing...' : 'Play Voice'}
                          </Button>
                        )}
                      </div>
                      
                      {message.role === 'user' && (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3 animate-fade-in-up">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="px-4 py-3 bg-muted/50 border border-border/50 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </CardContent>

            {isSpeaking && (
              <div className="p-4 border-t border-border/50 bg-primary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-primary animate-pulse" />
                    <span className="text-sm font-semibold text-primary">Playing voice response...</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopSpeaking}
                    className="gap-2"
                  >
                    <VolumeX className="w-4 h-4" />
                    Stop
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AITutor;
