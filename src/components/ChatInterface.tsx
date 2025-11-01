import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User } from 'lucide-react';
import { Upload } from '../services/FileProcessor';
import { ChunkedAIProcessor } from '../services/ChunkedAIProcessor';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const indexedUploads = uploads.filter(u => u.indexed);

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

  const getContext = () => {
    const selectedData = uploads
      .filter(u => selectedUploads.includes(u.id))
      .map(u => u.fullText)
      .join('\n\n---\n\n');
    
    return selectedData;
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;
    
    if (!apiKey) {
      alert('Please configure your OpenRouter API key in Settings to use chat.');
      return;
    }
    
    if (selectedUploads.length === 0) {
      alert('Please select at least one document to query.');
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
      const context = getContext();
      
      if (!context || context.trim().length === 0) {
        throw new Error('Selected documents have no content');
      }
      
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
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">Chat Q&A</h1>
        <p className="text-lg text-muted-foreground">
          Ask questions about your documents and get AI-powered answers.
        </p>
      </div>

      {/* Document Selection */}
      <div className="glass-card rounded-xl p-6 shadow-sm border border-border/40">
        <h2 className="text-lg font-semibold text-foreground mb-4">Select Documents to Query</h2>
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

      {/* Chat Messages */}
      <div className="glass-card rounded-xl shadow-sm border border-border/40 h-96 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Start a conversation by asking a question about your documents.</p>
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