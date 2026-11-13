/**
 * Dynamic Student Notes & Materials Engine
 * Freshman Ethiopia Educational Platform
 * Organizes materials hierarchically by Subject -> Chapters & Questions
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements - Search & Filters
  const searchInput = document.getElementById("search-input");
  const streamFilterBtns = document.querySelectorAll(".stream-filter-btn");
  const filterTabs = document.querySelectorAll(".filter-tab");
  const hierarchicalContainer = document.getElementById("hierarchical-materials-container");
  const materialsLoading = document.getElementById("materials-loading");
  const materialsEmpty = document.getElementById("materials-empty");
  const materialsCountBadge = document.getElementById("materials-count-badge");

  // Reader View Elements
  const readerView = document.getElementById("reader-view");
  const readerIframe = document.getElementById("reader-iframe");
  const readerImageContainer = document.getElementById("reader-image-container");
  const readerImage = document.getElementById("reader-image");
  const readerTitle = document.getElementById("reader-title");
  const readerLoading = document.getElementById("reader-loading");
  const readerError = document.getElementById("reader-error");
  const readerErrorMsg = document.getElementById("reader-error-message");
  const backBtn = document.getElementById("back-btn");
  const reloadBtn = document.getElementById("reload-btn");
  const fullscreenBtn = document.getElementById("fullscreen-btn");
  const retryBtn = document.getElementById("retry-load-btn");

  // State
  let allMaterials = [];
  let currentStream = "all";   // 'all', 'common', 'natural', 'social'
  let currentCategory = "all"; // 'all', 'notes', 'questions', 'exam', 'image'
  let currentActiveItem = null;

  init();

  function init() {
    setupEventListeners();
    loadMaterials();
  }

  // ============================================================================
  // 1. DATA LOADING
  // ============================================================================
  async function loadMaterials() {
    if (materialsLoading) materialsLoading.style.display = "flex";
    if (materialsEmpty) materialsEmpty.style.display = "none";
    if (hierarchicalContainer) hierarchicalContainer.innerHTML = "";

    const { data, error } = await window.AppConfig.fetchPublishedMaterials();

    if (materialsLoading) materialsLoading.style.display = "none";

    if (error) {
      console.error("Materials fetch error:", error);
      if (materialsEmpty) {
        materialsEmpty.style.display = "block";
        materialsEmpty.querySelector(".state-title").textContent = "Unable to Load Materials";
        materialsEmpty.querySelector(".state-desc").textContent = `Error: ${error}. Please verify network connection or Supabase settings.`;
      }
      return;
    }

    allMaterials = data || [];

    if (allMaterials.length === 0) {
      if (materialsEmpty) {
        materialsEmpty.style.display = "block";
        materialsEmpty.querySelector(".state-title").textContent = "No Materials Uploaded Yet";
        materialsEmpty.querySelector(".state-desc").textContent = "The instructor has not published any study notes or questions yet. Log in to the Admin Portal to upload.";
      }
      updateCounts(0);
      return;
    }

    renderHierarchicalCurriculum();

    // Check for auto-open deep link (?read=storage_path)
    const urlParams = new URLSearchParams(window.location.search);
    const autoPath = urlParams.get("read");
    if (autoPath) {
      const match = allMaterials.find((m) => m.storage_path.toLowerCase() === autoPath.toLowerCase());
      if (match) {
        openReader(match);
      } else {
        openReader({ storage_path: autoPath, title: autoPath, file_type: autoPath.endsWith(".png") || autoPath.endsWith(".jpg") ? "image" : "html" });
      }
    }
  }

  // ============================================================================
  // 2. HIERARCHICAL RENDERING (SUBJECT -> CHAPTERS & QUESTIONS)
  // ============================================================================
  function renderHierarchicalCurriculum() {
    if (!hierarchicalContainer) return;
    hierarchicalContainer.innerHTML = "";

    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

    // 1. Filter items based on active stream, category, and search query
    const filtered = allMaterials.filter((item) => {
      // Stream filter
      if (currentStream !== "all") {
        if (item.stream && item.stream !== currentStream && item.stream !== "common") {
          return false;
        }
      }

      // Category filter
      if (currentCategory !== "all") {
        if (currentCategory === "questions") {
          if (item.category !== "questions" && item.category !== "exam") return false;
        } else if (item.category !== currentCategory) {
          return false;
        }
      }

      // Search query filter (matches subject, title, filename, chapter)
      if (query) {
        const titleMatch = (item.title || "").toLowerCase().includes(query);
        const subjMatch = (item.subject || "").toLowerCase().includes(query);
        const fileMatch = (item.storage_path || item.file_name || "").toLowerCase().includes(query);
        const chapterMatch = (item.chapter_label || "").toLowerCase().includes(query) || (item.chapter ? `chapter ${item.chapter}`.includes(query) : false);

        if (!titleMatch && !subjMatch && !fileMatch && !chapterMatch) {
          return false;
        }
      }

      return true;
    });

    updateCounts(filtered.length);

    if (filtered.length === 0) {
      if (materialsEmpty) {
        materialsEmpty.style.display = "block";
        materialsEmpty.querySelector(".state-title").textContent = "No Matching Materials";
        materialsEmpty.querySelector(".state-desc").textContent = "No study notes or questions match your current search and filters. Try selecting 'All Streams' or clearing the search.";
      }
      return;
    }

    if (materialsEmpty) materialsEmpty.style.display = "none";

    // 2. Group items by Subject
    const groupedBySubject = {};
    filtered.forEach((item) => {
      const subject = item.subject || "General Academic";
      if (!groupedBySubject[subject]) {
        groupedBySubject[subject] = [];
      }
      groupedBySubject[subject].push(item);
    });

    // 3. Render Subject Sections
    const subjectNames = Object.keys(groupedBySubject).sort();

    subjectNames.forEach((subjName) => {
      const items = groupedBySubject[subjName];

      // Sort items within subject: Course Notes (Ch 1, 2, 3...) first, then Questions & Exams
      items.sort((a, b) => {
        const orderA = a.category === "notes" ? 1 : 2;
        const orderB = b.category === "notes" ? 1 : 2;
        if (orderA !== orderB) return orderA - orderB;
        if (a.chapter && b.chapter) return a.chapter - b.chapter;
        return (a.title || "").localeCompare(b.title || "");
      });

      const section = createSubjectSection(subjName, items);
      hierarchicalContainer.appendChild(section);
    });
  }

  /**
   * Create an organized Subject Section card
   */
  function createSubjectSection(subjectName, items) {
    const section = document.createElement("section");
    section.className = "subject-group-section";

    const subjectMeta = window.AppConfig.SUBJECTS_CATALOG.find((s) => s.name === subjectName) || {
      name: subjectName,
      fullTitle: subjectName,
      stream: items[0] ? items[0].stream : "common",
      color: "#0d9488",
    };

    const initial = subjectName.charAt(0);
    const streamLabel = formatStream(subjectMeta.stream);

    section.innerHTML = `
      <div class="subject-group-header">
        <div class="subject-title-area">
          <div class="subject-avatar" style="background: ${subjectMeta.color};">
            ${escapeHtml(initial)}
          </div>
          <div>
            <h3 class="subject-subgroup-title">${escapeHtml(subjectMeta.fullTitle || subjectName)}</h3>
            <div class="subject-subgroup-meta">
              <span>${items.length} Material${items.length === 1 ? '' : 's'}</span> • 
              <span class="stream-pill ${subjectMeta.stream}">${streamLabel}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="chapter-grid"></div>
    `;

    const grid = section.querySelector(".chapter-grid");
    items.forEach((item) => {
      const card = createMaterialCard(item, subjectMeta);
      grid.appendChild(card);
    });

    return section;
  }

  /**
   * Create an individual study material card
   */
  function createMaterialCard(item, subjectMeta) {
    const card = document.createElement("article");
    card.className = "chapter-card";

    const isQuestion = item.category === "questions" || item.category === "exam";
    const isImage = item.file_type === "image";
    const chapterBadgeText = item.chapter ? `Chapter ${item.chapter}` : (item.chapter_label || (isQuestion ? "Model Exam" : "Course Material"));
    const updatedStr = item.updated_at ? formatDate(item.updated_at) : "Recently";
    const sizeStr = item.file_size ? formatBytes(item.file_size) : "";

    card.innerHTML = `
      <div class="chapter-header">
        <span class="chapter-badge" style="${isQuestion ? 'background: #fef3c7; color: #92400e;' : (isImage ? 'background: #e0f2fe; color: #0369a1;' : '')}">
          ${isImage ? '🖼️ Diagram' : (isQuestion ? '❓ Questions / Exam' : '📖 Course Notes')}
        </span>
        <span class="chapter-tag">${escapeHtml(chapterBadgeText)}</span>
      </div>

      <h3 class="chapter-title">${escapeHtml(item.title || item.file_name)}</h3>
      
      <p class="chapter-description">
        ${isQuestion 
          ? 'Practice questions, conceptual model problems, and review exercises for exam preparation.'
          : (isImage 
              ? 'Educational infographic and scientific diagram supporting lecture notes.'
              : 'Interactive chapter notes with bilingual Amharic popups and structural explanations.')
        }
      </p>

      <div class="chapter-features">
        <span class="feature-pill">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          ${isQuestion ? 'Model Exam / Review' : 'Amharic Explanations'}
        </span>
        <span class="feature-pill">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ${updatedStr}
        </span>
        ${sizeStr ? `
        <span class="feature-pill">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          ${sizeStr}
        </span>` : ''}
      </div>

      <div class="card-footer">
        <div style="font-size: 0.8rem; color: var(--text-muted);">
          Format: <strong>${isImage ? 'Image Graphic' : 'Interactive HTML'}</strong>
        </div>
        <button class="btn btn-primary open-reader-btn">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          ${isImage ? 'View Diagram' : 'Read Notes'}
        </button>
      </div>
    `;

    card.querySelector(".open-reader-btn").addEventListener("click", () => {
      openReader(item);
    });

    return card;
  }

  // ============================================================================
  // 3. FULLSCREEN INTERACTIVE READER (HTML & IMAGE SUPPORT)
  // ============================================================================
  function openReader(item) {
    currentActiveItem = item;
    if (readerTitle) readerTitle.textContent = item.title || item.storage_path;

    readerView.classList.add("active");
    document.body.style.overflow = "hidden";

    loadReaderContent(item);
  }

  async function loadReaderContent(item) {
    showReaderLoading();

    const publicUrl = window.AppConfig.getNotesPublicUrl(item.storage_path);
    if (!publicUrl) {
      showReaderError("Could not resolve file URL", "Please verify your Supabase Storage configuration.");
      return;
    }

    // IMAGE RENDERER
    if (item.file_type === "image" || /\.(png|jpe?g|webp|svg)$/i.test(item.storage_path)) {
      readerIframe.style.display = "none";
      readerImageContainer.style.display = "block";
      readerImage.src = publicUrl;
      readerImage.onload = () => hideReaderLoading();
      readerImage.onerror = () => showReaderError("Image Failed to Load", "Could not fetch image from Supabase Storage.");
      return;
    }

    // HTML INTERACTIVE RENDERER (srcdoc with Blob URL fallback)
    readerImageContainer.style.display = "none";
    readerIframe.style.display = "block";

    try {
      const response = await fetch(publicUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const htmlContent = await response.text();
      if (!htmlContent || htmlContent.trim().length === 0) {
        throw new Error("The document file is empty.");
      }

      // Inject HTML into sandboxed iframe using srcdoc so interactive popups and styles run
      readerIframe.removeAttribute("src");
      readerIframe.srcdoc = htmlContent;

      readerIframe.onload = () => hideReaderLoading();
      setTimeout(() => hideReaderLoading(), 400);

    } catch (err) {
      console.warn("srcdoc fetch failed, attempting Blob URL fallback:", err);
      try {
        const res = await fetch(publicUrl);
        const text = await res.text();
        const blob = new Blob([text], { type: "text/html;charset=utf-8" });
        const blobUrl = URL.createObjectURL(blob);
        readerIframe.removeAttribute("srcdoc");
        readerIframe.src = blobUrl;
        hideReaderLoading();
      } catch (fallbackErr) {
        showReaderError("Failed to Render Document", `Could not render document. ${err.message}`);
      }
    }
  }

  function closeReader() {
    readerView.classList.remove("active");
    document.body.style.overflow = "";
    if (readerIframe) {
      readerIframe.removeAttribute("srcdoc");
      readerIframe.src = "about:blank";
    }
    if (readerImage) readerImage.src = "";
    currentActiveItem = null;

    if (window.location.search.includes("read=")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  function reloadActiveFile() {
    if (currentActiveItem) {
      loadReaderContent(currentActiveItem);
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      readerView.requestFullscreen().catch((err) => console.warn(err));
    } else {
      document.exitFullscreen();
    }
  }

  function showReaderLoading() {
    readerLoading.style.display = "flex";
    readerError.style.display = "none";
  }

  function hideReaderLoading() {
    readerLoading.style.display = "none";
    readerError.style.display = "none";
  }

  function showReaderError(title, message) {
    readerLoading.style.display = "none";
    readerError.style.display = "flex";
    const t = readerError.querySelector(".state-title");
    if (t) t.textContent = title;
    if (readerErrorMsg) readerErrorMsg.textContent = message;
  }

  // ============================================================================
  // 4. EVENT LISTENERS
  // ============================================================================
  function setupEventListeners() {
    // Search input
    if (searchInput) {
      searchInput.addEventListener("input", renderHierarchicalCurriculum);
    }

    // Stream filters
    streamFilterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        streamFilterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentStream = btn.getAttribute("data-stream") || "all";
        renderHierarchicalCurriculum();
      });
    });

    // Category tabs
    filterTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        filterTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentCategory = tab.getAttribute("data-filter") || "all";
        renderHierarchicalCurriculum();
      });
    });

    // Reader controls
    if (backBtn) backBtn.addEventListener("click", closeReader);
    if (reloadBtn) reloadBtn.addEventListener("click", reloadActiveFile);
    if (fullscreenBtn) fullscreenBtn.addEventListener("click", toggleFullscreen);
    if (retryBtn) retryBtn.addEventListener("click", reloadActiveFile);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && readerView.classList.contains("active")) {
        closeReader();
      }
    });
  }

  // ============================================================================
  // 5. UTILITIES
  // ============================================================================
  function updateCounts(total) {
    if (materialsCountBadge) {
      materialsCountBadge.textContent = `${total} Document${total === 1 ? '' : 's'} Available`;
    }
  }

  function formatStream(stream) {
    if (stream === "natural") return "Natural Science";
    if (stream === "social") return "Social Science";
    return "Common Courses";
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function formatDate(isoStr) {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "Recently";
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
