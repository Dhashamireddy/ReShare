# Give & Gather 🤝

> A real-time community donation platform connecting donors of **clothes, books, and food** with NGOs and individuals who need them — built for the WAP Project.

**Live Demo:** [https://give-and-gather.netlify.app](https://give-and-gather.netlify.app) *(deploy and replace this link)*  
**GitHub Repo:** [https://github.com/YOUR_USERNAME/give-gather](https://github.com/YOUR_USERNAME/give-gather)

---

## 🎯 Problem & Objective

Every day, tonnes of usable food, clothes, and books go to waste while thousands of people nearby lack access to them. Give & Gather solves this by:

- Letting **donors** post surplus items in under 2 minutes
- Letting **NGOs** post what they need and view real-time donor matches
- Enabling both sides to **message each other** and coordinate pickups
- Making the whole flow **searchable, filterable, and mobile-friendly**

---

## 👤 Users

| Role   | What they do |
|--------|-------------|
| Donor  | Browse live donations, post a donation, claim NGO requests |
| NGO    | Post requests, view donor matches, message donors, manage requests |

---

## ✅ Features (4–5 distinct pages/views)

1. **Login / Sign-up page** (`login.html`) — role selection (Donor / NGO), sign up with cloud auth
2. **Donor Home** (`index.html`) — browse donations, filter by category, search, claim, live ticker
3. **Donate modal** — post clothes/books/food with full form + cloud save
4. **NGO Dashboard** (`ngo-dashboard.html`) — 4 views: Overview, My Requests, Matches, Messages
5. **NGO Post Request modal** — submit a need with category, urgency, quantity

---

## 🛠 Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (separated files per page)
- **Backend / Auth / DB:** [Supabase](https://supabase.com) (PostgreSQL + REST API)
- **Deployment:** Netlify / GitHub Pages

---

## 📋 WAP Technical Concepts Demonstrated

| # | Concept | Where |
|---|---------|-------|
| 1 | **4–5 pages/views** | login.html, index.html, ngo-dashboard.html (4 internal views) |
| 2 | **fetch + API call** | `supabase.js` — all Supabase REST calls use `fetch()` |
| 3 | **async / await** | `app.js` → `loadDonations()`, `submitDonation()`, `submitClaim()` |
| 4 | **Error handling** | `try/catch` in every async function; graceful seed-data fallback |
| 5 | **DOM Events** | click, input, submit, keydown across all pages |
| 6 | **Higher-Order Functions** | `.map()` for rendering cards; `.filter()` for search/category; `.find()` for claim lookup |

### Bonus topics implemented
| Topic | Where |
|-------|-------|
| **Debouncing** | `app.js` → `onSearch` (350ms); `ngo-dashboard.js` → `filterReqList` (300ms) |
| **Pagination** | `app.js` → `loadMore()` — PAGE_SIZE = 6, increments on button click |

---

## 🗄 Database Schema (Supabase)

```sql
-- Run in Supabase SQL editor
-- See supabase-setup.sql for full setup
```

Tables: `profiles`, `donations`, `requests`, `messages`

---

## 🚀 Setup & Deployment

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/give-gather.git
cd give-gather
```

### 2. Set up Supabase
1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Run the SQL in `supabase-setup.sql` in the Supabase SQL Editor
4. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key

### 3. Configure keys
Open `supabase.js` and replace:
```js
const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY';
```

### 4. Deploy to Netlify (free)
1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
3. Select your repo → Deploy site
4. ✅ Done — you get a live HTTPS URL

---

## 📁 File Structure

```
give-gather/
├── index.html          # Donor home page
├── login.html          # Login / sign-up with role selection
├── ngo-dashboard.html  # Full NGO portal (4 views)
├── style.css           # All shared styles (responsive)
├── supabase.js         # Supabase client + session helpers + debounce utility
├── app.js              # Donor page logic
├── login.js            # Auth flow logic
├── ngo-dashboard.js    # NGO dashboard logic
├── supabase-setup.sql  # DB schema for Supabase
└── README.md
```

---

## 🏗 Hardest Bug Fixed

The seed-data fallback required careful detection of whether Supabase was configured without breaking the `async/await` chain. Solved by checking if `SUPABASE_URL` still contains the placeholder string — if so, skip the fetch and use local data instead. This way the app works fully offline during development without any code changes.

---

## 🔮 What I'd Build Next

- Real-time notifications using Supabase Realtime subscriptions
- Geolocation-based matching ("show donations within 5 km")
- Push notifications for NGOs when a new match appears
- Admin dashboard for impact analytics
- Image upload for donations (using Supabase Storage)

---

*Built with care in Bengaluru · Give & Gather 2026*
