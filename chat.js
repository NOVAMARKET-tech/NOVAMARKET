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

async function chatList() {
  if (!user) { location.hash = '#/login'; return; }
  const { data, error } = await db.from('conversations').select('id,seller_id,last_message_at,ads(title,photos)').order('last_message_at', { ascending: false });
  app.innerHTML = '<h2>Mes messages</h2>' + (error ? '<p class="none">Erreur : ' + esc(error.message) + '</p>' :
    data.length ? data.map(c => `<a class="box conv" href="#/chat/${c.id}"><div class="th">${c.ads?.photos?.[0] ? `<img src="${esc(c.ads.photos[0])}" alt="">` : '📦'}</div><div><b>${esc(c.ads?.title || 'Annonce')}</b><br><small>${c.seller_id === user.id ? 'Un acheteur vous a écrit' : 'Vous écrivez au vendeur'} · ${hm(c.last_message_at)}</small></div></a>`).join('')
    : '<p class="none">Aucune conversation. Ouvrez une annonce et cliquez sur « Envoyer un message ».</p>');
}

async function chatRoom(id) {
  if (!user) { location.hash = '#/login'; return; }
  const { data: c } = await db.from('conversations').select('id,ad_id,ads(title)').eq('id', id).maybeSingle();
  if (!c) { app.innerHTML = '<p class="none">Conversation introuvable.</p>'; return; }
  const { data: ms } = await db.from('messages').select('*').eq('conversation_id', id).order('created_at');
  const seen = new Set();
  const bub = m => seen.has(m.id) ? '' : (seen.add(m.id), `<div class="msg ${m.sender_id === user.id ? 'me' : ''}">${esc(m.body)}<small>${hm(m.created_at)}</small></div>`);
  app.innerHTML = `<p style="margin-top:12px"><a href="#/chat">← Messages</a> · <a href="#/ad/${c.ad_id}"><b>${esc(c.ads?.title || 'Annonce')}</b></a></p>
  <div class="msgs" id="ml">${(ms || []).map(bub).join('') || '<p class="none" id="e">Écrivez le premier message.</p>'}</div>
  <form class="send" id="sf"><input name="b" maxlength="2000" placeholder="Votre message..." autocomplete="off" required><button class="btn">Envoyer</button></form>`;
  const ml = $('#ml');
  const add = m => { const h = bub(m); if (!h) return; $('#e')?.remove(); ml.insertAdjacentHTML('beforeend', h); ml.scrollTop = ml.scrollHeight; };
  ml.scrollTop = ml.scrollHeight;
  $('#sf').onsubmit = async e => {
    e.preventDefault();
    const i = e.target.b, body = i.value.trim(); if (!body) return;
    i.value = '';
    const r = await db.from('messages').insert({ conversation_id: +id, body }).select().single();
    if (r.error) { i.value = body; return toast(r.error.message); }
    add(r.data);
  };
  closeChat();
  ch = db.channel('chat-' + id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + id }, p => add(p.new)).subscribe();
}
