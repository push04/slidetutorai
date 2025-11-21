import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Gauge, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Upload } from '../services/FileProcessor';
import { ChunkedAIProcessor } from '../services/ChunkedAIProcessor';
import { buildContextFromUploads } from '../utils/contextBuilder';

interface ChatInterfaceProps {
  uploads: Upload[];
  apiKey: string;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ uploads, apiKey }) => {
  const [selectedUploads, setSelectedUploads] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextPreview, setContextPreview] = useState('');
  const [contextSize, setContextSize] = useState(0);
  const [contextSlices, setContextSlices] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const CHAT_STORAGE_KEY = 'slidetutor_context_chat';

  const indexedUploads = uploads.filter(u => u.indexed);

  const MAX_CONTEXT_TOKENS = 3200;

  useEffect(() => {
    const { context, totalTokens, slicesUsed } = buildContextFromUploads(uploads, selectedUploads, MAX_CONTEXT_TOKENS);
    setContextPreview(context);
    setContextSize(totalTokens * 4); // Approximate chars
    setContextSlices(slicesUsed.length);
  }, [uploads, selectedUploads]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.messages)) {
          setMessages(parsed.messages);
        }
        if (Array.isArray(parsed.selectedUploads)) {
          setSelectedUploads(parsed.selectedUploads);
        }
        if (typeof parsed.draft === 'string') {
          setInputValue(parsed.draft);
        }
      }
    } catch (error) {
      console.warn('Failed to restore context chat state', error);
    }
  }, []);

  useEffect(() => {
    const payload = {
      messages,
      selectedUploads,
      draft: inputValue,
    };
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(payload));
  }, [messages, selectedUploads, inputValue]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUploadSelection = (uploadId: string) => {
    setSelectedUploads(prev => 
      prev.includes(uploadId) 
        ? prev.filter(id => id !== uploadId)
        : [...prev, uploadId]
    );
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    if (!apiKey) {
      toast.error('Add your OpenRouter API key in Settings to chat.');
      return;
    }

    if (selectedUploads.length === 0) {
      toast.error('Select at least one document to provide context.');
      return;
    }

    if (!contextPreview) {
      toast.error('Selected documents look empty. Try reprocessing your upload.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const processor = new ChunkedAIProcessor(apiKey);
      const context = contextPreview;

      const response = await processor.answerQuestionWithContext(inputValue, context);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat failed:', error);
      let errorMsg = 'Sorry, I encountered an error. ';

      if (error.message?.includes('API key')) {
        errorMsg += 'Please check your API key in Settings.';
      } else if (error.message?.includes('content')) {
        errorMsg += 'The selected documents appear to be empty.';
      } else {
        errorMsg += 'Please try again or select different documents.';
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorMsg,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card border border-border/50 rounded-2xl p-6 shadow-lg shadow-primary/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              Context-aware tutor
            </div>
            <h1 className="text-3xl font-bold text-foreground">Your AI Study Buddy</h1>
            <p className="text-sm text-muted-foreground">
              Ask anything about your uploads. We auto-stitch the most relevant chunks so answers stay focused and fast.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
              <div className="p-3 rounded-xl bg-muted/60 border border-border/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                  <Gauge className="w-4 h-4 text-primary" /> Context budget
                </div>
                <p className="text-lg font-bold text-foreground">~{contextSize.toLocaleString()} chars • {contextSlices} slices</p>
              </div>
            <div className="p-3 rounded-xl bg-muted/60 border border-border/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                <ShieldCheck className="w-4 h-4 text-secondary" /> Guardrails
              </div>
              <p className="text-sm text-foreground">Rate-limit friendly retries & chunk stitching</p>
            </div>
          </div>
        </div>
      </div>

      {/* Document Selection */}
      <div className="glass-card rounded-xl p-6 shadow-sm border border-border/40">
        <h2 className="text-lg font-semibold text-foreground mb-4">Choose Your Study Materials</h2>
        {indexedUploads.length === 0 ? (
          <p className="text-muted-foreground">No indexed documents available. Upload and process documents first.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {indexedUploads.map((upload) => (
              <label
                key={upload.id}
                className="flex items-center gap-3 p-3 border border-border/40 rounded-lg hover:bg-muted/20 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedUploads.includes(upload.id)}
                  onChange={() => handleUploadSelection(upload.id)}
                  className="rounded text-primary focus:ring-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{upload.filename}</p>
                  <p className="text-sm text-muted-foreground">{upload.slideCount} slides</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {contextPreview && (
        <div className="glass-card rounded-xl p-4 border border-border/50 shadow-sm text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              Condensed context preview
            </div>
            <span className="text-xs">Trimmed for efficiency</span>
          </div>
          {contextPreview}
        </div>
      )}

      {/* Chat Messages */}
      <div className="glass-card rounded-xl shadow-sm border border-border/40 h-96 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Ready to unlock insights? Ask your first question and discover what your materials really mean!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-secondary' 
                      : 'bg-success'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-secondary text-white'
                      : 'bg-muted text-foreground'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-indigo-200' : 'text-muted-foreground'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-border/40 p-4">
          <div className="flex gap-3">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={selectedUploads.length > 0 ? "Ask a question about your documents..." : "Select documents first to start chatting..."}
              className="flex-1 px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
              rows={3}
              disabled={selectedUploads.length === 0 || !apiKey}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading || selectedUploads.length === 0 || !apiKey}
              className="px-6 py-3 bg-secondary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};