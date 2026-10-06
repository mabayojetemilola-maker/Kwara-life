const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PROGRESS_DIR = path.join(DATA_DIR, 'progress');

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PROGRESS_DIR)) fs.mkdirSync(PROGRESS_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({}));

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Helpers ----------
function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function loadProgress(userId) {
  const file = path.join(PROGRESS_DIR, `${userId}.json`);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return null;
}

function saveProgress(userId, data) {
  const file = path.join(PROGRESS_DIR, `${userId}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- Auth & Progress API ----------
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const users = loadUsers();
  if (users[username.toLowerCase()]) {
    return res.status(400).json({ error: 'Username already taken' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const id = uuidv4();
  users[username.toLowerCase()] = {
    id,
    username,
    email: email || '',
    password: hashed,
    createdAt: new Date().toISOString(),
    naira: 5000, // starting virtual naira
  };
  saveUsers(users);

  // Create starter progress
  const starter = createStarterProgress(id, username);
  saveProgress(id, starter);

  res.json({ success: true, userId: id, username, naira: 5000 });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users[username.toLowerCase()];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const progress = loadProgress(user.id) || createStarterProgress(user.id, user.username);
  res.json({
    success: true,
    userId: user.id,
    username: user.username,
    naira: user.naira || progress.naira || 5000,
    progress
  });
});

app.get('/api/progress/:userId', (req, res) => {
  const progress = loadProgress(req.params.userId);
  if (!progress) return res.status(404).json({ error: 'No progress found' });
  res.json(progress);
});

app.post('/api/progress/:userId', (req, res) => {
  const { userId } = req.params;
  const data = req.body;
  if (!data) return res.status(400).json({ error: 'No data' });
  saveProgress(userId, data);

  // Also update naira in users file if present
  const users = loadUsers();
  for (const key in users) {
    if (users[key].id === userId) {
      users[key].naira = data.naira || users[key].naira;
      saveUsers(users);
      break;
    }
  }
  res.json({ success: true });
});

// Paystack webhook placeholder (you will add your secret verification later)
app.post('/api/paystack/webhook', (req, res) => {
  // IMPORTANT: Verify signature with your Paystack secret key in production
  const event = req.body;
  console.log('Paystack webhook received:', event.event);

  if (event.event === 'charge.success') {
    const { reference, amount, metadata } = event.data;
    const userId = metadata?.userId;
    const nairaToAdd = Math.floor(amount / 100); // assume 1 NGN = 1 virtual naira for simplicity, adjust as needed

    if (userId) {
      const progress = loadProgress(userId);
      if (progress) {
        progress.naira = (progress.naira || 0) + nairaToAdd;
        saveProgress(userId, progress);

        const users = loadUsers();
        for (const key in users) {
          if (users[key].id === userId) {
            users[key].naira = progress.naira;
            saveUsers(users);
            break;
          }
        }
        console.log(`Added ₦${nairaToAdd} to user ${userId}`);
      }
    }
  }
  res.sendStatus(200);
});

// Simple online count
let onlineCount = 0;

// ---------- Socket.io for chat & presence ----------
io.on('connection', (socket) => {
  onlineCount++;
  io.emit('online-count', onlineCount);

  socket.on('join-chat', (data) => {
    socket.username = data.username || 'Anonymous';
    socket.userId = data.userId;
    socket.join('global');
    io.to('global').emit('chat-message', {
      type: 'system',
      text: `${socket.username} joined Kwara Life`,
      time: new Date().toISOString()
    });
  });

  socket.on('chat-message', (msg) => {
    if (!msg.text || msg.text.trim().length === 0) return;
    const payload = {
      type: 'user',
      username: socket.username || 'Anonymous',
      text: msg.text.substring(0, 300),
      time: new Date().toISOString()
    };
    io.to('global').emit('chat-message', payload);
  });

  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    io.emit('online-count', onlineCount);
    if (socket.username) {
      io.to('global').emit('chat-message', {
        type: 'system',
        text: `${socket.username} left`,
        time: new Date().toISOString()
      });
    }
  });
});

function createStarterProgress(userId, username) {
  return {
    userId,
    username,
    createdAt: new Date().toISOString(),
    lastSaved: new Date().toISOString(),
    naira: 5000,
    day: 1,
    time: 8, // 8 AM
    needs: {
      hunger: 80,
      energy: 90,
      fun: 70,
      social: 60,
      hygiene: 85,
      bladder: 70
    },
    skills: {
      cooking: 1,
      work: 1,
      charm: 1,
      fitness: 1,
      knowledge: 1
    },
    career: null,
    careerLevel: 0,
    home: 'face-me-face-you',
    location: 'home',
    inventory: [],
    traits: [],
    relationships: {},
    history: []
  };
}

// Serve game routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/play', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

server.listen(PORT, () => {
  console.log(`Kwara Life server running on http://localhost:${PORT}`);
  console.log(`Data saved in: ${DATA_DIR}`);
});
