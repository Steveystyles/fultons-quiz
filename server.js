const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const port = Number(process.env.PORT || 3000);
const root = __dirname;
const dataDir = path.join(root, 'data');
const dbPath = path.join(dataDir, 'fultons-quiz.sqlite');
const sessions = new Map();

const wordleAnswers = [
  'apple', 'brave', 'crane', 'delta', 'eagle', 'flame', 'grape', 'house',
  'ivory', 'joker', 'knack', 'lemon', 'mango', 'noble', 'ocean', 'piano',
  'quest', 'raven', 'solar', 'tiger', 'union', 'vivid', 'whale', 'xenon',
  'yacht', 'zebra', 'adobe', 'brick', 'charm', 'droid'
];

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wordle_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    answer TEXT NOT NULL,
    guesses TEXT NOT NULL DEFAULT '[]',
    solved INTEGER NOT NULL DEFAULT 0,
    finished INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_wordle_games_user
  ON wordle_games(user_id, created_at);
`);

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function sendJson(res, status, body) {
  send(res, status, JSON.stringify(body), mimeTypes['.json']);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100000) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, user) {
  const { hash } = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.password_hash, 'hex'));
}

function publicUser(user) {
  return { id: user.id, name: user.name };
}

function getAuthUser(req) {
  const header = req.headers.authorization || '';
  const [, token] = header.match(/^Bearer\s+(.+)$/i) || [];
  if (!token || !sessions.has(token)) {
    return null;
  }

  const userId = sessions.get(token);
  return db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId) || null;
}

function requireAuth(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    sendJson(res, 401, { error: 'Sign in to play this puzzle.' });
    return null;
  }

  return user;
}

function parseGuesses(row) {
  try {
    return JSON.parse(row.guesses || '[]');
  } catch {
    return [];
  }
}

function evaluateGuess(guess, answer) {
  const guessLetters = guess.split('');
  const answerLetters = answer.split('');
  const result = guessLetters.map((letter) => ({ letter, status: 'absent' }));
  const remaining = {};

  guessLetters.forEach((letter, index) => {
    if (letter === answerLetters[index]) {
      result[index].status = 'correct';
      answerLetters[index] = null;
      return;
    }

    remaining[answerLetters[index]] = (remaining[answerLetters[index]] || 0) + 1;
  });

  guessLetters.forEach((letter, index) => {
    if (result[index].status === 'correct') {
      return;
    }

    if (remaining[letter]) {
      result[index].status = 'present';
      remaining[letter] -= 1;
    }
  });

  return result;
}

function pickAnswer(userId) {
  const usedRows = db.prepare('SELECT DISTINCT answer FROM wordle_games WHERE user_id = ?').all(userId);
  const used = new Set(usedRows.map((row) => row.answer));
  const fresh = wordleAnswers.filter((word) => !used.has(word));
  const pool = fresh.length ? fresh : wordleAnswers;
  return pool[Math.floor(Math.random() * pool.length)];
}

function createWordleGame(userId) {
  const answer = pickAnswer(userId);
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO wordle_games (user_id, answer, guesses, created_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, answer, '[]', now);
  return db.prepare('SELECT * FROM wordle_games WHERE id = ?').get(result.lastInsertRowid);
}

function getActiveWordleGame(userId) {
  return db.prepare(`
    SELECT * FROM wordle_games
    WHERE user_id = ? AND finished = 0
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId) || createWordleGame(userId);
}

