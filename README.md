# Freshman Ethiopia – Smart Study Notes & Materials Platform

A modern, responsive, multi-subject academic platform engineered for Ethiopian university freshman students to read interactive course notes and review model exam questions. Powered by **HTML5, CSS3, Vanilla JavaScript**, and **Supabase (Storage, Auth & Database)** without framework bloat.

---

## 🚀 Key Upgrades & Solved Problems

### 1. Smart Subject & Chapter Identification
When uploading files like `GeographyChapter1 (2).html`, the platform's smart identification engine scans both the **filename** and **HTML content** (`<title>`, `<h1>`, headings, and subject keywords). It automatically determines:
- **Subject:** (Geography, General Psychology, Mathematics, Biology, Physics, Chemistry, Logic & Critical Thinking, Communicative English, Civics, Economics, History, Emerging Tech, etc.)
- **Chapter / Unit:** (e.g. Chapter 1, Chapter 2, ...)
- **Category:** (Course Notes, Review Questions, Model Exam, Summary, Diagrams)
- **Academic Stream:** (Natural Science, Social Science, or Common Courses)
- **Document Title:** Human-readable title suggestion.
- **Manual Correction:** The administrator can review or correct all auto-detected fields before publishing.

### 2. Multi-Format & Image Support
- Supports full **HTML / HTM** learning materials with bilingual Amharic-English translation popups, interactive scripts, and styling.
- Full **Image Support** (`.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`) for educational diagrams, charts, infographics, and mind maps.
- **Multiple File Uploads:** Drag and drop or browse several files at once. The interactive queue bar allows you to select, inspect, and configure each item individually or publish all in batch.

### 3. Live Document Preview Before Publishing
- Before publishing, inspect the exact document inside the integrated live preview viewport.
- **Interactive HTML Preview:** Sandboxed iframe renders styles, scripts, diagrams, and popups exactly as students will experience them.
- **Image Preview:** High-resolution zoomable viewer for diagrams and charts.

### 4. Hierarchical Curriculum Organization
Materials on the student portal (`index.html`) are now structured hierarchically:
```text
Freshman Ethiopia
├── Course Notes
│   ├── Geography
│   │   ├── Chapter 1: Introduction to Geography of Ethiopia
│   │   └── Chapter 2: The Geology of Ethiopia
│   ├── Mathematics
│   │   ├── Chapter 1: Propositional Logic and Set Theory
│   │   └── Chapter 2: Relations and Functions
│   └── Biology / Physics / Psychology ...
└── Questions & Exams
    ├── Geography Review Questions
    ├── Mathematics Practice Problems
    └── University Model Final Exams
```
This prevents duplicate "Chapter 1" collisions across different subjects.

---

## 📁 Project Structure

```text
OnlinelearnFreshmanethiopia/
│
├── index.html            # Dynamic student portal with hierarchical subject groups & reader
├── admin.html            # Smart Document Publisher with auto-detection, preview & library manager
│
├── css/
│   └── style.css         # Unified design system (Light palette, subject color themes, responsive reader)
│
├── js/
│   ├── .env              # Supabase project URL and anon public key
│   ├── supabase.js       # Client config, Ethiopian course knowledge base, smart detector & storage helpers
│   ├── student.js        # Dynamic curriculum grouping, stream & category filters, and modal reader
│   └── admin.js          # Queue management, auto-detection form sync, live preview & metadata editor
│
├── supabase/
│   └── schema.sql        # Database schema: study_materials metadata table, admin allow-list, & Storage RLS
│
└── README.md             # Platform guide & documentation
```

---

## 🛠️ Supabase Database & Storage Setup

Open your [Supabase Dashboard](https://supabase.com/dashboard) and run [`supabase/schema.sql`](supabase/schema.sql) in the **SQL Editor**:

1. **`public.admin_users` table**: Controls administrator authorization.
2. **`public.is_admin()` function**: Security Definer function checking active admin status.
3. **`public.study_materials` table**: Stores rich document metadata (title, subject, chapter, stream, category, storage path).
4. **`chapter-files` storage bucket**: Configured for both HTML documents and images (`.png`, `.jpg`, `.webp`) up to 30MB with public student read policies and admin write policies.

### Authorize Your Admin Email
In Supabase **SQL Editor**, run:
```sql
INSERT INTO public.admin_users (id, email, is_active)
SELECT id, email, TRUE
FROM auth.users
WHERE email = 'eexamples@gmail.com'
ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
```

---

## 📖 How to Use the Smart Publisher

1. **Log In:** Navigate to `admin.html` and sign in with your authorized admin credentials.
2. **Upload Files:** Drag and drop one or more `.html`, `.png`, `.jpg`, or `.webp` files into the dropzone.
3. **Review Auto-Detection:** The smart engine fills in the Subject, Title, Chapter, Stream, and Category. Adjust any details if needed.
4. **Inspect Live Preview:** View the interactive document or diagram in the right-hand preview panel.
5. **Publish:** Click **Publish Current Document** (or **Publish All in Queue**). The file is stored in Supabase Storage with clean upserting, and its metadata is saved to the database.
6. **Manage Library:** View all published materials in the library table below, preview them in the student reader, edit their metadata on the fly, replace files, or delete them.
