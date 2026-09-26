const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s), app = $('#app');
const CATS = [["Téléphones","📱"],["Informatique","💻"],["Véhicules","🚗"],["Immobilier","🏠"],["Maison","🛋️"],["Vêtements","👕"],["Consoles et jeux","🎮"],["Services","⚙️"],["Emploi","💼"],["Autres","🔷"]];
const CAT_FIELDS = {
  'Téléphones': [['condition', 'État', 'select', ['Neuf', 'Très bon état', 'Bon état', 'À réparer']], ['storage_capacity', 'Stockage', 'text', 'Ex : 64 Go, 128 Go, 256 Go...']],
  'Informatique': [['device_type', 'Type', 'select', ['Ordinateur portable', 'Ordinateur de bureau', 'Tablette', 'Accessoire']], ['condition', 'État', 'select', ['Neuf', 'Très bon état', 'Bon état', 'À réparer']]],
  'Véhicules': [['year', 'Année', 'number'], ['mileage', 'Kilométrage (km)', 'number'], ['gearbox', 'Boîte', 'select', ['Manuelle', 'Automatique']], ['fuel', 'Carburant', 'select', ['Essence', 'Diesel', 'Électrique', 'Hybride']]],
  'Immobilier': [['property_type', 'Type de bien', 'select', ['Appartement', 'Maison', 'Studio / Chambre', 'Terrain', 'Bureau / Commerce', 'Location vacances']], ['transaction_type', 'Transaction', 'select', ['Vente', 'Location']], ['furnished', 'Meublé ?', 'select', ['Meublé', 'Non meublé']], ['rooms', 'Nombre de chambres', 'number'], ['bathrooms', 'Nombre de douches / salles de bain', 'number'], ['area', 'Superficie / Dimensions', 'text', 'Ex : 150 m², 12m x 10m...']],
  'Maison': [['home_type', 'Type', 'select', ['Meuble', 'Électroménager', 'Décoration', 'Autre']], ['condition', 'État', 'select', ['Neuf', 'Occasion']]],
  'Vêtements': [['size', 'Taille', 'text', 'Ex : M, 42, Unique...'], ['gender', 'Pour', 'select', ['Homme', 'Femme', 'Enfant', 'Unisexe']], ['condition', 'État', 'select', ['Neuf', 'Occasion']]],
  'Consoles et jeux': [['platform', 'Plateforme', 'select', ['PS5', 'PS4', 'Xbox', 'Nintendo Switch', 'PC', 'Autre']], ['condition', 'État', 'select', ['Neuf', 'Occasion']]],
  'Emploi': [['contract_type', 'Type de contrat', 'select', ['CDI', 'CDD', 'Stage', 'Temps partiel', 'Freelance']]]
};
const ALL_EXTRA_FIELDS = [...new Set(Object.values(CAT_FIELDS).flat().map(f => f[0]))];
const FIELD_LABELS = Object.fromEntries(Object.values(CAT_FIELDS).flat().map(f => [f[0], f[1]]));
const BRAND_LABELS = { 'Téléphones': 'Marque', 'Véhicules': 'Marque', 'Informatique': 'Marque', 'Consoles et jeux': 'Marque', 'Vêtements': 'Modèle' };
const BRAND_PLACEHOLDERS = { 'Téléphones': 'Ex : Samsung, Apple, Tecno, Infinix...', 'Véhicules': 'Ex : Toyota, Peugeot, Renault...', 'Informatique': 'Ex : HP, Dell, Lenovo, Apple...', 'Consoles et jeux': 'Ex : Sony, Microsoft, Nintendo...', 'Vêtements': 'Ex : Robe longue, chemise slim...' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fcfa = n => n == null ? 'Prix à débattre' : Number(n).toLocaleString('fr-FR') + ' FCFA';
const wa = (n, t = '') => { let d = String(n).replace(/\D/g, ''); if (!d.startsWith('229')) d = '229' + d; return 'https://wa.me/' + d + (t ? '?text=' + encodeURIComponent(t) : ''); };
let user = null, favs = new Set(), F = { q: '', cat: '', city: '', min: '', max: '' };
const toast = m => { const t = $('#toast'); t.textContent = m; t.hidden = false; setTimeout(() => t.hidden = true, 3200); };

function nav() {
  $('#nav').innerHTML = user
    ? '<a href="#/">Accueil</a><a href="#/chat">💬 Messages</a><a href="#/favs">♥ Favoris</a><a href="#/profile">👤 Mon profil</a>'
    : '<a href="#/">Accueil</a><a href="#/login">👤 Se connecter</a>';
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
  <div class="cats-wrap"><div class="cats-box" id="catsBox">${CATS.map(c => `<a class="cat ${F.cat === c[0] ? 'on' : ''}" href="#/categorie/${encodeURIComponent(c[0])}"><span>${c[1]}</span>${c[0]}</a>`).join('')}</div></div>
  <div class="hd"><h2>${F.cat ? `Catégorie : ${esc(F.cat)}` : 'Annonces récentes'}</h2>${F.cat ? '<a href="#/">✕ Toutes les catégories</a>' : ''}</div>
  <div class="grid" id="list"><p class="none">Chargement...</p></div>`;
  $('#ff').onsubmit = e => { e.preventDefault(); F = Object.fromEntries(new FormData(e.target)); home(); };
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
function categoryPage(nameEncoded) {
  F = { q: '', cat: decodeURIComponent(nameEncoded), city: '', min: '', max: '' };
  home();
}

async function adPage(id) {
  const { data: a } = await db.from('ads').select('*').eq('id', id).single();
  if (!a) { app.innerHTML = '<p class="none">Annonce introuvable.</p>'; return; }
  const mine = user && user.id === a.user_id;
  app.innerHTML = `<div class="box"><div class="gal">${(a.photos || []).map(p => `<img src="${esc(p)}" alt="">`).join('')}</div>
  <small><a href="#/categorie/${encodeURIComponent(a.category)}">${esc(a.category)}</a> · 📍 ${esc(a.city || 'Bénin')}</small><h2 style="margin:6px 0">${esc(a.title)}</h2>${a.brand ? `<p style="font-weight:600;color:var(--mute);margin-bottom:4px">${BRAND_LABELS[a.category] || 'Marque'} : ${esc(a.brand)}</p>` : ''}
  ${(() => { const l = (CAT_FIELDS[a.category] || []).filter(([n]) => a[n]).map(([n, label]) => `${label} : ${esc(a[n])}`); return l.length ? `<p style="font-weight:600;color:var(--mute);margin-bottom:4px">${l.join(' · ')}</p>` : ''; })()}
  <div class="p" style="font-size:22px">${fcfa(a.price)}</div>
  <p style="white-space:pre-wrap;margin-top:10px">${esc(a.description)}</p>
  ${a.specs ? `<div class="box" style="background:var(--bg);box-shadow:none;margin:12px 0 0"><b>Caractéristiques</b><p style="white-space:pre-wrap;margin-top:6px">${esc(a.specs)}</p></div>` : ''}
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
  let a = { title: '', description: '', price: '', category: CATS[0][0], city: '', whatsapp: user.user_metadata?.phone || '', photos: [], brand: '', specs: '' };
  if (id) { const { data } = await db.from('ads').select('*').eq('id', id).single(); if (!data || data.user_id !== user.id) { app.innerHTML = '<p class="none">Annonce introuvable.</p>'; return; } a = data; }
  const extraHTML = cat => (CAT_FIELDS[cat] || []).map(([name, label, type, opt]) => {
    const val = a[name] ?? '';
    if (type === 'select') return `<label>${label}<select name="${name}"><option value="">Non précisé</option>${opt.map(o => `<option ${val === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
    if (type === 'number') return `<label>${label}<input name="${name}" type="number" min="0" value="${esc(val)}"></label>`;
    return `<label>${label}<input name="${name}" maxlength="60" placeholder="${esc(opt)}" value="${esc(val)}"></label>`;
  }).join('');
  const brandHTML = cat => BRAND_LABELS[cat] ? `<label>${BRAND_LABELS[cat]} (facultatif)<input name="brand" maxlength="80" placeholder="${esc(BRAND_PLACEHOLDERS[cat] || '')}" value="${esc(a.brand)}"></label>` : '';
  app.innerHTML = `<h2>${id ? 'Modifier' : 'Publier'} l'annonce</h2><div class="box"><form class="f" id="af">
  <label>Titre<input name="title" required minlength="3" maxlength="120" value="${esc(a.title)}"></label>
  <label>Catégorie<select name="category" id="catSel">${CATS.map(c => `<option ${a.category === c[0] ? 'selected' : ''}>${c[0]}</option>`).join('')}</select></label>
  <div id="extra">${extraHTML(a.category)}</div>
  <div id="brandWrap">${brandHTML(a.category)}</div>
  <label>Autres caractéristiques (facultatif)<textarea name="specs" rows="4" placeholder="Ajoutez toute autre précision utile...">${esc(a.specs)}</textarea></label>
  <label>Description<textarea name="description" rows="5">${esc(a.description)}</textarea></label>
  <label>Prix (FCFA)<input name="price" type="number" min="0" value="${esc(a.price)}"></label>
  <label>Localisation (ville)<input name="city" required placeholder="Ex : Cotonou" value="${esc(a.city)}"></label>
  <label>Numéro WhatsApp<input name="whatsapp" required inputmode="tel" placeholder="0197392704" value="${esc(a.whatsapp)}"></label>
  ${a.photos.length ? `<label>Photos actuelles<div class="gal" id="cur">${a.photos.map((p, i) => `<span style="position:relative"><img src="${esc(p)}" style="height:100px;border-radius:10px"><button type="button" class="fav on" data-rm="${i}" style="position:absolute;right:4px;top:4px;width:26px;height:26px" aria-label="Retirer">×</button></span>`).join('')}</div><small>Cliquez sur × pour retirer une photo.</small></label>` : ''}
  <label>${a.photos.length ? 'Ajouter des photos' : 'Photos'} (6 max au total, 5 Mo chacune)<input name="files" type="file" accept="image/*" multiple></label>
  <button class="btn" id="sb">${id ? 'Enregistrer' : 'Publier'}</button></form></div>`;
  $('#catSel').onchange = e => { $('#extra').innerHTML = extraHTML(e.target.value); $('#brandWrap').innerHTML = brandHTML(e.target.value); };
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
    const cat = fd.get('category'), fields = CAT_FIELDS[cat] || [];
    const extraRow = {}; ALL_EXTRA_FIELDS.forEach(n => extraRow[n] = null);
    fields.forEach(([name, , type]) => {
      const raw = (fd.get(name) || '').toString().trim();
      extraRow[name] = raw === '' ? null : (type === 'number' ? +raw : raw);
    });
    const row = { title: fd.get('title').trim(), description: fd.get('description').trim(), price: fd.get('price') === '' ? null : +fd.get('price'), category: cat, city: fd.get('city').trim(), whatsapp: fd.get('whatsapp').trim(), photos: urls, brand: (fd.get('brand') || '').trim() || null, specs: fd.get('specs').trim() || null, ...extraRow };
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

const SETTINGS_MENU = [
  { key: 'perso', icon: '🧾', label: 'Informations personnelles', sub: [
    { key: 'compte', label: 'Informations du compte' },
    { key: 'adresse', label: 'Adresse' },
    { key: 'paiement', label: 'Moyens de paiement' },
    { key: 'fiscal', label: 'Revenus et fiscalité' },
    { key: 'factures', label: 'Factures' },
  ]},
  { key: 'securite', icon: '🔒', label: 'Connexion et sécurité', sub: [
    { key: 'motdepasse', label: 'Mot de passe' },
    { key: 'appareils', label: 'Appareils connectés' },
  ]},
  { key: 'confidentialite', icon: '🛡️', label: 'Confidentialité' },
  { key: 'notifications', icon: '🔔', label: 'Notifications' },
  { key: 'affichage', icon: '🎨', label: 'Affichage' },
  { key: 'annonces', icon: '📦', label: 'Mes annonces' },
  { key: 'favoris', icon: '♥', label: 'Mes favoris' },
  { key: 'services', icon: '⚙️', label: 'Nos services' },
  { key: 'aide', icon: '❓', label: 'Centre d\u2019aide' },
  { key: 'deconnexion', icon: '🚪', label: 'Déconnexion' },
];
const back = (href, label = 'Retour') => `<a class="back" href="${href}">← ${label}</a>`;

async function profile(section, sub) {
  if (!user) { location.hash = '#/login'; return; }
  if (section === 'favoris') { location.hash = '#/favs'; return; }
  if (section === 'services') { location.hash = '#/services'; return; }
  if (section === 'deconnexion') { await db.auth.signOut(); location.hash = '#/'; return; }
  if (!section) return profileMenu();
  if (section === 'annonces') return profileAnnonces();
  if (section === 'perso') return sub ? profilePerso(sub) : profileSub('perso', 'Informations personnelles');
  if (section === 'securite') return sub ? profileSecurite(sub) : profileSub('securite', 'Connexion et sécurité');
  if (section === 'confidentialite') return profileConfidentialite();
  if (section === 'notifications') return profileNotifications();
  if (section === 'affichage') return profileAffichage();
  if (section === 'aide') return profileAide();
  profileMenu();
}

function profileMenu() {
  const since = user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : null;
  app.innerHTML = `<h2>Mon profil</h2><div class="box" style="padding:14px 16px;display:flex;align-items:center;gap:12px">
  <div style="width:44px;height:44px;border-radius:50%;background:var(--g);color:#fff;display:grid;place-items:center;font-weight:700;font-size:18px">${esc((user.user_metadata?.name || user.email)[0].toUpperCase())}</div>
  <div><b>${esc(user.user_metadata?.name || 'Utilisateur')}</b><br><small>${esc(user.email)}</small>${since ? `<br><small style="color:var(--mute)">Membre depuis ${since}</small>` : ''}</div></div>
  <div class="slist">${SETTINGS_MENU.map(m => `<a class="srow ${m.key === 'deconnexion' ? 'danger' : ''}" href="#/profile/${m.key}"><span class="ic">${m.icon}</span><span class="lb">${m.label}</span><span class="chev">›</span></a>`).join('')}</div>`;
}

function profileSub(key, title) {
  const items = SETTINGS_MENU.find(m => m.key === key).sub;
  app.innerHTML = `${back('#/profile')}<h2>${title}</h2><div class="slist">${items.map(s => `<a class="srow" href="#/profile/${key}/${s.key}"><span class="lb">${s.label}</span><span class="chev">›</span></a>`).join('')}</div>`;
}

async function profileAnnonces() {
  app.innerHTML = `${back('#/profile')}<h2>Mes annonces</h2><div id="pa"><p class="none">Chargement...</p></div>`;
  const { data } = await db.from('ads').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  $('#pa').innerHTML = `<div class="box" style="padding:12px 16px"><b>${(data || []).length}</b> annonce(s) publiée(s)</div><div class="grid">${grid(data || [])}</div>`;
}

async function profilePerso(sub) {
  const m = user.user_metadata || {};
  if (sub === 'compte') {
    app.innerHTML = `${back('#/profile/perso', 'Informations personnelles')}<h2>Informations du compte</h2><div class="box"><form class="f" id="pf">
    <label>Nom<input name="name" required value="${esc(m.name || '')}"></label>
    <label>Numéro WhatsApp<input name="phone" inputmode="tel" placeholder="0197392704" value="${esc(m.phone || '')}"></label>
    <small>E-mail : ${esc(user.email)} (non modifiable)</small>
    <button class="btn" id="pb">Enregistrer</button></form></div>`;
    $('#pf').onsubmit = async e => {
      e.preventDefault(); const fd = new FormData(e.target); $('#pb').disabled = true;
      const r = await db.auth.updateUser({ data: { ...m, name: fd.get('name').trim(), phone: fd.get('phone').trim() } });
      if (r.error) { toast(r.error.message); $('#pb').disabled = false; return; }
      user = r.data.user; toast('Informations mises à jour'); profilePerso('compte');
    };
  }
  else if (sub === 'adresse') {
    const ad = m.address || {};
    app.innerHTML = `${back('#/profile/perso', 'Informations personnelles')}<h2>Adresse</h2><div class="box"><form class="f" id="pf">
    <label>Quartier<input name="quartier" value="${esc(ad.quartier || '')}"></label>
    <label>Ville<input name="ville" value="${esc(ad.ville || '')}"></label>
    <label>Précisions (rue, repère...)<textarea name="details" rows="3">${esc(ad.details || '')}</textarea></label>
    <small>Cette adresse reste privée : elle n'est pas affichée publiquement sur vos annonces.</small>
    <button class="btn" id="pb">Enregistrer</button></form></div>`;
    $('#pf').onsubmit = async e => {
      e.preventDefault(); const fd = new FormData(e.target); $('#pb').disabled = true;
      const address = { quartier: fd.get('quartier').trim(), ville: fd.get('ville').trim(), details: fd.get('details').trim() };
      const r = await db.auth.updateUser({ data: { ...m, address } });
      if (r.error) { toast(r.error.message); $('#pb').disabled = false; return; }
      user = r.data.user; toast('Adresse enregistrée'); profilePerso('adresse');
    };
  }
  else if (sub === 'paiement') {
    let { data: w } = await db.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
    if (!w) { await db.from('wallets').insert({ user_id: user.id, balance: 0 }); w = { balance: 0 }; }
    app.innerHTML = `${back('#/profile/perso', 'Informations personnelles')}<h2>Moyens de paiement</h2>
    <div class="box" style="text-align:center;padding:26px 16px"><small>Solde disponible</small><div style="font-size:32px;font-weight:800;color:var(--g2);margin:6px 0">${fcfa(w.balance)}</div></div>
    <div class="box"><b>Rechargement Mobile Money</b><p style="color:var(--mute);font-size:13px;margin-top:6px">Le paiement en ligne sécurisé (MTN, Moov Money) est en cours de branchement sur NovaMarket. Une fois activé, vous pourrez recharger votre solde directement ici. Aucun montant ne peut être ajouté pour le moment.</p></div>`;
  }
  else if (sub === 'fiscal') {
    const { data: t } = await db.from('wallet_transactions').select('amount,type').eq('user_id', user.id);
    const total = (t || []).filter(x => x.type === 'credit').reduce((s, x) => s + x.amount, 0);
    app.innerHTML = `${back('#/profile/perso', 'Informations personnelles')}<h2>Revenus et fiscalité</h2>
    <div class="box" style="text-align:center;padding:26px 16px"><small>Total reçu via NovaMarket (indicatif)</small><div style="font-size:28px;font-weight:800;color:var(--g2);margin:6px 0">${fcfa(total)}</div></div>
    <div class="box"><p style="color:var(--mute);font-size:13px">Ce montant est donné à titre indicatif à partir de vos transactions enregistrées sur NovaMarket. Il ne remplace pas une déclaration fiscale officielle. Pour vos obligations fiscales, rapprochez-vous de l'administration béninoise compétente (DGI).</p></div>`;
  }
  else if (sub === 'factures') {
    const { data: t } = await db.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    app.innerHTML = `${back('#/profile/perso', 'Informations personnelles')}<h2>Factures</h2>` + ((t && t.length) ? t.map(x => `<div class="box" style="display:flex;justify-content:space-between;align-items:center"><div><b>${esc(x.description || (x.type === 'credit' ? 'Crédit' : 'Débit'))}</b><br><small>${hm(x.created_at)}</small></div><b style="color:${x.amount >= 0 ? 'var(--g2)' : '#a4302b'}">${x.amount >= 0 ? '+' : ''}${fcfa(x.amount)}</b></div>`).join('') : '<div class="box"><p class="none" style="padding:0">Aucune facture pour le moment. Elles apparaîtront ici dès que le paiement en ligne sera actif.</p></div>');
  }
}

async function profileSecurite(sub) {
  if (sub === 'motdepasse') {
    app.innerHTML = `${back('#/profile/securite', 'Connexion et sécurité')}<h2>Mot de passe</h2><div class="box"><form class="f" id="pf">
    <label>Nouveau mot de passe<input name="pw" type="password" minlength="6" required></label>
    <label>Confirmer le mot de passe<input name="pw2" type="password" minlength="6" required></label>
    <button class="btn" id="pb">Mettre à jour</button></form></div>`;
    $('#pf').onsubmit = async e => {
      e.preventDefault(); const fd = new FormData(e.target);
      if (fd.get('pw') !== fd.get('pw2')) return toast('Les deux mots de passe ne correspondent pas');
      $('#pb').disabled = true;
      const r = await db.auth.updateUser({ password: fd.get('pw') });
      if (r.error) { toast(r.error.message); $('#pb').disabled = false; return; }
      toast('Mot de passe mis à jour'); location.hash = '#/profile/securite';
    };
  }
  else if (sub === 'appareils') {
    app.innerHTML = `${back('#/profile/securite', 'Connexion et sécurité')}<h2>Appareils connectés</h2>
    <div class="box"><b>Cette session</b><p style="color:var(--mute);font-size:13px;margin-top:6px">Dernière connexion : ${user.last_sign_in_at ? hm(user.last_sign_in_at) : 'inconnue'}</p></div>
    <div class="box"><b>Se déconnecter des autres appareils</b><p style="color:var(--mute);font-size:13px;margin:6px 0 12px">Par mesure de sécurité, NovaMarket ne peut pas encore afficher le détail de chaque appareil (nom, modèle) sans un serveur supplémentaire — c'est honnête de vous le dire plutôt que d'afficher de fausses informations. Vous pouvez en revanche déconnecter immédiatement tous les autres appareils connectés à votre compte, sauf celui-ci.</p>
    <button class="btn red" id="bo">Déconnecter tous les autres appareils</button></div>`;
    $('#bo').onclick = async () => {
      const r = await db.auth.signOut({ scope: 'others' });
      toast(r.error ? r.error.message : 'Les autres appareils ont été déconnectés');
    };
  }
}

function profileConfidentialite() {
  const p = user.user_metadata?.privacy || {};
  const row = (key, label, desc, checked) => `<div class="toggle-row"><div><b>${label}</b><p>${desc}</p></div><label class="switch"><input type="checkbox" data-priv="${key}" ${checked ? 'checked' : ''}><span></span></label></div>`;
  app.innerHTML = `${back('#/profile')}<h2>Confidentialité</h2><div class="box">
  ${row('show_phone_public', 'Afficher mon numéro WhatsApp sur mes annonces', 'Nécessaire pour que les acheteurs puissent vous contacter directement. Si désactivé, seul le bouton de messagerie interne restera disponible.', p.show_phone_public !== false)}
  ${row('allow_messages', 'Recevoir des messages de nouveaux acheteurs', 'Autorise les autres utilisateurs à démarrer une conversation avec vous depuis vos annonces.', p.allow_messages !== false)}
  </div><p style="color:var(--mute);font-size:12.5px;padding:0 4px">Vos choix sont enregistrés immédiatement sur votre compte.</p>`;
  document.querySelectorAll('[data-priv]').forEach(el => el.onchange = async () => {
    const m = user.user_metadata || {};
    const privacy = { ...(m.privacy || {}), [el.dataset.priv]: el.checked };
    const r = await db.auth.updateUser({ data: { ...m, privacy } });
    if (r.error) return toast(r.error.message);
    user = r.data.user; toast('Préférence enregistrée');
  });
}

function profileNotifications() {
  const n = user.user_metadata?.notif || {};
  const row = (key, label, desc, checked, disabled) => `<div class="toggle-row"><div><b>${label}</b><p>${desc}</p></div><label class="switch"><input type="checkbox" data-notif="${key}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span></span></label></div>`;
  app.innerHTML = `${back('#/profile')}<h2>Notifications</h2>
  <div class="box"><b style="font-size:13px;color:var(--mute)">DANS L'APPLICATION</b>
  ${row('msg_app', 'Nouveaux messages', 'Une pastille et un son léger vous préviennent quand vous recevez un message.', n.msg_app !== false)}
  ${row('fav_app', 'Activité sur vos favoris', 'Vous êtes prévenu si le prix d\u2019une annonce mise en favori change.', n.fav_app !== false)}
  ${row('promo_app', 'Nouveautés et promotions NovaMarket', 'Annonces des nouveaux services et offres spéciales.', n.promo_app === true)}
  </div>
  <div class="box"><b style="font-size:13px;color:var(--mute)">PAR E-MAIL</b>
  ${row('msg_email', 'Nouveaux messages par e-mail', 'Nécessite l\u2019envoi d\u2019e-mails automatiques, pas encore configuré sur NovaMarket. Votre préférence est enregistrée et sera activée dès que ce sera prêt.', n.msg_email === true, true)}
  </div>`;
  document.querySelectorAll('[data-notif]').forEach(el => el.onchange = async () => {
    const m = user.user_metadata || {};
    const notif = { ...(m.notif || {}), [el.dataset.notif]: el.checked };
    const r = await db.auth.updateUser({ data: { ...m, notif } });
    if (r.error) return toast(r.error.message);
    user = r.data.user; toast('Préférence enregistrée');
  });
}

function applyDisplayPrefs() {
  try {
    const theme = localStorage.getItem('nm_theme') || 'auto';
    document.documentElement.setAttribute('data-theme', theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme);
    const size = localStorage.getItem('nm_textsize') || 'md';
    document.body.style.zoom = { sm: '0.92', md: '1', lg: '1.15' }[size];
  } catch (e) {}
}
function profileAffichage() {
  const theme = localStorage.getItem('nm_theme') || 'auto';
  const size = localStorage.getItem('nm_textsize') || 'md';
  app.innerHTML = `${back('#/profile')}<h2>Affichage</h2>
  <div class="box"><b>Thème</b><p style="color:var(--mute);font-size:12.5px;margin:4px 0 12px">Choisissez l'apparence de NovaMarket sur cet appareil.</p>
  <div class="seg" id="segTheme">
  <button data-v="light" class="${theme === 'light' ? 'on' : ''}">☀️ Clair</button>
  <button data-v="dark" class="${theme === 'dark' ? 'on' : ''}">🌙 Sombre</button>
  <button data-v="auto" class="${theme === 'auto' ? 'on' : ''}">📱 Auto</button></div></div>
  <div class="box"><b>Taille du texte</b><p style="color:var(--mute);font-size:12.5px;margin:4px 0 12px">Agrandit l'affichage pour une meilleure lisibilité. (Fonctionne sur Chrome/Android ; peut ne pas s'appliquer sur certains navigateurs comme Firefox.)</p>
  <div class="seg" id="segSize">
  <button data-v="sm">A-</button><button data-v="md">A</button><button data-v="lg">A+</button></div></div>`;
  document.querySelectorAll('#segTheme button').forEach(b => { b.classList.toggle('on', b.dataset.v === theme); b.onclick = () => { localStorage.setItem('nm_theme', b.dataset.v); applyDisplayPrefs(); profileAffichage(); }; });
  document.querySelectorAll('#segSize button').forEach(b => { b.classList.toggle('on', b.dataset.v === size); b.onclick = () => { localStorage.setItem('nm_textsize', b.dataset.v); applyDisplayPrefs(); profileAffichage(); }; });
}

const FAQ = [
  ['Comment publier une annonce ?', 'Cliquez sur "＋ Publier une annonce" en haut de l\u2019écran, remplissez le titre, la catégorie, le prix, la localisation et votre numéro WhatsApp, ajoutez au moins une photo, puis validez.'],
  ['Comment contacter un vendeur ?', 'Ouvrez l\u2019annonce qui vous intéresse : vous pouvez soit cliquer sur "Contacter sur WhatsApp", soit lui envoyer un message directement sur NovaMarket.'],
  ['Comment modifier ou supprimer mon annonce ?', 'Ouvrez votre annonce (depuis "Mes annonces" dans votre profil), puis utilisez les boutons "Modifier" ou "Supprimer".'],
  ['NovaMarket gère-t-il le paiement entre acheteur et vendeur ?', 'Pour l\u2019instant, non : les paiements se font directement entre vous et l\u2019autre personne, en main propre de préférence. Un paiement en ligne sécurisé est en cours de mise en place.'],
  ['Comment ajouter ou retirer un favori ?', 'Cliquez sur le cœur affiché sur une annonce. Retrouvez ensuite tous vos favoris dans "Mes favoris", dans votre profil.'],
  ['J\u2019ai oublié mon mot de passe, que faire ?', 'Pour l\u2019instant, contactez-nous sur WhatsApp au 0197392704 pour être aidé à récupérer votre compte.'],
  ['Comment signaler une annonce suspecte ?', 'Contactez-nous sur WhatsApp au 0197392704 en nous indiquant le lien ou le titre de l\u2019annonce concernée.'],
];
function profileAide() {
  app.innerHTML = `${back('#/profile')}<h2>Centre d'aide</h2>
  <div class="box"><input id="faqSearch" placeholder="Rechercher une question..." style="width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink)"></div>
  <div class="box" id="faqList">${FAQ.map(f => `<details class="faq-item"><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join('')}</div>
  <div class="box"><b>Besoin d'aide supplémentaire ?</b><p style="color:var(--mute);font-size:13px;margin:6px 0 12px">Notre équipe vous répond directement.</p>
  <a class="btn wa" target="_blank" rel="noopener" href="${wa('0197392704', 'Bonjour, j\u2019ai besoin d\u2019aide sur NovaMarket')}">Contacter le support sur WhatsApp</a></div>`;
  $('#faqSearch').oninput = e => {
    const k = e.target.value.toLowerCase();
    $('#faqList').innerHTML = FAQ.filter(f => f[0].toLowerCase().includes(k) || f[1].toLowerCase().includes(k)).map(f => `<details class="faq-item" open>${k ? '' : ''}<summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join('') || '<p class="none">Aucun résultat.</p>';
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
  const parts = location.hash.slice(1).split('/'); const p = parts[1], id = parts[2], sub = parts[3];
  scrollTo(0, 0); closeChat();
  if (p === 'ad') adPage(id); else if (p === 'new') form(); else if (p === 'edit') form(id);
  else if (p === 'login') login(); else if (p === 'profile') profile(id, sub); else if (p === 'favs') favsPage();
  else if (p === 'chat') { id ? chatRoom(id) : chatList(); } else if (p === 'services') services(); else if (p === 'mentions') legalPage(); else if (p === 'categorie') categoryPage(id); else home();
}
window.addEventListener('hashchange', route);
db.auth.onAuthStateChange(async (_e, s) => { const changed = (s?.user?.id || null) !== (user?.id || null); user = s?.user || null; if (changed) { await loadFavs(); nav(); route(); } });
applyDisplayPrefs(); nav(); route();
