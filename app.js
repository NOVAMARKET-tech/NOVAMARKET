const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s), app = $('#app');
const CATS = [["Téléphones","📱"],["Informatique","💻"],["Véhicules","🚗"],["Immobilier","🏠"],["Maison","🛋️"],["Vêtements","👕"],["Consoles et jeux","🎮"],["Services","⚙️"],["Emploi","💼"],["Autres","🔷"]];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fcfa = n => n == null ? 'Prix à débattre' : Number(n).toLocaleString('fr-FR') + ' FCFA';
const wa = (n, t = '') => { let d = String(n).replace(/\D/g, ''); if (!d.startsWith('229')) d = '229' + d; return 'https://wa.me/' + d + (t ? '?text=' + encodeURIComponent(t) : ''); };
let user = null, favs = new Set(), F = { q: '', cat: '', city: '', min: '', max: '' };
const toast = m => { const t = $('#toast'); t.textContent = m; t.hidden = false; setTimeout(() => t.hidden = true, 3200); };

function nav() {
  $('#nav').innerHTML = '<a href="#/">Accueil</a><a href="#/services">Services</a>' +
    (user ? '<a href="#/chat">💬 Messages</a><a href="#/favs">♥ Favoris</a><a href="#/profile">Mon profil</a><button id="out">Déconnexion</button>' : '<a href="#/login">Connexion</a>');
  const o = $('#out'); if (o) o.onclick = async () => { await db.auth.signOut(); location.hash = '#/'; };
}
async function loadFavs() {
  favs = new Set(); if (!user) return;
  const { data } = await db.from('favorites').select('ad_id'); (data || []).forEach(r => favs.add(r.ad_id));
}
const card = a => `<a class="card" href="#/ad/${a.id}"><div class="ph">${a.photos?.[0] ? `<img src="${esc(a.photos[0])}" alt="" loading="lazy">` : '📦'}<em>${esc(a.category)}</em><button class="fav ${favs.has(a.id) ? 'on' : ''}" data-fav="${a.id}" aria-label="Favori">♥</button></div><div class="tx"><b>${esc(a.title)}</b><div class="p">${fcfa(a.price)}</div><small>📍 ${esc(a.city || 'Bénin')}</small></div></a>`;
const grid = l => l.length ? l.map(card).join('') : '<p class="none">Aucune annonce trouvée.</p>';

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-fav]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  if (!user) { toast('Connectez-vous pour utiliser les favoris'); location.hash = '#/login'; return; }
  const id = +b.dataset.fav;
  if (favs.has(id)) { await db.from('favorites').delete().eq('ad_id', id); favs.delete(id); }
  else { await db.from('favorites').insert({ ad_id: id }); favs.add(id); }
  b.classList.toggle('on', favs.has(id));
  if (location.hash === '#/favs') route();
});

async function home() {
  app.innerHTML = `<section class="hero"><div class="hero-in">
  <p class="brand">Nova<i>Market</i></p>
  <h1>Le marché en ligne du Bénin</h1>
  <p class="lead">Trouvez tout ce dont vous avez besoin : téléphones, voitures, immobilier, vêtements, maison, services et bien plus encore.</p>
  <form id="ff"><div class="search"><span class="ic">🔍</span><input class="q" name="q" placeholder="Rechercher une annonce, une catégorie, une ville..." value="${esc(F.q)}"><button class="btn" type="submit">Rechercher</button></div>
  <details class="more"><summary>Filtres avancés</summary><div class="more-grid">
  <select name="cat"><option value="">Toutes catégories</option>${CATS.map(c => `<option ${F.cat === c[0] ? 'selected' : ''}>${c[0]}</option>`).join('')}</select>
  <input name="city" placeholder="Ville" value="${esc(F.city)}"><input name="min" type="number" min="0" placeholder="Prix min" value="${esc(F.min)}"><input name="max" type="number" min="0" placeholder="Prix max" value="${esc(F.max)}">
  <button class="btn alt" type="submit">Appliquer</button></div></details></form>
  </div></section>
  <div class="cats-wrap"><div class="cats-box" id="catsBox">${CATS.map(c => `<button class="cat ${F.cat === c[0] ? 'on' : ''}" data-c="${c[0]}"><span>${c[1]}</span>${c[0]}</button>`).join('')}</div></div>
  <section class="svc-band"><div><h3>Nos services</h3><p>Pour vous faciliter la vie au quotidien</p></div>
  <div class="svc-item"><span>🚚</span><div><b>Livraison</b><small>Rapide et sécurisée</small></div></div>
  <div class="svc-item"><span>🧹</span><div><b>Nettoyage</b><small>Un espace propre, un esprit léger</small></div></div>
  <div class="svc-item"><span>👔</span><div><b>Pressing</b><small>Entre de bonnes mains</small></div></div>
  <div class="svc-contact"><span>💬 WhatsApp <b>0197392704</b></span><span>📍 Bénin</span></div></section>
  <h2>Annonces récentes</h2><div class="grid" id="list"><p class="none">Chargement...</p></div>`;
  $('#ff').onsubmit = e => { e.preventDefault(); F = Object.fromEntries(new FormData(e.target)); home(); };
  document.querySelectorAll('.cat').forEach(b => b.onclick = () => { F.cat = F.cat === b.dataset.c ? '' : b.dataset.c; home(); });
  let q = db.from('ads').select('*').order('created_at', { ascending: false }).limit(60);
  const k = F.q.replace(/[,()%*]/g, ' ').trim();
  if (k) q = q.or(`title.ilike.%${k}%,description.ilike.%${k}%`);
  if (F.cat) q = q.eq('category', F.cat);
  if (F.city) q = q.ilike('city', '%' + F.city.replace(/[%*]/g, '') + '%');
  if (F.min) q = q.gte('price', F.min);
  if (F.max) q = q.lte('price', F.max);
  const { data, error } = await q;
  $('#list').innerHTML = error ? '<p class="none">Erreur de chargement. Vérifiez config.js.</p>' : grid(data);
}

