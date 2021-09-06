import BigNumber from 'bignumber.js';
import { getCfmmStorage, getLQTContractStorage } from '../contracts/cfmm';
import { BaseStats, UserLQTData } from '../interfaces';

export const getBaseStats = async (): Promise<BaseStats> => {
  const cfmmStorage = await getCfmmStorage();
  const { cashPool, tokenPool } = cfmmStorage;
  const currentPrice = cfmmStorage.cashPool.toNumber() / cfmmStorage.tokenPool.toNumber();
  const totalLiquidity = (cfmmStorage.cashPool.toNumber() * 2) / 1e6;
  return {
    cashPool: (cashPool.toNumber() / 1e6).toFixed(6),
    tokenPool: (tokenPool.toNumber() / 1e6).toFixed(6),
    currentPrice: currentPrice.toFixed(6),
    totalLiquidity: totalLiquidity.toFixed(2),
  };
};

export const getUserLQTData = async (userAddress: string): Promise<UserLQTData> => {
  const cfmmStorage = await getCfmmStorage();
  const lqtTokenStorage = await getLQTContractStorage();
  const userLqtBalance: BigNumber =
    (await lqtTokenStorage.tokens.get(userAddress)) ?? new BigNumber(0);
  return {
    lqt: userLqtBalance.toNumber(),
    lqtShare: Number(
      ((userLqtBalance.toNumber() / cfmmStorage.lqtTotal.toNumber()) * 100).toFixed(2),
    ),
  };
};
