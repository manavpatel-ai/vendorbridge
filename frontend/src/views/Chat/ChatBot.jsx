import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../utility/api';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hello! I'm **VendorBridge AI**, your procurement assistant.\n\nI can help you with:\n- 📊 Understanding your **RFQs, POs & invoices**\n- ✅ Checking **pending approvals**\n- 📈 **Spend analysis** and trends\n- 🏢 **Vendor** information\n\nHow can I help you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulseVisible, setPulseVisible] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (isOpen) setPulseVisible(false);
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Build history (exclude the welcome message for cleaner context)
      const history = newMessages.slice(1).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await api.post('/chat/', {
        message: trimmed,
        history: history.slice(0, -1) // exclude the just-sent message from history
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.reply
      }]);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Error**: ${errorMsg}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "🔄 Chat cleared! How can I help you?"
    }]);
  };

  // Custom markdown components for styling
  const proseText = 'text-[#C5CEC9]';
  const proseHeading = 'text-[#E8EDEA]';
  const proseMuted = 'text-[#A8B5AE]';

  const markdownComponents = {
    h1: ({ children }) => <h1 className={`text-lg font-bold ${proseHeading} mt-3 mb-1`}>{children}</h1>,
    h2: ({ children }) => <h2 className={`text-base font-bold ${proseHeading} mt-2.5 mb-1`}>{children}</h2>,
    h3: ({ children }) => <h3 className={`text-sm font-semibold ${proseHeading} mt-2 mb-1`}>{children}</h3>,
    p: ({ children }) => <p className={`text-[13px] leading-relaxed ${proseText} mb-2`}>{children}</p>,
    strong: ({ children }) => <strong className={`font-semibold ${proseHeading}`}>{children}</strong>,
    em: ({ children }) => <em className={`italic ${proseMuted}`}>{children}</em>,
    ul: ({ children }) => <ul className={`list-disc list-inside space-y-0.5 mb-2 text-[13px] ${proseText}`}>{children}</ul>,
    ol: ({ children }) => <ol className={`list-decimal list-inside space-y-0.5 mb-2 text-[13px] ${proseText}`}>{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    code: ({ inline, className, children }) => {
      if (inline) {
        return <code className="bg-[#1a2722] text-[#22C55E] px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
      }
      return (
        <pre className="bg-[#0B0F0E] border border-[#223027] rounded-lg p-3 overflow-x-auto my-2">
          <code className="text-xs font-mono text-[#A8E6CF]">{children}</code>
        </pre>
      );
    },
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="w-full text-xs border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-[#1a2722]">{children}</thead>,
    th: ({ children }) => <th className="border border-[#223027] px-2 py-1.5 text-left font-semibold text-[#22C55E] text-[11px] uppercase tracking-wider">{children}</th>,
    td: ({ children }) => <td className={`border border-[#223027] px-2 py-1.5 ${proseText}`}>{children}</td>,
    blockquote: ({ children }) => (
      <blockquote className={`border-l-2 border-[#22C55E] pl-3 my-2 ${proseMuted} italic`}>{children}</blockquote>
    ),
    hr: () => <hr className="border-[#223027] my-3" />,
    a: ({ href, children }) => <a href={href} className="text-[#22C55E] underline hover:text-[#16a34a]" target="_blank" rel="noopener noreferrer">{children}</a>,
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-[#22C55E] to-[#16a34a] rounded-full flex items-center justify-center shadow-2xl shadow-[#22C55E]/30 hover:scale-110 hover:shadow-[#22C55E]/50 transition-all duration-300 cursor-pointer group"
          title="Chat with VendorBridge AI"
        >
          <Sparkles className="w-6 h-6 text-black group-hover:rotate-12 transition-transform duration-300" />

          {/* Pulse ring */}
          {pulseVisible && (
            <span className="absolute inset-0 rounded-full border-2 border-[#22C55E] animate-ping opacity-40" />
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] max-h-[85vh] bg-[#121A17] border border-[#223027] rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden animate-chatOpen">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#121A17] to-[#162118] border-b border-[#223027]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22C55E]/20 to-[#22C55E]/5 flex items-center justify-center border border-[#22C55E]/20">
                <Bot className="w-5 h-5 text-[#22C55E]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#E8EDEA] leading-tight">VendorBridge AI</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="text-[10px] text-[#8C9A93]">Online • Powered by Groq</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg hover:bg-[#1a2722] text-[#8C9A93] hover:text-[#E8EDEA] transition-colors cursor-pointer"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#1a2722] text-[#8C9A93] hover:text-[#E8EDEA] transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-[#22C55E]/20 to-[#22C55E]/5 border border-[#22C55E]/20'
                    : 'bg-gradient-to-br from-[#2a3a32] to-[#1a2722] border border-[#223027]'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-[#22C55E]" />
                    : <Bot className="w-3.5 h-3.5 text-[#22C55E]" />
                  }
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#E8EDEA]'
                    : 'bg-[#162118] border border-[#223027] text-[#C5CEC9]'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose-chat">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 bg-gradient-to-br from-[#2a3a32] to-[#1a2722] border border-[#223027]">
                  <Bot className="w-3.5 h-3.5 text-[#22C55E]" />
                </div>
                <div className="bg-[#162118] border border-[#223027] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[#22C55E] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-[#22C55E] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-[#22C55E] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-[#8C9A93]">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-4 py-3 border-t border-[#223027] bg-[#0e1512]">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your procurement data..."
                className="flex-1 bg-[#121A17] border border-[#223027] rounded-xl px-3.5 py-2.5 text-[13px] text-[#E8EDEA] placeholder-[#8C9A93]/50 focus:outline-none focus:border-[#22C55E]/50 focus:ring-1 focus:ring-[#22C55E]/20 resize-none transition-all duration-200 min-h-[40px] max-h-[100px]"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-10 h-10 bg-[#22C55E] hover:bg-[#16a34a] disabled:bg-[#223027] disabled:text-[#8C9A93] text-black rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </div>
            <p className="text-[9px] text-[#8C9A93]/60 text-center mt-1.5">
              Powered by Groq • Llama 3.3 70B
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
