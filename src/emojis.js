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
  k_link:       '',  // Neon blue chain link
  k_code:       '',  // Neon green terminal icon
  k_media:      '',  // Neon pink image icon
  k_prompt:     '',  // Neon purple brain/AI icon
  k_forward:    '',  // Grey/silver forward arrow
  k_mix:        '',  // Neon orange puzzle piece
  k_pin:        '',  // Gold pushpin
  k_note:       '',  // Green notepad
  k_file:       '',  // Document icon
  k_check:      '',  // Green checkmark
  k_stats:      '',  // Bar chart icon
  k_search:     '',  // Magnifying glass
  k_inbox:      '',  // Inbox tray

  // ── URL category emojis (static) ──
  k_video:      '',  // Play button / video
  k_social:     '',  // Chat bubble
  k_article:    '',  // Newspaper
  k_docs:       '',  // Page/document
  k_image:      '',  // Framed picture
  k_ai:         '',  // Robot face
  k_store:      '',  // Shopping bag
  k_music:      '',  // Music note
  k_web:        '',  // Globe

  // ── File type emojis (static) ──
  k_file_img:   '',  // Image file
  k_file_vid:   '',  // Video file
  k_file_aud:   '',  // Audio file
  k_file_doc:   '',  // Document file
  k_file_code:  '',  // Code file
  k_file_zip:   '',  // Archive file

  // ── Animated emojis ──
  k_loading:    '',  // Spinning loading circle
  k_sparkle:    '',  // Sparkle/stars effect
  k_typing:     '',  // Three dots typing
  k_success:    '',  // Animated checkmark
  k_pulse:      '',  // Pulsing glow dot
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
