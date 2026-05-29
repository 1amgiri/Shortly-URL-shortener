import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Database, User, URLRecord, AnalyticsRecord } from "./server/db";
import { parseUserAgent, getClientGeo, getReferrer } from "./server/utils";

// Seed Database with elegant starter records (mock clicks, tags, etc.)
Database.seedInitialData();

const app = express();
const PORT = 3000;

app.use(express.json());

// Express Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mock Authentication Helper
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. Token missing or invalid." });
  }
  const token = authHeader.split(" ")[1];
  
  // Custom simple token routing
  if (token === "demo-token") {
    const cachedUser = Database.getUserById("usr_demo");
    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }
  }

  // Token might be user ID directly for robust demo-session mock state
  const foundUser = Database.getUserById(token);
  if (foundUser) {
    req.user = foundUser;
    return next();
  }

  return res.status(401).json({ error: "Invalid auth token." });
}

// Extend Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// ==========================================
// API Endpoints
// ==========================================

// --- Authentication ---
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All profile fields are required." });
  }

  const existing = Database.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: "An account with this email already exists." });
  }

  const newUser = Database.createUser({
    name,
    email,
    passwordHash: password, // simple hash for demo
  });

  return res.json({
    success: true,
    token: newUser.id,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      subscriptionPlan: newUser.subscriptionPlan,
      apiKey: newUser.apiKey,
    },
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = Database.getUserByEmail(email);
  if (!user || user.passwordHash !== password) {
    return res.status(400).json({ error: "Invalid email or password combination." });
  }

  return res.json({
    success: true,
    token: user.id,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      apiKey: user.apiKey,
    },
  });
});

app.get("/api/auth/me", authenticate, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not logged in" });
  return res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      subscriptionPlan: req.user.subscriptionPlan,
      apiKey: req.user.apiKey,
    },
  });
});

// Update profile / Subscription simulation
app.post("/api/auth/profile", authenticate, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not logged in" });
  const { name, email, subscriptionPlan } = req.body;
  
  const updated = Database.updateUser(req.user.id, {
    ...(name && { name }),
    ...(email && { email }),
    ...(subscriptionPlan && { subscriptionPlan }),
  });

  if (updated) {
    return res.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        subscriptionPlan: updated.subscriptionPlan,
        apiKey: updated.apiKey,
      },
    });
  }
  return res.status(400).json({ error: "Update failed." });
});

// Rotate API Key
app.post("/api/auth/key-rotate", authenticate, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not logged in" });
  const newKey = "sk_" + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 15);
  Database.updateUser(req.user.id, { apiKey: newKey });
  return res.json({ success: true, apiKey: newKey });
});

// --- URL Management ---

// Create URL
app.post("/api/urls", (req, res) => {
  const { originalUrl, customAlias, expiresAt, password, title, description, tags } = req.body;
  if (!originalUrl) {
    return res.status(400).json({ error: "Original URL is required." });
  }

  // Basic URL prefix formatting
  let formattedUrl = originalUrl.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = "https://" + formattedUrl;
  }

  // Check if alias is taken
  if (customAlias) {
    const aliasInUse = Database.getURLByCode(customAlias);
    if (aliasInUse) {
      return res.status(400).json({ error: `The custom seal/alias '${customAlias}' is already in use by another link.` });
    }
  }

  // Extract optional token from headers to associate user
  let activeUserId: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const user = Database.getUserById(token);
    if (user) {
      activeUserId = user.id;
    }
  }

  // Check limits for free plans if authenticating
  if (activeUserId) {
    const user = Database.getUserById(activeUserId);
    const userUrlsCount = Database.getURLs().filter((u) => u.userId === activeUserId).length;
    if (user && user.subscriptionPlan === "Free" && userUrlsCount >= 5) {
      return res.status(403).json({
        error: "Free Plan limit exceeded (Max 5 URLs). Upgrade to Pro for unlimited links."
      });
    }
  }

  // Create standard random 6 character code
  let code = "";
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codeIsUnique = false;
  let attempts = 0;

  while (!codeIsUnique && attempts < 10) {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const checkObj = Database.getURLByCode(code);
    if (!checkObj) {
      codeIsUnique = true;
    }
    attempts++;
  }

  const freshURL = Database.createURL({
    userId: activeUserId,
    originalUrl: formattedUrl,
    shortCode: code,
    customAlias: customAlias || undefined,
    expiresAt: expiresAt || undefined,
    password: password || undefined,
    title: title || originalUrl.replace(/^https?:\/\//i, "").split("/")[0], // fallback title
    description: description || undefined,
    tags: tags || [],
  });

  return res.json({ success: true, url: freshURL });
});

