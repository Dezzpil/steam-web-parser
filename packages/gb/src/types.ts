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
  skuCode: string;
  parentId: number | null;
  name: string;
  type: string;
  genres: ProductGenreType[];
  platforms: ProductPlatformType[];
  isPreorder: boolean;
  isSale: boolean;
  priceStandart: number;
  priceActual: number;
  currency: string;
};