function getWordleStats(userId) {
  const rows = db.prepare(`
    SELECT answer, guesses, solved, finished, created_at, completed_at
    FROM wordle_games
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  const finished = rows.filter((row) => row.finished);
  const solved = finished.filter((row) => row.solved);
  const guessesTotal = solved.reduce((total, row) => total + parseGuesses(row).length, 0);
  const distribution = Object.fromEntries([1, 2, 3, 4, 5, 6].map((count) => [count, 0]));

  solved.forEach((row) => {
    const count = parseGuesses(row).length;
    distribution[count] = (distribution[count] || 0) + 1;
  });

  return {
    summary: {
      played: finished.length,
      found: solved.length,
      winRate: finished.length ? Math.round((solved.length / finished.length) * 100) : 0,
      averageGuesses: solved.length ? Number((guessesTotal / solved.length).toFixed(1)) : 0
    },
    distribution,
    answers: finished.slice(0, 12).map((row) => ({
      answer: row.answer.toUpperCase(),
      solved: Boolean(row.solved),
      guesses: parseGuesses(row).length,
      completedAt: row.completed_at
    }))
  };
}

function serializeWordleGame(row, includeAnswer = false) {
  const guesses = parseGuesses(row);
  return {
    id: row.id,
    guesses: guesses.map((guess) => ({
      word: guess.toUpperCase(),
      result: evaluateGuess(guess, row.answer)
    })),
    maxGuesses: 6,
    wordLength: 5,
    solved: Boolean(row.solved),
    finished: Boolean(row.finished),
    answer: includeAnswer || row.finished ? row.answer.toUpperCase() : null,
    stats: getWordleStats(row.user_id)
  };
}

async function handleAuth(req, res) {
  const body = await readBody(req);
  const name = normalizeName(body.name);
  const password = String(body.password || '');

  if (!/^[a-zA-Z0-9 _-]{2,24}$/.test(name)) {
    sendJson(res, 400, { error: 'Use a name with 2-24 letters, numbers, spaces, hyphens, or underscores.' });
    return;
  }

  if (password.length < 4) {
    sendJson(res, 400, { error: 'Password must be at least 4 characters.' });
    return;
  }

  let user = db.prepare('SELECT * FROM users WHERE name = ? COLLATE NOCASE').get(name);
  if (user) {
    if (!verifyPassword(password, user)) {
      sendJson(res, 401, { error: 'That password does not match this name.' });
      return;
    }
  } else {
    const { salt, hash } = hashPassword(password);
    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO users (name, password_hash, salt, created_at)
      VALUES (?, ?, ?, ?)
    `).run(name, hash, salt, now);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, user.id);
  sendJson(res, 200, { token, user: publicUser(user), wordleStats: getWordleStats(user.id) });
}

async function handleApi(req, res, url) {
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, { status: 'ok', app: 'fultons-quiz' });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth') {
      await handleAuth(req, res);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const header = req.headers.authorization || '';
      const [, token] = header.match(/^Bearer\s+(.+)$/i) || [];
      if (token) {
        sessions.delete(token);
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/me') {
      const user = requireAuth(req, res);
      if (!user) return;
      sendJson(res, 200, { user: publicUser(user), wordleStats: getWordleStats(user.id) });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/wordle/state') {
      const user = requireAuth(req, res);
      if (!user) return;
      sendJson(res, 200, serializeWordleGame(getActiveWordleGame(user.id)));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/wordle/stats') {
      const user = requireAuth(req, res);
      if (!user) return;
      sendJson(res, 200, getWordleStats(user.id));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/wordle/new') {
      const user = requireAuth(req, res);
      if (!user) return;
      const active = db.prepare(`
        SELECT * FROM wordle_games
        WHERE user_id = ? AND finished = 0
        ORDER BY created_at DESC
        LIMIT 1
      `).get(user.id);
      if (active) {
        sendJson(res, 409, { error: 'Finish the current word before starting another.' });
        return;
      }
      sendJson(res, 200, serializeWordleGame(createWordleGame(user.id)));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/wordle/guess') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await readBody(req);
      const guess = String(body.guess || '').trim().toLowerCase();

      if (!/^[a-z]{5}$/.test(guess)) {
        sendJson(res, 400, { error: 'Enter a five-letter word.' });
        return;
      }

      const game = getActiveWordleGame(user.id);
      if (game.finished) {
        sendJson(res, 409, { error: 'This word is already complete.', game: serializeWordleGame(game) });
        return;
      }

      const guesses = parseGuesses(game);
      guesses.push(guess);
      const solved = guess === game.answer;
      const finished = solved || guesses.length >= 6;
      const completedAt = finished ? new Date().toISOString() : null;

      db.prepare(`
        UPDATE wordle_games
        SET guesses = ?, solved = ?, finished = ?, completed_at = ?
        WHERE id = ?
      `).run(JSON.stringify(guesses), solved ? 1 : 0, finished ? 1 : 0, completedAt, game.id);

      const updated = db.prepare('SELECT * FROM wordle_games WHERE id = ?').get(game.id);
      sendJson(res, 200, serializeWordleGame(updated));
      return;
    }

    sendJson(res, 404, { error: 'API route not found.' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Server error.' });
  }
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, 'Not found');
      return;
    }

    const type = mimeTypes[path.extname(filePath)] || 'application/octet-stream';
    send(res, 200, data, type);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url);
    return;
  }

  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.resolve(root, `.${requested}`);
  const relativePath = path.relative(root, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      serveFile(res, path.join(root, 'index.html'));
      return;
    }

    serveFile(res, filePath);
  });
});

server.listen(port, () => {
  console.log(`Fulton's Quiz listening on http://127.0.0.1:${port}`);
});