async function adPage(id) {
  const { data: a } = await db.from('ads').select('*').eq('id', id).single();
  if (!a) { app.innerHTML = '<p class="none">Annonce introuvable.</p>'; return; }
  const mine = user && user.id === a.user_id;
  app.innerHTML = `<div class="box"><div class="gal">${(a.photos || []).map(p => `<img src="${esc(p)}" alt="">`).join('')}</div>
  <small>${esc(a.category)} · 📍 ${esc(a.city || 'Bénin')}</small><h2 style="margin:6px 0">${esc(a.title)}</h2><div class="p" style="font-size:22px">${fcfa(a.price)}</div>
  <p style="white-space:pre-wrap;margin-top:10px">${esc(a.description)}</p>
  <div class="row"><a class="btn wa" target="_blank" rel="noopener" href="${wa(a.whatsapp, 'Bonjour, je suis intéressé par votre annonce NovaMarket : ' + a.title)}">Contacter sur WhatsApp</a>
  ${mine ? '' : '<button class="btn" id="msg">💬 Envoyer un message</button>'}${mine ? `<a class="btn alt" href="#/edit/${a.id}">Modifier</a><button class="btn red" id="del">Supprimer</button>` : ''}</div></div>`;
  if (!mine) $('#msg').onclick = () => startChat(a.id);
  if (mine) $('#del').onclick = async () => {
    if (!confirm('Supprimer cette annonce ?')) return;
    const paths = (a.photos || []).map(u => u.split('/photos/')[1]).filter(Boolean);
    if (paths.length) await db.storage.from('photos').remove(paths);
    const { error } = await db.from('ads').delete().eq('id', a.id);
    if (error) return toast(error.message); toast('Annonce supprimée'); location.hash = '#/profile';
  };
}

