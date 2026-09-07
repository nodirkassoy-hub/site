/**
 * BalansAI - AI CFO & Sunniy Intellekt Maslahatchi Hub
 */

window.AiCfoView = {
  insights: null,
  chatHistory: [],

  async load() {
    try {
      const [insightsRes, chatRes] = await Promise.all([
        App.api('/api/ai/insights'),
        App.api('/api/ai/chat')
      ]);

      this.insights = insightsRes;
      this.chatHistory = chatRes.history;

      this.renderHealthGauge();
      this.renderRecommendations();
      this.renderChatMessages();
    } catch (err) {
      App.toast('AI tahlilini yuklashda xatolik: ' + err.message, 'error');
    }
  },

  renderHealthGauge() {
    if (!this.insights) return;
    const scoreEl = document.getElementById('ai-gauge-score');
    const statusEl = document.getElementById('ai-gauge-status');
    const runwayEl = document.getElementById('ai-gauge-runway');
    const netProfitEl = document.getElementById('ai-gauge-profit');
    const marginEl = document.getElementById('ai-gauge-margin');

    if (scoreEl) scoreEl.innerText = this.insights.healthScore;
    if (statusEl) statusEl.innerText = this.insights.healthStatus;
    if (runwayEl) runwayEl.innerText = `${this.insights.cashRunwayMonths} oy`;
    if (netProfitEl) netProfitEl.innerText = (this.insights.netProfit >= 0 ? '+' : '') + App.formatUZS(this.insights.netProfit);
    if (marginEl) marginEl.innerText = this.insights.profitMargin;
  },

  renderRecommendations() {
    const listEl = document.getElementById('ai-recommendations-list');
    if (!listEl || !this.insights) return;

    listEl.innerHTML = this.insights.recommendations.map(r => `
      <div class="liquid-glass p-5 rounded-2xl border border-white/10 hover:border-sky-500/40 transition-all duration-300">
        <div class="flex items-center justify-between mb-3">
          <span class="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">${r.badge}</span>
          <span class="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">${r.impact}</span>
        </div>
        <h4 class="text-base font-bold text-white mb-2">${r.title}</h4>
        <p class="text-xs text-slate-300 leading-relaxed mb-4">${r.description.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</p>
        <div class="flex justify-between items-center pt-3 border-t border-white/5">
          <button onclick="AiCfoView.askPrompt('${r.title}')" class="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1.5">
            <i class="fa-solid fa-wand-magic-sparkles"></i> AI bilan batafsil muhokama qilish
          </button>
        </div>
      </div>
    `).join('');
  },

  renderChatMessages() {
    const chatContainer = document.getElementById('ai-chat-messages');
    if (!chatContainer) return;

    if (this.chatHistory.length === 0) {
      chatContainer.innerHTML = `
        <div class="text-center py-12">
          <div class="w-16 h-16 mx-auto rounded-3xl ai-orb-glow flex items-center justify-center text-white text-2xl mb-4 shadow-xl">
            <i class="fa-solid fa-brain"></i>
          </div>
          <h3 class="text-lg font-bold text-white mb-1">BalansAI Shaxsiy CFO Maslahatchisi</h3>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            Moliya, soliq, pul oqimi va xarajatlarni optimallashtirish bo'yicha istalgan savolingizni bering.
          </p>
        </div>
      `;
      return;
    }

    chatContainer.innerHTML = this.chatHistory.map(msg => {
      const isUser = msg.sender === 'user';
      return `
        <div class="flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'} mb-4">
          ${!isUser ? `
            <div class="w-9 h-9 rounded-2xl flex-shrink-0 ai-orb-glow flex items-center justify-center text-white text-sm shadow-md">
              <i class="fa-solid fa-sparkles"></i>
            </div>
          ` : ''}
          <div class="max-w-2xl p-4 rounded-2xl text-sm leading-relaxed ${
            isUser 
              ? 'bg-sky-600 text-white rounded-br-none shadow-lg' 
              : 'liquid-glass border border-white/10 text-slate-100 rounded-bl-none shadow-md'
          }">
            <div class="prose prose-invert prose-sm">
              ${this.formatMarkdown(msg.text)}
            </div>
            <div class="text-[10px] mt-2 opacity-60 text-right">
              ${msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
          </div>
          ${isUser ? `
            <div class="w-9 h-9 rounded-2xl flex-shrink-0 bg-slate-700 border border-white/10 flex items-center justify-center text-white text-sm">
              <i class="fa-solid fa-user"></i>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    chatContainer.scrollTop = chatContainer.scrollHeight;
  },

  formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>');
  },

  askPrompt(promptText) {
    const input = document.getElementById('ai-chat-input');
    if (input) {
      input.value = promptText;
      this.sendMessage();
    }
  },

  async sendMessage() {
    const input = document.getElementById('ai-chat-input');
    if (!input || !input.value.trim()) return;

    const message = input.value.trim();
    input.value = '';

    // Append user message immediately
    this.chatHistory.push({
      sender: 'user',
      text: message,
      createdAt: new Date().toISOString()
    });
    this.renderChatMessages();

    // Show AI typing indicator
    const chatContainer = document.getElementById('ai-chat-messages');
    const typingId = 'typing_' + Date.now();
    if (chatContainer) {
      const typingEl = document.createElement('div');
      typingEl.id = typingId;
      typingEl.className = 'flex gap-3 mb-4';
      typingEl.innerHTML = `
        <div class="w-9 h-9 rounded-2xl ai-orb-glow flex items-center justify-center text-white text-sm">
          <i class="fa-solid fa-sparkles"></i>
        </div>
        <div class="liquid-glass p-4 rounded-2xl text-sm text-slate-300 border border-white/10 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-sky-400 animate-bounce"></span>
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
          <span class="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]"></span>
          <span class="text-xs text-slate-400 ml-1">AI CFO hisob-kitob qilmoqda...</span>
        </div>
      `;
      chatContainer.appendChild(typingEl);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    try {
      const result = await App.api('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message })
      });

      document.getElementById(typingId)?.remove();

      this.chatHistory.push(result.aiResponse);
      this.renderChatMessages();
    } catch (err) {
      document.getElementById(typingId)?.remove();
      App.toast('Xatolik yuz berdi: ' + err.message, 'error');
    }
  },

  async clearChat() {
    if (!confirm('AI suhbat tarixini tozalashni xohlaysizmi?')) return;
    try {
      await App.api('/api/ai/chat', { method: 'DELETE' });
      this.chatHistory = [];
      this.renderChatMessages();
      App.toast('Chat tarixi tozalandi', 'info');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
