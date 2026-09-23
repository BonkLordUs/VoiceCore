const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const title = $('#pageTitle');
const pageNames = { chats: 'Good evening, Alex', anonymous: 'Anonymous', gifts: 'Gift store', profile: 'Profile', creator: 'Creator workspace' };
const toast = $('.toast');
let toastTimer;
function show(message) { clearTimeout(toastTimer); toast.textContent = message; toast.classList.add('show'); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800); }
function openPage(name) { $$('.page').forEach(page => page.classList.toggle('active-page', page.id === name)); $$('.nav-item[data-page]').forEach(item => item.classList.toggle('active', item.dataset.page === name)); title.textContent = pageNames[name]; }
function modal({ title: heading, body, confirm = 'Continue', onConfirm }) {
  const element = document.createElement('div'); element.className = 'modal-backdrop';
  element.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" aria-label="Close">×</button><h2 id="modal-title">${heading}</h2><div class="modal-body">${body}</div><footer><button class="modal-cancel">Cancel</button><button class="modal-confirm">${confirm}</button></footer></section>`;
  const close = () => element.remove(); element.addEventListener('click', e => { if (e.target === element || e.target.closest('.modal-close, .modal-cancel')) close(); });
  $('.modal-confirm', element).addEventListener('click', () => { onConfirm?.(element); close(); }); document.body.append(element); $('.modal-close', element).focus();
}
$$('.nav-item[data-page]').forEach(button => button.addEventListener('click', () => openPage(button.dataset.page)));
$('#privacyButton').addEventListener('click', event => { event.currentTarget.classList.toggle('enabled'); const enabled = event.currentTarget.classList.contains('enabled'); localStorage.setItem('voicecore.streamerMode', String(enabled)); show(enabled ? 'Streamer mode enabled on this device.' : 'Streamer mode disabled.'); });
if (localStorage.getItem('voicecore.streamerMode') === 'true') $('#privacyButton').classList.add('enabled');
$('#newChat').addEventListener('click', () => modal({ title: 'Start a secure chat', body: '<label>Username or User ID<input id="recipient" placeholder="@username or 1234567890" autofocus></label>', confirm: 'Create chat', onConfirm: node => { const recipient = $('#recipient', node).value.trim(); show(recipient ? `Secure chat request created for ${recipient}.` : 'Enter a username or User ID first.'); } }));
$('#composer').addEventListener('submit', event => { event.preventDefault(); const input = $('input', event.currentTarget); const text = input.value.trim(); if (!text) return; const bubble = document.createElement('div'); bubble.className = 'bubble outgoing'; bubble.textContent = text; const time = document.createElement('time'); time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ✓'; bubble.append(time); $('.messages').append(bubble); input.value = ''; show('Message saved locally. Connect Chat Service to deliver it.'); });
$$('.chat-row').forEach(row => row.addEventListener('click', () => { $$('.chat-row').forEach(item => item.classList.remove('selected')); row.classList.add('selected'); const name = $('strong', row).childNodes[0].textContent.trim(); $('.conversation header strong').childNodes[0].nodeValue = name + ' '; show(`Opened conversation with ${name}.`); }));
function transfer() { modal({ title: 'Send VH Coins', body: '<label>Recipient username or User ID<input id="transfer-user" placeholder="@username"></label><label>Amount in VH<input id="transfer-amount" inputmode="numeric" type="number" min="1" placeholder="100"></label><p class="form-note">The configured platform fee is calculated server-side when Wallet Service is connected.</p>', confirm: 'Review transfer', onConfirm: node => { const amount = Number($('#transfer-amount', node).value); show(amount > 0 ? `Transfer draft for ${amount} VH created. Server authorization is required to complete it.` : 'Enter an amount greater than zero.'); } }); }
function topUp() { modal({ title: 'Top up VH wallet', body: '<label>Choose a package<select id="package"><option>100 VH</option><option>500 VH</option><option>1,000 VH</option><option>5,000 VH</option></select></label><p class="form-note">Payments are only confirmed by a verified server-side payment webhook.</p>', confirm: 'Continue to payment', onConfirm: node => show(`${$('#package', node).value} payment session needs a configured payment provider.`) }); }
function report() { modal({ title: 'Report conversation', body: '<label>Category<select><option>Harassment</option><option>Spam</option><option>Threats</option><option>NSFW</option><option>Scam</option><option>Other</option></select></label><label>What happened?<textarea placeholder="Add context for the moderation team"></textarea></label>', confirm: 'Submit report', onConfirm: () => show('Report draft saved. Connect Report Service to submit it securely.') }); }
document.addEventListener('click', event => { const button = event.target.closest('button'); if (!button || button.closest('.modal') || button.matches('.nav-item, #newChat, #privacyButton, .chat-row')) return; const text = button.textContent.trim().toLowerCase(); if (text.includes('send')) return transfer(); if (text.includes('top up')) return topUp(); if (text.includes('report')) return report(); if (text.includes('find a partner')) return modal({ title: 'Anonymous match', body: '<label>Language<select><option>English</option><option>Русский</option></select></label><label>Interests<input placeholder="Gaming, Music, Technology"></label><p class="form-note">Matching only starts after age, block-list and safety checks on the server.</p>', confirm: 'Find partner', onConfirm: () => show('Match preferences saved locally. Matchmaking Service is required to search safely.') }); if (text.includes('gift')) return modal({ title: 'Gift store', body: '<div class="gift-options"><button data-gift="Heart">♥ Heart · 50 VH</button><button data-gift="Rose">✿ Rose · 100 VH</button><button data-gift="Diamond">◆ Diamond · 500 VH</button></div>', confirm: 'Close' }); if (text.includes('profile')) return openPage('profile'); if (text.includes('dashboard')) return openPage('creator'); if (text.includes('premium')) return modal({ title: 'Core Premium', body: '<p>Premium is cosmetic and never grants administrative permissions.</p><label>Plan<select><option>Monthly</option><option>Yearly</option></select></label>', confirm: 'Choose plan', onConfirm: () => show('Premium checkout requires Wallet and Premium services.') }); if (button.matches('.conversation-actions button')) return text.includes('⌁') || text.includes('▣') ? show('Calls require authenticated WebRTC signaling and an SFU.') : show('Conversation options opened.'); if (button.matches('.icon-button')) return show('Search and notification services are not connected yet.'); if (!button.matches('.send')) show('This control needs its production service connection.'); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));


// Theme system: persisted locally, with system preference as the first-run default.
const themeToggle = $('#themeToggle');
const themeLabel = $('#themeLabel');
const themeIcon = $('#themeIcon');
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeLabel.textContent = theme === 'dark' ? 'Dark theme' : 'Light theme';
  themeIcon.textContent = theme === 'dark' ? '☾' : '☀';
}
const savedTheme = localStorage.getItem('voicecore.theme');
applyTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
themeToggle?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('voicecore.theme', next);
  applyTheme(next);
});