async function form(id) {
  if (!user) { toast('Connectez-vous pour publier'); location.hash = '#/login'; return; }
  let a = { title: '', description: '', price: '', category: CATS[0][0], city: '', whatsapp: user.user_metadata?.phone || '', photos: [] };
  if (id) { const { data } = await db.from('ads').select('*').eq('id', id).single(); if (!data || data.user_id !== user.id) { app.innerHTML = '<p class="none">Annonce introuvable.</p>'; return; } a = data; }
  app.innerHTML = `<h2>${id ? 'Modifier' : 'Publier'} l'annonce</h2><div class="box"><form class="f" id="af">
  <label>Titre<input name="title" required minlength="3" maxlength="120" value="${esc(a.title)}"></label>
  <label>Description<textarea name="description" rows="5">${esc(a.description)}</textarea></label>
  <label>Prix (FCFA)<input name="price" type="number" min="0" value="${esc(a.price)}"></label>
  <label>Catégorie<select name="category">${CATS.map(c => `<option ${a.category === c[0] ? 'selected' : ''}>${c[0]}</option>`).join('')}</select></label>
  <label>Localisation<input name="city" required placeholder="Ex : Cotonou" value="${esc(a.city)}"></label>
  <label>Numéro WhatsApp<input name="whatsapp" required inputmode="tel" placeholder="0197392704" value="${esc(a.whatsapp)}"></label>
  ${a.photos.length ? `<label>Photos actuelles<div class="gal" id="cur">${a.photos.map((p, i) => `<span style="position:relative"><img src="${esc(p)}" style="height:100px;border-radius:10px"><button type="button" class="fav on" data-rm="${i}" style="position:absolute;right:4px;top:4px;width:26px;height:26px" aria-label="Retirer">×</button></span>`).join('')}</div><small>Cliquez sur × pour retirer une photo.</small></label>` : ''}
  <label>${a.photos.length ? 'Ajouter des photos' : 'Photos'} (6 max au total, 5 Mo chacune)<input name="files" type="file" accept="image/*" multiple></label>
  <button class="btn" id="sb">${id ? 'Enregistrer' : 'Publier'}</button></form></div>`;
  let kept = [...a.photos];
  $('#cur')?.addEventListener('click', e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    kept[+b.dataset.rm] = null; b.closest('span').remove();
  });
  $('#af').onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target), files = [...fd.getAll('files')].filter(f => f.size);
    const remainKept = kept.filter(Boolean);
    if (files.length + remainKept.length > 6) return toast('6 photos maximum');
    if (files.some(f => f.size > 5e6)) return toast('Chaque photo doit faire moins de 5 Mo');
    if (files.length + remainKept.length === 0) return toast('Ajoutez au moins une photo');
    $('#sb').disabled = true; $('#sb').textContent = 'Envoi...';
    const urls = [...remainKept];
    for (const [i, f] of files.entries()) {
      const path = `${user.id}/${Date.now()}-${i}-${f.name.replace(/[^\w.]/g, '_')}`;
      const { error } = await db.storage.from('photos').upload(path, f);
      if (error) { toast(error.message); $('#sb').disabled = false; return; }
      urls.push(db.storage.from('photos').getPublicUrl(path).data.publicUrl);
    }
    const row = { title: fd.get('title').trim(), description: fd.get('description').trim(), price: fd.get('price') === '' ? null : +fd.get('price'), category: fd.get('category'), city: fd.get('city').trim(), whatsapp: fd.get('whatsapp').trim(), photos: urls };
    const r = id ? await db.from('ads').update(row).eq('id', id).select().single() : await db.from('ads').insert(row).select().single();
    if (r.error) { toast(r.error.message); $('#sb').disabled = false; return; }
    toast('Annonce enregistrée'); location.hash = '#/ad/' + r.data.id;
  };
}

function login() {
  let signup = false;
  const draw = () => {
    app.innerHTML = `<h2>${signup ? 'Créer un compte' : 'Connexion'}</h2><div class="box"><form class="f" id="lf">
    ${signup ? '<label>Nom<input name="name" required></label><label>Téléphone<input name="phone" inputmode="tel" placeholder="0197392704"></label>' : ''}
    <label>E-mail<input name="email" type="email" required></label><label>Mot de passe<input name="pw" type="password" minlength="6" required></label>
    <button class="btn">${signup ? "S'inscrire" : 'Se connecter'}</button></form>
    <p class="row"><button class="btn alt" id="sw">${signup ? "J'ai déjà un compte" : 'Créer un compte'}</button></p></div>`;
    $('#sw').onclick = () => { signup = !signup; draw(); };
    $('#lf').onsubmit = async e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      const r = signup ? await db.auth.signUp({ email: f.email, password: f.pw, options: { data: { name: f.name, phone: f.phone } } }) : await db.auth.signInWithPassword({ email: f.email, password: f.pw });
      if (r.error) return toast(r.error.message);
      if (signup && !r.data.session) return toast('Compte créé. Confirmez votre e-mail puis connectez-vous.');
      location.hash = '#/profile';
    };
  };
  draw();
}

