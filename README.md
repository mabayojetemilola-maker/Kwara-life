# Kwara Life 🇳🇬

Free multiplayer browser life-simulation set in **Kwara State, Nigeria**.  
Create a character, keep six needs alive, work real Kwara jobs, chat with other players, and top up virtual naira with Paystack.

**Live features**
- Account + **server-side progress saving**
- Six needs (hunger, energy, fun, social, hygiene, bladder)
- Kwara locations (Central Mosque, Emir’s Palace, Unilorin, Sobi Hill, Oja Oba, Owu Falls…)
- Jobs & skills
- Live global chat (Socket.io)
- Paystack top-ups (your live public key is already inserted)

---

## Quick local run

```bash
git clone https://github.com/YOUR_USERNAME/kwara-life.git
cd kwara-life
npm install
npm start
```

Open:
- Landing → http://localhost:3000  
- Play → http://localhost:3000/play

---

## Deploy to GitHub + production

### 1. Put on GitHub

1. Create a new repository on GitHub (e.g. `kwara-life`)
2. Upload / push this whole folder:

```bash
git init
git add .
git commit -m "Kwara Life v1"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kwara-life.git
git push -u origin main
```

### 2. Recommended production host (full features)

Vercel is great for static sites, but **Socket.io (live chat) + file-based saves** need a normal Node server.

**Best free options that work out of the box:**

#### Option A — Railway (easiest)
1. Go to https://railway.app → New Project → Deploy from GitHub
2. Select your `kwara-life` repo
3. Railway detects Node → click Deploy
4. After deploy, open the generated URL
5. (Optional) Add custom domain

#### Option B — Render
1. https://render.com → New → Web Service
2. Connect GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Deploy

#### Option C — Any VPS / DigitalOcean / Fly.io
Just run `npm install && npm start` (use PM2 in production).

### 3. Paystack webhook (important for top-ups)

In Paystack Dashboard → Settings → API Keys & Webhooks:

Set Webhook URL to:
```
https://YOUR-RAILWAY-OR-RENDER-URL/api/paystack/webhook
```

Your **live public key** is already in `public/js/game.js`.  
Never put your **Secret Key** in the frontend.

---

## Project structure

```
kwara-life/
├── server.js              # Express + Socket.io + auth + progress + Paystack webhook
├── package.json
├── .gitignore
├── README.md
├── data/                  # Created automatically (users + progress)
│   ├── users.json
│   └── progress/
└── public/
    ├── index.html         # Landing page
    ├── game.html          # Main game
    ├── css/style.css
    └── js/game.js         # Game logic + Paystack + chat client
```

---

## Notes

- Progress is saved on the server in the `data/` folder. Back it up.
- Chat is real-time global chat.
- Age gate: 18+ (you can enforce more strictly later).
- This is an independent project inspired by the life-sim genre and Kwara culture. Not affiliated with Lagos Life or any other game.

---

## Next upgrades you can add

- Character creation (traits, appearance)
- Location-based chat rooms
- More jobs / seasonal events
- Real database (Postgres / Mongo) instead of JSON files
- Mobile PWA

Built for the State of Harmony.
