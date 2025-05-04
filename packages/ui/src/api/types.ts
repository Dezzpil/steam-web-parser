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
