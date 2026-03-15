'use strict';

const API_BASE  = 'https://v2ffgtoy92.execute-api.eu-north-1.amazonaws.com/prod';
const TOKEN_KEY = 'glaciopia_token';

const Api = (() => {
  function getToken()  { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const r    = await fetch(API_BASE + path, opts);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function uploadFile(file, folder) {
    const ext  = file.name.split('.').pop().toLowerCase();
    const mime = file.type || 'application/octet-stream';
    const { url, publicUrl } = await request('POST', '/upload/presign', {
      folder,
      ext,
      contentType: mime,
    });
    const res = await fetch(url, {
      method:  'PUT',
      headers: { 'Content-Type': mime },
      body:    file,
    });
    if (!res.ok) throw new Error('Upload S3 fallito');
    return publicUrl;
  }

  return {
    getToken,
    setToken,

    auth: {
      register: (username, email, password) =>
        request('POST', '/auth/register', { username, email, password }),
      login: (email, password) =>
        request('POST', '/auth/login', { email, password }),
    },

    save: {
      get:    ()                                          => request('GET',    '/save'),
      put:    (saveData, points, prestige, xpLevel, optIn, research, totalTimeSec) => request('PUT', '/save', { save_data: saveData, points, prestige, xp_level: xpLevel, opt_in: optIn ?? false, research: research ?? 0, total_time_sec: totalTimeSec ?? 0 }),
      delete: ()                                          => request('DELETE', '/save'),
    },

    leaderboard: {
      get: () => request('GET', '/leaderboard'),
    },

    submit: {
      post: (type, payload, imageUrl) =>
        request('POST', '/submit', { type, payload, image_url: imageUrl }),
    },

    upload: {
      file: uploadFile,
    },
  };
})();