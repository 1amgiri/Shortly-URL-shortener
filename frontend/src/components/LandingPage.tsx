import React, { useState, useEffect } from "react";
import { Link2, Copy, Check, ExternalLink, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RecentLink {
  id: string;
  originalUrl: string;
  shortCode: string;
  createdAt: string;
}

export default function LandingPage() {
  const [longUrl, setLongUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shortenedResult, setShortenedResult] = useState<RecentLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load recent shortened links from localStorage with safe parsing
  const [recentLinks, setRecentLinks] = useState<RecentLink[]>(() => {
    try {
      const stored = localStorage.getItem("shortly_recent_links");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Track the copied status for the main/results link
  const [mainCopied, setMainCopied] = useState(false);

  // Sync recent shortened links with localStorage
  useEffect(() => {
    localStorage.setItem("shortly_recent_links", JSON.stringify(recentLinks));
  }, [recentLinks]);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShortenedResult(null);

    if (!longUrl.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/urls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalUrl: longUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "An error occurred while shortening the URL.");
      }

      const newLink: RecentLink = {
        id: data.url.id || Math.random().toString(),
        originalUrl: data.url.originalUrl,
        shortCode: data.url.shortCode,
        createdAt: new Date().toISOString(),
      };

      setShortenedResult(newLink);
      setRecentLinks((prev) => [newLink, ...prev].slice(0, 10)); // Limit of 10 recent links
      setLongUrl(""); // Reset input field
    } catch (err: any) {
      setError(err.message || "Failed to make contact with server.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code: string, id: string | null) => {
    const fullShortUrl = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(fullShortUrl);

    if (id === null) {
      setMainCopied(true);
      setTimeout(() => setMainCopied(false), 2000);
    } else {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 selection:bg-blue-100 selection:text-blue-900">
      <div className="flex-1 flex flex-col items-center justify-center">
        
        {/* Main interactive wrapper */}
        <div className="w-full max-w-xl space-y-8">
          
          {/* Main Title Section */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/10 mb-2">
              <Link2 size={24} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Shortly
            </h1>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              A clean and minimalist web application to shorten URLs and analyze telemetry routing.
            </p>
          </div>

          {/* Card with interactive tools */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xl space-y-6">
            
            {/* Form */}
            <form onSubmit={handleShorten} className="space-y-4">
              <div className="relative">
                <input
                  id="longUrl-input"
                  type="text"
                  required
                  placeholder="Paste long URL (e.g., github.com/facebook/react)..."
                  value={longUrl}
                  onChange={(e) => setLongUrl(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 transition-all shadow-inner"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pr-1 pointer-events-none text-slate-400">
                  <Globe size={16} />
                </div>
              </div>

              <button
                id="shorten-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10"
              >
                {loading ? "Shortening..." : "Shorten URL"}
              </button>
            </form>

            {/* Error alerts */}
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-650 text-xs font-semibold rounded-xl leading-relaxed">
                {error}
              </div>
            )}

            {/* Newly shortened output reveal box */}
            <AnimatePresence>
              {shortenedResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider font-mono">
                      Short Link Created
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">
                      {shortenedResult.originalUrl}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white border border-blue-100 rounded-lg">
                    <a
                      href={`${window.location.origin}/r/${shortenedResult.shortCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-blue-604 hover:underline truncate pr-4 font-bold flex items-center gap-1.5"
                    >
                      {window.location.host}/r/{shortenedResult.shortCode}
                      <ExternalLink size={12} className="text-blue-400 shrink-0" />
                    </a>

                    <button
                      id="copy-main-link"
                      onClick={() => copyToClipboard(shortenedResult.shortCode, null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-xs font-bold rounded-lg text-white transition-colors cursor-pointer shrink-0"
                    >
                      {mainCopied ? (
                        <>
                          <Check size={12} />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recent Shortened Links list */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
              Recently Shortened Links
            </h2>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {recentLinks.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="min-w-0 pr-3 space-y-1">
                        <p className="text-xs text-slate-400 truncate max-w-[250px] sm:max-w-md font-medium">
                          {link.originalUrl}
                        </p>
                        
                        <a
                          href={`${window.location.origin}/r/${link.shortCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-blue-600 hover:underline font-bold inline-flex items-center gap-1"
                        >
                          {window.location.host}/r/{link.shortCode}
                          <ExternalLink size={10} className="text-blue-400 shrink-0" />
                        </a>
                      </div>

                      <button
                        onClick={() => copyToClipboard(link.shortCode, link.id)}
                        className={`flex items-center justify-center p-1.5 border rounded-lg transition-all shrink-0 cursor-pointer ${
                          copiedId === link.id
                            ? "bg-emerald-50 border-emerald-250 text-emerald-600"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        }`}
                        title="Copy Short URL"
                      >
                        {copiedId === link.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center space-y-1">
                  <p className="text-xs text-slate-400 font-semibold">
                    No links shortened yet
                  </p>
                  <p className="text-[11px] text-slate-400">
                    URLs you shorten in this session will display here.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Footer info block */}
      <footer className="text-center text-[11px] text-slate-400 font-medium">
        © 2026 Shortly. All rights reserved.
      </footer>
    </div>
  );
}
