const path = require('path');

// ── URL extraction ──────────────────────────────────────────────────────────

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

const PLATFORM_MAP = {
  video:   [/youtube\.com/, /youtu\.be/, /twitch\.tv/, /vimeo\.com/, /dailymotion\.com/, /tiktok\.com/],
  code:    [/github\.com/, /gitlab\.com/, /bitbucket\.org/, /codepen\.io/, /replit\.com/,
            /stackoverflow\.com/, /stackexchange\.com/, /npmjs\.com/, /pypi\.org/,
            /crates\.io/, /pkg\.go\.dev/, /jsfiddle\.net/],
  social:  [/twitter\.com/, /x\.com/, /reddit\.com/, /discord\.gg/, /discord\.com\/invite/,
            /instagram\.com/, /threads\.net/, /bsky\.app/, /mastodon/,
            /facebook\.com/, /linkedin\.com/, /t\.me/, /telegram\.me/],
  article: [/medium\.com/, /dev\.to/, /hashnode\.dev/, /substack\.com/,
            /blog\./, /\.blog/, /wordpress\.com/, /ghost\.io/],
  docs:    [/docs\.google\.com/, /notion\.so/, /figma\.com/, /drive\.google\.com/,
            /dropbox\.com/, /onedrive\.live\.com/, /confluence/, /sheets\.google\.com/],
  image:   [/\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)(\?|$)/i],
  ai:      [/chat\.openai\.com/, /chatgpt\.com/, /claude\.ai/, /bard\.google\.com/,
            /poe\.com/, /perplexity\.ai/, /huggingface\.co/, /replicate\.com/],
  store:   [/amazon\.com/, /ebay\.com/, /etsy\.com/, /shopify\.com/, /aliexpress\.com/],
  music:   [/spotify\.com/, /soundcloud\.com/, /music\.apple\.com/, /music\.youtube\.com/],
};

function extractUrls(text) {
  const matches = text.match(URL_REGEX) || [];
  // Deduplicate and strip trailing punctuation that got captured
  return [...new Set(matches.map(url => url.replace(/[.,;:!?)>\]]+$/, '')))];
}

function categorizeUrl(urlString) {
  for (const [category, patterns] of Object.entries(PLATFORM_MAP)) {
    if (patterns.some(p => p.test(urlString))) return category;
  }
  return 'web';
}

function getPlatform(urlString) {
  try {
    const hostname = new URL(urlString).hostname.replace(/^www\./, '');
    // Shorten common domains for display
    const short = hostname.replace(/\.com$|\.org$|\.io$|\.dev$|\.net$/, '');
    return short;
  } catch {
    return 'link';
  }
}

function getTitle(urlString) {
  try {
    const url = new URL(urlString);
    // Try to extract a readable title from the path
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1]
        .replace(/[-_]/g, ' ')
        .replace(/\.\w+$/, '') // strip extension
        .trim();
      if (last.length > 2 && last.length < 80) return last;
    }
    return getPlatform(urlString);
  } catch {
    return 'Link';
  }
}

function parseUrls(text) {
  const rawUrls = extractUrls(text);
  return rawUrls.map(raw => ({
    raw,
    category: categorizeUrl(raw),
    platform: getPlatform(raw),
    title: getTitle(raw),
  }));
}

// ── Code block detection ────────────────────────────────────────────────────

const FENCED_CODE_REGEX = /```(\w*)\n?([\s\S]*?)```/g;

