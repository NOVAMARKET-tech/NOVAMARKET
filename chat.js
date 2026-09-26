// Messagerie NovaMarket (utilise db, app, user, esc, toast, $ définis dans app.js)
let ch = null;
const closeChat = () => { if (ch) { db.removeChannel(ch); ch = null; } };
const hm = d => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

async function startChat(adId) {
  if (!user) { toast('Connectez-vous pour envoyer un message'); location.hash = '#/login'; return; }
  const { data: ad } = await db.from('ads').select('user_id').eq('id', adId).single();
  if (!ad || ad.user_id === user.id) return toast('Action impossible');
  let { data: c } = await db.from('conversations').select('id').eq('ad_id', adId).eq('buyer_id', user.id).maybeSingle();
  if (!c) {
    const r = await db.from('conversations').insert({ ad_id: adId, seller_id: ad.user_id }).select('id').single();
    if (r.error) return toast(r.error.message);
    c = r.data;
  }
  location.hash = '#/chat/' + c.id;
}

async function chatList(filter) {
  if (!user) { location.hash = '#/login'; return; }
  filter = filter || 'all';
  const { data, error } = await db.from('conversations').select('id,ad_id,buyer_id,seller_id,last_message_at,ads(title,photos)').order('last_message_at', { ascending: false });
  const { data: reads } = await db.from('conversation_reads').select('conversation_id,last_read_at').eq('user_id', user.id);
  const readMap = new Map((reads || []).map(r => [r.conversation_id, r.last_read_at]));
  const unread = c => new Date(c.last_message_at) > new Date(readMap.get(c.id) || 0);
  const TABS = [['all', 'Tout'], ['unread', 'Non lus'], ['buy', 'Achats'], ['sell', 'Ventes']];
  let list = data || [];
  if (filter === 'unread') list = list.filter(unread);
  else if (filter === 'buy') list = list.filter(c => c.buyer_id === user.id);
  else if (filter === 'sell') list = list.filter(c => c.seller_id === user.id);
  app.innerHTML = `<h2>Mes messages</h2>
  <nav style="padding:0 0 14px;margin:0" id="ctabs">${TABS.map(t => `<button class="${filter === t[0] ? 'on' : ''}" data-t="${t[0]}" style="${filter === t[0] ? 'background:var(--g);color:#fff' : ''}">${t[1]}</button>`).join('')}</nav>
  ` + (error ? '<p class="none">Erreur : ' + esc(error.message) + '</p>' :
    list.length ? list.map(c => `<a class="box conv" href="#/chat/${c.id}" style="${unread(c) ? 'border-left:4px solid var(--g2)' : ''}"><div class="th">${c.ads?.photos?.[0] ? `<img src="${esc(c.ads.photos[0])}" alt="">` : '📦'}</div><div><b>${esc(c.ads?.title || 'Annonce')}${unread(c) ? ' •' : ''}</b><br><small>${c.buyer_id === user.id ? '🛒 Vous écrivez au vendeur' : '💰 Un acheteur vous a écrit'} · ${hm(c.last_message_at)}</small></div></a>`).join('')
    : '<p class="none">Aucune conversation dans cette liste.</p>');
  $('#ctabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) chatList(b.dataset.t); });
}

async function chatRoom(id) {
  if (!user) { location.hash = '#/login'; return; }
  const { data: c } = await db.from('conversations').select('id,ad_id,ads(title)').eq('id', id).maybeSingle();
  if (!c) { app.innerHTML = '<p class="none">Conversation introuvable.</p>'; return; }
  const { data: ms } = await db.from('messages').select('*').eq('conversation_id', id).order('created_at');
  const markRead = () => db.from('conversation_reads').upsert({ conversation_id: +id, last_read_at: new Date().toISOString() });
  markRead();
  const seen = new Set();
  const bub = m => seen.has(m.id) ? '' : (seen.add(m.id), `<div class="msg ${m.sender_id === user.id ? 'me' : ''}">${esc(m.body)}<small>${hm(m.created_at)}</small></div>`);
  app.innerHTML = `<p style="margin-top:12px"><a href="#/chat">← Messages</a> · <a href="#/ad/${c.ad_id}"><b>${esc(c.ads?.title || 'Annonce')}</b></a></p>
  <div class="msgs" id="ml">${(ms || []).map(bub).join('') || '<p class="none" id="e">Écrivez le premier message.</p>'}</div>
  <form class="send" id="sf"><input name="b" maxlength="2000" placeholder="Votre message..." autocomplete="off" required><button class="btn">Envoyer</button></form>`;
  const ml = $('#ml');
  const add = m => { const h = bub(m); if (!h) return; $('#e')?.remove(); ml.insertAdjacentHTML('beforeend', h); ml.scrollTop = ml.scrollHeight; if (m.sender_id !== user.id) markRead(); };
  ml.scrollTop = ml.scrollHeight;
  $('#sf').onsubmit = async e => {
    e.preventDefault();
    const i = e.target.b, body = i.value.trim(); if (!body) return;
    i.value = '';
    const r = await db.from('messages').insert({ conversation_id: +id, body }).select().single();
    if (r.error) { i.value = body; return toast(r.error.message); }
    add(r.data); markRead();
  };
  closeChat();
  ch = db.channel('chat-' + id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + id }, p => add(p.new)).subscribe();
}
