const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const toast=$('.toast'), title=$('#pageTitle'), modalRoot=$('#modalRoot');
const names={chats:'Good evening',anonymous:'Anonymous matching',wallet:'VH Wallet',gifts:'Gift store',profile:'Profile',creator:'Creator workspace'};
let toastTimer, currentUser=null, currentChat=null, socket=null;

function show(m){clearTimeout(toastTimer);toast.textContent=m;toast.classList.add('show');toastTimer=setTimeout(()=>toast.classList.remove('show'),2600)}
function openPage(name){$$('.page').forEach(p=>p.classList.toggle('active-page',p.id===name));$$('.nav-item[data-page],.mobile-nav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));title.textContent=name==='chats'?'Good evening, '+(currentUser?.displayName||'Alex'):names[name]||name;history.replaceState(null,'','#'+name);window.scrollTo({top:0,behavior:'smooth'})}
function modal({heading,body,confirm='Confirm',cancel='Cancel',danger=false,onConfirm}){
  modalRoot.innerHTML='<div class="modal-backdrop"><div class="modal"><button class="modal-close" aria-label="Close">×</button><h3>'+heading+'</h3><div>'+body+'</div><div class="modal-actions"><button class="secondary modal-cancel">'+cancel+'</button><button class="'+(danger?'danger':'primary')+' modal-confirm">'+confirm+'</button></div></div></div>';
  $('.modal-close').onclick=closeModal;$('.modal-cancel').onclick=closeModal;$('.modal-confirm').onclick=()=>{onConfirm?.();closeModal()};
}
function closeModal(){modalRoot.innerHTML=''}
function authHeaders(){const t=localStorage.getItem('voicecore.devToken');return t?{Authorization:'Bearer '+t,'Content-Type':'application/json'}:{'Content-Type':'application/json'}}
async function api(path,options={}){
  const r=await fetch(path,{...options,headers:{...authHeaders(),...(options.headers||{})}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||'Request failed');
  return data;
}
function setIdentity(){
  if(!currentUser)return;
  $$('.user-chip strong').forEach(x=>x.textContent=currentUser.displayName);
  $$('.user-chip small').forEach(x=>x.textContent='@'+currentUser.username);
  $$('.avatar-me').forEach(x=>x.textContent=currentUser.username.slice(0,2).toUpperCase());
  const h=$('.profile-head h2');if(h)h.textContent=currentUser.displayName;
  const p=$('.profile-head p');if(p)p.textContent='@'+currentUser.username+' · Local dev account';
}
function formatTime(value){return new Date(value).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function initials(name){return name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}
async function loadChats(){
  const chats=await api('/api/chats');
  const list=$('.chat-list');
  if(!chats.length){list.innerHTML='<div class="empty-state">No chats yet.</div>';return}
  list.innerHTML=chats.map((c,i)=>'<article class="chat-row '+(i===0?'selected':'')+'" data-chat-id="'+c.id+'"><div class="avatar grad-one">VC</div><div><strong>'+escapeHtml(c.title||'Private chat')+' <span class="online-dot"></span></strong><p>'+escapeHtml(c.last_message||'No messages yet')+'</p></div><time>'+(c.last_message_at?formatTime(c.last_message_at):'')+'</time></article>').join('');
  $$('.chat-row',list).forEach(row=>row.onclick=()=>selectChat(row.dataset.chatId));
  await selectChat(chats[0].id);
}
function connectSocket(){
  if(socket){try{socket.close()}catch{}}
  const token=localStorage.getItem('voicecore.devToken');
  const proto=location.protocol==='https:'?'wss':'ws';
  socket=new WebSocket(proto+'://'+location.host+'/ws?token='+encodeURIComponent(token));
  socket.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='message'&&m.message.chat_id===currentChat?.id){renderMessage(m.message,true);}}catch{}};
  socket.onclose=()=>{if(localStorage.getItem('voicecore.devToken'))setTimeout(connectSocket,1500)};
}
async function subscribe(chatId){if(socket?.readyState===1)socket.send(JSON.stringify({type:'subscribe',chatId}));}
async function selectChat(chatId){
  currentChat={id:chatId};
  $$('.chat-row').forEach(x=>x.classList.toggle('selected',x.dataset.chatId===chatId));
  const chats=await api('/api/chats');const chat=chats.find(x=>x.id===chatId);
  const name=chat?.title||'Private chat';
  $('#conversationName').innerHTML=escapeHtml(name)+' <span class="online-dot"></span>';
  $('#conversationAvatar').textContent='VC';
  const msgs=await api('/api/chats/'+chatId+'/messages');
  const box=$('#messages');box.innerHTML='<div class="day">TODAY</div>';
  msgs.forEach(m=>renderMessage(m,false));
  await subscribe(chatId);
}
function renderMessage(m,live){
  const box=$('#messages');const mine=m.sender_id===currentUser.id;
  const el=document.createElement('div');el.className='bubble '+(mine?'outgoing':'incoming');
  el.innerHTML=escapeHtml(m.body)+' <time>'+formatTime(m.created_at)+(mine?' ✓✓':'')+'</time>';
  box.appendChild(el);box.scrollTop=box.scrollHeight;
  if(live)show(mine?'Message sent':'New message');
}
async function sendMessage(value){
  if(!currentChat)return;
  try{await api('/api/chats/'+currentChat.id+'/messages',{method:'POST',body:JSON.stringify({body:value})})}
  catch(e){show(e.message)}
}
async function login(username,password){
  const data=await api('/api/auth/login',{method:'POST',body:JSON.stringify({username,password})});
  localStorage.setItem('voicecore.devToken',data.token);currentUser=data.user;
  $('#devLogin').style.display='none';setIdentity();openPage('chats');connectSocket();await loadChats();show('Signed in as @'+currentUser.username);
}
function initTheme(){
  const key='voicecore.theme';let theme=localStorage.getItem(key);
  if(!theme)theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  document.documentElement.dataset.theme=theme;
  const icon=$('#themeIcon'),label=$('#themeLabel');
  function paint(){const dark=document.documentElement.dataset.theme==='dark';icon.textContent=dark?'☀':'☾';label.textContent=dark?'Light theme':'Dark theme'}
  paint();$('#themeToggle')?.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem(key,next);paint()});
  $$('[data-theme-choice]').forEach(b=>b.onclick=()=>{document.documentElement.dataset.theme=b.dataset.themeChoice;localStorage.setItem(key,b.dataset.themeChoice);paint()});
}
function bindUi(){
  $$('[data-page]').forEach(b=>b.onclick=()=>openPage(b.dataset.page));
  $$('[data-page-go]').forEach(b=>b.onclick=()=>openPage(b.dataset.pageGo));
  $('#mobileMenu')?.addEventListener('click',()=>$('.sidebar').classList.toggle('mobile-open'));
  $('#privacyButton')?.addEventListener('click',()=>show('Streamer mode is stored locally in this DEV build.'));
  $('#notifyButton')?.addEventListener('click',()=>show('No new notifications.'));
  $('#searchButton')?.addEventListener('click',()=>show('Search is available after the local chat service is connected.'));
  $('#newChat')?.addEventListener('click',()=>show('The local DEV dataset contains the Alex ↔ Maya chat.'));
  $('#accountMenu')?.addEventListener('click',()=>modal({heading:'Local account',body:'<p>You are signed in as <b>@'+escapeHtml(currentUser?.username||'')+'</b>.</p><p class="muted">To test the second account, open this address in another browser or on your phone and sign in as Maya.</p>',confirm:'Sign out',cancel:'Close',onConfirm:logout}));
  $('#composer')?.addEventListener('submit',e=>{e.preventDefault();const input=$('input',e.currentTarget);const value=input.value.trim();if(value){input.value='';sendMessage(value)}});
  $$('[data-call]').forEach(b=>b.onclick=()=>show('Voice/video calling is the next realtime layer; chat messaging is live now.'));
  document.addEventListener('click',e=>{
    const a=e.target.closest('[data-action]');
    if(!a)return;
    const act=a.dataset.action;
    if(act==='premium')show('Core Premium UI is ready; billing is disabled in local DEV mode.');
    else if(act==='wallet-menu'||act==='wallet')openPage('wallet');
    else if(act==='send'||act==='receive'||act==='topup'||act==='transactions'||act==='copy')show('This action is intentionally disabled in local DEV mode.');
    else if(act==='room')show('Voice room signaling is not enabled in this local messenger test.');
    else if(act==='match')show('Matchmaking is not enabled in this local messenger test.');
    else if(act==='delete')modal({heading:'Delete local account?',body:'<p>This local DEV build does not expose account deletion. Your database is local to Docker.</p>',confirm:'Close',cancel:'Cancel'});
    else if(act==='edit-profile'||act==='privacy'||act==='blocked'||act==='audit'||act==='review')show('This screen is a product prototype; the local test focuses on authentication and messaging.');
    else if(act==='conversation-menu')show('Conversation controls are not enabled in local DEV mode.');
    else if(act==='attach'||act==='emoji')show('Attachments and emoji are not part of this local messenger test yet.');
  });
  $$('[data-gift]').forEach(b=>b.onclick=()=>show('Gift sending is disabled in local DEV mode.'));
  $$('[data-package]').forEach(b=>b.onclick=()=>show('VH top-up is disabled in local DEV mode.'));
}
async function logout(){localStorage.removeItem('voicecore.devToken');if(socket)socket.close();location.reload()}
async function boot(){
  initTheme();bindUi();
  const token=localStorage.getItem('voicecore.devToken');
  if(!token)return;
  try{currentUser=await api('/api/me');$('#devLogin').style.display='none';setIdentity();connectSocket();await loadChats();openPage(location.hash.slice(1)||'chats')}
  catch{localStorage.removeItem('voicecore.devToken')}
  $$('.dev-account').forEach(b=>b.onclick=()=>{const u=b.dataset.loginUser;$('#loginUsername').value=u;$('#loginPassword').value='Test1234!';$('#loginForm').requestSubmit()});
  $('#loginForm')?.addEventListener('submit',async e=>{e.preventDefault();const err=$('#loginError');err.textContent='';try{await login($('#loginUsername').value,$('#loginPassword').value)}catch(x){err.textContent='Invalid local credentials'}});
}
boot();
