/**
 * Admin Dashboard Logic
 * Supports multi-chapter notes (Chapter 1, 2, 3, 4, 5, 6...) and practice questions,
 * in-place replacement with upsert: true, credentials setup, and storage file management.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elements - Credentials Setup Card
  const configBox = document.getElementById("config-box");
  const configForm = document.getElementById("admin-config-form");
  const configUrlInput = document.getElementById("admin-supabase-url");
  const configKeyInput = document.getElementById("admin-supabase-key");

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

  // Elements - Upload Target Selection
  const targetSelect = document.getElementById("target-file-select");
  const customTargetGroup = document.getElementById("custom-target-group");
  const customFileNameInput = document.getElementById("custom-file-name");

  // Elements - File Drag & Drop
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const selectFileBtn = document.getElementById("select-file-btn");
  const filePill = document.getElementById("file-preview-pill");
  const fileNameDisplay = document.getElementById("file-name-display");
  const fileSizeDisplay = document.getElementById("file-size-display");
  const targetSummaryDisplay = document.getElementById("target-summary-display");
  const removeFileBtn = document.getElementById("remove-file-btn");
  const uploadBtn = document.getElementById("upload-btn");

  // Elements - Progress & Status
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");
  const progressPercent = document.getElementById("progress-percent");
  const progressText = document.getElementById("progress-text");
  const uploadAlert = document.getElementById("upload-alert");

  // Elements - Materials Management Table
  const filesTableBody = document.getElementById("files-table-body");
  const filesTableLoading = document.getElementById("files-table-loading");
  const filesTableEmpty = document.getElementById("files-table-empty");
  const refreshFilesBtn = document.getElementById("refresh-files-btn");

  let selectedFile = null;
  let currentUser = null;

  init();

  function init() {
    setupCredentialsForm();
    checkAuthAndSession();
    setupUploadHandlers();
  }

  function setupCredentialsForm() {
    const creds = window.AppConfig.getActiveCredentials();
    if (configUrlInput && creds.url) configUrlInput.value = creds.url;
    if (configKeyInput && creds.key) configKeyInput.value = creds.key;

    if (!window.AppConfig.isConfigured()) {
      if (configBox) configBox.style.display = "block";
      if (loginBtn) loginBtn.disabled = true;
    } else {
      if (configBox) configBox.style.display = "none";
      if (loginBtn) loginBtn.disabled = false;
    }

    if (configForm) {
      configForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const url = configUrlInput.value.trim();
        const key = configKeyInput.value.trim();

        if (!url || !key) {
          alert("Please provide both Supabase URL and Anon Key.");
          return;
        }

        window.AppConfig.saveCredentials(url, key);
        if (configBox) configBox.style.display = "none";
        if (loginBtn) loginBtn.disabled = false;
        checkAuthAndSession();
      });
    }
  }

  async function checkAuthAndSession() {
    if (!window.AppConfig.isConfigured()) return;

    const supabase = window.AppConfig.supabaseClient || window.AppConfig.initClient();
    if (!supabase) return;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn("Session check error:", error.message);
        handleSignedOut();
        return;
      }

      if (session && session.user) {
        await handleAuthenticatedUser(session.user);
      } else {
        handleSignedOut();
      }

      // Listen to auth changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (newSession && newSession.user) {
          await handleAuthenticatedUser(newSession.user);
        } else {
          handleSignedOut();
        }
      });
    } catch (err) {
      console.error("Session verification failed:", err);
      handleSignedOut();
    }
  }

  async function handleAuthenticatedUser(user) {
    currentUser = user;
    if (adminEmailDisplay) adminEmailDisplay.textContent = user.email;

    // Toggle UI views
    if (authSection) authSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "block";

    // Load list of all uploaded materials in the bucket
    loadPublishedMaterials();
  }

  function handleSignedOut() {
    currentUser = null;
    if (authSection) authSection.style.display = "block";
    if (dashboardSection) dashboardSection.style.display = "none";
    resetUploadState();
  }

  // Login handler
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          showAuthError(error.message);
        } else if (data.user) {
          await handleAuthenticatedUser(data.user);
        }
      } catch (err) {
        showAuthError(err.message || "An unexpected error occurred during sign in.");
      } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = "Sign In to Admin Dashboard";
      }
    });
  }

  // Logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const supabase = window.AppConfig.supabaseClient;
      if (supabase) {
        await supabase.auth.signOut();
      }
      handleSignedOut();
    });
  }

  // Target File selection (Chapter 1, 2, 3, 4, 5, 6, questions, or custom)
  if (targetSelect) {
    targetSelect.addEventListener("change", () => {
      if (targetSelect.value === "custom") {
        customTargetGroup.style.display = "block";
      } else {
        customTargetGroup.style.display = "none";
      }
      updateTargetSummary();
    });
  }

  if (customFileNameInput) {
    customFileNameInput.addEventListener("input", updateTargetSummary);
  }

  function getTargetFilePath() {
    if (!targetSelect) return "chapter-1.html";

    const val = targetSelect.value;
    if (val === "original") {
      if (selectedFile) {
        // Sanitize filename
        return selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      }
      return "uploaded_notes.html";
    }

    if (val === "custom") {
      const customName = customFileNameInput.value.trim();
      if (customName) {
        const clean = customName.replace(/[^a-zA-Z0-9._-]/g, "_");
        return clean.endsWith(".html") || clean.endsWith(".htm") ? clean : `${clean}.html`;
      }
      return "custom_notes.html";
    }

    return val;
  }

  function updateTargetSummary() {
    if (!targetSummaryDisplay) return;
    const path = getTargetFilePath();
    targetSummaryDisplay.textContent = `Target storage path: ${path} (in bucket "${window.AppConfig.BUCKET_NAME}")`;
  }

  // File Drag & Drop
  function setupUploadHandlers() {
    if (selectFileBtn && fileInput) {
      selectFileBtn.addEventListener("click", () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
          processSelectedFile(e.target.files[0]);
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
          processSelectedFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (removeFileBtn) {
      removeFileBtn.addEventListener("click", resetUploadState);
    }

    if (uploadBtn) {
      uploadBtn.addEventListener("click", handleUpload);
    }

    if (refreshFilesBtn) {
      refreshFilesBtn.addEventListener("click", loadPublishedMaterials);
    }
  }

  function processSelectedFile(file) {
    clearUploadAlert();
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith(".html") && !nameLower.endsWith(".htm")) {
      showUploadAlert("error", "Invalid file type. Please select an .html or .htm file.");
      return;
    }

    selectedFile = file;
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = formatBytes(file.size);

    filePill.classList.add("active");
    uploadBtn.disabled = false;

    // Auto-detect target based on filename
    autoDetectTargetSelection(file.name);
    updateTargetSummary();
  }

  function autoDetectTargetSelection(filename) {
    const lower = filename.toLowerCase();
    const chMatch = lower.match(/chapter[_-]?(\d+)/i) || lower.match(/ch[_-]?(\d+)/i);

    if (chMatch) {
      const num = chMatch[1];
      const matchingOption = targetSelect.querySelector(`option[value="chapter-${num}.html"]`);
      if (matchingOption) {
        targetSelect.value = `chapter-${num}.html`;
        customTargetGroup.style.display = "none";
        return;
      }
    }

    if (lower.includes("question") || lower.includes("exam") || lower.includes("quiz")) {
      targetSelect.value = "questions.html";
      customTargetGroup.style.display = "none";
      return;
    }
  }

  function resetUploadState() {
    selectedFile = null;
    if (fileInput) fileInput.value = "";
    if (filePill) filePill.classList.remove("active");
    if (uploadBtn) uploadBtn.disabled = true;
    if (progressContainer) progressContainer.classList.remove("active");
    updateTargetSummary();
  }

  // Upload & Upsert Handler
  async function handleUpload() {
    if (!selectedFile) return;

    clearUploadAlert();
    uploadBtn.disabled = true;
    progressContainer.classList.add("active");
    setProgress(20, "Preparing file...");

    const targetPath = getTargetFilePath();
    const supabase = window.AppConfig.supabaseClient;

    try {
      setProgress(50, `Uploading and replacing "${targetPath}"...`);

      /**
       * Upsert to Supabase Storage:
       * - Replaces previous version in place
       * - Content-Type text/html ensures correct browser execution
       * - cacheControl 0 ensures immediate freshness
       */
      const { data, error } = await supabase.storage
        .from(window.AppConfig.BUCKET_NAME)
        .upload(targetPath, selectedFile, {
          upsert: true,
          contentType: "text/html",
          cacheControl: "0",
        });

      if (error) throw error;

      setProgress(90, "Verifying upload...");

      // Reload files table
      await loadPublishedMaterials();

      setProgress(100, "Published successfully!");

      showUploadAlert(
        "success",
        `Success! "${selectedFile.name}" has been published to "${targetPath}". Students can now read this latest version instantly.`
      );

      resetUploadState();
    } catch (err) {
      console.error("Upload error:", err);
      showUploadAlert(
        "error",
        `Upload failed: ${err.message || "Could not upload file to Supabase Storage."}`
      );
      uploadBtn.disabled = false;
      progressContainer.classList.remove("active");
    }
  }

  /**
   * Load and display all published materials in the bucket
   */
  async function loadPublishedMaterials() {
    if (!filesTableBody) return;

    if (filesTableLoading) filesTableLoading.style.display = "block";
    if (filesTableEmpty) filesTableEmpty.style.display = "none";
    filesTableBody.innerHTML = "";

    const { data, error } = await window.AppConfig.listAllNotesFiles();

    if (filesTableLoading) filesTableLoading.style.display = "none";

    if (error) {
      console.error("Failed to load materials table:", error);
      return;
    }

    const files = data || [];

    if (files.length === 0) {
      if (filesTableEmpty) filesTableEmpty.style.display = "block";
      return;
    }

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

    files.forEach((file) => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--border-color)";

      const isQuestion = window.AppConfig.getMaterialCategory(file.name) === "questions";
      const title = window.AppConfig.formatMaterialTitle(file.name);
      const sizeStr = file.metadata ? formatBytes(file.metadata.size) : "-";
      const updatedStr = file.updated_at ? formatDate(file.updated_at) : "Recently";
      const publicUrl = window.AppConfig.getNotesPublicUrl(file.name);

      const studentReaderUrl = `index.html?read=${encodeURIComponent(file.name)}`;

      tr.innerHTML = `
        <td style="padding: 14px 12px; font-weight: 600;">
          <div>${escapeHtml(title)}</div>
          <div style="font-family: monospace; font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(file.name)}</div>
        </td>
        <td style="padding: 14px 12px;">
          <span class="nav-badge" style="${isQuestion ? 'background: #fef3c7; color: #92400e; border-color: #fde68a;' : ''}">
            ${isQuestion ? 'Questions' : 'Chapter'}
          </span>
        </td>
        <td style="padding: 14px 12px; font-size: 0.85rem; color: var(--text-muted);">${sizeStr}</td>
        <td style="padding: 14px 12px; font-size: 0.85rem; color: var(--text-muted);">${updatedStr}</td>
        <td style="padding: 14px 12px; text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <a href="${studentReaderUrl}" target="_blank" class="btn btn-secondary btn-sm" title="Preview rendered notes">
              Preview &nearr;
            </a>
            <button class="btn btn-secondary btn-sm select-replace-btn" data-file="${escapeHtml(file.name)}" title="Select this file to replace">
              Replace
            </button>
            <button class="btn btn-secondary btn-sm delete-file-btn" data-file="${escapeHtml(file.name)}" style="color: #dc2626;" title="Delete file">
              Delete
            </button>
          </div>
        </td>
      `;

      // Event listener for quick replace
      const replaceBtn = tr.querySelector(".select-replace-btn");
      replaceBtn.addEventListener("click", () => {
        // Set target select to this file or custom
        const existingOption = targetSelect.querySelector(`option[value="${file.name}"]`);
        if (existingOption) {
          targetSelect.value = file.name;
          customTargetGroup.style.display = "none";
        } else {
          targetSelect.value = "custom";
          customTargetGroup.style.display = "block";
          customFileNameInput.value = file.name;
        }
        updateTargetSummary();
        // Scroll to dropzone
        dropzone.scrollIntoView({ behavior: "smooth" });
        fileInput.click();
      });

      // Event listener for delete
      const delBtn = tr.querySelector(".delete-file-btn");
      delBtn.addEventListener("click", async () => {
        if (confirm(`Are you sure you want to delete "${file.name}" from Supabase Storage?`)) {
          const supabase = window.AppConfig.supabaseClient;
          const { error: delErr } = await supabase.storage
            .from(window.AppConfig.BUCKET_NAME)
            .remove([file.name]);

          if (delErr) {
            alert(`Error deleting file: ${delErr.message}`);
          } else {
            showUploadAlert("info", `File "${file.name}" deleted.`);
            loadPublishedMaterials();
          }
        }
      });

      filesTableBody.appendChild(tr);
    });
  }

  // UI helpers
  function setProgress(percent, message) {
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressText) progressText.textContent = message;
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
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