// Bulk Shorten URL
app.post("/api/urls/bulk", authenticate, (req, res) => {
  const { urlsList } = req.body; // Array of objects containing originalUrl
  if (!urlsList || !Array.isArray(urlsList) || urlsList.length === 0) {
    return res.status(400).json({ error: "Missing or invalid list of URLs for bulk treatment." });
  }

  const results: URLRecord[] = [];
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (const item of urlsList) {
    if (!item.originalUrl) continue;
    let target = item.originalUrl.trim();
    if (!/^https?:\/\//i.test(target)) {
      target = "https://" + target;
    }

    let code = "";
    let codeIsUnique = false;
    let attempts = 0;
    while (!codeIsUnique && attempts < 5) {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!Database.getURLByCode(code)) codeIsUnique = true;
      attempts++;
    }

    const createdRecord = Database.createURL({
      userId: req.user!.id,
      originalUrl: target,
      shortCode: code,
      title: item.title || target.replace(/^https?:\/\//i, "").split("/")[0],
      description: item.description || undefined,
      tags: item.tags || [],
    });
    results.push(createdRecord);
  }

  return res.json({ success: true, urls: results });
});

// List User URLs
app.get("/api/urls", authenticate, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const list = Database.getURLs().filter((u) => u.userId === req.user!.id);
  return res.json({ success: true, urls: list });
});

// Edit URL
app.put("/api/urls/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const { originalUrl, customAlias, expiresAt, password, title, description, tags, isActive } = req.body;

  const originalRecord = Database.getURLs().find((u) => u.id === id);
  if (!originalRecord || originalRecord.userId !== req.user!.id) {
    return res.status(404).json({ error: "URL record not found or access denied." });
  }

  // If changing customAlias, verify it's not custom-alias collision
  if (customAlias && customAlias !== originalRecord.customAlias) {
    const aliasInUse = Database.getURLByCode(customAlias);
    if (aliasInUse && aliasInUse.id !== id) {
      return res.status(400).json({ error: "Custom alias already claimed." });
    }
  }

  const updated = Database.updateURL(id, {
    ...(originalUrl && { originalUrl }),
    customAlias: customAlias || undefined,
    expiresAt: expiresAt || undefined,
    password: password || undefined,
    title: title || originalRecord.title,
    description: description || undefined,
    tags: tags || undefined,
    isActive: typeof isActive === "boolean" ? isActive : originalRecord.isActive,
  });

  return res.json({ success: true, url: updated });
});

// Delete URL
app.delete("/api/urls/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const originalRecord = Database.getURLs().find((u) => u.id === id);
  if (!originalRecord || originalRecord.userId !== req.user!.id) {
    return res.status(404).json({ error: "URL not search-found or access denied." });
  }

  Database.deleteURL(id);
  return res.json({ success: true, message: "URL deleted successfully." });
});

// --- Analytics Dashboard API ---
app.get("/api/analytics", authenticate, (req, res) => {
  const userUrls = Database.getURLs().filter((u) => u.userId === req.user!.id);
  const userUrlIds = userUrls.map((u) => u.id);

  // Filter global analytics files
  const userAnalytics = Database.getAnalytics().filter((a) => userUrlIds.includes(a.urlId));

  // Build high level dashboard payload
  return res.json({
    success: true,
    totalUrls: userUrls.length,
    totalClicks: userAnalytics.length,
    urls: userUrls,
    analytics: userAnalytics,
  });
});

// Get Analytics for a specific URL
app.get("/api/analytics/:urlId", authenticate, (req, res) => {
  const urlId = req.params.urlId;
  const urlRecord = Database.getURLs().find((u) => u.id === urlId);
  
  if (!urlRecord || urlRecord.userId !== req.user!.id) {
    return res.status(404).json({ error: "URL not found or unauthorized access." });
  }

  const urlAnalytics = Database.getAnalyticsByUrlId(urlId);
  return res.json({
    success: true,
    url: urlRecord,
    analytics: urlAnalytics
  });
});

