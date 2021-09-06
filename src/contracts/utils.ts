import { ContractAbstraction, Wallet } from '@taquito/taquito';
import { getTezosInstance } from './client';

export const initContract = async (
  address: string | null = null,
): Promise<ContractAbstraction<Wallet>> => {
  const tezos = getTezosInstance();
  if (!address || tezos === null) {
    throw new Error('contract address not set or Tezos not initialized');
  }
  const contract = await tezos.wallet.at(address);
  return contract;
};
