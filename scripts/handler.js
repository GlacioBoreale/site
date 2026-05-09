import pg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      { rejectUnauthorized: false }
});

const JWT_SECRET  = process.env.JWT_SECRET;
const ADMIN_EMAIL = 'coldesticecube@outlook.com';

const ALLOWED_ORIGINS = [
  'https://www.glaciopia.com',
  'https://glaciopia.com',
];

const FOLDER_BUCKET_MAP = {
  fanart:  'glaciopia-fanart',
  vtubers: 'glaciopia-vtubers',
  team:    'glaciopia-images',
};

function getCorsHeaders(event) {
  const origin  = event.headers?.origin || event.headers?.Origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Content-Type':                    'application/json',
    'Access-Control-Allow-Origin':     allowed,
    'Access-Control-Allow-Headers':    'Content-Type,Authorization',
    'Access-Control-Allow-Methods':    'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    'Access-Control-Allow-Credentials':'true',
  };
}

function res(statusCode, body, event) {
  return { statusCode, headers: getCorsHeaders(event || {}), body: JSON.stringify(body) };
}

function getPathAndMethod(event) {
  const path   = event.rawPath   || event.path   || '';
  const method = event.requestContext?.http?.method || event.httpMethod || '';
  return { path, method };
}

function authMiddleware(event) {
  const auth = event.headers?.Authorization || event.headers?.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try   { return jwt.verify(auth.slice(7), JWT_SECRET); }
  catch { return null; }
}

function requireAdmin(event) {
  const user = authMiddleware(event);
  if (!user)                      return { error: 'Unauthorized', status: 401 };
  if (user.email !== ADMIN_EMAIL) return { error: 'Forbidden',    status: 403 };
  return { user };
}

function parseTags(raw) {
  if (!raw) return ['untagged'];
  const tags = String(raw)
    .split(';')
    .map(t => t.trim().toLowerCase().replace(/[^a-z0-9àèéìòùa-z\s\-]/gi, '').trim())
    .filter(Boolean);
  return tags.length ? tags : ['untagged'];
}

