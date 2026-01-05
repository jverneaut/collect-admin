export type DomainProfile = {
  domainId: string;
  sourceCrawlId?: string | null;
  name?: string | null;
  description?: string | null;
  primaryColorsJson?: string | null;
  styleTagsJson?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Technology = {
  id: string;
  slug: string;
  name: string;
  websiteUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Screenshot = {
  id: string;
  crawlId: string;
  kind: "FULL_PAGE" | "VIEWPORT" | string;
  isPublished?: boolean;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  storageKey?: string | null;
  publicUrl?: string | null;
  createdAt: string;
};

export type SectionScreenshot = {
  id: string;
  crawlId: string;
  index: number;
  isPublished?: boolean;
  clipJson?: string | null;
  elementJson?: string | null;
  clip?: unknown;
  element?: unknown;
  format?: string | null;
  storageKey?: string | null;
  publicUrl?: string | null;
  createdAt: string;
};

export type Job = {
  id: string;
  type: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | string;
  input: unknown;
  progress?: unknown;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  result?: unknown;
  error?: { message?: string } | null;
};

export type CrawlTask = {
  id: string;
  crawlId: string;
  type: "SCREENSHOT" | "TECHNOLOGIES" | "SECTIONS" | "CATEGORIES" | "CONTENT" | "COLORS" | string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | string;
  attempts: number;
  lastAttemptAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrawlCategory = {
  crawlId: string;
  categoryId: string;
  confidence?: number | null;
  category?: Category;
};

export type CrawlTechnology = {
  crawlId: string;
  technologyId: string;
  confidence?: number | null;
  technology?: Technology;
};

export type UrlCrawl = {
  id: string;
  urlId: string;
  crawlRunId?: string | null;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | string;
  isPublished?: boolean;
  startedAt?: string | null;
  finishedAt?: string | null;
  crawledAt?: string | null;
  httpStatus?: number | null;
  finalUrl?: string | null;
  title?: string | null;
  metaDescription?: string | null;
  language?: string | null;
  contentHash?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  screenshots?: Screenshot[];
  sections?: SectionScreenshot[];
  tasks?: CrawlTask[];
  categories?: CrawlCategory[];
  technologies?: CrawlTechnology[];
};

export type CrawlRun = {
  id: string;
  domainId: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | string;
  reviewStatus?: "PENDING_REVIEW" | "REVIEWED" | string;
  reviewedAt?: string | null;
  isPublished?: boolean;
  publishedAt?: string | null;
  tags?: string[];
  jobId?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  optionsJson?: unknown;
  createdAt: string;
  updatedAt: string;
};

export type Url = {
  id: string;
  domainId: string;
  path: string;
  normalizedUrl: string;
  type: "HOMEPAGE" | "ABOUT" | "CONTACT" | "PRICING" | "BLOG" | "CAREERS" | "DOCS" | "TERMS" | "PRIVACY" | "OTHER" | string;
  isCanonical: boolean;
  createdAt: string;
  updatedAt: string;
  crawls?: UrlCrawl[];
  crawlInRun?: UrlCrawl | null;
};

export type Domain = {
  id: string;
  host: string;
  canonicalUrl: string;
  displayName?: string | null;
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
  urlsCount?: number;
  profile?: DomainProfile | null;
  crawlRuns?: CrawlRun[];
  derived?: {
    homepageUrl: Url | null;
    homepageLatestCrawl: UrlCrawl | null;
    primaryCategory: Category | null;
    categories: Category[];
    technologies: Technology[];
    screenshot: Screenshot | null;
  };
  urls?: Url[];
};

export type DomainWithHomepage = Domain & {
  homepage?: (Url & { crawls?: UrlCrawl[] }) | null;
  urlsCount?: number;
};
