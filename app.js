<script>
/* ═══════════════════════════════════════════════════════════════
   TORNFLIGHT v2.0 — Main Application
   Architecture: Modular namespace (App.*)
   No API keys in source code — stored only in localStorage
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── DOM Helper ── */
const G = id => document.getElementById(id);

/* ── Storage Helper ── */
const Store = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
  del: k => localStorage.removeItem(k)
};

/* ══════════════════════════════════════════════════════════════
   COUNTRY DATA
══════════════════════════════════════════════════════════════ */
const CTRY = {
  mex: { n:{pt:'México',en:'Mexico'}, city:'Ciudad Juárez', flag:'🇲🇽',
    ft:{standard:26,airstrip:18,wlt:13,business:8}, cost:6500, extras:[], safety:'med',
    tips:{pt:'Plushies e Flowers baratos. Ótimo destino de iniciação.',
          en:'Cheap Plushies and Flowers. Great starter destination.'} },
  cay: { n:{pt:'Cayman Islands',en:'Cayman Islands'}, city:'George Town', flag:'🇰🇾',
    ft:{standard:35,airstrip:25,wlt:18,business:11}, cost:10000, extras:['bank'], safety:'danger',
    tips:{pt:'Banco Offshore (0.5%/mês). PERIGO: muggers muito frequentes. Nunca offline com dinheiro!',
          en:'Offshore Bank (0.5%/month). DANGER: very frequent muggers. Never offline with cash!'} },
  can: { n:{pt:'Canadá',en:'Canada'}, city:'Toronto', flag:'🇨🇦',
    ft:{standard:41,airstrip:29,wlt:20,business:12}, cost:9000, extras:[], safety:'med',
    tips:{pt:'Variedade equilibrada. Flowers de qualidade.',en:'Balanced variety. Quality Flowers.'} },
  haw: { n:{pt:'Havai',en:'Hawaii'}, city:'Honolulu', flag:'🇺🇸',
    ft:{standard:134,airstrip:94,wlt:67,business:40}, cost:11000, extras:['suitcase'], safety:'med',
    tips:{pt:'Suitcases disponíveis (mais capacidade). Voo longo.',en:'Suitcases available (more capacity). Long flight.'} },
  uni: { n:{pt:'Reino Unido',en:'United Kingdom'}, city:'London', flag:'🇬🇧',
    ft:{standard:159,airstrip:111,wlt:80,business:48}, cost:18000, extras:[], safety:'med',
    tips:{pt:'Plushies raros. Voo longo — planeia bem.',en:'Rare Plushies. Long flight — plan carefully.'} },
  arg: { n:{pt:'Argentina',en:'Argentina'}, city:'Buenos Aires', flag:'🇦🇷',
    ft:{standard:167,airstrip:117,wlt:83,business:50}, cost:21000, extras:[], safety:'med',
    tips:{pt:'Items exclusivos de alto valor. Excelente para lucros.',en:'Exclusive high-value items. Excellent for profits.'} },
  swi: { n:{pt:'Suíça',en:'Switzerland'}, city:'Zurich', flag:'🇨🇭',
    ft:{standard:175,airstrip:123,wlt:88,business:53}, cost:27000, extras:['rehab'], safety:'safe',
    tips:{pt:'Reabilitação: elimina vícios e enche felicidade. Ideal antes do gym.',en:'Rehab: removes addictions and fills happiness. Ideal before gym.'} },
  jap: { n:{pt:'Japão',en:'Japan'}, city:'Tokyo', flag:'🇯🇵',
    ft:{standard:225,airstrip:158,wlt:113,business:68}, cost:32000, extras:[], safety:'med',
    tips:{pt:'Plushies raros e exclusivos de alto valor. Voo muito longo.',en:'Rare and exclusive high-value Plushies. Very long flight.'} },
  chi: { n:{pt:'China',en:'China'}, city:'Beijing', flag:'🇨🇳',
    ft:{standard:242,airstrip:169,wlt:121,business:72}, cost:35000, extras:['fortune'], safety:'med',
    tips:{pt:'Leitora da Fortuna ($75k): mostra % progresso para o próximo nível.',en:'Fortune Teller ($75k): reveals % progress to next level.'} },
  uae: { n:{pt:'Dubai (UAE)',en:'Dubai (UAE)'}, city:'Dubai', flag:'🇦🇪',
    ft:{standard:271,airstrip:190,wlt:135,business:81}, cost:32000, extras:[], safety:'med',
    tips:{pt:'Items de luxo e contraband exclusivo. Muito lucrativo.',en:'Luxury items and exclusive contraband. Very profitable.'} },
  sou: { n:{pt:'África do Sul',en:'South Africa'}, city:'Johannesburg', flag:'🇿🇦',
    ft:{standard:297,airstrip:208,wlt:149,business:89}, cost:40000, extras:['hunt'], safety:'med',
    tips:{pt:'Caça de animais: cash, XP e honors raros. Voo mais longo do jogo.',en:'Animal hunting: cash, XP and rare honors. Longest flight in game.'} }
};
const cname = c => CTRY[c?.toLowerCase()]?.n[App.lang.current] || c || '?';
const cflag = c => CTRY[c?.toLowerCase()]?.flag || '🌍';
const cflightMin = (c, type) => CTRY[c?.toLowerCase()]?.ft[type] || 0;

/* ══════════════════════════════════════════════════════════════
   APP NAMESPACE
══════════════════════════════════════════════════════════════ */
const App = {};

/* ── State ── */
App.state = {
  stocks: {},        // YATA stocks per country
  items: {},         // Torn items {id: {name, type, mv}}
  yataTs: 0,         // YATA timestamp
  favs: [],          // favourite keys
  activeDest: 'all', // active tab
  loaded: false,
  loading: false,
  travelData: null,
  pollTimer: null,
  cdTimer: null,
  notifOn: false,
  n3done: false,
  n1done: false,
  pwaPrompt: null,
  abroadDest: null,
  peopleRaw: [],     // raw people data for filter/sort
};

