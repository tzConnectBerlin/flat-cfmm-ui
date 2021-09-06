import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { getCfmmStorage, getUserBalance } from '../contracts/cfmm';
import { Baker, BaseStats, CfmmStorage, UserBalance, UserLQTData } from '../interfaces';
import { getBaseStats, getUserLQTData } from './contracts';
import { getDelegates } from './tzkt';

export const useDelegates = (userAddress?: string) => {
  return useQuery<Baker[], AxiosError, Baker[]>(['delegates'], () => {
    return getDelegates(userAddress);
  });
};

export const useBaseStats = () => {
  return useQuery<BaseStats, AxiosError, BaseStats>(['baseStats'], async () => {
    return getBaseStats();
  });
};

export const useUserBalance = (userAddress?: string) => {
  return useQuery<UserBalance | undefined, AxiosError, UserBalance | undefined>(
    ['userBalance', userAddress],
    () => {
      if (userAddress) {
        return getUserBalance(userAddress);
      }
    },
  );
};
export const useCfmmStorage = () => {
  return useQuery<CfmmStorage, AxiosError, CfmmStorage>(
    ['cfmmStorage'],
    async () => {
      return getCfmmStorage();
    },
    {
      refetchInterval: 30000,
      staleTime: 3000,
    },
  );
};

export const useUserLqtData = (userAddress?: string) => {
  return useQuery<UserLQTData | undefined, AxiosError, UserLQTData | undefined>(
    ['userLqtData', userAddress],
    async () => {
      if (userAddress) {
        return getUserLQTData(userAddress);
      }
    },
    {
      refetchInterval: 30000,
      staleTime: 3000,
    },
  );
};
