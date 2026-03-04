'use strict';

const { Pool }       = require('pg');
const jwt            = require('jsonwebtoken');
const bcrypt         = require('bcryptjs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');

// ─── DB ───────────────────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      { rejectUnauthorized: false },
  max:      3,
  idleTimeoutMillis: 30000,
});

// ─── S3 ───────────────────────────────────────────────────────────────────────
const s3     = new S3Client({ region: 'eu-north-1' });
const BUCKET = process.env.S3_BUCKET; // es. "glaciopia-submissions"

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = '30d';

function resp(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

function ok(body)          { return resp(200, body); }
function created(body)     { return resp(201, body); }
function badReq(msg)       { return resp(400, { error: msg }); }
function unauth(msg)       { return resp(401, { error: msg }); }
function forbidden(msg)    { return resp(403, { error: msg }); }
function notFound(msg)     { return resp(404, { error: msg }); }
function serverErr(msg)    { return resp(500, { error: msg }); }

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(event) {
  const auth = event.headers?.Authorization || event.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

function requireAuth(event) {
  const payload = verifyToken(event);
  if (!payload) throw { status: 401, message: 'Non autenticato' };
  return payload.sub;
}

function parseBody(event) {
  try { return JSON.parse(event.body || '{}'); }
  catch { return {}; }
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────
const ROUTES = {
  'POST /auth/register': authRegister,
  'POST /auth/login':    authLogin,
  'GET /save':           saveGet,
  'PUT /save':           savePut,
  'GET /leaderboard':    leaderboardGet,
  'POST /submit':        submitPost,
  'POST /upload/presign': uploadPresign,
};

exports.handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const path   = event.path || event.rawPath || '/';

  if (method === 'OPTIONS') return resp(200, {});

  const key     = `${method} ${path}`;
  const handler = ROUTES[key];
  if (!handler) return notFound(`Route ${key} non trovata`);

  try {
    return await handler(event);
  } catch (e) {
    if (e.status) return resp(e.status, { error: e.message });
    console.error(e);
    return serverErr('Errore interno');
  }
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
async function authRegister(event) {
  const { username, email, password } = parseBody(event);
  if (!username || !email || !password) return badReq('Campi mancanti');
  if (username.length < 3 || username.length > 32) return badReq('Username: 3-32 caratteri');
  if (password.length < 6) return badReq('Password troppo corta (min 6)');

  const hash = await bcrypt.hash(password, 10);
  try {
    const res = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, avatar_url, created_at`,
      [username.trim(), email.toLowerCase().trim(), hash],
    );
    const user  = res.rows[0];
    const token = signToken(user.id);
    return created({ token, user });
  } catch (e) {
    if (e.code === '23505') return badReq('Username o email già in uso');
    throw e;
  }
}

async function authLogin(event) {
  const { email, password } = parseBody(event);
  if (!email || !password) return badReq('Campi mancanti');

  const res = await pool.query(
    'SELECT id, username, email, avatar_url, created_at, password_hash FROM users WHERE email = $1',
    [email.toLowerCase().trim()],
  );
  const user = res.rows[0];
  if (!user) return unauth('Credenziali non valide');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return unauth('Credenziali non valide');

  const { password_hash, ...safeUser } = user;
  const token = signToken(user.id);
  return ok({ token, user: safeUser });
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────
async function saveGet(event) {
  const uid = requireAuth(event);
  const res = await pool.query(
    'SELECT save_data, points, prestige, xp_level, updated_at FROM game_saves WHERE user_id = $1',
    [uid],
  );
  if (!res.rows[0]) return ok({ save_data: null });
  return ok(res.rows[0]);
}

async function savePut(event) {
  const uid = requireAuth(event);
  const { save_data, points, prestige, xp_level } = parseBody(event);
  if (save_data === undefined) return badReq('save_data mancante');

  // Rispetta opt-in leaderboard: aggiorna visible solo se il flag è attivo nel save
  const leaderboardOptIn = save_data?.leaderboardOptIn === true;

  await pool.query(
    `INSERT INTO game_saves (user_id, save_data, points, prestige, xp_level, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET save_data  = EXCLUDED.save_data,
           points     = EXCLUDED.points,
           prestige   = EXCLUDED.prestige,
           xp_level   = EXCLUDED.xp_level,
           updated_at = NOW()`,
    [uid, JSON.stringify(save_data), points || 0, prestige || 0, xp_level || 0],
  );

  // Aggiorna flag visibilità leaderboard (colonna da aggiungere in game_saves)
  await pool.query(
    `UPDATE game_saves SET leaderboard_visible = $1 WHERE user_id = $2`,
    [leaderboardOptIn, uid],
  );

  return ok({ saved: true });
}

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────
// Pubblica: chiunque può vederla, solo gli opt-in appaiono.
async function leaderboardGet() {
  const res = await pool.query(
    `SELECT u.username, u.avatar_url, gs.points, gs.prestige, gs.xp_level
     FROM game_saves gs
     JOIN users u ON u.id = gs.user_id
     WHERE gs.leaderboard_visible = TRUE
     ORDER BY gs.points DESC
     LIMIT 100`,
  );
  return ok({ entries: res.rows });
}

// ─── SUBMIT ───────────────────────────────────────────────────────────────────
async function submitPost(event) {
  const uid = requireAuth(event);
  const { type, payload, image_url } = parseBody(event);

  const ALLOWED_TYPES = ['fanart', 'vtpedia'];
  if (!ALLOWED_TYPES.includes(type)) return badReq('Tipo non valido');
  if (!payload || typeof payload !== 'object') return badReq('Payload mancante');

  // Validazioni base per tipo
  if (type === 'fanart') {
    if (!payload.title || !payload.artist) return badReq('title e artist obbligatori');
  }
  if (type === 'vtpedia') {
    if (!payload.name || !payload.channel) return badReq('name e channel obbligatori');
  }

  const res = await pool.query(
    `INSERT INTO submissions (user_id, type, payload, image_url, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW())
     RETURNING id`,
    [uid, type, JSON.stringify(payload), image_url || null],
  );
  return created({ id: res.rows[0].id, status: 'pending' });
}

// ─── UPLOAD PRESIGN ───────────────────────────────────────────────────────────
async function uploadPresign(event) {
  requireAuth(event); // solo utenti loggati
  const { folder, ext, contentType } = parseBody(event);

  const ALLOWED_FOLDERS = ['fanart', 'vtpedia'];
  const ALLOWED_EXTS    = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  if (!ALLOWED_FOLDERS.includes(folder)) return badReq('Folder non valida');
  if (!ALLOWED_EXTS.includes((ext || '').toLowerCase())) return badReq('Estensione non supportata');

  const key = `submissions/${folder}/${randomUUID()}.${ext.toLowerCase()}`;
  const cmd = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    ContentType: contentType || 'application/octet-stream',
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5 min
  const publicUrl = `https://${BUCKET}.s3.eu-north-1.amazonaws.com/${key}`;
  return ok({ url, publicUrl });
}