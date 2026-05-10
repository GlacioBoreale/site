'use strict';

const API_BASE  = 'https://550ens3u67.execute-api.eu-north-1.amazonaws.com/prod';
const TOKEN_KEY = 'glaciopia_token';

const Api = (() => {
  function getToken()  { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r    = await fetch(API_BASE + path, opts);
    const data = await r.json();
    if (r.status === 401 && token) {
      Api.setToken(null);
      if (typeof Auth !== 'undefined') Auth.logout();
    }
    if (!r.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function uploadFile(file, folder) {
    const ext  = file.name.split('.').pop().toLowerCase();
    const mime = file.type || 'application/octet-stream';
    const { url, publicUrl } = await request('POST', '/upload/presign', { folder, ext, contentType: mime });
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': mime }, body: file });
    if (!r.ok) throw new Error('Upload S3 fallito');
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
      get:    () => request('GET', '/save'),
      put:    (saveData, points, prestige, xpLevel, optIn, research, totalTimeSec) =>
        request('PUT', '/save', { save_data: saveData, points, prestige, xp_level: xpLevel, opt_in: optIn ?? false, research: research ?? 0, total_time_sec: totalTimeSec ?? 0 }),
      delete: () => request('DELETE', '/save'),
    },

    leaderboard: {
      get: () => request('GET', '/leaderboard'),
    },

    tags: {
      fanart: () => request('GET', '/tags/fanart'),
    },

    fanarts: {
      get: () => request('GET', '/fanarts'),
    },

    vtubers: {
      get: () => request('GET', '/vtubers'),
    },

    submit: {
      post: (type, payload, imageUrl) =>
        request('POST', '/submit', { type, payload, image_url: imageUrl }),
    },

    upload: {
      file: uploadFile,
    },

    admin: {
      getStats:         ()                 => request('GET',    '/admin/stats'),
      getSubmissions:   ()                 => request('GET',    '/admin/submissions'),
      updateSubmission: (id, status, note) => request('PATCH',  `/admin/submissions/${id}`, { status, note }),
      deleteSubmission: (id)               => request('DELETE', `/admin/submissions/${id}`),
      getUsers:         ()                 => request('GET',    '/admin/users'),
      deleteUser:       (id)               => request('DELETE', `/admin/users/${id}`),
      getSaves:         ()                 => request('GET',    '/admin/saves'),
      deleteSave:       (userId)           => request('DELETE', `/admin/saves/${userId}`),
    },
  };
})();
