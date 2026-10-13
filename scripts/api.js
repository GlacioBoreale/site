'use strict';

const API_BASE  = 'https://glaciopia-api.coldesticecube.workers.dev';
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
    const isAuthEndpoint = path.startsWith('/auth/');
    if (r.status === 401 && token && !isAuthEndpoint) {
      Api.setToken(null);
      if (typeof Auth !== 'undefined') Auth.logout();
    }
    if (!r.ok) {
      const err = new Error(data.error || 'Request failed');
      err.data = data;
      err.status = r.status;
      if (data.needs_verification) err.needs_verification = true;
      throw err;
    }
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
      verify: (email, code) =>
        request('POST', '/auth/verify', { email, code }),
      resend: (email) =>
        request('POST', '/auth/resend', { email }),
      forgot: (email) =>
        request('POST', '/auth/forgot', { email }),
      reset: (email, code, password) =>
        request('POST', '/auth/reset', { email, code, password }),
    },

    save: {
      get:    () => request('GET', '/save'),
      put:    (saveData, points, prestige, xpLevel, optIn, research, totalTimeSec) =>
        request('PUT', '/save', { save_data: saveData, points, prestige, xp_level: xpLevel, opt_in: optIn ?? false, research: research ?? 0, total_time_sec: totalTimeSec ?? 0 }),
      delete: () => request('DELETE', '/save'),
      ackAdmin: () => request('POST', '/save/ack-admin'),
    },

    me: {
      get:            ()                    => request('GET',   '/me'),
      update:         (data)                => request('PATCH', '/me', data),
      requestPwdCode: ()                    => request('POST',  '/me/password-code'),
      changePassword: (data)                => request('POST',  '/me/password', data),
    },

    hallOfFame: {
      get: () => request('GET', '/hall-of-fame'),
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

    team: {
      get: () => request('GET', '/team'),
    },

    repos: {
      get: () => request('GET', '/repos'),
    },

    submit: {
      post: (type, payload, imageUrl) =>
        request('POST', '/submit', { type, payload, image_url: imageUrl }),
    },

    upload: {
      file: uploadFile,
    },

    admin: {
      getStats:           ()                        => request('GET',    '/admin/stats'),
      getSubmissions:     ()                        => request('GET',    '/admin/submissions'),
      updateSubmission:   (id, status, note)        => request('PATCH',  `/admin/submissions/${id}`, { status, note }),
      editSubmission:     (id, payload, created_at) => request('PATCH',  `/admin/submissions/${id}`, { update_payload: payload, update_created_at: created_at }),
      removeImage:        (id)                      => request('PATCH',  `/admin/submissions/${id}`, { remove_image: true }),
      deleteSubmission:   (id)                      => request('DELETE', `/admin/submissions/${id}`),
      getUsers:           ()                        => request('GET',    '/admin/users'),
      deleteUser:         (id)                      => request('DELETE', `/admin/users/${id}`),
      getSaves:           ()                        => request('GET',    '/admin/saves'),
      deleteSave:         (userId)                  => request('DELETE', `/admin/saves/${userId}`),
      updateUserGame:     (userId, data)            => request('PATCH',  `/admin/saves/${userId}/game`, data),
      updateUser:         (userId, data)            => request('PATCH',  `/admin/users/${userId}`, data),
      getRepos:           ()                        => request('GET',    '/admin/repos'),
      syncRepos:          (repos)                   => request('POST',   '/admin/repos/sync', { repos }),
      setReposAutoSync:   (autoSync)                => request('PATCH',  '/admin/repos/settings', { auto_sync: autoSync }),
      updateRepo:         (id, data)                => request('PATCH',  `/admin/repos/${id}`, data),
      getHallOfFame:      ()                        => request('GET',    '/admin/hall-of-fame'),
      createHallOfFame:   (data)                    => request('POST',   '/admin/hall-of-fame', data),
      updateHallOfFame:   (id, data)                => request('PATCH',  `/admin/hall-of-fame/${id}`, data),
      deleteHallOfFame:   (id)                      => request('DELETE', `/admin/hall-of-fame/${id}`),
    },
  };
})();