/* ══════════════════════════════════════════════════════════════
   LANGUAGE MODULE
══════════════════════════════════════════════════════════════ */
App.lang = {
  current: 'pt',
  strings: {},

  async load(code) {
    try {
      const r = await fetch(`locales/${code}.json`);
      if (!r.ok) throw new Error();
      this.strings = await r.json();
    } catch {
      // Fallback inline strings
      this.strings = code === 'en' ? App.lang._fallbackEN() : App.lang._fallbackPT();
    }
    this.current = code;
    Store.set('tf_lang', code);
    document.documentElement.lang = code;
    this.apply();
  },

  t(key, vars = {}) {
    let s = this.strings[key] || key;
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  },

  async set(code) {
    await this.load(code);
    // Update lang buttons everywhere
    ['pt', 'en'].forEach(c => {
      document.querySelectorAll(`.lbtn, #lb-${c}`).forEach(b => {
        const isTarget = b.textContent.includes(c.toUpperCase()) || b.textContent.includes(c === 'pt' ? 'Português' : 'English');
        if (isTarget) b.className = 'lbtn' + (c === code ? ' on' : '');
      });
    });
    ['lb-pt','lb-en'].forEach(id => {
      const b = G(id); if (!b) return;
      b.className = 'lbtn' + (id === 'lb-'+code ? ' on' : '');
    });
    if (App.state.loaded) { App.market.buildTabs(); App.market.buildCatFilter(); App.market.render(); App.planner.render(); }
    App.guide.build();
    App.trip.buildDests();
    if (App.state.travelData) App.monitor.applyUI(App.state.travelData);
    toast(code === 'pt' ? '🇵🇹 Português' : '🇬🇧 English', 'info');
  },

  apply() {
    const t = k => this.t(k);
    const set = (id, val, html = false) => { const e = G(id); if (e) html ? (e.innerHTML = val) : (e.textContent = val); };
    set('l-sub', t('app_subtitle'));
    set('l-title', t('login_title'));
    set('l-hint', t('login_hint'), true);
    set('l-nl', t('label_account_name'));
    set('l-kl', t('label_api_key'));
    set('l-btn', t('btn_login'));
    set('l-sh', t('label_saved_accounts'));
    set('t-logout', t('btn_logout'));
    set('nt-mkt', t('nav_market')); set('nt-mon', t('nav_monitor'));
    set('nt-int', t('nav_intelligence')); set('nt-gd', t('nav_guide'));
    set('nt-tr', t('nav_trip')); set('nt-fv', t('nav_favorites')); set('nt-st', t('nav_settings'));
    set('bn-mkt', t('nav_market')); set('bn-mon', t('nav_monitor'));
    set('bn-int', 'Intel'); set('bn-gd', t('nav_guide'));
    set('bn-tr', t('nav_trip')); set('bn-fv', t('nav_favorites')); set('bn-st', t('nav_settings'));
    set('v-mkt-s', t('market_sub'));
    set('v-mon-t', t('monitor_title')); set('v-mon-s', t('monitor_sub'));
    set('v-int-t', t('intelligence_title')); set('v-int-s', t('intelligence_sub'));
    set('v-gd-t', t('guide_title')); set('v-gd-s', t('guide_sub'));
    set('v-tr-t', t('trip_title')); set('v-tr-s', t('trip_sub'));
    set('v-fv-t', t('favorites_title'));
    set('v-st-t', t('settings_title'));
    set('so-ca', t('sort_price_asc')); set('so-cd', t('sort_price_desc'));
    set('so-pd', t('sort_profit_desc')); set('so-qd', t('sort_stock_desc')); set('so-na', t('sort_name_asc'));
    set('t-ref', t('btn_refresh')); set('t-upd', t('btn_refresh'));
    set('t-int-ref', t('btn_refresh'));
    set('t-ts', t('monitor_travel_status'));
    set('ntog-lbl', App.state.notifOn ? t('monitor_notif_on') : t('monitor_notif_label'));
    set('people-title', t('people_title')); set('t-ppl-wait', t('people_no_travel'));
    set('t-log', t('monitor_poll_log'));
    set('t-top-items', t('intel_top10_items')); set('t-top-dests', t('intel_top10_dests'));
    set('t-stock-alerts', t('intel_stock_alert'));
    set('t-cfg', t('trip_configure')); set('t-dl', t('label_destination'));
    set('t-fl', t('label_flight_type')); set('t-gl', t('label_goal'));
    set('ft-s', t('flight_standard')); set('ft-a', t('flight_airstrip'));
    set('ft-w', t('flight_wlt')); set('ft-b', t('flight_business'));
    set('g-i', t('goal_items')); set('g-r', t('goal_rehab')); set('g-b', t('goal_bank'));
    set('g-fo', t('goal_fortune')); set('g-h', t('goal_hunt'));
    set('t-gen', t('btn_generate'));
    set('t-ds', t('trip_dest_summary')); set('t-t15', t('trip_top15'));
    set('t-ca', t('label_current_account')); set('t-tn', t('label_torn_name'));
    set('t-akl', t('label_api_key')); set('t-sav', t('label_saved_accounts'));
    set('t-da', t('settings_del_all'));
    set('t-cache', t('settings_cache')); set('t-cc', t('settings_cache_clear'));
    set('t-ccs', t('settings_cache_sub')); set('t-ccb', t('btn_clear'));
    set('t-cf', t('settings_favs_clear')); set('t-cfb', t('btn_clear'));
    set('t-lang', t('settings_lang'));
    set('t-inst', t('settings_install')); set('t-inst-d', t('settings_install_desc'));
    set('t-inst-b', t('btn_install')); set('t-inst-s', t('settings_install_steps'), true);
    set('t-about', t('settings_about'));
    set('ib-txt', t('install_banner'), true);
    set('ib-install', t('btn_install').replace('⬇ ',''));
    // Placeholders
    const ms = G('ms'); if (ms) ms.placeholder = '🔍 ' + t('label_search');
    const fs = G('fs'); if (fs) fs.placeholder = '🔍 ' + t('favorites_search');
    const ps = G('people-search'); if (ps) ps.placeholder = '🔍 ' + t('people_search');
    const mc = G('mc'); if (mc && mc.options[0]) mc.options[0].textContent = t('label_all_categories');
  },

  _fallbackPT() {
    return { app_subtitle:'Foreign Stock · Travel Monitor · Trip Planner', login_title:'Entrar na conta',
      login_hint:'Recomendado: <strong>Full Access API Key</strong>.<br>Gera em <a href="https://www.torn.com/preferences.php#tab=api" target="_blank">torn.com → Preferences → API</a>',
      label_account_name:'Nome da conta', label_api_key:'API Key', btn_login:'Entrar', btn_logout:'Sair',
      btn_refresh:'Atualizar', btn_generate:'Gerar Plano', btn_clear:'Limpar', btn_install:'⬇ Instalar App',
      label_saved_accounts:'Contas guardadas', label_current_account:'Conta atual', label_torn_name:'Nome Torn',
      label_destination:'Destino', label_flight_type:'Tipo de voo', label_goal:'Objetivo',
      label_search:'Pesquisar produto...', label_all_categories:'Todas as categorias', favorites_search:'Filtrar favoritos...',
      nav_market:'Mercado', nav_monitor:'Monitor', nav_intelligence:'Intelligence',
      nav_guide:'Destinos', nav_trip:'Plano de Voo', nav_favorites:'Favoritos', nav_settings:'Conta',
      sort_price_asc:'Preço ↑', sort_price_desc:'Preço ↓', sort_profit_desc:'Lucro ↓', sort_stock_desc:'Stock ↓', sort_name_asc:'Nome A–Z',
      sort_level_desc:'Nível ↓', sort_activity_desc:'Atividade ↓',
      flight_standard:'Standard', flight_airstrip:'Airstrip', flight_wlt:'WLT Benefit', flight_business:'Business Class',
      goal_items:'🛒 Comprar items', goal_rehab:'💊 Reabilitação', goal_bank:'🏦 Banco Offshore', goal_fortune:'🔮 Leitora da Fortuna', goal_hunt:'🦁 Caça de Animais',
      market_title:'Foreign Stocks', market_sub:'YATA crowd-sourced + Torn API', market_profit_label:'de lucro',
      market_in_stock:' em stock', market_no_stock:'Sem stock', market_torn_price:'Mercado Torn:', market_no_results:'Nenhum produto encontrado',
      monitor_title:'Monitor de Viagem', monitor_sub:'Auto-poll 30s · Notificação 3min antes',
      monitor_travel_status:'Estado de viagem', monitor_at_home:'Em casa (Torn City)', monitor_flying_to:'A voar para',
      monitor_abroad:'No estrangeiro', monitor_no_travel:'Sem viagem ativa.', monitor_departed:'Partiu',
      monitor_eta:'Chegada est.', monitor_remaining:'Resta', monitor_location:'Localização', monitor_status:'Estado',
      monitor_notif_label:'Notificar 3min antes', monitor_notif_on:'✅ Notificações ativas', monitor_notif_denied:'Permissão negada.',
      monitor_notif_3min_title:'✈ TornFlight — 3 minutos!', monitor_notif_3min_body:'A chegar a {dest}! Prepara-te.',
      monitor_notif_1min_title:'✈ TornFlight — 1 minuto!', monitor_notif_1min_body:'Quase a chegar a {dest}!',
      monitor_poll_log:'Log de polling',
      people_title:'Jogadores no destino', people_loading:'A carregar jogadores...', people_none:'Nenhum jogador YATA visível neste destino.',
      people_sub:' viajante(s) YATA', people_note:'Dados YATA · Theater 10★ players ficam ocultos.', people_search:'Pesquisar jogador...', people_no_travel:'Sem viagem ativa.',
      intelligence_title:'Intelligence', intelligence_sub:'Análise de mercado · Melhores oportunidades',
      intel_best_profit:'Melhor Lucro', intel_best_item:'Melhor Item', intel_best_dest:'Melhor Destino',
      intel_profit_min:'Lucro/min', intel_profit_hour:'Lucro/hora', intel_yata_update:'Última atualização YATA',
      intel_top10_items:'Top 10 — Itens mais lucrativos', intel_top10_dests:'Top 10 — Destinos', intel_stock_alert:'Alertas de Stock',
      guide_title:'Guia de Destinos', guide_sub:'Extras exclusivos · Tempos de voo · Segurança · Dicas',
      guide_flight_times:'Tempos de voo', guide_extras:'Extras exclusivos', guide_safety:'Segurança',
      guide_tip:'Dica', guide_flight_cost:'Custo ida',
      guide_safe:'✅ Relativamente seguro', guide_med:'⚠ Cuidado normal', guide_danger:'🚨 Muggers frequentes',
      trip_title:'Plano de Voo', trip_sub:'Timeline completa com análise de risco', trip_configure:'Configurar viagem',
      trip_risk:'Risco', trip_risk_low:'Baixo 🟢', trip_risk_med:'Médio 🟡', trip_risk_high:'Alto 🔴',
      trip_roundtrip:'Tempo ida+volta', trip_total_cost:'Custo total', trip_flight_type:'Tipo de voo',
      trip_invuln:'✈ Invulnerável durante o voo', trip_grace:'🛡 Grace period: 15s',
      trip_dest_summary:'Resumo por destino', trip_top15:'Top 15 — mais baratos com stock',
      favorites_title:'Favoritos', favorites_no_favs:'Sem favoritos ainda.<br>Vai ao Mercado e clica ☆.',
      fav_added:'⭐ Adicionado', fav_removed:'Removido',
      settings_title:'Conta', settings_cache:'Cache', settings_cache_clear:'Limpar cache',
      settings_cache_sub:'Re-download YATA + Torn API', settings_favs_clear:'Limpar favoritos',
      settings_del_all:'🗑 Apagar todas as contas', settings_lang:'Idioma / Language',
      settings_install:'Instalar como App', settings_install_desc:'Adiciona ao ecrã inicial para usar como app nativa.',
      settings_install_steps:'<b>iOS Safari:</b> Partilhar → Adicionar ao Ecrã Inicial<br><b>Android Chrome:</b> Menu ⋮ → Adicionar ao ecrã inicial<br><b>Desktop Chrome/Edge:</b> ícone ⊕ na barra de endereço',
      settings_about:'Sobre fontes de dados', install_banner:'<b>📱</b> Instalar app',
      status_loading:'A carregar...', status_cache:'Cache · {ago} · clica Atualizar',
      status_ok:'{total} produtos · YATA: {ago}', status_error:'Erro', status_updated:'Estado atualizado',
      confirm_del_accounts:'Apagar todas as contas?', confirm_clear_favs:'Limpar todos os favoritos?',
      error_name:'Escreve um nome.', error_key:'API Key inválida.', error_network:'Erro de rede.',
      data_updated:'Dados atualizados ✓', data_error:'Erro ao carregar', cache_cleared:'Cache limpo',
      favs_cleared:'Favoritos limpos', accounts_cleared:'Contas apagadas', no_data:'Sem dados.',
      time_now:'agora', time_min:'m', time_hour:'h', time_day:'d',
      people_loading:'A carregar jogadores...'
    };
  },

  _fallbackEN() {
    return { app_subtitle:'Foreign Stock · Travel Monitor · Trip Planner', login_title:'Log in',
      login_hint:'Recommended: <strong>Full Access API Key</strong>.<br>Generate at <a href="https://www.torn.com/preferences.php#tab=api" target="_blank">torn.com → Preferences → API</a>',
      label_account_name:'Account name', label_api_key:'API Key', btn_login:'Log in', btn_logout:'Log out',
      btn_refresh:'Refresh', btn_generate:'Generate Plan', btn_clear:'Clear', btn_install:'⬇ Install App',
      label_saved_accounts:'Saved accounts', label_current_account:'Current account', label_torn_name:'Torn name',
      label_destination:'Destination', label_flight_type:'Flight type', label_goal:'Goal',
      label_search:'Search product...', label_all_categories:'All categories', favorites_search:'Filter favourites...',
      nav_market:'Market', nav_monitor:'Monitor', nav_intelligence:'Intelligence',
      nav_guide:'Destinations', nav_trip:'Trip Plan', nav_favorites:'Favourites', nav_settings:'Account',
      sort_price_asc:'Price ↑', sort_price_desc:'Price ↓', sort_profit_desc:'Profit ↓', sort_stock_desc:'Stock ↓', sort_name_asc:'Name A–Z',
      sort_level_desc:'Level ↓', sort_activity_desc:'Activity ↓',
      flight_standard:'Standard', flight_airstrip:'Airstrip', flight_wlt:'WLT Benefit', flight_business:'Business Class',
      goal_items:'🛒 Buy items', goal_rehab:'💊 Rehab', goal_bank:'🏦 Offshore Bank', goal_fortune:'🔮 Fortune Teller', goal_hunt:'🦁 Animal Hunting',
      market_title:'Foreign Stocks', market_sub:'YATA crowd-sourced + Torn API', market_profit_label:'profit',
      market_in_stock:' in stock', market_no_stock:'Out of stock', market_torn_price:'Torn Market:', market_no_results:'No products found',
      monitor_title:'Travel Monitor', monitor_sub:'Auto-poll 30s · 3min arrival notification',
      monitor_travel_status:'Travel status', monitor_at_home:'At home (Torn City)', monitor_flying_to:'Flying to',
      monitor_abroad:'Abroad', monitor_no_travel:'No active travel.', monitor_departed:'Departed',
      monitor_eta:'ETA', monitor_remaining:'Remaining', monitor_location:'Location', monitor_status:'Status',
      monitor_notif_label:'Notify 3min before arriving', monitor_notif_on:'✅ Notifications active', monitor_notif_denied:'Permission denied.',
      monitor_notif_3min_title:'✈ TornFlight — 3 minutes!', monitor_notif_3min_body:'Arriving at {dest}! Get ready.',
      monitor_notif_1min_title:'✈ TornFlight — 1 minute!', monitor_notif_1min_body:'Almost at {dest}!',
      monitor_poll_log:'Polling log',
      people_title:'Players at destination', people_loading:'Loading players...', people_none:'No YATA players visible at this destination.',
      people_sub:' YATA traveller(s)', people_note:'YATA data · Theater 10★ players are hidden.', people_search:'Search player...', people_no_travel:'No active travel.',
      intelligence_title:'Intelligence', intelligence_sub:'Market analysis · Best opportunities',
      intel_best_profit:'Best Profit', intel_best_item:'Best Item', intel_best_dest:'Best Destination',
      intel_profit_min:'Profit/min', intel_profit_hour:'Profit/hour', intel_yata_update:'Last YATA update',
      intel_top10_items:'Top 10 — Most profitable items', intel_top10_dests:'Top 10 — Destinations', intel_stock_alert:'Stock Alerts',
      guide_title:'Destination Guide', guide_sub:'Exclusive extras · Flight times · Safety · Tips',
      guide_flight_times:'Flight times', guide_extras:'Exclusive extras', guide_safety:'Safety',
      guide_tip:'Tip', guide_flight_cost:'One-way cost',
      guide_safe:'✅ Relatively safe', guide_med:'⚠ Normal caution', guide_danger:'🚨 Frequent muggers',
      trip_title:'Trip Plan', trip_sub:'Full timeline with risk analysis', trip_configure:'Configure trip',
      trip_risk:'Risk', trip_risk_low:'Low 🟢', trip_risk_med:'Medium 🟡', trip_risk_high:'High 🔴',
      trip_roundtrip:'Round-trip time', trip_total_cost:'Total cost', trip_flight_type:'Flight type',
      trip_invuln:'✈ Invulnerable during flight', trip_grace:'🛡 Grace period: 15s',
      trip_dest_summary:'Destination summary', trip_top15:'Top 15 — cheapest with stock',
      favorites_title:'Favourites', favorites_no_favs:'No favourites yet.<br>Go to Market and click ☆.',
      fav_added:'⭐ Added', fav_removed:'Removed',
      settings_title:'Account', settings_cache:'Cache', settings_cache_clear:'Clear cache',
      settings_cache_sub:'Force re-download YATA + Torn API', settings_favs_clear:'Clear favourites',
      settings_del_all:'🗑 Delete all accounts', settings_lang:'Language / Idioma',
      settings_install:'Install as App', settings_install_desc:'Add to home screen for a native app experience.',
      settings_install_steps:'<b>iOS Safari:</b> Share → Add to Home Screen<br><b>Android Chrome:</b> Menu ⋮ → Add to home screen<br><b>Desktop Chrome/Edge:</b> ⊕ icon in address bar',
      settings_about:'About data sources', install_banner:'<b>📱</b> Install app',
      status_loading:'Loading...', status_cache:'Cache · {ago} · click Refresh',
      status_ok:'{total} products · YATA: {ago}', status_error:'Error', status_updated:'Status updated',
      confirm_del_accounts:'Delete all saved accounts?', confirm_clear_favs:'Clear all favourites?',
      error_name:'Enter a name.', error_key:'Invalid API Key.', error_network:'Network error.',
      data_updated:'Data updated ✓', data_error:'Error loading data', cache_cleared:'Cache cleared',
      favs_cleared:'Favourites cleared', accounts_cleared:'Accounts deleted', no_data:'No data.',
      time_now:'now', time_min:'m', time_hour:'h', time_day:'d',
      people_loading:'Loading players...'
    };
  }
};
const t = k => App.lang.t(k);

