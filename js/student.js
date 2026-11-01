/**
 * Dynamic Student Notes Interface
 * Automatically fetches and displays all uploaded chapters (1, 2, 3, 4, 5, 6...)
 * and Question files directly from Supabase Storage.
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const configAlert = document.getElementById("config-alert");
  const openConfigBtn = document.getElementById("open-config-btn");
  const configModal = document.getElementById("config-modal");
  const closeConfigBtn = document.getElementById("close-config-btn");
  const configForm = document.getElementById("config-form");
  const configUrlInput = document.getElementById("config-supabase-url");
  const configKeyInput = document.getElementById("config-supabase-key");

  const searchInput = document.getElementById("search-input");
  const filterTabs = document.querySelectorAll(".filter-tab");
  const materialsContainer = document.getElementById("materials-container");
  const materialsLoading = document.getElementById("materials-loading");
  const materialsEmpty = document.getElementById("materials-empty");
  const materialsCountBadge = document.getElementById("materials-count-badge");

  // Reader View Elements
  const readerView = document.getElementById("reader-view");
  const readerIframe = document.getElementById("reader-iframe");
  const readerTitle = document.getElementById("reader-title");
  const readerLoading = document.getElementById("reader-loading");
  const readerError = document.getElementById("reader-error");
  const readerErrorMsg = document.getElementById("reader-error-message");
  const backBtn = document.getElementById("back-btn");
  const reloadBtn = document.getElementById("reload-btn");
  const fullscreenBtn = document.getElementById("fullscreen-btn");
  const retryBtn = document.getElementById("retry-load-btn");

  let allFiles = [];
  let currentFilter = "all"; // 'all', 'chapter', 'questions'
  let currentActiveFile = null;

  // Initialize UI & load materials
  init();

  function init() {
    setupConfigModal();
    checkConfiguration();
    setupEventListeners();
  }

  function checkConfiguration() {
    if (!window.AppConfig.isConfigured()) {
      if (configAlert) configAlert.style.display = "flex";
      if (materialsLoading) materialsLoading.style.display = "none";
      if (materialsEmpty) {
        materialsEmpty.style.display = "block";
        materialsEmpty.querySelector(".state-title").textContent = "Supabase Connection Required";
        materialsEmpty.querySelector(".state-desc").textContent = 
          "Please connect your Supabase project using the button above to load your uploaded study notes and questions.";
      }
      return false;
    }

    if (configAlert) configAlert.style.display = "none";
    loadMaterialsFromStorage();
    return true;
  }

  /**
   * Fetch all files from Supabase Storage bucket 'chapter-files'
   */
  async function loadMaterialsFromStorage() {
    if (materialsLoading) materialsLoading.style.display = "flex";
    if (materialsEmpty) materialsEmpty.style.display = "none";
    if (materialsContainer) materialsContainer.innerHTML = "";

    const { data, error } = await window.AppConfig.listAllNotesFiles();

    if (materialsLoading) materialsLoading.style.display = "none";

    if (error) {
      console.error("Storage list error:", error);
      if (materialsEmpty) {
        materialsEmpty.style.display = "block";
        materialsEmpty.querySelector(".state-title").textContent = "Unable to Load Notes";
        materialsEmpty.querySelector(".state-desc").textContent = `Error: ${error}. Please ensure the 'chapter-files' bucket is public.`;
      }
      return;
    }

    allFiles = data || [];

    if (allFiles.length === 0) {
      if (materialsEmpty) {
        materialsEmpty.style.display = "block";
        materialsEmpty.querySelector(".state-title").textContent = "No Notes Uploaded Yet";
        materialsEmpty.querySelector(".state-desc").textContent = 
          "The instructor has not published any study notes or questions yet. Log in to the Admin Portal to upload your HTML files.";
      }
      updateCounts(0, 0, 0);
      return;
    }

    // Sort files logically: chapter-1, chapter-2, ... then questions
    allFiles.sort((a, b) => {
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    });

    renderMaterialsGrid();

    // Check if URL has ?read=fileName to auto-open
    const urlParams = new URLSearchParams(window.location.search);
    const autoFile = urlParams.get("read");
    if (autoFile) {
      const match = allFiles.find(f => f.name.toLowerCase() === autoFile.toLowerCase()) || { name: autoFile };
      const title = window.AppConfig.formatMaterialTitle(match.name);
      openReader(match.name, title);
    }
  }

  /**
   * Render cards for all matching files
   */
  function renderMaterialsGrid() {
    if (!materialsContainer) return;
    materialsContainer.innerHTML = "";

    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

    // Count totals
    let chapterCount = 0;
    let questionsCount = 0;

    allFiles.forEach(file => {
      const cat = window.AppConfig.getMaterialCategory(file.name);
      if (cat === "questions") questionsCount++;
      else chapterCount++;
    });

    updateCounts(allFiles.length, chapterCount, questionsCount);

    // Filter files
    const filtered = allFiles.filter(file => {
      const category = window.AppConfig.getMaterialCategory(file.name);
      const title = window.AppConfig.formatMaterialTitle(file.name).toLowerCase();
      const fileNameLower = file.name.toLowerCase();

      // Category filter
      if (currentFilter !== "all" && category !== currentFilter) {
        return false;
      }

      // Search query filter
      if (query && !title.includes(query) && !fileNameLower.includes(query)) {
        return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      if (materialsEmpty) {
        materialsEmpty.style.display = "block";
        materialsEmpty.querySelector(".state-title").textContent = "No Matching Materials";
        materialsEmpty.querySelector(".state-desc").textContent = "Try searching with different keywords or switch filters.";
      }
      return;
    }

    if (materialsEmpty) materialsEmpty.style.display = "none";

    // Generate Cards
    filtered.forEach(file => {
      const card = createMaterialCard(file);
      materialsContainer.appendChild(card);
    });
  }

  /**
   * Create an attractive card for a study material file
   */
  function createMaterialCard(file) {
    const isQuestion = window.AppConfig.getMaterialCategory(file.name) === "questions";
    const title = window.AppConfig.formatMaterialTitle(file.name);
    const formattedSize = file.metadata ? formatBytes(file.metadata.size) : "";
    const updatedTime = file.updated_at ? formatDate(file.updated_at) : "Recently published";

    const card = document.createElement("article");
    card.className = "chapter-card";

    card.innerHTML = `
      <div class="chapter-header">
        <span class="chapter-badge" style="${isQuestion ? 'background: #fef3c7; color: #92400e;' : ''}">
          ${isQuestion ? '❓ Practice Questions' : '📖 Study Notes'}
        </span>
        <span class="chapter-tag">${file.name}</span>
      </div>

      <h3 class="chapter-title">${escapeHtml(title)}</h3>
      
      <p class="chapter-description">
        ${isQuestion 
          ? 'Comprehensive practice exercises, model questions, and conceptual self-check answers.'
          : 'Interactive academic chapter notes with bilingual explanations, diagrams, and popups.'
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
          Updated: ${updatedTime}
        </span>
        ${formattedSize ? `
        <span class="feature-pill">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          ${formattedSize}
        </span>` : ''}
      </div>

      <div class="card-footer">
        <div style="font-size: 0.8rem; color: var(--text-muted);">
          Format: <strong>HTML Interactive</strong>
        </div>
        <button class="btn btn-primary open-reader-btn" data-file="${escapeHtml(file.name)}" data-title="${escapeHtml(title)}">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Read Document
        </button>
      </div>
    `;

    // Button event listener
    const btn = card.querySelector(".open-reader-btn");
    btn.addEventListener("click", () => {
      openReader(file.name, title);
    });

    return card;
  }

  function updateCounts(total, chapters, questions) {
    if (materialsCountBadge) {
      materialsCountBadge.textContent = `${total} Document${total === 1 ? '' : 's'} Available`;
    }

    const tabAll = document.querySelector('[data-filter="all"]');
    const tabCh = document.querySelector('[data-filter="chapter"]');
    const tabQ = document.querySelector('[data-filter="questions"]');

    if (tabAll) tabAll.textContent = `All Materials (${total})`;
    if (tabCh) tabCh.textContent = `Course Chapters (${chapters})`;
    if (tabQ) tabQ.textContent = `Questions & Exams (${questions})`;
  }

  /**
   * Open the Fullscreen / Embedded Reader for a specific file
   */
  function openReader(fileName, title) {
    currentActiveFile = fileName;
    if (readerTitle) readerTitle.textContent = title || fileName;

    readerView.classList.add("active");
    document.body.style.overflow = "hidden";

    loadIframeContent(fileName);
  }

  /**
   * Fetch and render the HTML notes using srcdoc
   * Supabase Storage serves HTML files with Content-Type: text/plain to prevent XSS.
   * By fetching the text and injecting it via srcdoc (or Blob URL), the browser is
   * forced to parse and render it as a full, rich HTML document with all styles,
   * scripts, and Amharic translation popups intact.
   */
  async function loadIframeContent(fileName) {
    showReaderLoading();

    const publicUrl = window.AppConfig.getNotesPublicUrl(fileName);
    if (!publicUrl) {
      showReaderError("Could not resolve document URL", "Please verify your Supabase Storage configuration.");
      return;
    }

    try {
      // 1. Fetch raw HTML document from Supabase Storage
      const response = await fetch(publicUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load file (HTTP ${response.status}: ${response.statusText})`);
      }

      const htmlContent = await response.text();

      if (!htmlContent || htmlContent.trim().length === 0) {
        throw new Error("The retrieved file is empty.");
      }

      // 2. Render as rich HTML inside the sandboxed iframe using srcdoc
      readerIframe.removeAttribute("src");
      readerIframe.srcdoc = htmlContent;

      // Handle load event
      readerIframe.onload = () => {
        hideReaderLoading();
      };

      // Safety timeout to dismiss spinner once document is parsed
      setTimeout(() => {
        hideReaderLoading();
      }, 400);

    } catch (err) {
      console.warn("srcdoc fetch failed, attempting Blob URL fallback:", err);

      try {
        // Fallback: Create a Blob with explicit text/html MIME type
        const res = await fetch(publicUrl);
        const text = await res.text();
        const blob = new Blob([text], { type: "text/html;charset=utf-8" });
        const blobUrl = URL.createObjectURL(blob);
        readerIframe.removeAttribute("srcdoc");
        readerIframe.src = blobUrl;
        hideReaderLoading();
      } catch (fallbackErr) {
        console.error("All rendering attempts failed:", fallbackErr);
        showReaderError(
          "Failed to render document",
          `Could not render "${fileName}". Error: ${err.message}. Please check your network connection.`
        );
      }
    }
  }

  function closeReader() {
    readerView.classList.remove("active");
    document.body.style.overflow = "";
    readerIframe.removeAttribute("srcdoc");
    readerIframe.src = "about:blank";
    currentActiveFile = null;

    // Clean up ?read= query parameter if present
    if (window.location.search.includes("read=")) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }

  function reloadActiveFile() {
    if (currentActiveFile) {
      loadIframeContent(currentActiveFile);
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      readerView.requestFullscreen().catch(err => console.warn(err));
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

  function setupEventListeners() {
    // Search input
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        renderMaterialsGrid();
      });
    }

    // Filter tabs
    filterTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        filterTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentFilter = tab.getAttribute("data-filter") || "all";
        renderMaterialsGrid();
      });
    });

    // Reader buttons
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

  /**
   * Supabase Connection Settings Modal Setup
   */
  function setupConfigModal() {
    const creds = window.AppConfig.getActiveCredentials();
    if (configUrlInput) configUrlInput.value = creds.url || "";
    if (configKeyInput) configKeyInput.value = creds.key || "";

    if (openConfigBtn) {
      openConfigBtn.addEventListener("click", () => {
        configModal.style.display = "flex";
      });
    }

    if (closeConfigBtn) {
      closeConfigBtn.addEventListener("click", () => {
        configModal.style.display = "none";
      });
    }

    if (configForm) {
      configForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const url = configUrlInput.value.trim();
        const key = configKeyInput.value.trim();

        if (!url || !key) {
          alert("Please enter both the Supabase URL and the Anon Key.");
          return;
        }

        window.AppConfig.saveCredentials(url, key);
        configModal.style.display = "none";
        checkConfiguration();
      });
    }
  }

  // Utilities
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
