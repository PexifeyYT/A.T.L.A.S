import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  symbol?: string;
  timeframe?: string;
  analysisResult?: any;
  performanceStats?: any;
}

const SUGGESTED_QUESTIONS = [
  'How does ATLAS work?',
  'Explain order blocks',
  'What is the TJR strategy?',
  'How does the learning loop work?',
  'Explain Wyckoff method',
  'What are fair value gaps?',
  'Explain risk management rules',
  'What is volume profile?',
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  symbol,
  timeframe,
  analysisResult,
  performanceStats,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hey — I'm ATLAS. I have full knowledge of my own analysis engine, all 13 strategy modules, and deep expertise in trading and markets.\n\nAsk me anything: how I work, what signals mean, trading concepts, or questions about the current chart.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [llmModel, setLlmModel] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    window.api.getLlmStatus().then(r => {
      if (r.success && r.data.available) setLlmModel(r.data.model);
    }).catch(() => {});
  }, []);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = { symbol, timeframe, analysisResult, performanceStats };
      const result = await window.api.chatMessage(msg, context);

      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.success ? result.data : `Error: ${result.error}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, reply]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Connection error. Make sure ATLAS main process is running.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: '0',
      role: 'assistant',
      content: `Chat cleared. Ask me anything about trading, markets, or ATLAS.`,
      timestamp: new Date(),
    }]);
    window.api.clearChatHistory().catch(() => {});
  };

  return (
    <div className="flex flex-col h-full bg-tv-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-tv-border bg-tv-surface2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-tv-text">🤖 ATLAS AI</span>
          {llmModel ? (
            <span className="text-xs bg-tv-green/15 text-tv-green px-1.5 py-0.5 rounded">
              {llmModel}
            </span>
          ) : (
            <span className="text-xs bg-tv-accent/15 text-tv-accent px-1.5 py-0.5 rounded">
              Built-in KB
            </span>
          )}
        </div>
        <button
          onClick={clearChat}
          className="text-xs text-tv-text-secondary hover:text-tv-text transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-tv-accent/20 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                🤖
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-tv-accent text-white rounded-tr-none'
                  : 'bg-tv-surface2 text-tv-text rounded-tl-none border border-tv-border/50'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-tv-surface2 border border-tv-border flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                👤
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-tv-accent/20 flex items-center justify-center text-xs flex-shrink-0">
              🤖
            </div>
            <div className="bg-tv-surface2 border border-tv-border/50 rounded-lg rounded-tl-none px-3 py-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-tv-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-tv-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-tv-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions (only when few messages) */}
      {messages.length <= 2 && !loading && (
        <div className="px-3 pb-2">
          <div className="text-xs text-tv-text-secondary mb-1.5">Quick questions:</div>
          <div className="flex flex-wrap gap-1">
            {SUGGESTED_QUESTIONS.slice(0, 4).map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs px-2 py-1 bg-tv-surface2 border border-tv-border rounded hover:border-tv-accent hover:text-tv-accent transition-colors text-tv-text-secondary"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 border-t border-tv-border pt-2">
        {symbol && (
          <div className="text-xs text-tv-text-secondary mb-1.5">
            Context: <span className="text-tv-accent">{symbol}</span> · {timeframe}
            {analysisResult && <span className="text-tv-text-secondary"> · analysis loaded</span>}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about trading, ATLAS, or current analysis..."
            rows={2}
            className="flex-1 bg-tv-surface2 border border-tv-border rounded px-3 py-2 text-xs text-tv-text placeholder-tv-text-secondary outline-none focus:border-tv-accent resize-none transition-colors"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-3 bg-tv-accent text-white rounded text-xs font-bold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ↵
          </button>
        </div>
        <div className="text-xs text-tv-text-secondary mt-1">Enter to send · Shift+Enter for newline</div>
      </div>
    </div>
  );
};