/* ══════════════════════════════════════════════════════════════
   AUTH MODULE
══════════════════════════════════════════════════════════════ */
App.auth = {
  async login() {
    const name = G('in-n').value.trim();
    const key  = G('in-k').value.trim();
    const err  = G('lerr');
    err.classList.add('hidden');
    if (!name) { showErr(err, t('error_name')); return; }
    if (!key || key.length < 10) { showErr(err, t('error_key')); return; }
    setBtn('btn-login', '⏳…', true);
    try {
      const r = await fetch(`https://api.torn.com/user/?selections=basic&key=${key}&_=${Date.now()}`);
      const d = await r.json();
      if (d.error) { showErr(err, `Torn [${d.error.code}]: ${d.error.error}`); return; }
      const acct = { name, tornName: d.name || name, apiKey: key, tornId: d.player_id };
      this._upsert(acct);
      this._loginAs(acct, true);
    } catch { showErr(err, t('error_network')); }
    finally { setBtn('btn-login', '→ ' + t('btn_login'), false); }
  },

  _loginAs(acct, fresh) {
    App.state.favs = Store.get('tf_favs') || [];
    App.state.notifOn = Store.get('tf_notif') || false;
    Store.set('tf_lastuser', { name: acct.name, tornName: acct.tornName, apiKey: acct.apiKey, tornId: acct.tornId });
    G('pLogin').style.display = 'none';
    G('pApp').style.display = 'flex';
    G('uname').textContent = acct.tornName || acct.name;
    G('s-name').textContent = acct.tornName || acct.name;
    G('s-key').textContent = maskKey(acct.apiKey);
    G('ntog').checked = App.state.notifOn;
    G('nfbtn-top').className = 'nfbtn' + (App.state.notifOn ? ' on' : '');
    App.lang.apply();
    App.market.buildTabs();
    App.guide.build();
    App.trip.buildDests();
    App.auth._renderSavedSettings();

    const cs = Store.get('tf_stocks'), ci = Store.get('tf_items');
    if (cs && ci && !fresh) {
      App.state.stocks = cs.data; App.state.yataTs = cs.ts; App.state.items = ci;
      App.state.loaded = true;
      App.market.updateCounts(); App.market.buildCatFilter();
      setStatus('dy', t('status_cache').replace('{ago}', timeAgo(cs.ts * 1000)));
      App.market.render(); App.planner.render();
    } else { App.data.load(); }

    App.monitor.startPoll();
  },

  logout() {
    clearInterval(App.state.pollTimer); clearInterval(App.state.cdTimer);
    Store.del('tf_lastuser');
    G('pApp').style.display = 'none'; G('pLogin').style.display = 'flex';
    G('in-k').value = ''; G('in-n').value = '';
    App.state.travelData = null; App.state.loaded = false;
    G('tbar').classList.remove('show');
  },

  _upsert(a) {
    const arr = Store.get('tf_accts') || [];
    const i = arr.findIndex(x => x.apiKey === a.apiKey);
    if (i >= 0) arr[i] = a; else arr.push(a);
    Store.set('tf_accts', arr);
    this._renderSavedLogin();
  },

  _del(i) {
    const arr = Store.get('tf_accts') || []; arr.splice(i, 1);
    Store.set('tf_accts', arr); this._renderSavedLogin(); this._renderSavedSettings();
  },

  clearAll() {
    if (!confirm(t('confirm_del_accounts'))) return;
    Store.set('tf_accts', []); this._renderSavedLogin(); this._renderSavedSettings();
    toast(t('accounts_cleared'), 'ok');
  },

  _renderSavedLogin() {
    const arr = Store.get('tf_accts') || [];
    G('saved-sec').style.display = arr.length ? '' : 'none';
    G('saved-list').innerHTML = arr.map((a, i) => `
      <div class="arow" onclick="App.auth._loginAs(${j(a)}, false)">
        <div><div class="ar-n">${e(a.tornName||a.name)}</div><div class="ar-k">${maskKey(a.apiKey)}</div></div>
        <button class="adel" onclick="event.stopPropagation();App.auth._del(${i})" aria-label="Delete">✕</button>
      </div>`).join('');
  },

  _renderSavedSettings() {
    const arr = Store.get('tf_accts') || [];
    G('s-saved').innerHTML = arr.length
      ? arr.map((a, i) => `
        <div class="arow" style="cursor:default">
          <div><div class="ar-n">${e(a.tornName||a.name)}</div><div class="ar-k">${maskKey(a.apiKey)}</div></div>
          <button class="adel" onclick="App.auth._del(${i});App.auth._renderSavedSettings()" aria-label="Delete">✕</button>
        </div>`).join('')
      : `<p style="font-size:.77rem;color:var(--muted)">${t('no_data')}</p>`;
  }
};

