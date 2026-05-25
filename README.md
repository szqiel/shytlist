<div align="center">
  <img src="public/logo.svg" alt="Shytlist Logo" width="120" />
  <h1>Shytlist</h1>
  <p><strong>Lazy making shotlists? Just Shytlist!</strong></p>
  <p>A high-performance, cinematic shotlist builder for DPs and Indie Filmmakers.</p>

  <p>
    <a href="https://github.com/SZQIEL/Shytlist/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-37CAFF?style=for-the-badge" alt="MIT License" />
    </a>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite" alt="Vite 6" />
    <img src="https://img.shields.io/badge/Supabase-Database-3EC78D?style=for-the-badge&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS 4" />
    <img src="https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel" alt="Vercel" />
  </p>
</div>

---

## 📽️ The Kinetic Viewfinder

Shytlist is not just another spreadsheet. It’s a sophisticated pro-tool designed to feel like an extension of your camera hardware. Built with a **Noir Cinema** aesthetic, it provides a high-contrast, visual-first workspace for fast-paced sets.

![Shytlist Hero Image](image.png)

## 🧠 Design Philosophy

Our design language is built on three core pillars:

- **The Kinetic Viewfinder** – The interface should feel like camera hardware. High performance, precision, and tactile feedback.
- **The Rarity Rule** – Neon accents (Cyan/Yellow) are used for direction, not decoration. They occupy less than 10% of the screen to guide your focus where it matters.
- **Doppelrand Architecture** – Elevated panels use nested double-borders and light refraction to simulate physical hardware plates.

## ✨ Core Features

- **⚡ Effortless Scene Management** – Automatic shot numbering and re-calculation as you move shots between scenes.
- **🎯 Cinematic Presets** – Inject common sequences (Establish, Dialogue, Macro) instantly.
- **🎨 Dual View Modes** – Toggle between a precise **Table View** and a visual **Gallery Storyboard**.
- **⏱️ Production Intelligence** – Real-time estimated runtimes based on shot metrics.
- **📄 Pro Exports** – Generate branded, landscape PDF shotlists and CSV spreadsheets.
- **🔒 Secure Collaboration** – Private project protection with Supabase Auth and SEO-aware indexing blocks.

## 🛤️ Roadmap

- [ ] **Multi-user Collaboration** – Real-time co-editing for DP/Director teams.
- [ ] **Advanced Cinematic AI** – Auto-suggest shots based on script snippets.
- [ ] **Mobile Viewfinder App** – Dedicated iOS/Android companion for field use.
- [ ] **Lighting Diagrams** – Integrated 2D overhead lighting planner.

## 🛠️ Tech Stack

- **Frontend:** React 19 (TS), Vite 6, Tailwind CSS 4
- **Animation:** Motion (Spring Physics)
- **Database:** Supabase (Auth, Postgres, Storage)
- **Icons:** Phosphor Icons
- **Deployment:** Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS)
- Supabase Account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SZQIEL/Shytlist.git
   cd Shytlist
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p>Built for the next generation of filmmakers by <a href="https://github.com/SZQIEL">SZQIEL</a>.</p>
</div>
