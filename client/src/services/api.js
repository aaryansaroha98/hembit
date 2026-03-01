const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export const api = {
  get: (path, token) =>
    request(path, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  post: (path, body, token) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  put: (path, body, token) =>
    request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  del: (path, token) =>
    request(path, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  uploadFile: async (file, token) => {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return request('/admin/media/upload', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, dataUrl }),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};
