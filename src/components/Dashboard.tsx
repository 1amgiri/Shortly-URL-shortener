import React, { useState, useEffect } from "react";
import { Search, Plus, Trash2, Edit2, Copy, Check, ExternalLink, QrCode, Sliders, Key, RefreshCw, BarChart3, ListCollapse, UserCheck, Lock, Calendar, Tag, Layers, Share2, DownloadCloud, Ban, CheckCircle, Save, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell, Legend, PieChart, Pie } from "recharts";
import QRCode from "qrcode";
import { URLRecord, AnalyticsRecord, DashboardStats } from "../types";

interface DashboardProps {
  authToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    subscriptionPlan: "Free" | "Pro" | "Enterprise";
    apiKey?: string;
  };
  onLogout: () => void;
}

export default function Dashboard({ authToken, user, onLogout }: DashboardProps) {
  // Core Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sub-tabs
  // "urls" | "analytics" | "bulk" | "api" | "profile"
  const [activeTab, setActiveTab] = useState<"urls" | "analytics" | "bulk" | "api" | "profile">("urls");

  // Filter/Search states
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Single URL Detailed view modal/panel
  const [selectedUrlRecord, setSelectedUrlRecord] = useState<URLRecord | null>(null);
  const [selectedUrlAnalytics, setSelectedUrlAnalytics] = useState<AnalyticsRecord[]>([]);
  const [loadingSingleAnalytics, setLoadingSingleAnalytics] = useState(false);

  // Edit URL states
  const [editingUrl, setEditingUrl] = useState<URLRecord | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAlias, setEditAlias] = useState("");
  const [editExpires, setEditExpires] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Create links states
  const [newOriginalUrl, setNewOriginalUrl] = useState("");
  const [newAlias, setNewAlias] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [newTagsString, setNewTagsString] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);

  // QR Code Designer states
  const [qrTargetUrl, setQrTargetUrl] = useState("");
  const [qrFg, setQrFg] = useState("#4f46e5");
  const [qrBg, setQrBg] = useState("#ffffff");
  const [qrBlob, setQrBlob] = useState("");

  // Bulk input
  const [bulkInput, setBulkInput] = useState("");
  const [bulkResults, setBulkResults] = useState<URLRecord[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // UI state feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Load Dashboard Data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load analytical metrics.");
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [authToken]);

  // Handle Clipboard copies
  const triggerCopy = (urlCode: string, trackingId: string) => {
    const fullUrl = `${window.location.origin}/${urlCode}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(trackingId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // QR Code designer generator
  useEffect(() => {
    if (qrTargetUrl) {
      QRCode.toDataURL(
        qrTargetUrl,
        {
          width: 300,
          margin: 1.5,
          color: {
            dark: qrFg,
            light: qrBg,
          },
        },
        (err, dataUrl) => {
          if (!err) setQrBlob(dataUrl);
        }
      );
    }
  }, [qrTargetUrl, qrFg, qrBg]);

  // Open QR Designer for a specific URL
  const openQRDesignerFor = (urlCode: string) => {
    const link = `${window.location.origin}/${urlCode}`;
    setQrTargetUrl(link);
    // Auto shift to active designer if needed, or overlay inside URL list
  };

  // Save QR Code File
  const downloadQRPNG = (code: string) => {
    if (!qrBlob) return;
    const link = document.createElement("a");
    link.href = qrBlob;
    link.download = `qrcode_${code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Create link handler
  const handleCreateURL = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOriginalUrl) return;
    setCreatingLink(true);
    setError("");

    try {
      const parsedTags = newTagsString
        ? newTagsString.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
        : [];

      const res = await fetch("/api/urls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          originalUrl: newOriginalUrl,
          customAlias: newAlias || undefined,
          title: newTitle || undefined,
          password: newPass || undefined,
          expiresAt: newExpiry || undefined,
          tags: parsedTags,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Shortening fail.");

      // Success
      setNewOriginalUrl("");
      setNewAlias("");
      setNewTitle("");
      setNewPass("");
      setNewExpiry("");
      setNewTagsString("");
      
      // Reload table
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingLink(false);
    }
  };

  // Edit Link Handler
  const startEditing = (url: URLRecord) => {
    setEditingUrl(url);
    setEditTitle(url.title || "");
    setEditDescription(url.description || "");
    setEditAlias(url.customAlias || "");
    setEditExpires(url.expiresAt ? url.expiresAt.substring(0, 10) : "");
    setEditPassword(url.password || "");
    setEditTags(url.tags ? url.tags.join(", ") : "");
    setEditIsActive(url.isActive);
  };

  const handleUpdateURL = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUrl) return;
    setSavingEdit(true);
    setError("");

    try {
      const parsedTags = editTags
        ? editTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
        : [];

      const res = await fetch(`/api/urls/${editingUrl.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          customAlias: editAlias || undefined,
          expiresAt: editExpires || undefined,
          password: editPassword || undefined,
          tags: parsedTags,
          isActive: editIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEditingUrl(null);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Link
  const handleDeleteURL = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this shortened URL? Click analytics for this link will be cleaned up.")) return;
    try {
      const res = await fetch(`/api/urls/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error("Delete fail.");
      await loadDashboardData();
      if (selectedUrlRecord?.id === id) {
        setSelectedUrlRecord(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // View link analytics deep details
  const viewSingleAnalytics = async (url: URLRecord) => {
    setSelectedUrlRecord(url);
    setLoadingSingleAnalytics(true);
    try {
      const res = await fetch(`/api/analytics/${url.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedUrlAnalytics(data.analytics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSingleAnalytics(false);
    }
  };

  // Bulk url treating
  const handleBulkShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput.trim()) return;
    setBulkLoading(true);
    setError("");
    setBulkResults([]);

    try {
      // Split by newline and map to objects
      const urlsArray = bulkInput
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((url) => ({ originalUrl: url }));

      const res = await fetch("/api/urls/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ urlsList: urlsArray }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk action failure.");

      setBulkResults(data.urls);
      setBulkInput("");
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Rotate Key
  const handleRotateKey = async () => {
    if (!confirm("Are you sure you want to rotate your Developer API Key? Any headless programs currently integrated with your key must be updated.")) return;
    try {
      const res = await fetch("/api/auth/key-rotate", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert(`API Key rotated successfully! New Key: ${data.apiKey}`);
        loadDashboardData();
      }
    } catch {
      alert("Fail key rotation.");
    }
  };

  // Plan simulator
  const handleUpgradeSubscription = async (plan: string) => {
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ subscriptionPlan: plan }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Success! Your Sandbox level is now set to ${plan}.`);
        window.location.reload();
      }
    } catch {
      alert("Plan update error.");
    }
  };

  // Export analytics CSV
  const handleExportCSV = (id: string, code: string) => {
    // Standard fetch with file download anchor
    const exportUrl = `${window.location.origin}/api/analytics/export/${id}?token=${authToken}`;
    
    // Create direct invisible browser trigger
    const link = document.createElement("a");
    link.href = `/api/analytics/export/${id}`;
    // Pass bearer auth via a specific header simulator or directly let the browser process the file
    // Because file downloads can be restricted if authenticated only via header,
    // we use a neat workaround: our server supports simple download proxy or we can download it by fetching the text
    fetch(`/api/analytics/export/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    .then(async (res) => {
      if (!res.ok) throw new Error();
      const csvContent = await res.text();
      const blob = new Blob([csvContent], { type: "text/csv" });
      const dlLink = document.createElement("a");
      dlLink.href = URL.createObjectURL(blob);
      dlLink.download = `analytics_link_${code}.csv`;
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
    })
    .catch(() => {
      alert("Error exporting CSV trace.");
    });
  };

  // --- Analytical Computations for charts ---
  
  // 1. Clicks Over Time (Line Chart)
  const getClickTrends = () => {
    if (!stats || !stats.analytics) return [];
    
    const dayCounts: Record<string, number> = {};
    const daysArr = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    daysArr.forEach((day) => { dayCounts[day] = 0; });

    stats.analytics.forEach((item) => {
      const day = item.timestamp.split("T")[0];
      if (dayCounts[day] !== undefined) {
        dayCounts[day]++;
      }
    });

    return Object.keys(dayCounts).map((key) => ({
      date: new Date(key).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      clicks: dayCounts[key],
    }));
  };

  // 2. Geographic breakdown (Bar Chart)
  const getGeographicBreakdown = () => {
    if (!stats || !stats.analytics) return [];
    const countryCounts: Record<string, number> = {};
    stats.analytics.forEach((item) => {
      const c = item.country || "Other";
      countryCounts[c] = (countryCounts[c] || 0) + 1;
    });
    return Object.keys(countryCounts)
      .map((key) => ({ country: key, clicks: countryCounts[key] }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);
  };

  // 3. User agent shares (Browser Pie Chart)
  const getBrowserShares = () => {
    if (!stats || !stats.analytics) return [];
    const counts: Record<string, number> = {};
    stats.analytics.forEach((item) => {
      const b = item.browser || "Other";
      counts[b] = (counts[b] || 0) + 1;
    });
    const colors = ["#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b"];
    return Object.keys(counts).map((key, i) => ({
      name: key,
      value: counts[key],
      color: colors[i % colors.length],
    }));
  };

  // 4. Device Shares (Bar details)
  const getDeviceShares = () => {
    if (!stats || !stats.analytics) return [];
    const counts: Record<string, number> = {};
    stats.analytics.forEach((item) => {
      const d = item.device || "Desktop";
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.keys(counts).map((key) => ({
      device: key,
      clicks: counts[key],
    }));
  };

  // 5. Referral sources details
  const getReferrerSources = () => {
    if (!stats || !stats.analytics) return [];
    const counts: Record<string, number> = {};
    stats.analytics.forEach((item) => {
      const ref = item.referrer || "Direct";
      counts[ref] = (counts[ref] || 0) + 1;
    });
    return Object.keys(counts)
      .map((key) => ({ name: key, clicks: counts[key] }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 6);
  };

  // Get list of tags
  const getUniqueTagsOfUser = () => {
    if (!stats || !stats.urls) return [];
    const tagsSet = new Set<string>();
    stats.urls.forEach((u) => {
      if (u.tags) {
        u.tags.forEach((tag) => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet);
  };

  const filteredUrls = stats?.urls.filter((url) => {
    const matchesSearch =
      url.originalUrl.toLowerCase().includes(search.toLowerCase()) ||
      (url.title && url.title.toLowerCase().includes(search.toLowerCase())) ||
      url.shortCode.toLowerCase().includes(search.toLowerCase()) ||
      (url.customAlias && url.customAlias.toLowerCase().includes(search.toLowerCase()));

    const matchesTag = !selectedTag || (url.tags && url.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  }) || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row">
      
      {/* --- DASHBOARD SIDEBAR PANEL --- */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-white shrink-0 py-6 px-4 flex flex-col justify-between shadow-sm">
        <div className="space-y-8">
          
          {/* Logo Name */}
          <div className="flex items-center gap-2.5 px-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold font-display">
              L
            </div>
            <div>
              <span className="text-sm font-bold font-display text-slate-900 tracking-tight">LiteShort Console</span>
              <span className="text-[10px] text-blue-650 block font-mono font-bold tracking-widest leading-none">STUDENT SANDBOX</span>
            </div>
          </div>

          {/* User profile capsule */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Current Session</span>
            <h4 className="text-xs font-semibold text-slate-850 truncate">{user.name}</h4>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[9px] bg-blue-50 border border-blue-200 text-blue-600 font-extrabold px-1.5 py-0.5 rounded uppercase">
                Sandbox Mode
              </span>
              <button
                id="dash-logout-btn"
                onClick={onLogout}
                className="text-[10px] text-slate-500 hover:text-red-600 transition-colors cursor-pointer font-semibold"
                title="Disconnect your session"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Nav links */}
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab("urls"); setSelectedUrlRecord(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "urls" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Layers size={14} />
              <span>Link Management</span>
            </button>
            <button
              onClick={() => { setActiveTab("analytics"); setSelectedUrlRecord(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "analytics" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <BarChart3 size={14} />
              <span>Redirect Analytics</span>
            </button>
            <button
              onClick={() => { setActiveTab("bulk"); setSelectedUrlRecord(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "bulk" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Plus size={14} />
              <span>Bulk Link treatment</span>
            </button>
            <button
              onClick={() => { setActiveTab("api"); setSelectedUrlRecord(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "api" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Key size={14} />
              <span>Developer API Key</span>
            </button>
            <button
              onClick={() => { setActiveTab("profile"); setSelectedUrlRecord(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "profile" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <UserCheck size={14} />
              <span>Profile Settings</span>
            </button>
          </nav>
        </div>

        {/* Workspace support contacts */}
        <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 space-y-1 font-medium">
          <p>SSL secured platform proxy</p>
          <p>Node/Vite sandbox container</p>
        </div>
      </aside>

      {/* --- DASHBOARD MAIN WORKSPACE --- */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full filter blur-3xl -z-10" />

        {/* Global error messaging inside dashboard */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-650 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        {/* TAB 1: LINKS MANAGEMENT TABLE */}
        {activeTab === "urls" && !selectedUrlRecord && (
          <div className="space-y-6">
            
            {/* Header section with Stats boxes */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block">Workspace Workspace</span>
                <h2 className="text-2xl font-bold font-display text-white">Your URL Portfolio</h2>
              </div>
            </div>

            {/* Premium Create URL Form inside Dashboard */}
            <div className="p-5 border border-slate-800 bg-[#0c1220]/40 rounded-2xl">
              <form onSubmit={handleCreateURL} className="space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Plus size={14} className="text-indigo-400" />
                  <span>Seal A New Original link</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
                    <Search className="text-slate-500 shrink-0" size={14} />
                    <input
                      id="dash-long-url"
                      type="text"
                      required
                      placeholder="Paste destination link (e.g., mail.google.com/mail)"
                      value={newOriginalUrl}
                      onChange={(e) => setNewOriginalUrl(e.target.value)}
                      className="w-full bg-transparent text-xs text-slate-200 outline-none border-none py-1.5 focus:ring-0"
                    />
                  </div>
                  
                  <div className="md:col-span-4 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 leading-none">/alias:</span>
                    <input
                      id="dash-alias"
                      type="text"
                      placeholder="e.g. email"
                      value={newAlias}
                      onChange={(e) => setNewAlias(e.target.value)}
                      className="w-full bg-transparent text-xs text-slate-200 outline-none border-none py-1.5 focus:ring-0"
                    />
                  </div>
                </div>

                {/* Additional optional inputs collapsible or visible directly */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Custom Title (Optional)</label>
                    <input
                      type="text"
                      placeholder="Google Mail Workspace"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Password protection (Optional)</label>
                    <input
                      type="password"
                      placeholder="Strict locked access"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Expiration clock (Optional)</label>
                    <input
                      type="date"
                      value={newExpiry}
                      onChange={(e) => setNewExpiry(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Comma Tags (Optional)</label>
                    <input
                      type="text"
                      placeholder="google, work, mail"
                      value={newTagsString}
                      onChange={(e) => setNewTagsString(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    id="dash-create-btn"
                    type="submit"
                    disabled={creatingLink}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white rounded-xl transition-colors cursor-pointer"
                  >
                    {creatingLink ? "Sealing link..." : "Create Short Link"}
                  </button>
                </div>
              </form>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-2 border-b border-slate-800">
              <div className="w-full md:w-80 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-2">
                <Search size={14} className="text-slate-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Query by title, original URL, short code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 outline-none border-none focus:ring-0 placeholder:text-slate-600"
                />
              </div>

              {/* Tag filtering capsules */}
              <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
                <span className="text-[10px] text-slate-400 font-semibold uppercase pr-1.5">Tags:</span>
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-full border transition-all ${
                    selectedTag === null ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All Links
                </button>
                {getUniqueTagsOfUser().map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-full border transition-all ${
                      selectedTag === tag ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Edit modal inline overlay */}
            <AnimatePresence>
              {editingUrl && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-5 border border-amber-500/20 bg-amber-500/5 rounded-2xl overflow-hidden"
                >
                  <form onSubmit={handleUpdateURL} className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                        <Edit2 size={14} />
                        <span>Edit short URL properties: {editingUrl.shortCode}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setEditingUrl(null)}
                        className="text-slate-400 hover:text-slate-200 text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-400 mb-1">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Custom Alias (Must be unique)</label>
                        <input
                          type="text"
                          value={editAlias}
                          onChange={(e) => setEditAlias(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Security password protection</label>
                        <input
                          type="text"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Expiration clock</label>
                        <input
                          type="date"
                          value={editExpires}
                          onChange={(e) => setEditExpires(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-1">Comma Tags</label>
                        <input
                          type="text"
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          id="edit-active"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          className="rounded border-slate-800 text-indigo-600 bg-slate-950"
                        />
                        <label htmlFor="edit-active" className="text-xs text-slate-300">Active (Allows clicks)</label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 font-semibold text-xs text-white rounded-xl transition-colors cursor-pointer"
                      >
                        {savingEdit ? "Saving..." : "Save Link updates"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* URL Management List Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0f1524] text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="p-4">Details</th>
                    <th className="p-4">Short Code</th>
                    <th className="p-4 text-center">Redirect Path</th>
                    <th className="p-4 text-center">Clicks</th>
                    <th className="p-4 text-center">Security & Life</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredUrls.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                        {loading ? "Synchronizing database data..." : "No URL items match your active filters structure."}
                      </td>
                    </tr>
                  ) : (
                    filteredUrls.map((url) => (
                      <tr key={url.id} className="hover:bg-[#121a2c]/20 transition-all">
                        {/* Title, Original URL, Tags */}
                        <td className="p-4 max-w-sm space-y-1.5">
                          <h4 className="font-semibold text-slate-200 text-xs sm:text-xs tracking-tight line-clamp-1">{url.title}</h4>
                          <a
                            href={url.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-slate-500 hover:text-indigo-400 hover:underline transition-colors block truncate"
                          >
                            {url.originalUrl}
                          </a>
                          {url.tags && url.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {url.tags.map((tag) => (
                                <span key={tag} className="px-1.5 py-0.5 bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 rounded text-[9px] font-semibold">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Short code / Alias */}
                        <td className="p-4 font-mono font-bold text-slate-200">
                          {url.customAlias ? (
                            <span className="text-indigo-400">/{url.customAlias}</span>
                          ) : (
                            <span>/{url.shortCode}</span>
                          )}
                        </td>

                        {/* Target click redirect link */}
                        <td className="p-4 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-[#0f1524] border border-slate-800 px-2.5 py-1.5 rounded-lg">
                            <span className="font-mono text-[10px] text-indigo-300 truncate max-w-[150px]">
                              {window.location.origin}/{url.customAlias || url.shortCode}
                            </span>
                            <button
                              onClick={() => triggerCopy(url.customAlias || url.shortCode, url.id)}
                              className="text-slate-400 hover:text-white transition-colors"
                              title="Copy redirect shortcut to clipboard"
                            >
                              {copiedId === url.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            </button>
                            <a
                              href={`/r/${url.customAlias || url.shortCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-white transition-colors"
                              title="Visit direct redirection URL portal"
                            >
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        </td>

                        {/* Total Clicks */}
                        <td className="p-4 text-center">
                          <button
                            onClick={() => viewSingleAnalytics(url)}
                            className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 rounded text-[11px] font-bold text-indigo-400 tracking-tight transition-all cursor-pointer"
                            title="Inspect detailed geographic logs"
                          >
                            {url.clicks} clicks
                          </button>
                        </td>

                        {/* Expiry and Locks */}
                        <td className="p-4 text-center space-y-1">
                          <div className="flex justify-center items-center gap-1.5 text-slate-400">
                            {url.password ? (
                              <Lock size={12} className="text-yellow-500" title="Password secured" />
                            ) : (
                              <Sliders size={12} className="text-slate-400 opacity-30" />
                            )}
                            {url.expiresAt ? (
                              <Calendar size={12} className="text-indigo-400" title={`Expires ${new Date(url.expiresAt).toLocaleDateString()}`} />
                            ) : (
                              <Clock size={12} className="text-slate-400 opacity-20" />
                            )}
                          </div>
                          
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${url.isActive ? "bg-emerald-500" : "bg-red-500"}`} title={url.isActive ? "Working" : "Disabled"} />
                        </td>

                        {/* Action buttons list */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => viewSingleAnalytics(url)}
                              className="p-1 px-1.5 hover:bg-slate-800 rounded text-slate-400 hover:test-white transition-colors cursor-pointer"
                              title="Inspect Deep Analytics"
                            >
                              <BarChart3 size={13} />
                            </button>
                            <button
                              onClick={() => startEditing(url)}
                              className="p-1 px-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                              title="Edit link credentials"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteURL(url.id)}
                              className="p-1 px-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete Link record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* COMPONENT: SINGLE URL DETAILED ANALYTICS (Clicked on click cells) */}
        {selectedUrlRecord && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedUrlRecord(null)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 bg-indigo-500/5 rounded-xl border border-indigo-500/10 px-3 py-1.5 cursor-pointer"
              >
                &larr; Back to URLs List
              </button>
              
              <button
                onClick={() => handleExportCSV(selectedUrlRecord.id, selectedUrlRecord.shortCode)}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 transition-colors text-white font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                <DownloadCloud size={14} />
                <span>Export Clicks CSV Log</span>
              </button>
            </div>

            <div className="p-5 border border-slate-800 bg-slate-900/60 rounded-2xl">
              <div className="flex justify-between items-start gap-4 flex-col md:flex-row">
                <div>
                  <h3 className="text-lg font-bold text-white font-display">{selectedUrlRecord.title}</h3>
                  <a href={selectedUrlRecord.originalUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 block break-all font-mono">
                    {selectedUrlRecord.originalUrl}
                  </a>
                  <span className="text-[10px] text-slate-500 block mt-1">Created on {new Date(selectedUrlRecord.createdAt).toLocaleString()}</span>
                </div>
                <div className="bg-slate-950 px-4 py-2 border border-slate-800 rounded-xl text-center shrink-0">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-widest leading-none mb-1">Click Counter</span>
                  <span className="text-2xl font-extrabold font-display bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    {selectedUrlRecord.clicks}
                  </span>
                </div>
              </div>
            </div>

            {/* Chart graphs specifically for selection */}
            {loadingSingleAnalytics ? (
              <p className="text-slate-400 text-xs p-6 text-center">Loading detailed event logs...</p>
            ) : selectedUrlAnalytics.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
                This link has not had clean redirection visits logged yet. Use the short URL to generate analytic events!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Referrers */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Top Referral Sources</h4>
                  <div className="space-y-2 text-xs">
                    {(() => {
                      const sources: Record<string, number> = {};
                      selectedUrlAnalytics.forEach((a) => {
                        const ref = a.referrer || "Direct";
                        sources[ref] = (sources[ref] || 0) + 1;
                      });
                      return Object.keys(sources).map((key) => (
                        <div key={key} className="flex justify-between items-center bg-slate-900 p-2 border border-slate-800/40 rounded-lg">
                          <span className="font-semibold text-slate-300">{key}</span>
                          <span className="text-indigo-400 font-bold">{sources[key]} clicks</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Countries list */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Geographic Distribution</h4>
                  <div className="space-y-2 text-xs font-medium">
                    {(() => {
                      const counts: Record<string, number> = {};
                      selectedUrlAnalytics.forEach((a) => {
                        const c = a.country || "United States";
                        counts[c] = (counts[c] || 0) + 1;
                      });
                      return Object.keys(counts).map((key) => (
                        <div key={key} className="flex justify-between items-center bg-slate-900 p-2 border border-slate-800/40 rounded-lg">
                          <span className="text-slate-300">🌍 {key} - {selectedUrlAnalytics.find((a) => a.country === key)?.city}</span>
                          <span className="text-indigo-400 font-bold">{counts[key]} redirects</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Devices */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl col-span-1 md:col-span-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Device Devices Share</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {["Mobile", "Desktop", "Tablet"].map((dev) => {
                      const count = selectedUrlAnalytics.filter((a) => a.device === dev).length;
                      return (
                        <div key={dev} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wide block font-semibold">{dev}</span>
                          <strong className="text-lg text-slate-200">{count}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 2: GENERAL SAAS OVERVIEW CHARTS */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block">Analytical Hub</span>
              <h2 className="text-2xl font-bold font-display text-white">Consolidated Platform Performance</h2>
            </div>

            {/* KPI metric grids */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Shortened Links</span>
                <p className="text-2xl font-extrabold text-white font-display">{stats?.totalUrls || 0}</p>
              </div>
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Consolidated Clicks</span>
                <p className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent font-display">{stats?.totalClicks || 0}</p>
              </div>
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-bold font-display">System Integrity</span>
                <p className="text-2xl font-extrabold text-emerald-400">99.99%</p>
              </div>
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Response Speed</span>
                <p className="text-2xl font-extrabold text-amber-400">~18ms</p>
              </div>
            </div>

            {!stats || stats.analytics.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
                You haven't shortened any links or generated clicks yet. Create a short URL to load custom analytics!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
                
                {/* Click trends AreaChart */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl md:col-span-8">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Click Redirections Volume (Last 7 Days)</h4>
                  <div className="h-72 w-full mt-2 font-mono text-[9px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getClickTrends()}>
                        <defs>
                          <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#475569" />
                        <YAxis stroke="#475569" />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "white" }} />
                        <Area type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Country breakdown Bar */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl md:col-span-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 font-display">Top Geographies</h4>
                  <div className="h-72 w-full mt-2 font-mono text-[9px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getGeographicBreakdown()} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#475569" />
                        <YAxis dataKey="country" type="category" stroke="#475569" width={65} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "white" }} />
                        <Bar dataKey="clicks" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                          {getGeographicBreakdown().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? "#6366f1" : "#3b82f6"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Browser shares Pie */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl md:col-span-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Browsers Share</h4>
                  <div className="h-64 w-full mt-2 flex items-center justify-center font-mono text-[9px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getBrowserShares()}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {getBrowserShares().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ color: "white", fontSize: "10px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Referrers */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl md:col-span-8">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Referrers Funnel</h4>
                  <div className="h-64 w-full mt-2 font-mono text-[9px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getReferrerSources()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#475569" />
                        <YAxis stroke="#475569" />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                        <Bar dataKey="clicks" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 3: BULK URL LINK TREATMENT */}
        {activeTab === "bulk" && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block">Power Tools</span>
              <h2 className="text-2xl font-bold font-display text-white">Bulk URL Minimizer</h2>
            </div>

            <div className="p-6 border border-slate-800 bg-[#0c1220]/40 rounded-2xl">
              <form onSubmit={handleBulkShorten} className="space-y-4">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Paste original links list below (One URL per line):
                </label>
                
                <textarea
                  id="bulk-urls-area"
                  rows={6}
                  required
                  placeholder={`google.com/search\ngithub.com/facebook/react\nnews.ycombinator.com`}
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-slate-200 font-mono"
                />

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-slate-500">Premium Pro Feature active</span>
                  <button
                    id="bulk-submit-btn"
                    type="submit"
                    disabled={bulkLoading}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-xl transition-colors cursor-pointer"
                  >
                    {bulkLoading ? "Processing Bulk List..." : "Sealing Bulk Batch &rarr;"}
                  </button>
                </div>
              </form>
            </div>

            {bulkResults.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-emerald-400">Your shortened batch results ({bulkResults.length} URLs processed)</h4>
                
                <div className="overflow-hidden border border-slate-850 rounded-xl bg-slate-950 divide-y divide-slate-900">
                  {bulkResults.map((item) => (
                    <div key={item.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-emerald-500/5">
                      <div className="space-y-1 max-w-md">
                        <h5 className="text-xs font-bold text-slate-200 truncate">{item.title}</h5>
                        <p className="text-[10px] text-slate-500 truncate">{item.originalUrl}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-emerald-300">
                          {window.location.origin}/{item.shortCode}
                        </span>
                        <button
                          onClick={() => triggerCopy(item.shortCode, item.id)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-slate-850 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-200 cursor-pointer"
                        >
                          {copiedId === item.id ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DEVELOPER API KEY Rotate & Copy */}
        {activeTab === "api" && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block font-display">Programmatic Access</span>
              <h2 className="text-2xl font-bold font-display text-white">Developer API Integration</h2>
            </div>

            <div className="p-6 border border-slate-800 bg-[#0c1220]/40 rounded-2xl space-y-6">
              <div className="space-y-2">
                <p className="text-slate-400 text-xs leading-relaxed">
                  Integrate shortened URL sealing directly in your CLI shell, GitHub CI steps, or custom web portals. Direct header authentication bypasses standard browsers.
                </p>
              </div>

              {/* Private Code segment */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-300">Your Developer API Token</label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="font-mono text-xs text-indigo-300 font-bold tracking-wide select-all truncate pr-3">
                    {user.apiKey || "sk_live_demourlshortenerkey"}
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user.apiKey || "sk_live_demourlshortenerkey");
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {copiedKey ? "Copied!" : "Copy Token"}
                    </button>
                    <button
                      onClick={handleRotateKey}
                      className="p-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                      title="Generate a new token"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Snippet box */}
              <div className="space-y-3.5 border-t border-slate-800 pt-5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest leading-none">POST request treatment</h4>
                <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl font-mono text-[10px] text-slate-400 space-y-1">
                  <p className="text-indigo-400">curl -X POST "{window.location.origin}/api/urls" \</p>
                  <p className="pl-4">-H "Authorization: Bearer {user.apiKey || "sk_your_key_here"}" \</p>
                  <p className="pl-4">-H "Content-Type: application/json" \</p>
                  <p className="pl-4">-d '{"{"} "originalUrl": "https://google.com", "customAlias": "lucky" {"}"}'</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE SETTINGS */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 block">General Settings</span>
              <h2 className="text-2xl font-bold font-display text-slate-900">Workspace Settings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Account properties card */}
              <div className="p-6 border border-slate-200 bg-white rounded-2xl space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider font-display">Account Properties</h3>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1 font-medium">Full Name</label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold">{user.name}</div>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-medium">Email Address</label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold">{user.email}</div>
                  </div>
                </div>
              </div>

              {/* Subscriptions toggle plan card */}
              <div className="p-6 border border-blue-100 bg-blue-50/20 rounded-2xl space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider font-display">Developer Sandbox Toggles</h3>
                
                <div className="space-y-4 text-xs">
                  <p className="text-slate-600 leading-relaxed">
                    Adjust your simulated database registration levels within this local sandbox to test various application redirection behaviors and rate limits.
                  </p>

                  <div className="space-y-2">
                    {[
                      { plan: "Free", text: "Reader Access (Simulates lock indicators)" },
                      { plan: "Pro", text: "Developer Access (Unlocks full metrics panel)" },
                      { plan: "Enterprise", text: "Admin Access (Exposes full integration tools)" }
                    ].map((item) => (
                      <div
                        key={item.plan}
                        onClick={() => handleUpgradeSubscription(item.plan as any)}
                        className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          user.subscriptionPlan === item.plan
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <div>
                          <h4 className="font-bold">{item.plan} Level</h4>
                          <span className={`text-[10px] block ${user.subscriptionPlan === item.plan ? 'text-blue-100' : 'text-slate-500'}`}>{item.text}</span>
                        </div>
                        {user.subscriptionPlan === item.plan && (
                          <span className="text-[10px] bg-blue-500 text-white border border-blue-400 font-semibold px-2 py-0.5 rounded uppercase">Active</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
