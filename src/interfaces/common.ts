export interface ErrorType {
  [key: number]: string;
}

export type AddressTrimSizeType = 'small' | 'medium' | 'large';

export interface BaseStats {
  currentPrice: string;
  totalLiquidity: string;
  cashPool: string;
  tokenPool: string;
  [key: string]: string | number;
}

export interface UserOvenStats {
  totalOvens: number;
  xtz: number;
  ctez: number;
}
