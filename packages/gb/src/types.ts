export type ProductGenreType = {
  id: number;
  name: string;
};

export type ProductPlatformType = {
  id: number;
  name: string;
};

export type ProductType = {
  id: number;
  skuId: number;
  parentId: number | null;
  name: string;
  type: string;
  genres: ProductGenreType[];
  platforms: ProductPlatformType[];
  isPreorder: boolean;
};
