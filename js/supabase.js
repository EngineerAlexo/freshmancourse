/**
 * Supabase Client Configuration & Shared Storage Helpers
 * 
 * Supports both hardcoded values and browser localStorage configuration,
 * allowing instant setup without code modification.
 */

// Default constants configured from your Supabase project
let DEFAULT_SUPABASE_URL = "https://qehxdsptiheahyjnzxgy.supabase.co";
let DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlaHhkc3B0aWhlYWh5am56eGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NTU5MTgsImV4cCI6MjEwOTEzMTkxOH0.9cKEDirYM-4cMoFpfoGDheR7cPBql0t_q0lvXcuCpOA";
const BUCKET_NAME = "chapter-files";

// Retrieve active credentials from localStorage or fall back to constants
function getActiveCredentials() {
  const storedUrl = localStorage.getItem("study_notes_supabase_url");
  const storedKey = localStorage.getItem("study_notes_supabase_key");

  const url = (storedUrl && storedUrl.startsWith("https://")) 
    ? storedUrl.trim() 
    : (DEFAULT_SUPABASE_URL.startsWith("https://") ? DEFAULT_SUPABASE_URL.trim() : "");

  const key = (storedKey && storedKey.length > 20) 
    ? storedKey.trim() 
    : (DEFAULT_SUPABASE_ANON_KEY !== "YOUR_SUPABASE_PUBLISHABLE_KEY" ? DEFAULT_SUPABASE_ANON_KEY.trim() : "");

  return { url, key };
}

function saveCredentials(url, key) {
  if (url) localStorage.setItem("study_notes_supabase_url", url.trim());
  if (key) localStorage.setItem("study_notes_supabase_key", key.trim());
  initClient();
}

function clearCredentials() {
  localStorage.removeItem("study_notes_supabase_url");
  localStorage.removeItem("study_notes_supabase_key");
  supabaseClient = null;
}

const isConfigured = () => {
  const { url, key } = getActiveCredentials();
  return Boolean(url && key && url.startsWith("https://") && key.length > 20);
};

// Initialize Supabase client
let supabaseClient = null;

function initClient() {
  const { url, key } = getActiveCredentials();
  if (url && key && typeof window.supabase !== "undefined") {
    try {
      supabaseClient = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      window.AppConfig.supabaseClient = supabaseClient;
      return supabaseClient;
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      return null;
    }
  }
  return null;
}

if (typeof window.supabase !== "undefined") {
  initClient();
}

/**
 * Get the public URL for any uploaded HTML notes or questions file with cache-busting.
 */
function getNotesPublicUrl(filePath) {
  if (!supabaseClient || !filePath) return null;

  // Clean path (strip leading slash if present)
  const cleanPath = filePath.startsWith("/") ? filePath.substring(1) : filePath;

  const { data } = supabaseClient.storage
    .from(BUCKET_NAME)
    .getPublicUrl(cleanPath);

  if (!data || !data.publicUrl) return null;

  // Append timestamp cache-buster so updates appear immediately
  const cacheBuster = `t=${Date.now()}`;
  const separator = data.publicUrl.includes("?") ? "&" : "?";
  return `${data.publicUrl}${separator}${cacheBuster}`;
}

/**
 * Dynamically list all uploaded notes and question files in the storage bucket.
 * Supports Chapter 1, 2, 3, 4, 5, 6... and Question files.
 */
async function listAllNotesFiles() {
  if (!supabaseClient) {
    return { data: [], error: "Supabase client is not configured." };
  }

  try {
    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .list("", {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      return { data: [], error: error.message };
    }

    // Filter only .html and .htm files
    const htmlFiles = (data || []).filter(item => {
      const name = item.name.toLowerCase();
      return (name.endsWith(".html") || name.endsWith(".htm")) && !name.startsWith(".");
    });

    return { data: htmlFiles, error: null };
  } catch (err) {
    return { data: [], error: err.message || "Failed to list storage files." };
  }
}

/**
 * Check if the currently signed-in user is authorized in the admin_users table.
 */
async function checkIsAuthorizedAdmin(userId) {
  if (!supabaseClient || !userId) return false;

  try {
    const { data, error } = await supabaseClient
      .from("admin_users")
      .select("id, email, is_active")
      .eq("id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.warn("admin_users lookup warning:", error.message);
      // If table query fails, check user's session metadata or return false
      return false;
    }

    return Boolean(data && data.is_active);
  } catch (err) {
    console.error("Error verifying admin permissions:", err);
    return false;
  }
}

/**
 * Format raw file names into human-readable titles
 * e.g. "chapter-1.html" -> "Chapter 1 Notes"
 *      "psychology_ch2.html" -> "Psychology Ch 2"
 *      "questions.html" -> "Model Questions & Practice"
 */
function formatMaterialTitle(filename) {
  if (!filename) return "Study Notes";

  // Strip extension
  let base = filename.replace(/\.(html|htm)$/i, "");

  // Common patterns
  const chMatch = base.match(/chapter[_-]?(\d+)/i) || base.match(/ch[_-]?(\d+)/i);
  if (chMatch) {
    const num = chMatch[1];
    if (base.toLowerCase().includes("question")) {
      return `Chapter ${num}: Model Questions & Answers`;
    }
    return `Chapter ${num}: Course Study Notes`;
  }

  if (base.toLowerCase().includes("question") || base.toLowerCase().includes("exam") || base.toLowerCase().includes("quiz")) {
    return base
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  // Format snake_case or kebab-case to Title Case
  return base
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Categorize a file as either 'chapter' or 'questions'
 */
function getMaterialCategory(filename) {
  const lower = (filename || "").toLowerCase();
  if (lower.includes("question") || lower.includes("exam") || lower.includes("quiz") || lower.includes("test")) {
    return "questions";
  }
  return "chapter";
}

// Export to window
window.AppConfig = {
  BUCKET_NAME,
  getActiveCredentials,
  saveCredentials,
  clearCredentials,
  isConfigured,
  supabaseClient,
  initClient,
  getNotesPublicUrl,
  listAllNotesFiles,
  checkIsAuthorizedAdmin,
  formatMaterialTitle,
  getMaterialCategory,
};