/* ══════════════════════════════════════════════════════════════
   DATA MODULE
══════════════════════════════════════════════════════════════ */
App.data = {
  _apiKey() { return (Store.get('tf_lastuser') || {}).apiKey || ''; },

  async load() {
    if (App.state.loading) return;
    const key = this._apiKey(); if (!key) return;
    App.state.loading = true;
    G('rfbtn').disabled = true; G('rsp').classList.add('spinning');
    setStatus('dy', t('status_loading'));
    App.market.showSkel();
    try {
      /* 1 — YATA stocks */
      const yr = await fetch('https://yata.yt/api/v1/travel/export/');
      if (!yr.ok) throw new Error(`YATA HTTP ${yr.status}`);
      const yd = await yr.json();
      if (!yd.stocks) throw new Error('YATA format error');
      App.state.stocks = yd.stocks; App.state.yataTs = yd.timestamp;
      Store.set('tf_stocks', { data: yd.stocks, ts: yd.timestamp });

      /* 2 — Torn items */
      const tr = await fetch(`https://api.torn.com/torn/?selections=items&key=${key}`);
      const td = await tr.json();
      if (td.error) throw new Error(`Torn [${td.error.code}]: ${td.error.error}`);
      App.state.items = {};
      Object.entries(td.items || {}).forEach(([id, it]) => {
        App.state.items[id] = { name: it.name, type: it.type, mv: it.market_value || 0 };
      });
      Store.set('tf_items', App.state.items);
      App.state.loaded = true;

      App.market.updateCounts(); App.market.buildCatFilter();
      const tot = Object.values(App.state.stocks).reduce((n, c) => n + (c.stocks||[]).length, 0);
      setStatus('dg', t('status_ok').replace('{total}', tot).replace('{ago}', timeAgo(App.state.yataTs * 1000)));
      App.market.render(); App.planner.render();
      toast(t('data_updated'), 'ok');
    } catch (ex) {
      console.error(ex); setStatus('dr', ex.message);
      G('marea').innerHTML = errState(ex.message); toast(t('data_error'), 'err');
    } finally {
      App.state.loading = false; G('rfbtn').disabled = false; G('rsp').classList.remove('spinning');
    }
  },

  clearCache() {
    Store.del('tf_stocks'); Store.del('tf_items');
    App.state.stocks = {}; App.state.items = {}; App.state.loaded = false;
    App.market.render(); toast(t('cache_cleared'), 'info');
  },

  allProducts() {
    const list = [];
    Object.entries(CTRY).forEach(([code, ci]) => {
      const d = App.state.stocks[code]; if (!d) return;
      (d.stocks || []).forEach(s => {
        const inf = App.state.items[s.id] || {};
        list.push({
          key: `${code}:${s.id}`, id: s.id,
          name: inf.name || s.name || `#${s.id}`,
          type: inf.type || '—', cost: s.cost, qty: s.quantity, mv: inf.mv || 0,
          code, cname: ci.n[App.lang.current], cflag: ci.flag,
          updatedAt: d.update * 1000
        });
      });
    });
    return list;
  }
};

/* ══════════════════════════════════════════════════════════════
   MARKET MODULE
══════════════════════════════════════════════════════════════ */
App.market = {
  buildTabs() {
    const L = App.lang.current;
    let h = `<button class="dtab active" id="tab-all" onclick="App.market.setDest('all')">🌍 ${L==='pt'?'Todos':'All'} <span class="dc" id="cnt-all">—</span></button>`;
    Object.entries(CTRY).forEach(([code, c]) => {
      h += `<button class="dtab" id="tab-${code}" onclick="App.market.setDest('${code}')">${c.flag}${c.n[L]}<span class="dc" id="cnt-${code}">—</span></button>`;
    });
    G('dtabs').innerHTML = h;
  },

  setDest(code) {
    App.state.activeDest = code;
    document.querySelectorAll('.dtab').forEach(t => t.classList.remove('active'));
    G('tab-' + code)?.classList.add('active');
    this.render();
  },

  updateCounts() {
    let tot = 0;
    Object.keys(CTRY).forEach(code => {
      const n = (App.state.stocks[code]?.stocks || []).length; tot += n;
      const el = G('cnt-' + code); if (el) el.textContent = n;
    });
    const el = G('cnt-all'); if (el) el.textContent = tot;
  },

  buildCatFilter() {
    const types = new Set();
    Object.values(App.state.stocks).forEach(d => (d.stocks||[]).forEach(s => {
      const inf = App.state.items[s.id]; if (inf?.type) types.add(inf.type);
    }));
    const sel = G('mc'), cur = sel.value;
    sel.innerHTML = `<option value="">${t('label_all_categories')}</option>` +
      [...types].sort().map(ty => `<option value="${ty}"${ty===cur?' selected':''}>${ty}</option>`).join('');
  },

  render() {
    if (!App.state.loaded) { this.showSkel(); return; }
    const search = G('ms').value.toLowerCase().trim();
    const cat    = G('mc').value;
    const sort   = G('mo').value;
    let prods = App.data.allProducts();
    if (App.state.activeDest !== 'all') prods = prods.filter(p => p.code === App.state.activeDest);
    if (search) prods = prods.filter(p => p.name.toLowerCase().includes(search) || p.type.toLowerCase().includes(search));
    if (cat)    prods = prods.filter(p => p.type === cat);
    switch (sort) {
      case 'cost_asc':    prods.sort((a,b) => a.cost-b.cost); break;
      case 'cost_desc':   prods.sort((a,b) => b.cost-a.cost); break;
      case 'profit_desc': prods.sort((a,b) => (b.mv-b.cost)-(a.mv-a.cost)); break;
      case 'qty_desc':    prods.sort((a,b) => b.qty-a.qty); break;
      case 'name_asc':    prods.sort((a,b) => a.name.localeCompare(b.name)); break;
    }
    if (!prods.length) {
      G('marea').innerHTML = `<div class="empty"><div class="ei">📦</div><p>${t('market_no_results')}${search?` — "${e(search)}"`:''}</p></div>`;
      return;
    }
    G('marea').innerHTML = `<div class="pgrid">${prods.map((p,i) => this._card(p,i)).join('')}</div>`;
  },

  _card(p, i) {
    const isFav = App.state.favs.includes(p.key);
    const profit = p.mv > 0 ? p.mv - p.cost : 0;
    const pCls = profit > 0 ? 'pos' : profit < 0 ? 'neg' : '';
    // "de lucro" — per the requirement
    const pStr = profit !== 0 ? `${profit>0?'+':''}$${fmtN(Math.abs(profit))} ${t('market_profit_label')}` : '';
    return `<div class="pc" style="animation-delay:${Math.min(i,24)*12}ms">
      <div class="ptop">
        <div class="pname">${e(p.name)}</div>
        <button class="fbtn${isFav?' on':''}" onclick="App.favs.toggle('${p.key}')" aria-label="Favourite">
          ${isFav?'⭐':'☆'}</button>
      </div>
      <div class="pprice">$${fmtN(p.cost)}</div>
      ${p.mv>0?`<div class="pmkt">${t('market_torn_price')} $${fmtN(p.mv)}</div>`:''}
      ${pStr?`<div class="pprofit ${pCls}">${pStr}</div>`:''}
      <div class="pills">
        <span class="pill pb">${e(p.type)}</span>
        ${p.qty>0?`<span class="pill pg">${fmtN(p.qty)}${t('market_in_stock')}</span>`:`<span class="pill pr">${t('market_no_stock')}</span>`}
      </div>
      <div class="pfoot">${p.cflag} ${e(p.cname)} · ↻ ${timeAgo(p.updatedAt)}</div>
    </div>`;
  },

  showSkel() {
    G('marea').innerHTML = `<div class="sgrid">${Array(8).fill('<div class="skel"></div>').join('')}</div>`;
  }
};