const CODE_INDICATORS = [
  /^(const|let|var|function|class|import|export|if|for|while|return|async|await)\s/m,
  /^(def|class|import|from|print|if|for|while|return|elif|except|try)\s/m,
  /^(public|private|protected|static|void|int|string|bool|namespace|using)\s/m,
  /^(fn|let|mut|impl|struct|enum|use|mod|pub)\s/m,
  /^(func|package|import|type|struct|interface)\s/m,
  /[{};]\s*$/m,
  /^\s*(\/\/|#|\/\*|\*|--)\s/m,
  /=>\s*[{(]/m,
  /\(\s*\)\s*\{/m,
  /\bfunction\s*\w*\s*\(/m,
  /\b(console\.log|println!?|printf?|echo|System\.out)\b/m,
  /^\s*@\w+/m, // decorators/annotations
];

function extractCodeBlocks(text) {
  const blocks = [];

  // Fenced code blocks (```lang ... ```)
  FENCED_CODE_REGEX.lastIndex = 0;
  let match;
  while ((match = FENCED_CODE_REGEX.exec(text)) !== null) {
    const content = match[2].trim();
    if (content.length > 0) {
      blocks.push({ language: match[1] || 'txt', content });
    }
  }

  return blocks;
}

function looksLikeCode(text) {
  if (text.length < 20) return false;
  const matchCount = CODE_INDICATORS.filter(r => r.test(text)).length;
  return matchCount >= 3;
}

// ── AI Prompt detection ─────────────────────────────────────────────────────

const PROMPT_INDICATORS = [
  /^(you are|act as|pretend to be|imagine you're|play the role of)\s/im,
  /^(system\s*prompt|system\s*message|system|instructions?)\s*[:\-]/im,
  /^(prompt|template|persona|role)\s*[:\-]/im,
  /\b(you are an? (expert|helpful|advanced|professional|skilled))\b/i,
  /\b(your (task|job|role|goal|objective|purpose) is to)\b/i,
  /\b(respond (as|like|in the style of))\b/i,
  /\b(generate|create|write|produce|output|provide)\s+(a |an |the )?(detailed|comprehensive|complete)/i,
  /\b(step[- ]by[- ]step|chain[- ]of[- ]thought|few[- ]shot|zero[- ]shot)\b/i,
  /\b(input|output|context|constraints?|requirements?|format|example)\s*:/im,
  /\b(do not|don't|never|always|make sure|ensure|remember to)\b.*\b(respond|answer|reply|generate|output)/i,
  /\b(tone|style|voice|perspective|point of view)\s*:/i,
  /\b(as an ai|as a language model|as an assistant|as a chatbot)\b/i,
  /^#+\s*(system|prompt|instructions?|context|role|task)\b/im,
  /\b(delimiters?|xml tags?|markdown format)\b/i,
  /\[?(INST|SYS|SYSTEM)\]?\s/,
];

const PROMPT_STRUCTURAL = [
  /^#{1,3}\s+\w/m,                    // Markdown headers
  /^\d+\.\s+\w/m,                     // Numbered lists
  /^[-*]\s+\w/m,                      // Bullet lists
  /```[\s\S]*?```/,                    // Contains code examples
  /\{[a-z_]+\}/i,                     // Template variables like {user_input}
  /\[\[.*?\]\]/,                       // Template markers [[like this]]
  /<[a-z_]+>/i,                        // XML-style tags <example>
];

function looksLikePrompt(text) {
  if (text.length < 50) return false;

  // Count indicator matches
  const indicatorScore = PROMPT_INDICATORS.filter(r => r.test(text)).length;

  // Count structural matches
  const structuralScore = PROMPT_STRUCTURAL.filter(r => r.test(text)).length;

  // Strong signals: if 2+ prompt indicators match, it's very likely a prompt
  if (indicatorScore >= 2) return true;

  // Medium signal: 1 indicator + 2+ structural features + decent length
  if (indicatorScore >= 1 && structuralScore >= 2 && text.length > 150) return true;

  // Weak signal: lots of structural features + long text (instructional document)
  if (structuralScore >= 3 && text.length > 300) return true;

  return false;
}

// ── Attachment classification ───────────────────────────────────────────────

const ATTACHMENT_TYPES = {
  image:    ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff'],
  video:    ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'],
  audio:    ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma'],
  document: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx', '.csv'],
  code:     ['.js', '.py', '.ts', '.java', '.c', '.cpp', '.rs', '.go', '.rb', '.sh', '.json', '.yaml', '.yml', '.toml', '.html', '.css', '.php', '.sql', '.xml'],
  archive:  ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
};

function classifyAttachment(filename) {
  const ext = path.extname(filename).toLowerCase();
  for (const [type, extensions] of Object.entries(ATTACHMENT_TYPES)) {
    if (extensions.includes(ext)) return type;
  }
  return 'file';
}

function parseAttachments(attachments) {
  return attachments.map(att => ({
    name: att.name,
    url: att.url,
    type: classifyAttachment(att.name),
    size: att.size,
    proxyURL: att.proxyURL,
  }));
}

// ── Text cleanup ────────────────────────────────────────────────────────────

function cleanText(text) {
  let cleaned = text;
  cleaned = cleaned.replace(URL_REGEX, '');
  // Use a fresh regex to avoid lastIndex state from extractCodeBlocks
  cleaned = cleaned.replace(/```(\w*)\n?([\s\S]*?)```/g, '');
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  cleaned = cleaned.replace(/^\s+$/gm, '');
  return cleaned.trim();
}

// ── Forwarded message detection ─────────────────────────────────────────────

function isForwardedMessage(message) {
  // Discord's native forward feature: messageSnapshots is the definitive signal
  if (message.messageSnapshots?.size > 0) return true;
  // Check reference type: type 1 = Forward (type 0 = Reply/Default)
  if (message.reference && message.reference.type === 1) return true;
  return false;
}

function getForwardedContent(message) {
  if (message.messageSnapshots?.size > 0) {
    const snapshot = message.messageSnapshots.first();
    return {
      content: snapshot.content || message.content,
      author: snapshot.author?.username || 'Unknown',
      attachments: snapshot.attachments ? [...snapshot.attachments.values()] : [],
    };
  }
  return {
    content: message.content,
    author: null,
    attachments: [...message.attachments.values()],
  };
}

// ── Main parser ─────────────────────────────────────────────────────────────

function parseMessage(content, attachments = [], message = null) {
  const urls = parseUrls(content);
  const codeBlocks = extractCodeBlocks(content);
  const parsedAttachments = parseAttachments(attachments);
  const text = cleanText(content);

  // Detect unformatted code in plain text
  if (codeBlocks.length === 0 && looksLikeCode(text) && urls.length === 0) {
    codeBlocks.push({ language: 'txt', content: text });
  }

  // Detect AI prompts
  const isPrompt = looksLikePrompt(content);

  // Detect forwarded messages
  const forwarded = message ? isForwardedMessage(message) : false;
  const forwardedData = (forwarded && message) ? getForwardedContent(message) : null;

  // Count content types
  const hasLinks = urls.length > 0;
  const hasMedia = parsedAttachments.length > 0;
  const hasCode = codeBlocks.length > 0;
  const hasText = text.length >= 10;

  // Determine content types present
  const contentTypes = [];
  if (hasLinks) contentTypes.push('links');
  if (hasMedia) contentTypes.push('media');
  if (hasCode) contentTypes.push('code');
  if (hasText) contentTypes.push('text');

  // ── Smart routing decision ──
  let route;
  if (forwarded) {
    route = 'forwarded';
  } else if (contentTypes.length >= 2) {
    // Multiple content types = mix
    route = 'mix';
  } else if (contentTypes.length === 1) {
    if (hasLinks) route = 'links';
    else if (hasMedia) route = 'media';
    else if (hasCode) route = 'code';
    else if (hasText && isPrompt) route = 'prompts';
    else if (hasText) route = 'mix'; // plain text goes to mix
  } else {
    // Edge case: nothing detected
    route = 'mix';
  }

  // Override: if it's text + links but the text IS a prompt with reference links
  if (isPrompt && !hasMedia && !hasCode && contentTypes.length <= 2) {
    route = 'prompts';
  }

  return {
    urls,
    text,
    codeBlocks,
    attachments: parsedAttachments,
    contentTypes,
    route,
    isPrompt,
    forwarded,
    forwardedData,
    raw: content,
  };
}

module.exports = { parseMessage, isForwardedMessage, getForwardedContent };
