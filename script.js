const STORAGE_KEY = 'chatgpt-style-demo-chats';
const chatArea = document.getElementById('chatArea');
const messagesElement = document.getElementById('messages');
const welcome = document.getElementById('welcome');
const historyList = document.getElementById('historyList');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendBtn');
const chatForm = document.getElementById('chatForm');
const suggestions = document.getElementById('suggestions');
const toast = document.getElementById('toast');
const backdrop = document.createElement('div');
backdrop.className = 'sidebar-backdrop';
backdrop.setAttribute('aria-hidden', 'true');
document.body.append(backdrop);

let toastTimer;
let chats = loadChats();
let activeChatId = chats[0]?.id || '';
const pendingReplies = new Map();

function createChat() {
  return { id: createId(), title: 'New chat', messages: [], updatedAt: Date.now() };
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadChats() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error('Saved chat data is not a list.');
    return parsed.filter(chat =>
      chat && typeof chat.id === 'string' &&
      typeof chat.title === 'string' &&
      Array.isArray(chat.messages) &&
      chat.messages.every(message =>
        message && ['user', 'assistant'].includes(message.role) &&
        typeof message.text === 'string'
      )
    );
  } catch (error) {
    window.setTimeout(() => showToast('Saved chats could not be loaded.'), 0);
    console.error('Could not load saved chats:', error);
    return [];
  }
}

function saveChats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (error) {
    showToast('Could not save chats in this browser.');
    console.error('Could not save chats:', error);
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2300);
}

function activeChat() {
  return chats.find(chat => chat.id === activeChatId);
}

function startNewChat() {
  const chat = createChat();
  chats.unshift(chat);
  activeChatId = chat.id;
  saveChats();
  render();
  userInput.focus();
  closeSidebar();
}

function renderHistory() {
  historyList.replaceChildren();
  chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = `history-item${chat.id === activeChatId ? ' active' : ''}`;
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-current', chat.id === activeChatId ? 'page' : 'false');

    const title = document.createElement('span');
    title.className = 'history-title';
    title.textContent = chat.title;
    const removeButton = document.createElement('button');
    removeButton.className = 'delete-chat';
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', `Delete ${chat.title}`);
    removeButton.title = 'Delete chat';
    removeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    item.append(title, removeButton);
    item.addEventListener('click', event => {
      if (event.target.closest('.delete-chat')) {
        chats = chats.filter(entry => entry.id !== chat.id);
        if (activeChatId === chat.id) activeChatId = chats[0]?.id || '';
        saveChats();
        render();
        return;
      }
      activeChatId = chat.id;
      render();
      closeSidebar();
    });
    item.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === item) {
        event.preventDefault();
        activeChatId = chat.id;
        render();
        closeSidebar();
      }
    });
    historyList.append(item);
  });
}

function addMessage(role, text) {
  const row = document.createElement('article');
  row.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;

  if (role === 'assistant') {
    const mark = document.createElement('div');
    mark.className = 'assistant-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.2a4 4 0 0 0-3.88 3.02 4 4 0 0 0-2.6 6.88 4 4 0 0 0 3.68 6.06A4 4 0 0 0 16 20.3a4 4 0 0 0 4.13-5.73 4 4 0 0 0-.25-6.99A4 4 0 0 0 12 3.2Z" stroke="currentColor" stroke-width="1.5"/></svg>';
    row.append(mark);
  }

  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = text;
  row.append(content);
  messagesElement.append(row);
}

function renderMessages() {
  messagesElement.replaceChildren();
  const chat = activeChat();
  const hasMessages = Boolean(chat && chat.messages.length);
  welcome.classList.toggle('is-hidden', hasMessages);
  suggestions.hidden = hasMessages;

  if (chat) chat.messages.forEach(message => addMessage(message.role, message.text));
  if (hasMessages && (pendingReplies.get(chat.id) || 0) > 0) {
    const typing = document.createElement('div');
    typing.className = 'message assistant-message';
    typing.innerHTML = '<div class="assistant-mark" aria-hidden="true">✦</div><div class="typing-indicator" aria-label="Thinking"><span></span><span></span><span></span></div>';
    messagesElement.append(typing);
  }
  chatArea.scrollTop = chatArea.scrollHeight;
}

function render() {
  renderHistory();
  renderMessages();
}

