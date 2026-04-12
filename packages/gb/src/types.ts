export type ProductGenreType = {
  id: number;
  name: string;
};

export type ProductGenresMapType = Map<string, ProductGenreType>; // by name

export type ProductPlatformType = {
  id: number;
  name: string;
};

export type ProductPlatformsMapType = Map<string, ProductPlatformType>; // by name

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

export type ProductProxyFromCSV = {
  id: number;
  skuId: number;
  skuCode: string;
  name: string;
  type: string;
  isPreorder: boolean;
  isSale: boolean;
};