/* ══════════════════════════════════════════════════════════════
   MONITOR MODULE
══════════════════════════════════════════════════════════════ */
App.monitor = {
  startPoll() {
    this.poll(false);
    clearInterval(App.state.pollTimer);
    App.state.pollTimer = setInterval(() => {
      const st = App.state.travelData?.status?.state;
      if (!App.state.travelData || st === 'Traveling' || st === 'Abroad') this.poll(false);
    }, 30000);
  },

  async poll(manual = true) {
    const key = App.data._apiKey(); if (!key) return;
    G('psp').classList.add('spinning');
    try {
      const r = await fetch(`https://api.torn.com/user/?selections=travel,basic&key=${key}&_=${Date.now()}`);
      const d = await r.json();
      if (d.error) { this._log(`❌ ${d.error.error}`, 'err'); return; }
      App.state.travelData = d;
      this.applyUI(d);
      this._log(`✓ ${hhmm()} — ${d.status?.state||'?'}`, 'ok');
      if (manual) toast(t('status_updated'), 'ok');
    } catch (ex) { this._log(`⚠ ${ex.message}`, 'err'); }
    finally { G('psp').classList.remove('spinning'); }
  },

  applyUI(d) {
    const state = d.status?.state || 'Okay';
    const trv   = d.travel || {};
    const bd = G('bigdot'), lbl = G('ts-lbl'), sub = G('ts-sub');
    const cdEl = G('ts-cd'), bwEl = G('ts-bw'), rows = G('ts-rows'), tbar = G('tbar');

    if (state === 'Traveling') {
      const dest  = trv.destination || '';
      const tl    = trv.time_left || 0;
      const dep   = trv.departed || 0;
      const arr   = trv.timestamp || 0;
      const total = arr > dep ? arr - dep : 0;
      bd.className = 'ts-bd bd-trv';
      lbl.textContent = `${t('monitor_flying_to')} ${cname(dest)}`;
      sub.textContent = `${t('monitor_departed')}: ${fmtTs(dep*1000)}`;
      cdEl.classList.remove('hidden'); bwEl.classList.remove('hidden');
      this._startCD(tl, total);
      rows.innerHTML = this._irow(t('monitor_departed'), fmtTs(dep*1000)) +
                       this._irow(t('monitor_eta'), fmtTs(arr*1000)) +
                       this._irow(t('monitor_remaining'), fmtDur(tl));
      tbar.classList.add('show');
      G('tbar-txt').innerHTML = `${t('monitor_flying_to')} <b>${cname(dest)}</b>`;
      this._checkNotifs(tl, dest);
      if (App.state.abroadDest !== dest) { App.state.abroadDest = dest; App.people.fetch(dest); }
    } else if (state === 'Abroad') {
      const dest = trv.destination || '';
      bd.className = 'ts-bd bd-abrd';
      lbl.textContent = t('monitor_abroad');
      sub.textContent = `${cflag(dest)} ${cname(dest)}`;
      cdEl.classList.add('hidden'); bwEl.classList.add('hidden');
      clearInterval(App.state.cdTimer); G('tbar-cd').textContent = '';
      rows.innerHTML = this._irow(t('monitor_location'), cflag(dest)+' '+cname(dest));
      tbar.classList.remove('show');
      if (App.state.abroadDest !== dest) { App.state.abroadDest = dest; App.people.fetch(dest); }
      App.state.n3done = false; App.state.n1done = false;
    } else {
      bd.className = 'ts-bd bd-home';
      lbl.textContent = t('monitor_at_home');
      sub.textContent = t('monitor_no_travel');
      cdEl.classList.add('hidden'); bwEl.classList.add('hidden');
      clearInterval(App.state.cdTimer); G('tbar-cd').textContent = '';
      rows.innerHTML = this._irow(t('monitor_status'), '🏠 ' + t('monitor_at_home'));
      tbar.classList.remove('show');
      G('people-title').textContent = t('people_title');
      G('people-area').innerHTML = `<div class="empty"><div class="ei">🏠</div><p>${t('monitor_no_travel')}</p></div>`;
      G('people-controls').classList.add('hidden');
      App.state.abroadDest = null; App.state.n3done = false; App.state.n1done = false;
    }
  },

  _startCD(tl, total) {
    clearInterval(App.state.cdTimer);
    let remaining = tl;
    const tick = () => {
      if (remaining < 0) remaining = 0;
      const s = fmtDur(remaining);
      G('ts-cd').textContent = s; G('tbar-cd').textContent = s;
      if (total > 0) {
        const pct = Math.max(0, Math.min(100, (1 - remaining/total)*100));
        G('ts-bar').style.width = pct + '%';
      }
      if (remaining > 0) remaining--;
    };
    tick();
    App.state.cdTimer = setInterval(tick, 1000);
  },

  _checkNotifs(tl, dest) {
    if (!App.state.notifOn) return;
    if (tl <= 180 && !App.state.n3done) {
      App.state.n3done = true;
      this._sendNotif(t('monitor_notif_3min_title'), t('monitor_notif_3min_body').replace('{dest}', cname(dest)));
      toast('🔔 3min', 'info');
    }
    if (tl <= 60 && !App.state.n1done) {
      App.state.n1done = true;
      this._sendNotif(t('monitor_notif_1min_title'), t('monitor_notif_1min_body').replace('{dest}', cname(dest)));
    }
    if (tl > 300) { App.state.n3done = false; App.state.n1done = false; }
  },

  async handleNotifToggle() {
    const on = G('ntog').checked;
    if (on) {
      if (!('Notification' in window)) { toast('No support', 'err'); G('ntog').checked = false; return; }
      const p = await Notification.requestPermission();
      if (p === 'granted') {
        App.state.notifOn = true; Store.set('tf_notif', true);
        G('ntog-lbl').textContent = t('monitor_notif_on');
        G('nfbtn-top').className = 'nfbtn on'; toast(t('monitor_notif_on'), 'ok');
      } else {
        App.state.notifOn = false; G('ntog').checked = false; toast(t('monitor_notif_denied'), 'err');
      }
    } else {
      App.state.notifOn = false; Store.set('tf_notif', false);
      G('ntog-lbl').textContent = t('monitor_notif_label');
      G('nfbtn-top').className = 'nfbtn';
    }
  },

  _sendNotif(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(title, { body, icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✈️</text></svg>' }); } catch {}
  },

  _log(msg, cls='') {
    const el = G('plog');
    const d = document.createElement('div'); d.className='plog-line pl-'+cls; d.textContent=msg;
    el.insertBefore(d, el.firstChild);
    while (el.children.length > 25) el.removeChild(el.lastChild);
  },

  _irow(l, v) { return `<div class="irow"><span class="il">${l}</span><span class="iv">${v}</span></div>`; }
};

/* ══════════════════════════════════════════════════════════════
   PEOPLE MODULE — Uses YATA export travellers data
══════════════════════════════════════════════════════════════ */
App.people = {
  async fetch(dest) {
    if (!dest) return;
    const cc = dest.toLowerCase();
    G('people-title').textContent = `${cflag(cc)} ${cname(cc)}`;
    G('people-area').innerHTML = `<div style="font-family:var(--M);font-size:.7rem;color:var(--muted);padding:.5rem 0">${t('people_loading')}</div>`;
    G('people-controls').classList.add('hidden');

    // YATA export includes a 'travelers' field per country with player data
    const yataData = App.state.stocks[cc];

    if (!yataData) {
      G('people-area').innerHTML = `<div class="empty"><div class="ei">👥</div><p>${t('people_no_travel')}</p></div>`;
      return;
    }

    // Extract travellers from YATA data
    // YATA format: stocks[country].travelers = [{tId, name, ttl, update, ...}]
    const travelers = yataData.travelers || yataData.travellers || [];

    if (!travelers.length) {
      G('people-area').innerHTML = `<div class="empty"><div class="ei">👤</div><p>${t('people_none')}<br><small style="font-size:.7rem;color:var(--muted)">${t('people_note')}</small></p></div>`;
      return;
    }

    App.state.peopleRaw = travelers.map(u => ({
      id: u.tId || u.id || 0,
      name: u.name || '?',
      level: u.level || 0,
      faction: u.faction || u.factionName || '—',
      update: u.update || u.ttl || 0,
      status: u.status || 'Abroad',
      hospital: u.hospital || false,
    }));

    G('people-controls').classList.remove('hidden');
    this.filterRender();
  },

  filterRender() {
    const search = (G('people-search')?.value || '').toLowerCase().trim();
    const sort   = G('people-sort')?.value || 'name';
    let list = [...App.state.peopleRaw];

    if (search) list = list.filter(u => u.name.toLowerCase().includes(search) || String(u.id).includes(search) || u.faction.toLowerCase().includes(search));

    switch (sort) {
      case 'name':          list.sort((a,b) => a.name.localeCompare(b.name)); break;
      case 'level_desc':    list.sort((a,b) => b.level - a.level); break;
      case 'activity_desc': list.sort((a,b) => b.update - a.update); break;
    }

    if (!list.length) {
      G('people-area').innerHTML = `<div class="empty"><div class="ei">🔍</div><p>${t('people_none')}</p></div>`;
      return;
    }

    const rows = list.slice(0, 50).map(u => {
      const ago = u.update > 0 ? timeAgo(u.update * 1000) : '—';
      const isOnline = u.update > 0 && (Date.now()/1000 - u.update) < 300;
      const badgeCls = u.hospital ? 'pbadge-hosp' : 'pbadge';
      const badgeTxt = u.hospital ? '🏥 Hospital' : u.status || 'Abroad';
      return `<div class="prow">
        <div class="pleft">
          <div class="avt">${u.name ? u.name[0].toUpperCase() : '?'}</div>
          <div class="pinfo">
            <div class="pnlbl">
              <a href="https://www.torn.com/profiles.php?XID=${u.id}" target="_blank" rel="noopener">${e(u.name)}</a>
              <span class="pid">[${u.id}]</span>
            </div>
            <div class="pmlbl">${e(u.faction)}</div>
          </div>
        </div>
        <div class="pright">
          <span class="${badgeCls}">${badgeTxt}</span>
          <span class="plevel">Lv${u.level||'?'}</span>
          <span class="ponline${isOnline?' online':''}">↻ ${ago}</span>
        </div>
      </div>`;
    }).join('');

    G('people-area').innerHTML = rows +
      `<p style="font-family:var(--M);font-size:.62rem;color:var(--muted);margin-top:.6rem">${list.length}${t('people_sub')}</p>
       <p style="font-family:var(--M);font-size:.6rem;color:var(--muted);margin-top:2px">${t('people_note')}</p>`;
  }
};

/* ══════════════════════════════════════════════════════════════
   Players MODULE
══════════════════════════════════════════════════════════════ */
App.players = {
    raw: [],
    filtered: [],
    destination: 'all',
    search: '',
    status: 'all'
};
/* ══════════════════════════════════════════════════════════════
   INTELLIGENCE MODULE
══════════════════════════════════════════════════════════════ */
App.intelligence = {
  render() {
    if (!App.state.loaded) {
      G('intel-kpis').innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="ei">🧠</div><p>${t('no_data')}</p></div>`;
      G('intel-top-items').innerHTML = '';
      G('intel-top-dests').innerHTML = '';
      G('intel-alerts').innerHTML = '';
      return;
    }

    const prods = App.data.allProducts();
    const prodsWithStock = prods.filter(p => p.qty > 0);
    const prodsWithProfit = prods.filter(p => p.mv > 0 && (p.mv - p.cost) > 0);
    prodsWithProfit.sort((a,b) => (b.mv-b.cost) - (a.mv-a.cost));

    // Best profit item
    const bestProfit = prodsWithProfit[0];
    // Best by profit/min (profit / one-way flight time)
    const byProfitMin = prodsWithStock.filter(p => p.mv > p.cost).map(p => {
      const ft = CTRY[p.code]?.ft?.business || CTRY[p.code]?.ft?.standard || 1;
      return { ...p, pmin: (p.mv-p.cost)/ft, phour: (p.mv-p.cost)/ft*60 };
    }).sort((a,b) => b.pmin - a.pmin);
    const bestPMin = byProfitMin[0];

    // Best destination (by total profit of top item)
    const destProfits = {};
    prodsWithProfit.slice(0, 100).forEach(p => {
      if (!destProfits[p.code]) destProfits[p.code] = 0;
      destProfits[p.code] += p.mv - p.cost;
    });
    const bestDestCode = Object.entries(destProfits).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const bestDest = bestDestCode ? CTRY[bestDestCode] : null;

    // KPI cards
    G('intel-kpis').innerHTML = [
      { icon:'💰', label:t('intel_best_profit'),
        val: bestProfit ? `$${fmtN(bestProfit.mv-bestProfit.cost)}` : '—',
        sub: bestProfit ? `<b>${e(bestProfit.name)}</b> · ${bestProfit.cflag} ${e(bestProfit.cname)}` : t('no_data'),
        highlight: true },
      { icon:'📦', label:t('intel_best_item'),
        val: bestProfit ? e(bestProfit.name) : '—',
        sub: bestProfit ? `$${fmtN(bestProfit.cost)} → $${fmtN(bestProfit.mv)}` : t('no_data') },
      { icon:'🌍', label:t('intel_best_dest'),
        val: bestDest ? `${bestDest.flag} ${bestDest.n[App.lang.current]}` : '—',
        sub: bestDestCode ? `$${fmtN(destProfits[bestDestCode])} ${t('market_profit_label')} top items` : t('no_data') },
      { icon:'⚡', label:t('intel_profit_min'),
        val: bestPMin ? `$${fmtN(Math.round(bestPMin.pmin))}/min` : '—',
        sub: bestPMin ? `<b>${e(bestPMin.name)}</b> · Business Class` : t('no_data') },
      { icon:'🕒', label:t('intel_profit_hour'),
        val: bestPMin ? `$${fmtN(Math.round(bestPMin.phour))}/h` : '—',
        sub: bestPMin ? `${bestPMin.cflag} ${e(bestPMin.cname)}` : t('no_data') },
      { icon:'🔄', label:t('intel_yata_update'),
        val: App.state.yataTs > 0 ? timeAgo(App.state.yataTs*1000) : '—',
        sub: App.state.yataTs > 0 ? new Date(App.state.yataTs*1000).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}) : t('no_data') },
    ].map(c => `
      <div class="intel-card${c.highlight?' highlight':''}">
        <div class="ic-icon">${c.icon}</div>
        <div class="ic-label">${c.label}</div>
        <div class="ic-val">${c.val}</div>
        <div class="ic-sub">${c.sub}</div>
      </div>`).join('');

    // Top 10 items by profit
    G('intel-top-items').innerHTML = prodsWithProfit.slice(0,10).map((p,i) => {
      const profit = p.mv - p.cost;
      const ft = CTRY[p.code]?.ft?.business || 1;
      const pmin = profit/ft;
      return `<div class="top-item-row" onclick="App.nav.go('market');App.market.setDest('${p.code}');G('ms').value='${p.name.replace(/'/g,'').slice(0,20)}';App.market.render()">
        <div class="tir-left">
          <span class="tir-rank">${i+1}</span>
          <div>
            <div class="tir-name">${e(p.name)}</div>
            <div class="tir-dest">${p.cflag} ${e(p.cname)} · ${p.qty>0?fmtN(p.qty)+t('market_in_stock'):t('market_no_stock')}</div>
          </div>
        </div>
        <div class="tir-right">
          <div class="tir-profit">+$${fmtN(profit)}</div>
          <div class="tir-pmin">$${fmtN(Math.round(pmin))}/min</div>
        </div>
      </div>`;
    }).join('') || `<p style="font-size:.77rem;color:var(--muted)">${t('no_data')}</p>`;

    // Top 10 destinations by total profit potential
    const destList = Object.entries(destProfits).map(([code,profit]) => ({
      code, profit, c: CTRY[code], count: prodsWithProfit.filter(p=>p.code===code).length
    })).sort((a,b)=>b.profit-a.profit).slice(0,10);

    G('intel-top-dests').innerHTML = destList.map((d,i) => `
      <div class="top-item-row" onclick="App.nav.go('market');App.market.setDest('${d.code}')">
        <div class="tir-left">
          <span class="tir-rank">${i+1}</span>
          <div>
            <div class="tir-name">${d.c.flag} ${d.c.n[App.lang.current]}</div>
            <div class="tir-dest">${d.count} ${App.lang.current==='pt'?'itens lucrativos':'profitable items'}</div>
          </div>
        </div>
        <div class="tir-right">
          <div class="tir-profit">$${fmtN(d.profit)}</div>
        </div>
      </div>`).join('') || `<p style="font-size:.77rem;color:var(--muted)">${t('no_data')}</p>`;

    // Stock alerts — low stock items with profit
    const lowStock = prodsWithProfit.filter(p => p.qty > 0 && p.qty <= 3);
    const outOfStock = prodsWithProfit.filter(p => p.qty === 0).slice(0, 5);
    let alertsHTML = '';
    lowStock.slice(0,5).forEach(p => {
      alertsHTML += `<div class="alert-row">
        <div><div class="alert-name">${e(p.name)}</div><div class="alert-sub">${p.cflag} ${e(p.cname)}</div></div>
        <div class="alert-val">⚠ ${p.qty} ${App.lang.current==='pt'?'em stock':'in stock'}</div>
      </div>`;
    });
    outOfStock.forEach(p => {
      alertsHTML += `<div class="alert-row alert-row-red">
        <div><div class="alert-name alert-name-red">${e(p.name)}</div><div class="alert-sub">${p.cflag} ${e(p.cname)}</div></div>
        <div class="alert-val" style="color:var(--red)">✕ ${t('market_no_stock')}</div>
      </div>`;
    });
    G('intel-alerts').innerHTML = alertsHTML || `<p style="font-size:.77rem;color:var(--muted)">${App.lang.current==='pt'?'Sem alertas.':'No alerts.'}</p>`;
  }
};

/* ══════════════════════════════════════════════════════════════
   GUIDE MODULE
══════════════════════════════════════════════════════════════ */
App.guide = {
  build() {
    const L = App.lang.current;
    const XMAP = {
      bank:    `<span class="xb x-bank">🏦 ${L==='pt'?'Banco Offshore':'Offshore Bank'}</span>`,
      rehab:   `<span class="xb x-rehab">💊 ${L==='pt'?'Reabilitação':'Rehab Center'}</span>`,
      fortune: `<span class="xb x-fortune">🔮 ${L==='pt'?'Leitora da Fortuna':'Fortune Teller'}</span>`,
      hunt:    `<span class="xb x-hunt">🦁 ${L==='pt'?'Caça de Animais':'Animal Hunting'}</span>`,
      suitcase:`<span class="xb x-sc">🧳 Suitcases</span>`,
    };
    const SMAP = {
      safe:   `<span class="xb x-safe">${t('guide_safe')}</span>`,
      med:    `<span class="xb x-warn">${t('guide_med')}</span>`,
      danger: `<span class="xb x-danger">${t('guide_danger')}</span>`,
    };
    G('dgrid').innerHTML = Object.entries(CTRY).map(([code, c]) => `
      <div class="dgc">
        <div class="dgch">
          <span class="dgcf">${c.flag}</span>
          <div><div class="dgct">${c.n[L]}</div><div class="dgcity">${c.city}</div></div>
        </div>
        <div class="dgb">
          <div class="dgs">
            <div class="dgsl">${t('guide_flight_times')}</div>
            <div class="frow"><span class="flb">${t('flight_standard')}</span><span class="fvl">${fmtMin(c.ft.standard)}</span></div>
            <div class="frow"><span class="flb">${t('flight_airstrip')}</span><span class="fvl">${fmtMin(c.ft.airstrip)}</span></div>
            <div class="frow"><span class="flb">${t('flight_wlt')}</span><span class="fvl">${fmtMin(c.ft.wlt)}</span></div>
            <div class="frow"><span class="flb">${t('flight_business')}</span><span class="fvl"><b>${fmtMin(c.ft.business)}</b></span></div>
            <div class="frow"><span class="flb">${t('guide_flight_cost')}</span><span class="fvl">$${fmtN(c.cost)}</span></div>
          </div>
          ${c.extras.length ? `<div class="dgs"><div class="dgsl">${t('guide_extras')}</div><div class="extras">${c.extras.map(x=>XMAP[x]||'').join('')}</div></div>` : ''}
          <div class="dgs"><div class="dgsl">${t('guide_safety')}</div><div class="extras">${SMAP[c.safety]||''}</div></div>
          <div class="dgs"><div class="dgsl">${t('guide_tip')}</div><p style="font-size:.7rem;color:var(--muted2);line-height:1.65">${e(c.tips[L])}</p></div>
        </div>
      </div>`).join('');
  }
};

/* ══════════════════════════════════════════════════════════════
   TRIP MODULE
══════════════════════════════════════════════════════════════ */
App.trip = {
  buildDests() {
    const L = App.lang.current;
    G('tp-d').innerHTML = '<option value="">—</option>' +
      Object.entries(CTRY).map(([code,c]) => `<option value="${code}">${c.flag} ${c.n[L]}</option>`).join('');
  },

  build() {
    const code   = G('tp-d').value;
    const flight = G('tp-f').value;
    const goal   = G('tp-g').value;
    const L      = App.lang.current;
    if (!code) { toast(L==='pt'?'Escolhe um destino':'Choose a destination','err'); return; }

    const c = CTRY[code];
    const tmin = c.ft[flight] || c.ft.standard;
    const GOALS = {
      items:  {icon:'🛒', title:t('goal_items').replace('🛒 ',''),   desc:L==='pt'?'Compra items estrangeiros e vende em Torn City. Verifica o Mercado para calcular lucros.':'Buy foreign items and sell in Torn City. Check Market to calculate profits.'},
      rehab:  {icon:'💊', title:t('goal_rehab').replace('💊 ',''),   desc:L==='pt'?'Rehab na Suíça: elimina vícios e enche a felicidade. Essencial antes do gym.':'Rehab in Switzerland: removes addictions and fills happiness. Essential before gym.'},
      bank:   {icon:'🏦', title:t('goal_bank').replace('🏦 ',''),    desc:L==='pt'?'Cayman National Bank. Juros 0.5%/mês. NUNCA fiques offline com dinheiro!':'Cayman National Bank. 0.5%/month interest. NEVER go offline with cash!'},
      fortune:{icon:'🔮', title:t('goal_fortune').replace('🔮 ',''), desc:L==='pt'?'Leitora em Pequim: revela % do teu progresso para o próximo nível. Custo: $75.000.':'Fortune Teller in Beijing: reveals % progress to next level. Cost: $75,000.'},
      hunt:   {icon:'🦁', title:t('goal_hunt').replace('🦁 ',''),    desc:L==='pt'?'Caça na África do Sul: cash, XP e honors raros. Usa energia.':'Hunting in South Africa: cash, XP and rare honors. Uses energy.'},
    };
    const gi = GOALS[goal] || GOALS.items;

    const destProds = App.state.loaded
      ? (App.state.stocks[code]?.stocks||[]).map(s=>({...s,info:App.state.items[s.id]||{}}))
          .filter(s=>s.quantity>0).sort((a,b)=>a.cost-b.cost).slice(0,5)
      : [];

    const warns = [];
    const chk = (cond, lvl, msg) => { if (cond) warns.push({lvl, msg}); };
    const pt = L==='pt';
    chk(code==='cay','danger', pt?'🚨 Cayman — muggers MUITO frequentes! Deposita rápido e volta imediatamente.':'🚨 Cayman — VERY frequent muggers! Deposit fast and return immediately.');
    chk(code!=='swi'&&goal==='rehab','warn', pt?'⚠ Reabilitação só disponível na Suíça.':'⚠ Rehab only available in Switzerland.');
    chk(code!=='chi'&&goal==='fortune','warn', pt?'⚠ Leitora da Fortuna só disponível na China.':'⚠ Fortune Teller only in China.');
    chk(code!=='sou'&&goal==='hunt','warn', pt?'⚠ Caça só disponível na África do Sul.':'⚠ Hunting only in South Africa.');
    chk(code!=='cay'&&goal==='bank','warn', pt?'⚠ Banco Offshore só nas Cayman Islands.':'⚠ Offshore Bank only in Cayman Islands.');
    chk(code==='swi'&&goal==='rehab','safe', pt?'✅ Destino correto. Suíça é muito segura.':'✅ Correct destination. Switzerland is very safe.');
    chk(code==='cay'&&goal==='bank','safe', pt?'✅ Destino correto para Banco Offshore.':'✅ Correct destination for Offshore Bank.');
    chk(code==='chi'&&goal==='fortune','safe', pt?'✅ Destino correto para Leitora.':'✅ Correct destination for Fortune Teller.');
    chk(code==='sou'&&goal==='hunt','safe', pt?'✅ Destino correto para Caça.':'✅ Correct destination for Hunting.');
    chk(tmin>=200,'warn', `${pt?'⚠ Voo muito longo':'⚠ Very long flight'} (${fmtMin(tmin)}) — ${pt?'maximiza o inventário.':'maximize inventory.'}`);
    chk(c.safety==='danger','danger', pt?'🚨 Destino perigoso — nunca offline com dinheiro.':'🚨 Dangerous destination — never offline with cash.');
    chk(goal==='items'&&destProds.length>0,'safe', `✅ ${destProds.length} ${pt?'produto(s) com stock disponíveis.':'product(s) with stock available.'}`);

    const danger = warns.filter(w=>w.lvl==='danger').length;
    const warn2  = warns.filter(w=>w.lvl==='warn').length;
    const rs     = danger*3 + warn2;
    const rl     = rs===0?'low':rs<=2?'med':'high';
    const rlText = t('trip_risk_'+rl);

    const plist = destProds.length
      ? destProds.map(p=>`${e(p.info.name||'Item')} <b style="color:var(--accent)">$${fmtN(p.cost)}</b>`).join(', ')
      : (pt?'Carrega o Mercado para ver items.':'Load Market to see items.');

    const profit = App.state.items ? (() => {
      const topProd = destProds.find(p => App.state.items[p.id]?.mv > p.cost);
      if (!topProd) return '';
      const mv = App.state.items[topProd.id]?.mv||0;
      const pr = mv - topProd.cost;
      return pr>0 ? ` · <span style="color:var(--green)">+$${fmtN(pr)} ${t('market_profit_label')}</span>` : '';
    })() : '';

    const steps = [
      {i:'🏠', t:pt?'Partida — Torn City':'Departure — Torn City', s:pt?'Assegura dinheiro e inventário livre.':'Ensure cash and free inventory.', b:null},
      {i:'✈️', t:`${pt?'Voo para':'Flight to'} ${c.n[L]} (${flight})`, s:`${pt?'Duração':'Duration'}: ${fmtMin(tmin)} · ${pt?'Custo':'Cost'}: $${fmtN(c.cost)}`, b:{cls:'x-safe',t:t('trip_invuln')}},
      {i:'🛬', t:`${pt?'Chegada em':'Arrival in'} ${c.city}`, s:pt?'Grace period 15s — ninguém te pode atacar.':'Grace period 15s — no player can attack you.', b:{cls:'x-safe',t:t('trip_grace')}},
      ...(goal==='items'?[{i:'🛒', t:pt?'Comprar items':'Buy items', s:plist+profit, b:null}]:[]),
      ...(goal==='rehab'?[{i:'💊', t:pt?'Centro de Reabilitação':'Rehab Center', s:pt?'Elimina vícios e enche felicidade. Custo varia.':'Removes addictions and fills happiness. Cost varies.', b:{cls:'x-safe',t:'💊'}}]:[]),
      ...(goal==='bank'?[{i:'🏦', t:pt?'Banco Offshore':'Offshore Bank', s:pt?'Mín $100. Juros 0.5%/mês. NÃO fiques offline!':'Min $100. 0.5%/month. DON\'T go offline!', b:{cls:'x-danger',t:'⚠ Muggers!'}}]:[]),
      ...(goal==='fortune'?[{i:'🔮', t:pt?'Leitora da Fortuna':'Fortune Teller', s:pt?'$75.000 para saber % do teu progresso para o próximo nível.':'$75,000 to know your % progress to next level.', b:{cls:'x-safe',t:'🔮 $75,000'}}]:[]),
      ...(goal==='hunt'?[{i:'🦁', t:pt?'Caça de Animais':'Animal Hunting', s:pt?'Usa energia. Cada caça dá cash, XP e possivelmente honors.':'Use energy. Each hunt gives cash, XP and possibly honors.', b:{cls:'x-safe',t:'🦁'}}]:[]),
      {i:'✈️', t:pt?'Regresso':'Return flight', s:`${fmtMin(tmin)} · ${pt?'Invulnerável':'Invulnerable'}`, b:{cls:'x-safe',t:t('trip_invuln')}},
      {i:'🏠', t:pt?'Chegou a casa!':'Back home!', s:`${pt?'Custo total':'Total cost'}: $${fmtN(c.cost*2)} · ${pt?'Tempo total':'Total time'}: ${fmtMin(tmin*2)}`, b:null},
    ];

    G('trip-result').innerHTML = `<div class="tresult">
      <div class="ptitle">${c.flag} ${c.n[L]} — ${gi.icon} ${gi.title}</div>
      <div class="riskrow">
        <div class="riskbox"><div class="rl">${t('trip_risk')}</div><div class="rv ${rl}">${rlText}</div></div>
        <div class="riskbox"><div class="rl">${t('trip_roundtrip')}</div><div class="rv">${fmtMin(tmin*2)}</div></div>
        <div class="riskbox"><div class="rl">${t('trip_total_cost')}</div><div class="rv">$${fmtN(c.cost*2)}</div></div>
        <div class="riskbox"><div class="rl">${t('trip_flight_type')}</div><div class="rv" style="text-transform:capitalize">${flight}</div></div>
      </div>
      <p style="font-size:.76rem;color:var(--muted2);line-height:1.65;margin-bottom:.85rem">${gi.desc}</p>
      ${warns.length ? `<div class="warnings">${warns.map(w=>`<div class="wline wl-${w.lvl}">${w.msg}</div>`).join('')}</div>` : ''}
      <div class="timeline">${steps.map(s=>`
        <div class="tstep">
          <div class="tsi">${s.i}</div>
          <div class="tsc">
            <div class="tst">${s.t}</div>
            <div class="tss">${s.s}</div>
            ${s.b?`<div class="tsbadge ${s.b.cls}">${s.b.t}</div>`:''}
          </div>
        </div>`).join('')}
      </div>
    </div>`;
    G('trip-result').classList.remove('hidden');
    G('trip-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  clear() { G('trip-result').innerHTML=''; G('trip-result').classList.add('hidden'); }
};

/* ══════════════════════════════════════════════════════════════
   PLANNER MODULE
══════════════════════════════════════════════════════════════ */
App.planner = {
  render() {
    if (!App.state.loaded) {
      G('plan-dests').innerHTML = `<p style="font-size:.77rem;color:var(--muted)">${t('no_data')}</p>`;
      G('plan-top').innerHTML = '';
      return;
    }
    const L = App.lang.current;
    const rows = Object.entries(CTRY).map(([code,ci]) => {
      const d = App.state.stocks[code];
      if (!d || (d.stocks||[]).length===0) return null;
      const sorted = [...d.stocks].sort((a,b)=>a.cost-b.cost);
      return {code,ci,d,ch:sorted[0]};
    }).filter(Boolean);

    G('plan-dests').innerHTML = rows.length ? rows.map(r => `
      <div class="dsr" onclick="App.nav.go('market');App.market.setDest('${r.code}')">
        <div class="dsrl"><span class="dsrf">${r.ci.flag}</span>
          <div><div class="dsrn">${r.ci.n[L]}</div><div class="dsrc">${(r.d.stocks||[]).length}</div></div></div>
        <div class="dsrr"><div class="dsrp">$${fmtN(r.ch.cost)}</div><div class="dsra">↻ ${timeAgo(r.d.update*1000)}</div></div>
      </div>`).join('')
    : `<p style="font-size:.77rem;color:var(--muted)">${t('no_data')}</p>`;

    const top = App.data.allProducts().filter(p=>p.qty>0).sort((a,b)=>a.cost-b.cost).slice(0,15);
    G('plan-top').innerHTML = top.length ? top.map((p,i) => `
      <div class="dsr" onclick="App.nav.go('market');App.market.setDest('${p.code}');G('ms').value='${p.name.replace(/'/g,'').slice(0,18)}';App.market.render()">
        <div class="dsrl">
          <span style="font-family:var(--M);font-size:.6rem;color:var(--muted);width:16px;flex-shrink:0">${i+1}</span>
          <div><div class="dsrn">${e(p.name)}</div><div class="dsrc">${p.cflag} ${e(p.cname)} · ${fmtN(p.qty)}</div></div></div>
        <div class="dsrp">$${fmtN(p.cost)}</div>
      </div>`).join('')
    : `<p style="font-size:.77rem;color:var(--muted)">${t('no_data')}</p>`;
  }
};

/* ══════════════════════════════════════════════════════════════
   FAVORITES MODULE
══════════════════════════════════════════════════════════════ */
App.favs = {
  toggle(key) {
    const i = App.state.favs.indexOf(key);
    if (i >= 0) { App.state.favs.splice(i,1); toast(t('fav_removed'),'info'); }
    else { App.state.favs.push(key); toast(t('fav_added'),'ok'); }
    Store.set('tf_favs', App.state.favs);
    if (G('view-market').classList.contains('active'))    App.market.render();
    if (G('view-favorites').classList.contains('active')) this.render();
  },

  render() {
    if (!App.state.loaded) {
      G('farea').innerHTML=`<div class="empty"><div class="ei">⚠️</div><p>${t('no_data')}</p></div>`;return;
    }
    if (!App.state.favs.length) {
      G('farea').innerHTML=`<div class="empty"><div class="ei">⭐</div><p>${t('favorites_no_favs')}</p></div>`;return;
    }
    const search = G('fs').value.toLowerCase().trim();
    let prods = App.data.allProducts().filter(p=>App.state.favs.includes(p.key));
    if (search) prods=prods.filter(p=>p.name.toLowerCase().includes(search)||p.cname.toLowerCase().includes(search));
    if (!prods.length) { G('farea').innerHTML=`<div class="empty"><div class="ei">🔍</div><p>—</p></div>`; return; }
    G('farea').innerHTML=`<p class="sbar" style="margin-bottom:.8rem">${prods.length}</p><div class="pgrid">${prods.map((p,i)=>App.market._card(p,i)).join('')}</div>`;
  },

  clearAll() {
    if (!confirm(t('confirm_clear_favs'))) return;
    App.state.favs=[]; Store.set('tf_favs',[]);
    this.render(); toast(t('favs_cleared'),'ok');
  }
};

/* ══════════════════════════════════════════════════════════════
   NAVIGATION MODULE
══════════════════════════════════════════════════════════════ */
App.nav = {
  go(name) {
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.querySelectorAll('.nb,.bnn').forEach(b=>b.classList.remove('active'));
    G('view-'+name)?.classList.add('active');
    G('nav-'+name)?.classList.add('active');
    G('bnn-'+name)?.classList.add('active');
    // Scroll to top on mobile
    window.scrollTo({top:0,behavior:'smooth'});
    switch(name) {
      case 'favorites':    App.favs.render(); break;
      case 'trip':         App.planner.render(); break;
      case 'monitor':      App.monitor.poll(false); break;
      case 'intelligence': App.intelligence.render(); break;
      case 'guide':        App.guide.build(); break;
      case 'settings':     App.auth._renderSavedSettings(); break;
    }
  }
};

/* ══════════════════════════════════════════════════════════════
   PWA MODULE
══════════════════════════════════════════════════════════════ */
App.pwa = {
  async install() {
    if (App.state.pwaPrompt) {
      App.state.pwaPrompt.prompt();
      const { outcome } = await App.state.pwaPrompt.userChoice;
      if (outcome === 'accepted') { App.state.pwaPrompt=null; G('ibanner').classList.remove('show'); }
    } else {
      G('inst-instr').classList.remove('hidden');
    }
  }
};

/* ══════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════════════════════════════ */
const e    = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const j    = o => JSON.stringify(o).replace(/"/g,'&quot;');
const fmtN = n => Number(n||0).toLocaleString('pt-PT');
const maskKey = k => k&&k.length>8 ? k.slice(0,4)+'…'+k.slice(-4) : '****';
const fmtDur  = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60; return `${pad(h)}:${pad(m)}:${pad(ss)}`; };
const pad     = n => String(n||0).padStart(2,'0');
const fmtTs   = ts => ts ? new Date(ts).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}) : '—';
const hhmm    = ()  => new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
const fmtMin  = m   => m>=60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`;

function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now()-ts)/1000);
  const tnow=t('time_now'), tmin=t('time_min'), thour=t('time_hour'), tday=t('time_day');
  if (s<60) return tnow;
  const m=Math.floor(s/60); if (m<60) return `${m}${tmin}`;
  const h=Math.floor(m/60); if (h<24) return `${h}${thour}`;
  return `${Math.floor(h/24)}${tday}`;
}

function setStatus(cls, txt) {
  G('sdot').className = 'dot ' + cls; G('stxt').textContent = txt;
}

function errState(msg) {
  return `<div class="empty"><div class="ei">⚠️</div><p>${t('status_error')}: <code>${e(msg)}</code></p></div>`;
}

function showErr(el, msg) { el.textContent=msg; el.classList.remove('hidden'); }
function setBtn(id, tx, d) { const b=G(id); if(b){b.innerHTML=tx;b.disabled=d;} }

let _toastTimer;
function toast(msg, type='') {
  const el=G('toast'); el.textContent=msg; el.className='show '+type;
  clearTimeout(_toastTimer); _toastTimer=setTimeout(()=>el.className='',2800);
}

/* ══════════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════════ */
async function boot() {
  // Load language first
  const savedLang = Store.get('tf_lang') || 'pt';
  await App.lang.load(savedLang);

  // Update lang buttons
  ['pt','en'].forEach(c => {
    const b = G('lb-'+c); if (b) b.className='lbtn'+(c===savedLang?' on':'');
  });
  document.querySelectorAll('.lang-row .lbtn').forEach(b => {
    const isEN = b.textContent.includes('EN') || b.textContent.includes('English');
    const code = isEN ? 'en' : 'pt';
    b.className = 'lbtn'+(code===savedLang?' on':'');
  });

  // PWA events
  window.addEventListener('beforeinstallprompt', ev => {
    ev.preventDefault(); App.state.pwaPrompt = ev;
    G('ibanner').classList.add('show');
  });
  window.addEventListener('appinstalled', () => {
    G('ibanner').classList.remove('show'); App.state.pwaPrompt=null;
  });

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  // Render saved accounts on login page
  App.auth._renderSavedLogin();

  // Auto-login if remembered
  const last = Store.get('tf_lastuser');
  if (last && last.apiKey) App.auth._loginAs(last, false);
}

boot();
</script>
