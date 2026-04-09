// ── Kyraxx Organiser - Custom Emoji Config ──────────────────────────────────
//
// HOW TO SET UP:
// 1. Upload all emojis to your Discord server
// 2. Type \:emoji_name: in Discord chat to get the ID
// 3. Copy the full string like <:k_link:1234567890> or <a:k_loading:1234567890>
// 4. Paste it into the CUSTOM object below
//
// If a custom emoji is not set (empty string), the Unicode fallback is used.
// ─────────────────────────────────────────────────────────────────────────────

const CUSTOM = {
  // ── Route/Category emojis (static) ──
  k_link:       '<:k_link:1491764771694055504>',  // Neon blue chain link
  k_code:       '<:k_code:1491764781001216081>',  // Neon green terminal icon
  k_media:      '<:k_media:1491764790006251650>',  // Neon pink image icon
  k_prompt:     '<:k_prompt:1491764799116279960>',  // Neon purple brain/AI icon
  k_forward:    '<:k_forward:1491764807710281799>',  // Grey/silver forward arrow
  k_mix:        '<:k_mix:1491764816367587388>',  // Neon orange puzzle piece
  k_pin:        '<:k_pin:1491764825108512849>',  // Gold pushpin
  k_note:       '<:k_note:1491764835199746239>',  // Green notepad
  k_file:       '<:k_file:1491764843781423204>',  // Document icon
  k_check:      '<:k_check:1491764852258246687>',  // Green checkmark
  k_stats:      '<:k_stats:1491764860864954440>',  // Bar chart icon
  k_search:     '<:k_search:1491764871732134039>',  // Magnifying glass
  k_inbox:      '<:k_inbox:1491764879881933042>',  // Inbox tray

  // ── URL category emojis (static) ──
  k_video:      '<:k_video:1491764889042292896>',  // Play button / video
  k_social:     '<:k_social:1491764897820967063>',  // Chat bubble
  k_article:    '<:k_article:1491764906695983115>',  // Newspaper
  k_docs:       '<:k_file_doc:1491764979538596022>',  // Page/document
  k_image:      '<:k_file_img:1491764950710882314>',  // Framed picture
  k_ai:         '<:k_ai:1491764915411619974>',  // Robot face
  k_store:      '<:k_store:1491764932755193968>',  // Shopping bag
  k_music:      '<:k_music:1491764924056338462>',  // Music note
  k_web:        '<:k_web:1491764941160448160>',  // Globe

  // ── File type emojis (static) ──
  k_file_img:   '<:k_file_img:1491764950710882314>',  // Image file
  k_file_vid:   '<:k_file_vid:1491764959606997194>',  // Video file
  k_file_aud:   '<:k_file_aud:1491764969090318479>',  // Audio file
  k_file_doc:   '<:k_file_doc:1491764979538596022>',  // Document file
  k_file_code:  '<:k_file_code:1491764989575299153>',  // Code file
  k_file_zip:   '<:k_file_zip:1491764998014500865>',  // Archive file

  // ── Animated emojis ──
  k_loading:    '<a:k_loading:1491765006855966853>',  // Spinning loading circle
  k_sparkle:    '<a:k_sparkle:1491765015286517924>',  // Sparkle/stars effect
  k_typing:     '<a:k_typing:1491765036732121190>',  // Three dots typing
  k_success:    '<a:k_success:1491765027198341194>',  // Animated checkmark
  k_pulse:      '<a:k_pulse:1491765048841080944>',  // Pulsing glow dot

  // ── Extra static (v2) ──
  k_star:         '<:k_star:1491767986695045273>',
  k_crown:        '<:k_crown:1491767996102869073>',
  k_fire:         '<:k_fire:1491768004407726091>',
  k_heart:        '<:k_heart:1491768013152714823>',
  k_shield:       '<:k_shield:1491768021973205052>',
  k_bolt:         '<:k_bolt:1491768030613471407>',
  k_gem:          '<:k_gem:1491768039366987776>',
  k_clock:        '<:k_clock:1491768048049197146>',
  k_tag:          '<:k_tag:1491768056878465174>',
  k_wave:         '<:k_wave:1491768065665536060>',

  // ── Extra animated (v2) ──
  k_anim_fire:    '<a:k_anim_fire:1491768073932243097>',
  k_anim_star:    '<a:k_anim_star:1491768082723635230>',
  k_anim_heart:   '<a:k_anim_heart:1491768090910785577>',
  k_anim_crown:   '<a:k_anim_crown:1491768099450388673>',
  k_anim_bolt:    '<a:k_anim_bolt:1491768108900159529>',
  k_anim_wave:    '<a:k_anim_wave:1491768117372653619>',
  k_anim_rocket:  '<a:k_anim_rocket:1491768129456574535>',
  k_anim_party:   '<a:k_anim_party:1491768141364330516>',
  k_anim_eyes:    '<a:k_anim_eyes:1491768150801518623>',

  // ── Remaining 11 (run: node setup-emojis-retry.js after ~45 min) ──
  k_anim_gear:    '',
  k_anim_alert:   '',
  k_anim_rainbow: '',
  k_anim_coin:    '',
  k_anim_ping:    '',
  k_anim_verify:  '',
  k_anim_arrow:   '',
  k_anim_music:   '',
  k_anim_chat:    '',
  k_anim_lock:    '',
  k_anim_globe:   '',
};