// CSV Export Endpoint
app.get("/api/analytics/export/:urlId", authenticate, (req, res) => {
  const { urlId } = req.params;
  const urlRecord = Database.getURLs().find((u) => u.id === urlId);
  
  if (!urlRecord || urlRecord.userId !== req.user!.id) {
    return res.status(404).json({ error: "Analyse file block or access denied." });
  }

  const urlAnalytics = Database.getAnalyticsByUrlId(urlId);
  
  // Format as CSV content
  let csv = "ID,IP Address,Country,City,Browser,Device,Referrer,Timestamp\r\n";
  for (const row of urlAnalytics) {
    csv += `${row.id},"${row.ipAddress}","${row.country}","${row.city}","${row.browser}","${row.device}","${row.referrer}","${row.timestamp}"\r\n`;
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=analytics_${urlRecord.shortCode}.csv`);
  return res.status(200).send(csv);
});

// ==========================================
// Immediate Redirection Engine (/:code)
// ==========================================
app.get("/r/:code", (req, res, next) => {
  const code = req.params.code;
  const record = Database.getURLByCode(code);

  if (!record || !record.isActive) {
    return next(); // Let standard client routes handle fallback (not found card)
  }

  // Check expiration date
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    return res.status(410).send(`
      <html>
        <head><title>Link Expired | URL Shortener</title></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #0f172a; color: white;">
          <div style="text-align: center; border: 1px solid #334155; padding: 2.5rem; border-radius: 12px; background: #1e293b; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #ef4444; margin-top: 0;">Link Expired</h1>
            <p>We apologize, but this URL shortened link expired on ${new Date(record.expiresAt).toLocaleString()}.</p>
            <a href="/" style="display: inline-block; margin-top: 1.5rem; color: #3b82f6; text-decoration: none; font-weight: 500;">Go to URL Shortener homepage &rarr;</a>
          </div>
        </body>
      </html>
    `);
  }

  // Check password prompt
  if (record.password) {
    const providedPass = req.query.p;
    if (providedPass !== record.password) {
      // Return a professional browser portal asking for password
      return res.status(403).send(`
        <html>
          <head>
            <title>Password Protected Link</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #0f172a; color: white;">
            <div style="text-align: center; border: 1px solid #334155; padding: 2.5rem; border-radius: 12px; max-width: 400px; width: 90%; background: #1e293b; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <h1 style="font-size: 1.5rem; margin-top: 0; margin-bottom: 0.5rem;">Password Required</h1>
              <p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem;">This destination URL is password-protected by its author.</p>
              
              <form method="GET" action="">
                <input type="password" name="p" placeholder="Enter Access Password" required style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #475569; padding: 0.75rem; border-radius: 6px; color: white; text-align: center; font-size: 1rem; margin-bottom: 1rem;"/>
                <input type="submit" value="Unlock & Redirect &rarr;" style="width: 100%; background: #2563eb; color: white; border: none; padding: 0.75rem; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'"/>
              </form>
            </div>
          </body>
        </html>
      `);
    }
  }

  // Parse telemetry details for visitors
  const ipInfo = getClientGeo(req);
  const uaInfo = parseUserAgent(req.headers["user-agent"]);
  const referrer = getReferrer(req);

  // Record Click
  Database.recordClick(record.id, {
    ipAddress: ipInfo.ipAddress,
    country: ipInfo.country,
    city: ipInfo.city,
    browser: uaInfo.browser,
    device: uaInfo.device,
    referrer: referrer,
  });

  // Execute Redirect
  return res.redirect(302, record.originalUrl);
});

// Fallback direct alias or shortcode redirect without '/r/' prefix (e.g. localhost:3000/react)
app.get("/:code", (req, res, next) => {
  const code = req.params.code;
  
  // Forbidden routing keywords that must NOT be treated as short codes
  const reservedWords = [
    "api", "assets", "src", "index.html", "dashboard", 
    "analytics", "profile", "pricing", "features", "login", "register"
  ];

  if (reservedWords.includes(code.toLowerCase()) || code.includes(".")) {
    return next();
  }

  const record = Database.getURLByCode(code);
  if (record && record.isActive) {
    return res.redirect(302, `/r/${code}`); // chain to main redirect validator
  }
  next();
});

// ==========================================
// Vite Server Ingress / Static Assets Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamic Vite middleware for speedy dev loading
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express application booted in [${process.env.NODE_ENV || "development"}] mode.`);
    console.log(`Server bound to port ${PORT} at host 0.0.0.0`);
  });
}

startServer();
