import fs from "fs";
import path from "path";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  apiKey?: string;
  subscriptionPlan: "Free" | "Pro" | "Enterprise";
}

export interface URLRecord {
  id: string;
  userId: string | null;
  originalUrl: string;
  shortCode: string;
  customAlias?: string;
  clicks: number;
  createdAt: string;
  expiresAt?: string;
  password?: string;
  title?: string;
  description?: string;
  tags?: string[];
  isActive: boolean;
}

export interface AnalyticsRecord {
  id: string;
  urlId: string;
  ipAddress: string;
  country: string;
  city: string;
  browser: string;
  device: string;
  referrer: string;
  timestamp: string;
}

export interface APIKeyRecord {
  id: string;
  userId: string;
  name: string;
  key: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  urls: URLRecord[];
  analytics: AnalyticsRecord[];
  apiKeys: APIKeyRecord[];
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

function ensureDbExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      users: [],
      urls: [],
      analytics: [],
      apiKeys: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
  }
}

export class Database {
  private static read(): DatabaseSchema {
    ensureDbExists();
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content) as DatabaseSchema;
    } catch {
      return { users: [], urls: [], analytics: [], apiKeys: [] };
    }
  }

  private static write(data: DatabaseSchema) {
    ensureDbExists();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  }

  // --- Users ---
  static getUsers(): User[] {
    return this.read().users;
  }

  static getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  static getUserByEmail(email: string): User | undefined {
    return this.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  static getUserByApiKey(apiKey: string): User | undefined {
    return this.getUsers().find((u) => u.apiKey === apiKey);
  }

  static createUser(user: Omit<User, "id" | "createdAt" | "subscriptionPlan">): User {
    const db = this.read();
    const newUser: User = {
      ...user,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
      subscriptionPlan: "Free",
      apiKey: "sk_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    };
    db.users.push(newUser);
    this.write(db);
    return newUser;
  }

  static updateUser(id: string, updates: Partial<User>): User | undefined {
    const db = this.read();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) return undefined;
    db.users[index] = { ...db.users[index], ...updates };
    this.write(db);
    return db.users[index];
  }

  // --- URLs ---
  static getURLs(): URLRecord[] {
    return this.read().urls;
  }

  static getURLByCode(code: string): URLRecord | undefined {
    return this.getURLs().find((u) => u.shortCode === code || u.customAlias === code);
  }

  static createURL(url: Omit<URLRecord, "id" | "clicks" | "createdAt" | "isActive">): URLRecord {
    const db = this.read();
    const newURL: URLRecord = {
      ...url,
      id: Math.random().toString(36).substring(2, 11),
      clicks: 0,
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    db.urls.push(newURL);
    this.write(db);
    return newURL;
  }

  static updateURL(id: string, updates: Partial<URLRecord>): URLRecord | undefined {
    const db = this.read();
    const index = db.urls.findIndex((u) => u.id === id);
    if (index === -1) return undefined;
    db.urls[index] = { ...db.urls[index], ...updates };
    this.write(db);
    return db.urls[index];
  }

  static deleteURL(id: string): boolean {
    const db = this.read();
    const lengthBefore = db.urls.length;
    db.urls = db.urls.filter((u) => u.id !== id);
    // Also cleanup analytics for that URL
    db.analytics = db.analytics.filter((a) => a.urlId !== id);
    this.write(db);
    return db.urls.length < lengthBefore;
  }

  // --- Analytics ---
  static getAnalytics(): AnalyticsRecord[] {
    return this.read().analytics;
  }

  static getAnalyticsByUrlId(urlId: string): AnalyticsRecord[] {
    return this.getAnalytics().filter((a) => a.urlId === urlId);
  }

  static recordClick(urlId: string, info: Omit<AnalyticsRecord, "id" | "urlId" | "timestamp">) {
    const db = this.read();
    const newAnalytics: AnalyticsRecord = {
      ...info,
      id: Math.random().toString(36).substring(2, 11),
      urlId,
      timestamp: new Date().toISOString(),
    };
    db.analytics.push(newAnalytics);

    // Increment click counter on the URL
    const urlIndex = db.urls.findIndex((u) => u.id === urlId);
    if (urlIndex !== -1) {
      db.urls[urlIndex].clicks += 1;
    }

    this.write(db);
    return newAnalytics;
  }

  // Seed standard elegant analytics details on start if empty
  static seedInitialData() {
    ensureDbExists();
    const db = this.read();
    if (db.urls.length > 0) return; // already has data

    // Seed mock active user
    const mockUser: User = {
      id: "usr_demo",
      name: "Alex Rivera",
      email: "demo@example.com",
      passwordHash: "demo123", // simplified
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      apiKey: "sk_live_demourlshortenerkey",
      subscriptionPlan: "Pro"
    };

    // Seed mock URLs
    const urls: URLRecord[] = [
      {
        id: "url_1",
        userId: "usr_demo",
        originalUrl: "https://github.com/facebook/react",
        shortCode: "react",
        clicks: 342,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        title: "React GitHub Official",
        description: "Official repository of the React library.",
        tags: ["tech", "frontend", "github"],
        isActive: true
      },
      {
        id: "url_2",
        userId: "usr_demo",
        originalUrl: "https://news.ycombinator.com",
        shortCode: "hn",
        clicks: 189,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Hacker News",
        description: "Y Combinator news feed for technology and startups.",
        tags: ["tech", "startups"],
        isActive: true
      },
      {
        id: "url_3",
        userId: "usr_demo",
        originalUrl: "https://tailwindcss.com/docs/installation",
        shortCode: "tailwind",
        clicks: 84,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Tailwind CSS Documentation",
        description: "The official design reference and installation docs for utility CSS framework.",
        tags: ["design", "css"],
        isActive: true
      }
    ];

    // Seed mock Analytics
    const countries = ["United States", "India", "United Kingdom", "Germany", "Japan", "Canada", "Australia", "France"];
    const cities: Record<string, string[]> = {
      "United States": ["New York", "San Francisco", "Austin", "Seattle", "Chicago"],
      "India": ["Bengaluru", "Mumbai", "Delhi", "Pune", "Hyderabad"],
      "United Kingdom": ["London", "Manchester", "Edinburgh", "Birmingham"],
      "Germany": ["Berlin", "Munich", "Frankfurt", "Hamburg"],
      "Japan": ["Tokyo", "Osaka", "Kyoto", "Yokohama"],
      "Canada": ["Toronto", "Vancouver", "Montreal"],
      "Australia": ["Sydney", "Melbourne", "Brisbane"],
      "France": ["Paris", "Lyon", "Marseille"]
    };
    const browsers = ["Chrome", "Safari", "Firefox", "Edge", "Brave"];
    const devices = ["Mobile", "Desktop", "Tablet"];
    const referrers = ["Direct", "Twitter / X", "LinkedIn", "Hacker News", "Google", "GitHub", "Product Hunt"];

    const analytics: AnalyticsRecord[] = [];

    // Helper to generate seed analytic entries
    for (const url of urls) {
      const clickCount = url.clicks;
      const numDays = 15;
      for (let i = 0; i < clickCount; i++) {
        const country = countries[Math.floor(Math.random() * countries.length)];
        const cityList = cities[country] || ["Capital"];
        const city = cityList[Math.floor(Math.random() * cityList.length)];
        const browser = browsers[Math.floor(Math.random() * browsers.length)];
        const device = devices[Math.floor(Math.random() * devices.length)];
        const referrer = i % 5 === 0 ? "Direct" : referrers[Math.floor(Math.random() * referrers.length)];

        // Random stamp distributed over the last numDays
        const offsetMs = Math.random() * numDays * 24 * 60 * 60 * 1000;
        const timestamp = new Date(Date.now() - offsetMs).toISOString();

        analytics.push({
          id: `an_${url.id}_${i}`,
          urlId: url.id,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
          country,
          city,
          browser,
          device,
          referrer,
          timestamp,
        });
      }
    }

    db.users.push(mockUser);
    db.urls.push(...urls);
    db.analytics.push(...analytics);
    this.write(db);
    console.log("Database seeded successfully with dynamic data.");
  }
}
