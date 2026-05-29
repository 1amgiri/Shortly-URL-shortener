export interface User {
  id: string;
  name: string;
  email: string;
  subscriptionPlan: "Free" | "Pro" | "Enterprise";
  apiKey?: string;
  createdAt: string;
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

export interface DashboardStats {
  totalUrls: number;
  totalClicks: number;
  urls: URLRecord[];
  analytics: AnalyticsRecord[];
}