// ── Unicode fallbacks ───────────────────────────────────────────────────────

const FALLBACK = {
  k_link:       '\uD83D\uDD17',      // 🔗
  k_code:       '\uD83D\uDCBB',      // 💻
  k_media:      '\uD83D\uDCCE',      // 📎
  k_prompt:     '\uD83E\uDD16',      // 🤖
  k_forward:    '\uD83D\uDD04',      // 🔄
  k_mix:        '\uD83D\uDCE6',      // 📦
  k_pin:        '\uD83D\uDCCC',      // 📌
  k_note:       '\uD83D\uDCDD',      // 📝
  k_file:       '\uD83D\uDCC4',      // 📄
  k_check:      '\u2705',            // ✅
  k_stats:      '\uD83D\uDCCA',      // 📊
  k_search:     '\uD83D\uDD0D',      // 🔍
  k_inbox:      '\uD83D\uDCE5',      // 📥

  k_video:      '\uD83C\uDFAC',      // 🎬
  k_social:     '\uD83D\uDCAC',      // 💬
  k_article:    '\uD83D\uDCF0',      // 📰
  k_docs:       '\uD83D\uDCC4',      // 📄
  k_image:      '\uD83D\uDDBC\uFE0F',// 🖼️
  k_ai:         '\uD83E\uDD16',      // 🤖
  k_store:      '\uD83D\uDED2',      // 🛒
  k_music:      '\uD83C\uDFB5',      // 🎵
  k_web:        '\uD83C\uDF10',      // 🌐

  k_file_img:   '\uD83D\uDDBC\uFE0F',// 🖼️
  k_file_vid:   '\uD83C\uDFAC',      // 🎬
  k_file_aud:   '\uD83C\uDFB5',      // 🎵
  k_file_doc:   '\uD83D\uDCC4',      // 📄
  k_file_code:  '\uD83D\uDCBB',      // 💻
  k_file_zip:   '\uD83D\uDCE6',      // 📦

  k_loading:    '\u23F3',            // ⏳
  k_sparkle:    '\u2728',            // ✨
  k_typing:     '\uD83D\uDCAD',      // 💭
  k_success:    '\u2705',            // ✅
  k_pulse:      '\uD83D\uDD35',      // 🔵
};

// ── Emoji getter ────────────────────────────────────────────────────────────

function e(name) {
  return CUSTOM[name] || FALLBACK[name] || '';
}

// ── Category mappers ────────────────────────────────────────────────────────

function urlIcon(category) {
  const map = {
    video: 'k_video', code: 'k_code', social: 'k_social',
    article: 'k_article', docs: 'k_docs', image: 'k_image',
    ai: 'k_ai', store: 'k_store', music: 'k_music', web: 'k_web',
  };
  return e(map[category] || 'k_web');
}

function fileIcon(type) {
  const map = {
    image: 'k_file_img', video: 'k_file_vid', audio: 'k_file_aud',
    document: 'k_file_doc', code: 'k_file_code', archive: 'k_file_zip',
  };
  return e(map[type] || 'k_file');
}

function routeIcon(route) {
  const map = {
    prompts: 'k_prompt', media: 'k_media', links: 'k_link',
    forwarded: 'k_forward', code: 'k_code', mix: 'k_mix',
  };
  return e(map[route] || 'k_mix');
}

module.exports = { e, urlIcon, fileIcon, routeIcon, CUSTOM };
