import { useState } from 'react';
import { Brain, Send, Loader2, Lightbulb, HelpCircle, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'question' | 'hint' | 'guidance' | 'answer';
}

interface SocraticTutorProps {
  topic?: string;
  context?: string;
  apiKey: string;
}

export function SocraticTutor({ topic, apiKey }: SocraticTutorProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: topic
        ? `Ready to master ${topic}? Instead of just telling you the answer, I'll guide you to discover it yourself - that's how real learning happens! What would you like to explore first?`
        : "Hey there! I'm your AI learning coach. I won't just give you answers - I'll help you think through problems and discover solutions yourself. That's the secret to actually remembering stuff! What topic are you curious about?",
      type: 'guidance'
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'socratic' | 'explain' | 'practice'>('socratic');

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    if (!apiKey) {
      toast.error('Please configure your OpenRouter API key in Settings first');
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Build conversation context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Use OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [
            {
              role: 'system',
              content: mode === 'socratic'
                ? `You are a brilliant Socratic tutor. Help students learn through guided questioning.

CORE PRINCIPLES:
1. **Ask probing questions** - Don't give direct answers; lead students to discover them
2. **Build on prior knowledge** - Connect new concepts to what they already understand
3. **Encourage reasoning** - Ask "Why?" and "How do you know that?"
4. **Break down complexity** - Split hard problems into manageable sub-questions
5. **Provide scaffolding** - Give hints and partial information when students are stuck
6. **Celebrate progress** - Acknowledge insights and correct reasoning
7. **Be patient** - Allow time for thinking; don't rush to correct

RESPONSE STYLE:
- Start with clarifying questions to understand their current thinking
- Use analogies and real-world examples
- Ask one question at a time (don't overwhelm)
- If stuck, provide a smaller stepping stone question
- When they're right, affirm it and ask them to explain WHY

AVOID: Lecturing, giving direct answers, or being condescending.`
                : mode === 'explain'
                ? `You are an expert educator who explains complex topics clearly and simply.

EXPLANATION STRATEGY:
1. **Start with the big picture** - Why does this matter?
2. **Use analogies** - Connect to familiar concepts
3. **Build progressively** - Simple to complex, step by step
4. **Provide examples** - Real-world applications
5. **Highlight key points** - What's most important to remember
6. **Check understanding** - Ask if anything needs clarification
7. **Visual language** - Help them "see" the concepts

STYLE:
- Simple, clear language (avoid jargon, or explain it)
- Enthusiastic and encouraging tone
- Break into digestible chunks
- Use formatting (**bold** for key terms, numbered lists for steps)
- End with a quick recap or key takeaways

Make learning feel accessible and exciting.`
                : `You are a practice coach creating effective learning exercises.

PRACTICE DESIGN:
1. **Start at their level** - Not too easy, not too hard
2. **Progressive difficulty** - Build skills incrementally
3. **Targeted practice** - Focus on specific skills/concepts
4. **Helpful hints** - Guide without giving the answer
5. **Immediate feedback** - Explain what's correct and why
6. **Real applications** - Show how this matters
7. **Celebrate effort** - Encourage persistence and growth

RESPONSE FORMAT:
- State the problem clearly
- Provide context (why this matters)
- Offer 1-2 strategic hints
- After their attempt, give specific feedback
- If wrong, ask guiding questions to help them find the error
- If right, acknowledge and extend with a slightly harder variation

Focus on building competence and confidence.`
            },
            ...conversationHistory,
            { role: 'user', content: input }
          ],
          temperature: mode === 'socratic' ? 0.7 : mode === 'explain' ? 0.4 : 0.6,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || 'I apologize, but I encountered an error. Could you rephrase your question?';

      const assistantMessage: Message = {
        role: 'assistant',
        content: content,
        type: mode === 'socratic' ? 'question' : mode === 'explain' ? 'answer' : 'question'
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsProcessing(false);

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response. Please check your API key and try again.');
      setIsProcessing(false);
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'socratic': return <HelpCircle className="w-4 h-4" />;
      case 'explain': return <Lightbulb className="w-4 h-4" />;
      case 'practice': return <Brain className="w-4 h-4" />;
    }
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case 'question': return <HelpCircle className="w-4 h-4 text-primary" />;
      case 'hint': return <Lightbulb className="w-4 h-4 text-warning" />;
      case 'guidance': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      default: return <Brain className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="glass-card rounded-2xl border border-border h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Your AI Learning Coach</h3>
              <p className="text-xs text-muted-foreground">Think deeper, learn better with smart questions</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMode('socratic')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              mode === 'socratic'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            <HelpCircle className="w-3 h-3 inline mr-1" />
            Socratic
          </button>
          <button
            onClick={() => setMode('explain')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              mode === 'explain'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lightbulb className="w-3 h-3 inline mr-1" />
            Explain Simply
          </button>
          <button
            onClick={() => setMode('practice')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              mode === 'practice'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            <Brain className="w-3 h-3 inline mr-1" />
            Practice
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.role === 'user'
                ? 'bg-primary/20'
                : 'bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30'
            }`}>
              {message.role === 'user' ? (
                <div className="w-5 h-5 bg-primary rounded-full" />
              ) : (
                getMessageIcon(message.type)
              )}
            </div>
            <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-background border border-border'
              }`}>
                <p className={`text-sm whitespace-pre-wrap ${
                  message.role === 'user' ? 'text-white' : 'text-foreground'
                }`}>
                  {message.content}
                </p>
              </div>
              {message.type && message.role === 'assistant' && (
                <p className="text-xs text-muted-foreground mt-1 px-2">
                  {message.type === 'question' && 'Thought-provoking question'}
                  {message.type === 'hint' && 'Helpful hint'}
                  {message.type === 'guidance' && 'Guidance'}
                  {message.type === 'answer' && 'Explanation'}
                </p>
              )}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
            <div className="flex-1">
              <div className="inline-block px-4 py-3 rounded-2xl bg-background border border-border">
                <p className="text-sm text-muted-foreground">Thinking...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={
              mode === 'socratic'
                ? "Ask a question or share your thoughts..."
                : mode === 'explain'
                ? "What concept would you like explained simply?"
                : "Ready for a practice problem?"
            }
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={isProcessing || !input.trim()}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {getModeIcon()} {mode === 'socratic' && 'Socratic mode: Learn through guided questions'}
          {mode === 'explain' && 'Simple explanations: Concepts broken down to basics'}
          {mode === 'practice' && 'Practice mode: Apply what you\'ve learned'}
        </p>
      </div>
    </div>
  );
}