async function profile() {
  if (!user) { location.hash = '#/login'; return; }
  const { data } = await db.from('ads').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  const m = user.user_metadata || {};
  app.innerHTML = `<h2>Mon profil</h2><div class="box"><form class="f" id="pf">
  <label>Nom<input name="name" required value="${esc(m.name || '')}"></label>
  <label>Numéro WhatsApp<input name="phone" inputmode="tel" placeholder="0197392704" value="${esc(m.phone || '')}"></label>
  <small>E-mail : ${esc(user.email)} (non modifiable)</small>
  <button class="btn" id="pb">Enregistrer</button></form></div>
  <div class="row"><span class="box" style="margin:0;padding:12px 16px"><b>${(data || []).length}</b> annonce(s) publiée(s)</span><a class="btn alt" href="#/favs">♥ Voir mes favoris</a></div>
  <h2>Mes annonces</h2><div class="grid">${grid(data || [])}</div>`;
  $('#pf').onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target);
    $('#pb').disabled = true;
    const r = await db.auth.updateUser({ data: { name: fd.get('name').trim(), phone: fd.get('phone').trim() } });
    if (r.error) { toast(r.error.message); $('#pb').disabled = false; return; }
    user = r.data.user; toast('Profil mis à jour'); profile();
  };
}
async function favsPage() {
  if (!user) { location.hash = '#/login'; return; }
  const { data } = await db.from('favorites').select('ads(*)');
  app.innerHTML = `<h2>Mes favoris</h2><div class="grid">${grid((data || []).map(r => r.ads).filter(Boolean))}</div>`;
}
function services() {
  const s = [['🚚', 'Livraison', 'Rapide et sécurisée'], ['🧹', 'Nettoyage', 'Un espace propre, un esprit léger'], ['👔', 'Pressing', 'Vos vêtements entre de bonnes mains']];
  app.innerHTML = `<h2>Services NovaMarket</h2><div class="svc">${s.map(x => `<div class="box"><span style="font-size:34px">${x[0]}</span><br><b>${x[1]}</b><p>${x[2]}</p><div class="row"><a class="btn wa" target="_blank" rel="noopener" href="${wa('0197392704', 'Bonjour, je souhaite le service : ' + x[1])}">Demander sur WhatsApp</a></div></div>`).join('')}</div>
  <div class="box"><b>Contact</b><p>WhatsApp : 0197392704<br>Téléphone : <a href="tel:0161209887">0161209887</a><br>Zone : Bénin</p></div>`;
}

function legalPage() {
  app.innerHTML = `<h2>Mentions légales et confidentialité</h2>
  <div class="box"><b>Éditeur du site</b><p>NovaMarket est une plateforme de petites annonces destinée au marché béninois.<br>Contact : WhatsApp 0197392704 · Téléphone <a href="tel:0161209887">0161209887</a> · Zone : Bénin, Agbato.</p></div>
  <div class="box"><b>Rôle de la plateforme</b><p>NovaMarket met en relation des personnes souhaitant acheter, vendre ou échanger des biens et services. NovaMarket n'est ni vendeur ni acheteur : chaque annonce est publiée et gérée sous l'entière responsabilité de son auteur. Vérifiez toujours un bien avant de payer et privilégiez les remises en main propre.</p></div>
  <div class="box"><b>Contenu autorisé</b><p>Les annonces doivent respecter la loi béninoise et ne pas concerner des biens ou services interdits, volés, contrefaits ou dangereux. NovaMarket se réserve le droit de retirer toute annonce non conforme.</p></div>
  <div class="box"><b>Données personnelles</b><p>Lors de l'inscription, NovaMarket conserve votre nom, votre e-mail et votre numéro WhatsApp afin de faire fonctionner votre compte, vos annonces et la messagerie. Ces données sont hébergées chez Supabase et ne sont jamais vendues à des tiers. Votre numéro WhatsApp est visible par les personnes intéressées par vos annonces, car il sert au contact direct.</p></div>
  <div class="box"><b>Photos</b><p>Les photos que vous ajoutez à une annonce sont stockées de façon sécurisée et restent visibles tant que l'annonce existe. Vous pouvez les retirer ou supprimer votre annonce à tout moment depuis votre profil.</p></div>
  <div class="box"><b>Cookies</b><p>NovaMarket utilise uniquement les informations nécessaires à votre connexion (session). Aucun cookie publicitaire n'est utilisé.</p></div>`;
}
function route() {
  const [, p, id] = location.hash.slice(1).split('/'); scrollTo(0, 0); closeChat();
  if (p === 'ad') adPage(id); else if (p === 'new') form(); else if (p === 'edit') form(id);
  else if (p === 'login') login(); else if (p === 'profile') profile(); else if (p === 'favs') favsPage();
  else if (p === 'chat') { id ? chatRoom(id) : chatList(); } else if (p === 'services') services(); else if (p === 'mentions') legalPage(); else home();
}
window.addEventListener('hashchange', route);
db.auth.onAuthStateChange(async (_e, s) => { const changed = (s?.user?.id || null) !== (user?.id || null); user = s?.user || null; if (changed) { await loadFavs(); nav(); route(); } });
nav(); route();