function makeResponse(prompt) {
  const lower = prompt.toLowerCase();
  if (/\b(hello|hi|hey)\b/.test(lower)) return 'Hello! What would you like to work on today?';
  if (lower.includes('html') || lower.includes('css') || lower.includes('javascript')) {
    return 'HTML gives a page its structure, CSS controls how it looks, and JavaScript makes it interactive. This demo uses all three—and its replies are simulated locally.';
  }
  if (lower.includes('brainstorm') || lower.includes('ideas')) {
    return 'Here are a few ways to get started:\n\n1. Pick a small problem you encounter every day.\n2. Build a simple tool that makes it easier.\n3. Keep the first version focused on one useful feature.\n\nTell me what topics you enjoy and I can tailor the ideas.';
  }
  if (lower.includes('explain')) {
    return 'A useful way to understand a tricky idea is to start with the simplest version, connect it to something familiar, and then add the details one at a time. What concept should we unpack?';
  }
  if (lower.includes('write') || lower.includes('creative')) {
    return 'Try this prompt: A small town receives a postcard from a place that does not exist on any map. The message is addressed to someone who has not been born yet.';
  }
  return `I’m a front-end demo, so I can’t generate a real AI answer. Your message was: “${prompt}”\n\nConnect this interface to an AI API to get live responses.`;
}

function sendMessage(text = userInput.value) {
  const content = text.trim();
  if (!content) return;
  if (!activeChatId || !activeChat()) {
    const chat = createChat();
    chats.unshift(chat);
    activeChatId = chat.id;
  }

  const chat = activeChat();
  chat.messages.push({ role: 'user', text: content });
  if (chat.title === 'New chat') chat.title = content.length > 32 ? `${content.slice(0, 32).trimEnd()}…` : content;
  chat.updatedAt = Date.now();
  chats = [chat, ...chats.filter(entry => entry.id !== chat.id)];
  pendingReplies.set(chat.id, (pendingReplies.get(chat.id) || 0) + 1);
  userInput.value = '';
  resizeInput();
  saveChats();
  render();

  window.setTimeout(() => {
    chat.messages.push({ role: 'assistant', text: makeResponse(content) });
    chat.updatedAt = Date.now();
    const remainingReplies = (pendingReplies.get(chat.id) || 1) - 1;
    if (remainingReplies > 0) pendingReplies.set(chat.id, remainingReplies);
    else pendingReplies.delete(chat.id);
    saveChats();
    render();
  }, 650);
}

function resizeInput() {
  userInput.style.height = 'auto';
  userInput.style.height = `${Math.min(userInput.scrollHeight, 180)}px`;
  sendButton.disabled = !userInput.value.trim();
}

function closeSidebar() {
  document.body.classList.remove('sidebar-open');
}

document.getElementById('newChatBtn').addEventListener('click', startNewChat);
document.getElementById('sidebarToggle').addEventListener('click', () => {
  if (window.matchMedia('(max-width: 700px)').matches) closeSidebar();
  else document.body.classList.toggle('sidebar-collapsed');
});
document.getElementById('mobileMenuBtn').addEventListener('click', () => document.body.classList.add('sidebar-open'));
backdrop.addEventListener('click', closeSidebar);
document.getElementById('shareBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast('Link copied');
  } catch (error) {
    showToast('Clipboard access is unavailable in this browser.');
    console.error('Could not copy the page link:', error);
  }
});
document.getElementById('modelPicker').addEventListener('click', event => {
  const button = event.currentTarget;
  button.setAttribute('aria-expanded', button.getAttribute('aria-expanded') !== 'true' ? 'true' : 'false');
  showToast('Model selection is not available in this demo.');
});
document.getElementById('attachBtn').addEventListener('click', () => showToast('File uploads are not available in this demo.'));
document.getElementById('toolsBtn').addEventListener('click', () => showToast('Tools are not connected in this demo.'));
document.getElementById('profileButton').addEventListener('click', () => showToast('Profile settings are not available in this demo.'));
chatForm.addEventListener('submit', event => {
  event.preventDefault();
  sendMessage();
  userInput.focus();
});
userInput.addEventListener('input', resizeInput);
userInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});
suggestions.addEventListener('click', event => {
  const button = event.target.closest('[data-prompt]');
  if (!button) return;
  userInput.value = button.dataset.prompt;
  resizeInput();
  userInput.focus();
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    startNewChat();
  }
  if (event.key === 'Escape') closeSidebar();
});

render();
resizeInput();
