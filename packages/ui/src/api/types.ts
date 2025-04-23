export interface App {
  id: number;
  title: string;
  description: string;
  genre: string[];
  popularTags: string[];
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