export const handler = async (event) => {
  const { path, method } = getPathAndMethod(event);

  console.log('DEBUG', JSON.stringify({ path, method, rawPath: event.rawPath, httpMethod: event.httpMethod, ctxMethod: event.requestContext?.http?.method }));

  if (method === 'OPTIONS') return res(200, {}, event);

  const body = event.body
    ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body)
    : {};

  if (body.action === 'init_db') {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username      VARCHAR(32) UNIQUE NOT NULL,
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_url    TEXT,
        created_at    TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS game_saves (
        user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        save_data      JSONB,
        points         NUMERIC DEFAULT 0,
        prestige       NUMERIC DEFAULT 0,
        xp_level       INT DEFAULT 0,
        research       NUMERIC DEFAULT 0,
        total_time_sec NUMERIC DEFAULT 0,
        opt_in         BOOLEAN DEFAULT FALSE,
        updated_at     TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS submissions (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
        type       VARCHAR(20) NOT NULL,
        payload    JSONB,
        image_url  TEXT,
        status     VARCHAR(10) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS fanart_tags (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       VARCHAR(60) UNIQUE NOT NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      INSERT INTO fanart_tags (name) VALUES ('untagged') ON CONFLICT DO NOTHING;
    `);
    return res(200, { message: 'Tables created!' }, event);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fanart_tags (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       VARCHAR(60) UNIQUE NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    INSERT INTO fanart_tags (name) VALUES ('untagged') ON CONFLICT DO NOTHING;
  `);

  if (path.endsWith('/auth/register') && method === 'POST') {
    const { username, email, password } = body;
    if (!username || !email || !password)
      return res(400, { error: 'Missing fields' }, event);
    const hash = await bcrypt.hash(password, 10);
    try {
      const r = await pool.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1,$2,$3) RETURNING id, username, email, created_at',
        [username, email, hash]
      );
      const user  = r.rows[0];
      const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      return res(201, { token, user }, event);
    } catch (e) {
      if (e.code === '23505') return res(409, { error: 'Username or email already exists' }, event);
      return res(500, { error: e.message }, event);
    }
  }

  if (path.endsWith('/auth/login') && method === 'POST') {
    const { email, password } = body;
    if (!email || !password) return res(400, { error: 'Missing fields' }, event);
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = r.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res(401, { error: 'Invalid credentials' }, event);
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    return res(200, { token, user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url, created_at: user.created_at } }, event);
  }

  if (path.endsWith('/save') && method === 'GET') {
    const user = authMiddleware(event);
    if (!user) return res(401, { error: 'Unauthorized' }, event);
    const r = await pool.query('SELECT * FROM game_saves WHERE user_id=$1', [user.id]);
    return res(200, r.rows[0] || {}, event);
  }

  if (path.endsWith('/save') && method === 'PUT') {
    const user = authMiddleware(event);
    if (!user) return res(401, { error: 'Unauthorized' }, event);
    try {
      const { save_data, points, prestige, xp_level, opt_in, research, total_time_sec } = body;
      await pool.query(`ALTER TABLE game_saves ALTER COLUMN prestige TYPE NUMERIC`);
      await pool.query(`ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS research       NUMERIC  DEFAULT 0`);
      await pool.query(`ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS total_time_sec NUMERIC  DEFAULT 0`);
      await pool.query(`ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS opt_in         BOOLEAN  DEFAULT FALSE`);
      await pool.query(`
        INSERT INTO game_saves (user_id, save_data, points, prestige, xp_level, research, total_time_sec, opt_in, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET save_data=$2, points=$3, prestige=$4, xp_level=$5, research=$6, total_time_sec=$7, opt_in=$8, updated_at=NOW()
      `, [user.id, save_data, points||0, prestige||0, xp_level||0, research||0, total_time_sec||0, opt_in??false]);
      return res(200, { message: 'Saved' }, event);
    } catch(e) {
      console.error('PUT /save error:', e.message, e.stack);
      return res(500, { error: e.message }, event);
    }
  }

  if (path.endsWith('/save') && method === 'DELETE') {
    const user = authMiddleware(event);
    if (!user) return res(401, { error: 'Unauthorized' }, event);
    await pool.query('DELETE FROM game_saves WHERE user_id=$1', [user.id]);
    return res(200, { message: 'Save deleted' }, event);
  }

  if (path.endsWith('/leaderboard') && method === 'GET') {
    await pool.query(`
      ALTER TABLE game_saves
        ADD COLUMN IF NOT EXISTS opt_in         BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS research       NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_time_sec NUMERIC DEFAULT 0
    `);
    const base = `
      SELECT u.username, s.points, s.prestige, s.xp_level, s.research, s.total_time_sec
      FROM game_saves s JOIN users u ON s.user_id = u.id
      WHERE s.opt_in = TRUE
    `;
    const [rPts, rPres, rXp, rRes, rTime] = await Promise.all([
      pool.query(base + ' ORDER BY s.points          DESC LIMIT 100'),
      pool.query(base + ' ORDER BY s.prestige        DESC LIMIT 100'),
      pool.query(base + ' ORDER BY s.xp_level        DESC LIMIT 100'),
      pool.query(base + ' ORDER BY s.research        DESC LIMIT 100'),
      pool.query(base + ' ORDER BY s.total_time_sec  DESC LIMIT 100'),
    ]);
    return res(200, {
      leaderboard: {
        points:         rPts.rows,
        prestige:       rPres.rows,
        xp_level:       rXp.rows,
        research:       rRes.rows,
        total_time_sec: rTime.rows,
      }
    }, event);
  }

  if (path.endsWith('/tags/fanart') && method === 'GET') {
    const r = await pool.query(
      "SELECT name FROM fanart_tags ORDER BY name = 'untagged' DESC, name ASC"
    );
    return res(200, { tags: r.rows.map(r => r.name) }, event);
  }

  if (path.endsWith('/submit') && method === 'POST') {
    const user = authMiddleware(event);
    if (!user) return res(401, { error: 'Unauthorized' }, event);
    const { type, payload, image_url } = body;
    const ALLOWED_TYPES = ['fanart', 'vtuber', 'team', 'tag'];
    if (!ALLOWED_TYPES.includes(type)) return res(400, { error: 'Tipo non valido' }, event);
    if (!payload || typeof payload !== 'object') return res(400, { error: 'Payload mancante' }, event);
    if (type === 'fanart') {
      if (!payload.title || !payload.artist) return res(400, { error: 'title e artist obbligatori' }, event);
      payload.tags = parseTags(payload.tags_raw || '');
      delete payload.tags_raw;
    }
    if (type === 'vtuber' && (!payload.name   || !payload.channel)) return res(400, { error: 'name e channel obbligatori' }, event);
    if (type === 'team'   && (!payload.name   || !payload.email))   return res(400, { error: 'name e email obbligatori' }, event);
    if (type === 'tag') {
      if (!payload.name) return res(400, { error: 'name obbligatorio' }, event);
      const exists = await pool.query('SELECT id FROM fanart_tags WHERE name=$1', [payload.name.toLowerCase().trim()]);
      if (exists.rows.length) return res(409, { error: 'Tag già esistente' }, event);
    }
    await pool.query(
      'INSERT INTO submissions (user_id, type, payload, image_url) VALUES ($1,$2,$3,$4)',
      [user.id, type, payload, image_url || null]
    );
    return res(201, { message: 'Submission received' }, event);
  }

  if (path.endsWith('/upload/presign') && method === 'POST') {
    const user = authMiddleware(event);
    if (!user) return res(401, { error: 'Unauthorized' }, event);
    const { folder, ext, contentType } = body;
    const ALLOWED_FOLDERS = ['fanart', 'vtubers', 'team'];
    const ALLOWED_EXTS    = ['jpg','jpeg','png','gif','webp'];
    if (!ALLOWED_FOLDERS.includes(folder))               return res(400, { error: 'Folder non valida' }, event);
    if (!ALLOWED_EXTS.includes((ext||'').toLowerCase())) return res(400, { error: 'Estensione non supportata' }, event);
    const bucket = FOLDER_BUCKET_MAP[folder];
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl }               = await import('@aws-sdk/s3-request-presigner');
    const { randomUUID }                 = await import('crypto');
    const s3  = new S3Client({ region: 'eu-north-1' });
    const key = `${randomUUID()}.${ext.toLowerCase()}`;
    const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType || 'application/octet-stream' });
    const url       = await getSignedUrl(s3, cmd, { expiresIn: 300 });
    const publicUrl = `https://${bucket}.s3.eu-north-1.amazonaws.com/${key}`;
    return res(200, { url, publicUrl }, event);
  }

  if (path.endsWith('/admin/stats') && method === 'GET') {
    const { error, status } = requireAdmin(event);
    if (error) return res(status, { error }, event);
    const [users, saves, subs, subByType, subByStatus] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM game_saves'),
      pool.query('SELECT COUNT(*) FROM submissions'),
      pool.query('SELECT type, COUNT(*) FROM submissions GROUP BY type'),
      pool.query('SELECT status, COUNT(*) FROM submissions GROUP BY status'),
    ]);
    return res(200, {
      users:       parseInt(users.rows[0].count),
      saves:       parseInt(saves.rows[0].count),
      submissions: parseInt(subs.rows[0].count),
      by_type:     Object.fromEntries(subByType.rows.map(r   => [r.type,   parseInt(r.count)])),
      by_status:   Object.fromEntries(subByStatus.rows.map(r => [r.status, parseInt(r.count)])),
    }, event);
  }

  if (path.endsWith('/admin/submissions') && method === 'GET') {
    const { error, status } = requireAdmin(event);
    if (error) return res(status, { error }, event);
    const r = await pool.query(`
      SELECT s.*, u.username, u.email AS user_email
      FROM submissions s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    return res(200, { submissions: r.rows }, event);
  }

  if (path.match(/\/admin\/submissions\/[^/]+$/) && method === 'PATCH') {
    const { error, status } = requireAdmin(event);
    if (error) return res(status, { error }, event);
    const id = path.split('/').pop();
    const { status: newStatus, note } = body;
    if (!['pending','approved','rejected'].includes(newStatus))
      return res(400, { error: 'Status non valido' }, event);
    if (note !== undefined) {
      await pool.query(
        `UPDATE submissions SET status=$1, payload = payload || jsonb_build_object('admin_note', $3::text) WHERE id=$2`,
        [newStatus, id, note]
      );
    } else {
      await pool.query('UPDATE submissions SET status=$1 WHERE id=$2', [newStatus, id]);
    }
    if (newStatus === 'approved') {
      const sub = await pool.query('SELECT type, payload, user_id FROM submissions WHERE id=$1', [id]);
      const s = sub.rows[0];
      if (s?.type === 'tag' && s.payload?.name) {
        await pool.query(
          'INSERT INTO fanart_tags (name, created_by) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING',
          [s.payload.name.toLowerCase().trim(), s.user_id || null]
        );
      }
    }
    return res(200, { ok: true }, event);
  }

  if (path.match(/\/admin\/submissions\/[^/]+$/) && method === 'DELETE') {
    const { error, status } = requireAdmin(event);
    if (error) return res(status, { error }, event);
    await pool.query('DELETE FROM submissions WHERE id=$1', [path.split('/').pop()]);
    return res(200, { ok: true }, event);
  }

  if (path.endsWith('/admin/users') && method === 'GET') {
    const { error, status } = requireAdmin(event);
    if (error) return res(status, { error }, event);
    const r = await pool.query(`
      SELECT u.id, u.username, u.email, u.created_at,
             gs.points, gs.prestige, gs.xp_level, gs.research,
             gs.total_time_sec, gs.opt_in, gs.updated_at AS last_save
      FROM users u
      LEFT JOIN game_saves gs ON gs.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    return res(200, { users: r.rows }, event);
  }

  if (path.match(/\/admin\/users\/[^/]+$/) && method === 'DELETE') {
    const { error, status } = requireAdmin(event);
    if (error) return res(status, { error }, event);
    await pool.query('DELETE FROM users WHERE id=$1', [path.split('/').pop()]);
    return res(200, { ok: true }, event);
  }

  if (path.endsWith('/admin/saves') && method === 'GET') {
    const { error, status } = requireAdmin(event);
    if (error) return res(status, { error }, event);
    const r = await pool.query(`
      SELECT gs.*, u.username, u.email
      FROM game_saves gs
      JOIN users u ON gs.user_id = u.id
      ORDER BY gs.updated_at DESC
    `);
    return res(200, { saves: r.rows }, event);
  }

  if (path.match(/\/admin\/saves\/[^/]+$/) && method === 'DELETE') {
    const { error, status } = requireAdmin(event);
    if (error) return res(status, { error }, event);
    await pool.query('DELETE FROM game_saves WHERE user_id=$1', [path.split('/').pop()]);
    return res(200, { ok: true }, event);
  }

  return res(404, { error: 'Not found', debug: { path, method } }, event);
};
