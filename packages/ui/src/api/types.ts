export interface App {
  id: number;
  title: string;
  description: string;
  descriptionMini: string;
  linkToLogoImg: string;
  categories: string[];
  genre: string[];
  popularTags: string[];
  isDownloadableContent: boolean;
  releaseDate: string;
  developers: string[];
  reviewsSummaryExplain: string;
  reviewsSummaryCount: number;
  Online: AppOnline[];
  Price: AppPrice[];
}

export interface AppOnline {
  id: number;
  appId: number;
  createdAt: string;
  value: number;
}

export interface AppPrice {
  id: number;
  appId: number;
  createdAt: string;
  currency: string;
  initial: number;
  final: number;
  discount: number;
  initialFormatted: string;
  finalFormatted: string;
}

export interface AppWithRelations extends App {
  leftRelations: {
    rightId: number;
  }[];
}

export interface AppsResponse {
  apps: App[];
  total: number;
}

export interface QueueLengthResponse {
  length: number;
}

export interface StatsResponse {
  totalApps: number;
  freeApps: number;
  paidApps: number;
  downloadable: number;
  nonDownloadable: number;
}

export interface AppUrl {
  id: number;
  path: string;
  foundByTerm: string | null;
  createdAt: string;
  grabbedAt: string | null;
  App?: App | null;
}

export interface SearchResultsResponse {
  appUrls: AppUrl[];
  total: number;
}

export interface CrawlProcess {
  id: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  type: string;
  sortBy: string | null;
  status: string;
  error: string | null;
  seen: number;
  added: number;
}

export interface CrawlMessage {
  ts: number;
  text: string;
}

export interface CrawlingsResponse {
  items: CrawlProcess[];
  total: number;
}

export interface ActiveCrawlingResponse {
  process: CrawlProcess | null;
  messages: CrawlMessage[];
}

export interface PriceOnlineProcess {
  id: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  status: string;
  error: string | null;
  priceCollected: number;
  onlineCollected: number;
}

export interface PriceOnlineMessage {
  ts: number;
  text: string;
}

export interface PriceOnlineProcessesResponse {
  items: PriceOnlineProcess[];
  total: number;
}

export interface ActivePriceOnlineResponse {
  process: PriceOnlineProcess | null;
  messages: PriceOnlineMessage[];
}
