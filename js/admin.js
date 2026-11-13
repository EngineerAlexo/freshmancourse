/**
 * Smart Admin Dashboard & Document Publisher
 * Freshman Ethiopia Educational Notes Platform
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elements - Containers
  const authSection = document.getElementById("auth-section");
  const dashboardSection = document.getElementById("dashboard-section");

  // Elements - Auth
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const loginBtn = document.getElementById("login-btn");
  const authError = document.getElementById("auth-error");
  const logoutBtn = document.getElementById("logout-btn");
  const adminEmailDisplay = document.getElementById("admin-email-display");

  // Elements - Upload & Queue
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const selectFileBtn = document.getElementById("select-file-btn");
  const queueContainer = document.getElementById("queue-container");
  const fileQueueBar = document.getElementById("file-queue-bar");
  const uploadAlert = document.getElementById("upload-alert");

  // Elements - Smart Metadata Form
  const detectionBanner = document.getElementById("detection-banner");
  const detectionMessage = document.getElementById("detection-message");
  const metaTitle = document.getElementById("meta-title");
  const metaSubject = document.getElementById("meta-subject");
  const metaStream = document.getElementById("meta-stream");
  const metaCategory = document.getElementById("meta-category");
  const metaChapter = document.getElementById("meta-chapter");
  const metaStoragePath = document.getElementById("meta-storage-path");
  const autoNameBtn = document.getElementById("auto-name-btn");
  const publishCurrentBtn = document.getElementById("publish-current-btn");
  const publishAllBtn = document.getElementById("publish-all-btn");

  // Elements - Progress Bar
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");
  const progressPercent = document.getElementById("progress-percent");
  const progressText = document.getElementById("progress-text");

  // Elements - Live Preview Panel
  const previewFilenameLabel = document.getElementById("preview-filename-label");
  const previewStatusPill = document.getElementById("preview-status-pill");
  const previewEmpty = document.getElementById("preview-empty");
  const previewIframe = document.getElementById("preview-iframe");
  const previewImage = document.getElementById("preview-image");
  const previewReloadBtn = document.getElementById("preview-reload-btn");

  // Elements - Materials Table & Filters
  const tableSearchInput = document.getElementById("table-search-input");
  const tableSubjectFilter = document.getElementById("table-subject-filter");
  const tableCategoryFilter = document.getElementById("table-category-filter");
  const tableStreamFilter = document.getElementById("table-stream-filter");
  const filesTableBody = document.getElementById("files-table-body");
  const filesTableLoading = document.getElementById("files-table-loading");
  const filesTableEmpty = document.getElementById("files-table-empty");
  const refreshFilesBtn = document.getElementById("refresh-files-btn");

  // Elements - Edit Metadata Modal
  const editModal = document.getElementById("edit-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const cancelModalBtn = document.getElementById("cancel-modal-btn");
  const editMetadataForm = document.getElementById("edit-metadata-form");
  const editItemId = document.getElementById("edit-item-id");
  const editItemStoragePath = document.getElementById("edit-item-storage-path");
  const editTitle = document.getElementById("edit-title");
  const editSubject = document.getElementById("edit-subject");
  const editStream = document.getElementById("edit-stream");
  const editCategory = document.getElementById("edit-category");
  const editChapter = document.getElementById("edit-chapter");

  // State
  let uploadQueue = []; // Array of { file, textContent, previewUrl, meta, isRead }
  let activeIndex = -1;
  let allPublishedMaterials = [];
  let currentUser = null;

  init();

  function init() {
    checkAuthAndSession();
    setupEventListeners();
  }

  // ============================================================================
  // 1. AUTHENTICATION & SESSION
  // ============================================================================
  async function checkAuthAndSession() {
    if (!window.AppConfig.isConfigured()) return;
    const supabase = window.AppConfig.supabaseClient || window.AppConfig.initClient();
    if (!supabase) return;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        handleSignedOut();
        return;
      }

      if (session && session.user) {
        handleAuthenticatedUser(session.user);
      } else {
        handleSignedOut();
      }

      supabase.auth.onAuthStateChange((event, newSession) => {
        if (newSession && newSession.user) {
          handleAuthenticatedUser(newSession.user);
        } else {
          handleSignedOut();
        }
      });
    } catch (err) {
      console.error("Session verification failed:", err);
      handleSignedOut();
    }
  }

  function handleAuthenticatedUser(user) {
    currentUser = user;
    if (adminEmailDisplay) adminEmailDisplay.textContent = user.email;
    if (authSection) authSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "block";
    loadPublishedMaterials();
  }

  function handleSignedOut() {
    currentUser = null;
    if (authSection) authSection.style.display = "block";
    if (dashboardSection) dashboardSection.style.display = "none";
    clearQueue();
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAuthError();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        showAuthError("Please provide both email and password.");
        return;
      }

      loginBtn.disabled = true;
      loginBtn.innerHTML = `
        <div class="spinner" style="width: 18px; height: 18px; border-width: 2px; margin-bottom: 0;"></div>
        Signing In...
      `;

      const supabase = window.AppConfig.supabaseClient || window.AppConfig.initClient();

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          showAuthError(error.message);
        } else if (data.user) {
          handleAuthenticatedUser(data.user);
        }
      } catch (err) {
        showAuthError(err.message || "An unexpected error occurred during sign in.");
      } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = "Sign In to Admin Dashboard";
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const supabase = window.AppConfig.supabaseClient;
      if (supabase) await supabase.auth.signOut();
      handleSignedOut();
    });
  }

  // ============================================================================
  // 2. MULTI-FILE SELECTION & QUEUE
  // ============================================================================
  function setupEventListeners() {
    if (selectFileBtn && fileInput) {
      selectFileBtn.addEventListener("click", () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
          addFilesToQueue(Array.from(e.target.files));
          fileInput.value = "";
        }
      });
    }

    if (dropzone) {
      ["dragenter", "dragover"].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add("dragover");
        });
      });

      ["dragleave", "drop"].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove("dragover");
        });
      });

      dropzone.addEventListener("drop", (e) => {
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          addFilesToQueue(Array.from(e.dataTransfer.files));
        }
      });
    }

    // Auto format filename button
    if (autoNameBtn) {
      autoNameBtn.addEventListener("click", formatSuggestedFilename);
    }

    // Dynamic field change triggers
    [metaSubject, metaChapter, metaCategory].forEach((el) => {
      if (el) el.addEventListener("change", () => {
        syncFormToCurrentItem();
        formatSuggestedFilename();
      });
    });

    if (metaTitle) {
      metaTitle.addEventListener("input", syncFormToCurrentItem);
    }

    if (metaStream) {
      metaStream.addEventListener("change", syncFormToCurrentItem);
    }

    if (metaStoragePath) {
      metaStoragePath.addEventListener("input", syncFormToCurrentItem);
    }

    // Publish buttons
    if (publishCurrentBtn) {
      publishCurrentBtn.addEventListener("click", () => publishCurrentItem());
    }

    if (publishAllBtn) {
      publishAllBtn.addEventListener("click", () => publishAllInQueue());
    }

    // Table filters & search
    if (tableSearchInput) tableSearchInput.addEventListener("input", filterAndRenderTable);
    if (tableSubjectFilter) tableSubjectFilter.addEventListener("change", filterAndRenderTable);
    if (tableCategoryFilter) tableCategoryFilter.addEventListener("change", filterAndRenderTable);
    if (tableStreamFilter) tableStreamFilter.addEventListener("change", filterAndRenderTable);
    if (refreshFilesBtn) refreshFilesBtn.addEventListener("click", loadPublishedMaterials);

    // Edit Modal events
    if (closeModalBtn) closeModalBtn.addEventListener("click", closeEditModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeEditModal);
    if (editMetadataForm) editMetadataForm.addEventListener("submit", handleSaveEditedMetadata);
  }

  /**
   * Add dropped/selected files to upload queue and trigger smart reading
   */
  async function addFilesToQueue(files) {
    clearUploadAlert();
    const validExtensions = [".html", ".htm", ".png", ".jpg", ".jpeg", ".webp"];

    const acceptedFiles = files.filter((file) => {
      const lower = file.name.toLowerCase();
      return validExtensions.some((ext) => lower.endsWith(ext));
    });

    if (acceptedFiles.length === 0) {
      showUploadAlert("error", "No valid files selected. Please upload HTML or Image files (.html, .htm, .png, .jpg, .webp).");
      return;
    }

    for (const file of acceptedFiles) {
      const item = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        isImage: file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name),
        textContent: "",
        previewUrl: "",
        meta: null,
        status: "pending"
      };

      await processQueueItem(item);
      uploadQueue.push(item);
    }

    renderQueuePills();

    // Select the newly added file (or first in queue)
    if (activeIndex === -1 || activeIndex >= uploadQueue.length) {
      selectQueueItem(0);
    } else {
      selectQueueItem(uploadQueue.length - 1);
    }
  }

  /**
   * Read file content & run smart identification
   */
  async function processQueueItem(item) {
    return new Promise((resolve) => {
      const reader = new FileReader();

      if (item.isImage) {
        reader.onload = (e) => {
          item.previewUrl = e.target.result;
          item.meta = window.AppConfig.smartIdentifyDocument({
            filename: item.name,
            mimeType: item.type || "image/jpeg"
          });
          resolve(item);
        };
        reader.readAsDataURL(item.file);
      } else {
        reader.onload = (e) => {
          item.textContent = e.target.result;
          item.meta = window.AppConfig.smartIdentifyDocument({
            filename: item.name,
            textContent: item.textContent,
            mimeType: "text/html"
          });
          resolve(item);
        };
        reader.readAsText(item.file);
      }
    });
  }

  /**
   * Render the Queue Pills
   */
  function renderQueuePills() {
    if (!fileQueueBar || !queueContainer) return;

    if (uploadQueue.length === 0) {
      queueContainer.style.display = "none";
      if (publishAllBtn) publishAllBtn.style.display = "none";
      return;
    }

    queueContainer.style.display = "block";
    fileQueueBar.innerHTML = "";

    uploadQueue.forEach((item, index) => {
      const pill = document.createElement("div");
      pill.className = `queue-pill ${index === activeIndex ? "active" : ""}`;

      const icon = item.isImage ? "🖼️" : "📄";
      const subjectTag = item.meta ? `[${item.meta.subject}]` : "";

      pill.innerHTML = `
        <span>${icon} ${escapeHtml(item.name)} <small style="opacity: 0.8;">${subjectTag}</small></span>
        <span class="pill-remove" title="Remove from queue">&times;</span>
      `;

      pill.addEventListener("click", (e) => {
        if (e.target.classList.contains("pill-remove")) {
          e.stopPropagation();
          removeFromQueue(index);
        } else {
          selectQueueItem(index);
        }
      });

      fileQueueBar.appendChild(pill);
    });

    if (publishAllBtn) {
      publishAllBtn.style.display = uploadQueue.length > 1 ? "inline-flex" : "none";
      publishAllBtn.textContent = `Publish All (${uploadQueue.length}) in Queue`;
    }
  }

  function removeFromQueue(index) {
    uploadQueue.splice(index, 1);
    if (uploadQueue.length === 0) {
      clearQueue();
    } else {
      const nextIndex = Math.min(index, uploadQueue.length - 1);
      renderQueuePills();
      selectQueueItem(nextIndex);
    }
  }

  function clearQueue() {
    uploadQueue = [];
    activeIndex = -1;
    renderQueuePills();
    resetForm();
    resetPreview();
  }

  /**
   * Select a specific item in the queue to show in Form & Live Preview
   */
  function selectQueueItem(index) {
    if (!uploadQueue[index]) return;
    activeIndex = index;
    renderQueuePills();

    const item = uploadQueue[index];
    populateFormWithMetadata(item);
    renderLivePreview(item);

    if (publishCurrentBtn) publishCurrentBtn.disabled = false;
  }

  // ============================================================================
  // 3. SMART METADATA FORM POPULATION
  // ============================================================================
  function populateFormWithMetadata(item) {
    const meta = item.meta;
    if (!meta) return;

    if (metaTitle) metaTitle.value = meta.title || "";
    if (metaSubject) metaSubject.value = meta.subject || "General Academic";
    if (metaStream) metaStream.value = meta.stream || "common";
    if (metaCategory) metaCategory.value = meta.category || "notes";
    if (metaChapter) metaChapter.value = meta.chapter ? String(meta.chapter) : "";

    // Target storage filename
    if (!meta.storagePath) {
      meta.storagePath = generateCleanStoragePath(meta, item.name);
    }
    if (metaStoragePath) metaStoragePath.value = meta.storagePath;

    // Detection Banner
    if (detectionBanner && detectionMessage) {
      detectionBanner.style.display = "flex";
      detectionMessage.textContent = meta.detectionNotes && meta.detectionNotes.length > 0
        ? `Identified as ${meta.subject} (${meta.chapterLabel || "General"}). ${meta.detectionNotes.join(" • ")}`
        : `Smart identification complete for ${item.name}.`;
    }
  }

  function syncFormToCurrentItem() {
    if (activeIndex === -1 || !uploadQueue[activeIndex]) return;
    const item = uploadQueue[activeIndex];
    if (!item.meta) item.meta = {};

    item.meta.title = metaTitle.value.trim();
    item.meta.subject = metaSubject.value;
    item.meta.stream = metaStream.value;
    item.meta.category = metaCategory.value;
    item.meta.chapter = metaChapter.value ? parseInt(metaChapter.value, 10) : null;
    item.meta.chapterLabel = metaChapter.value ? `Chapter ${metaChapter.value}` : "";
    item.meta.storagePath = metaStoragePath.value.trim();
  }

  function formatSuggestedFilename() {
    if (activeIndex === -1 || !uploadQueue[activeIndex]) return;
    const item = uploadQueue[activeIndex];
    syncFormToCurrentItem();
    const suggested = generateCleanStoragePath(item.meta, item.name);
    item.meta.storagePath = suggested;
    if (metaStoragePath) metaStoragePath.value = suggested;
  }

  function generateCleanStoragePath(meta, originalName) {
    const ext = (originalName.split(".").pop() || "html").toLowerCase();
    const subjectSlug = (meta.subject || "general").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

    let base = "";
    if (meta.chapter) {
      base = `${subjectSlug}_chapter_${meta.chapter}`;
    } else if (meta.category === "exam") {
      base = `${subjectSlug}_model_exam`;
    } else if (meta.category === "questions") {
      base = `${subjectSlug}_questions`;
    } else {
      base = `${subjectSlug}_notes`;
    }

    // Preserve image extension
    return `${base}.${ext}`;
  }

  // ============================================================================
  // 4. LIVE DOCUMENT PREVIEW
  // ============================================================================
  function renderLivePreview(item) {
    if (previewEmpty) previewEmpty.style.display = "none";
    if (previewFilenameLabel) previewFilenameLabel.textContent = `${item.name} (${formatBytes(item.size)})`;
    if (previewStatusPill) {
      previewStatusPill.textContent = "Ready to Publish";
      previewStatusPill.style.background = "#ecfdf5";
      previewStatusPill.style.color = "#065f46";
    }

    if (item.isImage) {
      if (previewIframe) previewIframe.style.display = "none";
      if (previewImage) {
        previewImage.style.display = "block";
        previewImage.src = item.previewUrl;
      }
    } else {
      if (previewImage) previewImage.style.display = "none";
      if (previewIframe) {
        previewIframe.style.display = "block";
        // Render raw HTML using srcdoc so interactive popups, styles, and scripts run!
        previewIframe.srcdoc = item.textContent || "<p style='padding:20px; font-family:sans-serif;'>Empty document.</p>";
      }
    }
  }

  function resetPreview() {
    if (previewEmpty) previewEmpty.style.display = "block";
    if (previewIframe) {
      previewIframe.style.display = "none";
      previewIframe.removeAttribute("srcdoc");
      previewIframe.src = "about:blank";
    }
    if (previewImage) {
      previewImage.style.display = "none";
      previewImage.src = "";
    }
    if (previewFilenameLabel) {
      previewFilenameLabel.textContent = "Inspect text, diagrams, and formatting before publishing";
    }
    if (previewStatusPill) {
      previewStatusPill.textContent = "Awaiting File";
      previewStatusPill.style.background = "var(--bg-card-subtle)";
      previewStatusPill.style.color = "var(--text-muted)";
    }
  }

  function resetForm() {
    if (metaTitle) metaTitle.value = "";
    if (metaSubject) metaSubject.value = "Geography";
    if (metaStream) metaStream.value = "common";
    if (metaCategory) metaCategory.value = "notes";
    if (metaChapter) metaChapter.value = "1";
    if (metaStoragePath) metaStoragePath.value = "";
    if (detectionBanner) detectionBanner.style.display = "none";
    if (publishCurrentBtn) publishCurrentBtn.disabled = true;
    if (progressContainer) progressContainer.classList.remove("active");
  }

  // ============================================================================
  // 5. PUBLISHING ENGINE
  // ============================================================================
  async function publishCurrentItem() {
    if (activeIndex === -1 || !uploadQueue[activeIndex]) return;
    syncFormToCurrentItem();

    const item = uploadQueue[activeIndex];
    const targetPath = item.meta.storagePath || item.name;

    if (!item.meta.title) {
      showUploadAlert("error", "Please enter a document title.");
      return;
    }

    clearUploadAlert();
    publishCurrentBtn.disabled = true;
    if (progressContainer) progressContainer.classList.add("active");
    setProgress(25, "Uploading file to Supabase Storage...");

    try {
      // 1. Upload to Storage
      await window.AppConfig.uploadMaterialFile(item.file, targetPath, item.type);
      setProgress(70, "Saving document metadata to database...");

      // 2. Save metadata record
      const materialRecord = {
        title: item.meta.title,
        storage_path: targetPath,
        file_name: item.name,
        file_type: item.isImage ? "image" : "html",
        mime_type: item.type || (item.isImage ? "image/jpeg" : "text/html"),
        file_size: item.size,
        subject: item.meta.subject,
        subject_code: getSubjectCode(item.meta.subject),
        category: item.meta.category,
        chapter: item.meta.chapter,
        chapter_label: item.meta.chapterLabel,
        stream: item.meta.stream,
        description: "",
      };

      await window.AppConfig.saveMaterialMetadata(materialRecord);
      setProgress(100, "Published successfully!");

      showUploadAlert(
        "success",
        `Success! "${item.meta.title}" has been published to "${targetPath}". Students can now read and view it immediately.`
      );

      // Remove from queue
      removeFromQueue(activeIndex);

      // Refresh table
      loadPublishedMaterials();
    } catch (err) {
      console.error("Publishing error:", err);
      showUploadAlert("error", `Publish failed: ${err.message || "Could not publish material."}`);
      publishCurrentBtn.disabled = false;
      if (progressContainer) progressContainer.classList.remove("active");
    }
  }

  async function publishAllInQueue() {
    if (uploadQueue.length === 0) return;

    if (!confirm(`Are you sure you want to publish all ${uploadQueue.length} materials in the queue?`)) {
      return;
    }

    if (publishAllBtn) publishAllBtn.disabled = true;
    if (publishCurrentBtn) publishCurrentBtn.disabled = true;

    let successCount = 0;
    const total = uploadQueue.length;

    for (let i = 0; i < total; i++) {
      selectQueueItem(0); // Always publish head of queue
      await publishCurrentItem();
      successCount++;
    }

    showUploadAlert("success", `Batch upload completed! Successfully published ${successCount} documents.`);
    if (publishAllBtn) publishAllBtn.disabled = false;
  }

  // ============================================================================
  // 6. PUBLISHED MATERIALS LIBRARY TABLE
  // ============================================================================
  async function loadPublishedMaterials() {
    if (!filesTableBody) return;

    if (filesTableLoading) filesTableLoading.style.display = "block";
    if (filesTableEmpty) filesTableEmpty.style.display = "none";
    filesTableBody.innerHTML = "";

    const { data, error } = await window.AppConfig.fetchPublishedMaterials();

    if (filesTableLoading) filesTableLoading.style.display = "none";

    if (error) {
      console.error("Error loading library table:", error);
      if (filesTableEmpty) {
        filesTableEmpty.style.display = "block";
        filesTableEmpty.textContent = `Error loading materials: ${error}`;
      }
      return;
    }

    allPublishedMaterials = data || [];
    filterAndRenderTable();
  }

  function filterAndRenderTable() {
    if (!filesTableBody) return;
    filesTableBody.innerHTML = "";

    const query = tableSearchInput ? tableSearchInput.value.toLowerCase().trim() : "";
    const subjectFilter = tableSubjectFilter ? tableSubjectFilter.value : "all";
    const categoryFilter = tableCategoryFilter ? tableCategoryFilter.value : "all";
    const streamFilter = tableStreamFilter ? tableStreamFilter.value : "all";

    const filtered = allPublishedMaterials.filter((item) => {
      // Search
      if (query) {
        const titleMatch = (item.title || "").toLowerCase().includes(query);
        const fileMatch = (item.storage_path || item.file_name || "").toLowerCase().includes(query);
        const subjMatch = (item.subject || "").toLowerCase().includes(query);
        if (!titleMatch && !fileMatch && !subjMatch) return false;
      }

      // Subject
      if (subjectFilter !== "all" && item.subject !== subjectFilter) return false;

      // Category
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;

      // Stream
      if (streamFilter !== "all" && item.stream !== streamFilter && item.stream !== "common") return false;

      return true;
    });

    if (filtered.length === 0) {
      if (filesTableEmpty) filesTableEmpty.style.display = "block";
      return;
    }

    if (filesTableEmpty) filesTableEmpty.style.display = "none";

    filtered.forEach((item) => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--border-color)";

      const subjectClass = getSubjectClass(item.subject);
      const categoryLabel = getCategoryLabel(item.category);
      const chapterLabel = item.chapter ? `Ch. ${item.chapter}` : (item.chapter_label || "General");
      const sizeStr = item.file_size ? formatBytes(item.file_size) : "-";
      const isImage = item.file_type === "image";
      const readerUrl = `index.html?read=${encodeURIComponent(item.storage_path)}`;

      tr.innerHTML = `
        <td style="padding: 14px 14px;">
          <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(item.title || item.file_name)}</div>
          <div style="font-family: monospace; font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-top: 2px;">
            <span>${isImage ? "🖼️" : "📄"}</span>
            <span>${escapeHtml(item.storage_path)}</span>
          </div>
        </td>
        <td style="padding: 14px 14px;">
          <span class="subject-pill ${subjectClass}">
            ${escapeHtml(item.subject)}
          </span>
        </td>
        <td style="padding: 14px 14px;">
          <div><strong style="font-size: 0.85rem;">${escapeHtml(chapterLabel)}</strong></div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(categoryLabel)}</div>
        </td>
        <td style="padding: 14px 14px;">
          <span class="stream-pill ${item.stream || 'common'}">
            ${formatStreamLabel(item.stream)}
          </span>
        </td>
        <td style="padding: 14px 14px; font-size: 0.85rem; color: var(--text-muted);">${sizeStr}</td>
        <td style="padding: 14px 14px; text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <a href="${readerUrl}" target="_blank" class="btn btn-secondary btn-sm" title="Open student reader view">
              Preview &nearr;
            </a>
            <button class="btn btn-secondary btn-sm edit-details-btn" title="Edit document information">
              Edit
            </button>
            <button class="btn btn-secondary btn-sm replace-btn" title="Replace file in storage">
              Replace
            </button>
            <button class="btn btn-secondary btn-sm delete-btn" style="color: #dc2626;" title="Delete material">
              Delete
            </button>
          </div>
        </td>
      `;

      // Edit Details Event
      tr.querySelector(".edit-details-btn").addEventListener("click", () => openEditModal(item));

      // Replace Event
      tr.querySelector(".replace-btn").addEventListener("click", () => {
        if (metaStoragePath) metaStoragePath.value = item.storage_path;
        if (metaSubject) metaSubject.value = item.subject;
        if (metaTitle) metaTitle.value = item.title;
        dropzone.scrollIntoView({ behavior: "smooth" });
        fileInput.click();
      });

      // Delete Event
      tr.querySelector(".delete-btn").addEventListener("click", async () => {
        if (confirm(`Are you sure you want to delete "${item.title || item.storage_path}"? This cannot be undone.`)) {
          try {
            await window.AppConfig.deleteMaterial(item.storage_path, item.id);
            showUploadAlert("info", `Deleted "${item.title || item.storage_path}".`);
            loadPublishedMaterials();
          } catch (delErr) {
            alert(`Error deleting material: ${delErr.message}`);
          }
        }
      });

      filesTableBody.appendChild(tr);
    });
  }

  // ============================================================================
  // 7. EDIT METADATA MODAL
  // ============================================================================
  function openEditModal(item) {
    if (!editModal) return;
    editItemId.value = item.id || "";
    editItemStoragePath.value = item.storage_path || "";
    editTitle.value = item.title || "";
    editSubject.value = item.subject || "General Academic";
    editStream.value = item.stream || "common";
    editCategory.value = item.category || "notes";
    editChapter.value = item.chapter ? String(item.chapter) : "";

    editModal.style.display = "flex";
  }

  function closeEditModal() {
    if (editModal) editModal.style.display = "none";
  }

  async function handleSaveEditedMetadata(e) {
    e.preventDefault();
    const id = editItemId.value;
    const storagePath = editItemStoragePath.value;

    const updated = {
      title: editTitle.value.trim(),
      storage_path: storagePath,
      subject: editSubject.value,
      subject_code: getSubjectCode(editSubject.value),
      stream: editStream.value,
      category: editCategory.value,
      chapter: editChapter.value ? parseInt(editChapter.value, 10) : null,
      chapter_label: editChapter.value ? `Chapter ${editChapter.value}` : "",
      updated_at: new Date().toISOString()
    };

    try {
      const supabase = window.AppConfig.supabaseClient;
      if (supabase) {
        if (id) {
          await supabase.from("study_materials").update(updated).eq("id", id);
        } else {
          await supabase.from("study_materials").update(updated).eq("storage_path", storagePath);
        }
      }

      closeEditModal();
      showUploadAlert("success", `Updated details for "${updated.title}".`);
      loadPublishedMaterials();
    } catch (err) {
      alert(`Failed to save changes: ${err.message}`);
    }
  }

  // ============================================================================
  // 8. HELPERS & UTILITIES
  // ============================================================================
  function getSubjectCode(subjectName) {
    const found = window.AppConfig.SUBJECTS_CATALOG.find((s) => s.name === subjectName);
    return found ? found.code : "GEN";
  }

  function getSubjectClass(subjectName) {
    const map = {
      "Geography": "subject-geography",
      "Psychology": "subject-psychology",
      "Mathematics": "subject-mathematics",
      "Biology": "subject-biology",
      "Physics": "subject-physics",
      "Chemistry": "subject-chemistry",
      "Logic & Critical Thinking": "subject-logic",
      "Communicative English": "subject-english",
      "Moral & Civic Education": "subject-civics",
      "Economics": "subject-economics",
      "History": "subject-history",
      "Social Anthropology": "subject-anthropology",
      "Emerging Technologies": "subject-emtech",
      "Computer Programming": "subject-computing"
    };
    return map[subjectName] || "subject-general";
  }

  function getCategoryLabel(cat) {
    const map = {
      "notes": "Course Notes",
      "questions": "Review Questions",
      "exam": "Model Exam",
      "summary": "Summary",
      "image": "Diagram / Image"
    };
    return map[cat] || "Course Material";
  }

  function formatStreamLabel(stream) {
    if (stream === "natural") return "Natural Science";
    if (stream === "social") return "Social Science";
    return "Common";
  }

  function setProgress(percent, message) {
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressText) progressText.textContent = message;
  }

  function showUploadAlert(type, message) {
    if (!uploadAlert) return;
    uploadAlert.className = `alert-banner ${type}`;
    uploadAlert.textContent = message;
    uploadAlert.style.display = "block";
  }

  function clearUploadAlert() {
    if (uploadAlert) {
      uploadAlert.style.display = "none";
      uploadAlert.textContent = "";
    }
  }

  function showAuthError(msg) {
    if (authError) {
      authError.textContent = msg;
      authError.style.display = "block";
    }
  }

  function clearAuthError() {
    if (authError) {
      authError.textContent = "";
      authError.style.display = "none";
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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
