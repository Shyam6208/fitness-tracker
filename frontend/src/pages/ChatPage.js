import React, { useState } from 'react';
import { useAuth, API } from '@/App';
import Navigation from '@/components/Navigation';
import { Brain, PaperPlaneRight, Robot } from '@phosphor-icons/react';

const ChatPage = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: userMessage,
          session_id: sessionId
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        if (data.session_id) setSessionId(data.session_id);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please check your connection.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <Navigation />
      
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-8">
        <div className="mb-6">
          <h1 className="font-['Barlow_Condensed'] font-black text-4xl uppercase tracking-tight mb-2" data-testid="chat-title">
            AI Fitness Coach
          </h1>
          <p className="text-[#A1A1AA]">Ask me anything about training, nutrition, or supplements</p>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 bg-[#141414] border border-white/10 rounded-sm p-6 mb-4 overflow-y-auto" data-testid="chat-messages-container">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center" data-testid="chat-empty-state">
              <div className="w-24 h-24 rounded-full bg-[#FF3B30]/10 border-2 border-[#FF3B30]/30 flex items-center justify-center mb-6">
                <Brain size={52} weight="fill" className="text-[#FF3B30]" />
              </div>
              <h3 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight mb-2">
                Your AI Coach is Ready
              </h3>
              <p className="text-[#A1A1AA] max-w-md">
                I'm here to help with workout advice, nutrition guidance, form tips, and supplement recommendations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, msgIdx) => (
                <div key={`${msg.role}-${msgIdx}-${msg.content.slice(0, 20)}`} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} data-testid={`chat-message-${msgIdx}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-[#FF3B30] flex items-center justify-center flex-shrink-0">
                      <Robot size={20} weight="fill" />
                    </div>
                  )}
                  <div className={`max-w-[70%] rounded-sm p-4 ${msg.role === 'user' ? 'bg-[#FF3B30] text-white' : 'bg-[#1C1C1E] text-white border border-white/10'}`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start" data-testid="chat-loading-indicator">
                  <div className="w-8 h-8 rounded-full bg-[#FF3B30] flex items-center justify-center flex-shrink-0">
                    <Robot size={20} weight="fill" />
                  </div>
                  <div className="bg-[#1C1C1E] border border-white/10 rounded-sm p-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#A1A1AA] rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-[#A1A1AA] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-[#A1A1AA] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about workouts, nutrition, form tips..."
            className="flex-1 bg-[#141414] border border-white/10 rounded-sm px-4 py-3 text-white focus:border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30] transition-all outline-none"
            disabled={loading}
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[#FF3B30] text-white px-6 py-3 rounded-sm font-bold hover:bg-[#FF6B63] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            data-testid="chat-send-button"
          >
            <PaperPlaneRight size={20} weight="fill" />
          </button>
        </form>
      </main>
    </div>
  );
};

export default ChatPage;
