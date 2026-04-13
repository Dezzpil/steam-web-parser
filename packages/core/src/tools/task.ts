export type TaskType = {
  href: string;
  appId: number;
  forMainLoop: boolean;
  fromAppId?: number;
  title?: string;
};

export type TaskExtendedType = TaskType & {
  genre: string[];
  popularTags: string[];
  linkToLogoImg: string;
};
