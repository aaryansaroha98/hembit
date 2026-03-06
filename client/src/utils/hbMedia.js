const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

function isLocalHost(hostname) {
  const value = String(hostname || '').toLowerCase();
  return value === 'localhost' || value === '127.0.0.1';
}

function isPrivateIp(hostname) {
  const value = String(hostname || '').trim();
  if (!value) return false;
  return (
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(value) ||
    /^169\.254\.\d{1,3}\.\d{1,3}$/.test(value) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(value)
  );
}

function applyCloudinaryCompatibility(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('res.cloudinary.com')) {
      return url;
    }

    const marker = '/upload/';
    if (!parsed.pathname.includes(marker)) {
      return url;
    }

    const [before, after] = parsed.pathname.split(marker);
    if (!after || after.startsWith('f_auto,') || after.startsWith('q_auto,') || after.startsWith('f_auto/') || after.startsWith('q_auto/')) {
      return url;
    }

    parsed.pathname = `${before}${marker}f_auto,q_auto/${after}`;
    return parsed.toString();
  } catch {
    return url;
  }
}

export function resolveStoryImageSrc(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';

  if (value.startsWith('/uploads/') || value.startsWith('uploads/')) {
    const normalizedPath = value.startsWith('/') ? value : `/${value}`;
    return `${API_ORIGIN}${normalizedPath}`;
  }

  const withProtocol = value.startsWith('//') ? `https:${value}` : value;

  try {
    const parsed = new URL(withProtocol, window.location.origin);
    const isUploadsPath = parsed.pathname.startsWith('/uploads/');

    // Rewrite unstable local/private upload URLs to the configured API origin.
    if (isUploadsPath && (isLocalHost(parsed.hostname) || isPrivateIp(parsed.hostname))) {
      return `${API_ORIGIN}${parsed.pathname}${parsed.search || ''}`;
    }

    // Keep upload assets on API origin when host differs to avoid device-specific host leaks.
    if (isUploadsPath && parsed.origin !== API_ORIGIN) {
      return `${API_ORIGIN}${parsed.pathname}${parsed.search || ''}`;
    }

    if (
      parsed.protocol === 'http:' &&
      window.location.protocol === 'https:' &&
      !isLocalHost(parsed.hostname) &&
      !isPrivateIp(parsed.hostname)
    ) {
      parsed.protocol = 'https:';
    }

    return encodeURI(applyCloudinaryCompatibility(parsed.toString()));
  } catch {
    return '';
  }
}

export function getPostImages(post) {
  const seen = new Set();
  const list = [];

  const pushUrl = (value) => {
    const url = String(value || '').trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    list.push(url);
  };

  if (Array.isArray(post?.images)) {
    post.images.forEach(pushUrl);
  }

  pushUrl(post?.image);
  return list;
}
