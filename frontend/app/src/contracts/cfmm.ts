import { OpKind, WalletContract, WalletParamsWithKind } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import {
  AddLiquidityParams,
  CashToTokenParams,
  CfmmStorage,
  ErrorType,
  RemoveLiquidityParams,
  TokenToCashParams,
  TokenToTokenParams,
} from '../interfaces';
import { CFMM_ADDRESS, FA2_TOKEN_ID } from '../utils/globals';
import { getTezosInstance } from './client';
import { getCTezFa12Contract, getLQTContract } from './fa12';
import { executeMethod, initContract } from './utils';

let cfmm: WalletContract;
let token: WalletContract;

type FA12TokenType = 'ctez' | 'lqt';

export const initCfmm = async (address: string, tokenAddress: string): Promise<void> => {
  cfmm = await initContract(address);
  token = await initContract(tokenAddress);
};

export const getCfmmStorage = async (): Promise<CfmmStorage> => {
  const storage = await cfmm.storage<any>();
  return storage;
};

export const getLQTContractStorage = async (): Promise<any> => {
  const lqtContract = await getLQTContract();
  const storage: any = await lqtContract.storage();
  return storage;
};

export const getTokenAllowanceOps = async (
  tokenContract: WalletContract,
  userAddress: string,
  newAllowance: number,
  tokenType: FA12TokenType = 'ctez',
): Promise<WalletParamsWithKind[]> => {
  const batchOps: WalletParamsWithKind[] = [];
  const maxTokensDeposited = tokenType === 'ctez' ? newAllowance * 1e6 : newAllowance;
  console.log(maxTokensDeposited);
  const storage: any = await tokenContract.storage();
  const currentAllowance = new BigNumber(
    (await storage.allowances.get({ owner: userAddress, spender: CFMM_ADDRESS })) ?? 0,
  )
    .shiftedBy(-6)
    .toNumber();
  if (currentAllowance < newAllowance) {
    if (currentAllowance > 0) {
      batchOps.push({
        kind: OpKind.TRANSACTION,
        ...tokenContract.methods.approve(CFMM_ADDRESS, 0).toTransferParams(),
      });
    }
    batchOps.push({
      kind: OpKind.TRANSACTION,
      ...tokenContract.methods.approve(CFMM_ADDRESS, maxTokensDeposited).toTransferParams(),
    });
  }
  return batchOps;
};

export const addLiquidity = async (args: AddLiquidityParams): Promise<string> => {
  const tezos = getTezosInstance();
  const CTezFa12 = await getCTezFa12Contract();
  const batchOps: WalletParamsWithKind[] = await getTokenAllowanceOps(
    CTezFa12,
    args.owner,
    args.maxTokensDeposited,
  );
  const batch = tezos.wallet.batch([
    ...batchOps,
    {
      kind: OpKind.TRANSACTION,
      ...token.methods
        .update_operators([
          {
            add_operator: {
              owner: args.owner,
              operator: CFMM_ADDRESS,
              token_id: FA2_TOKEN_ID,
            },
          },
        ])
        .toTransferParams(),
    },
    {
      kind: OpKind.TRANSACTION,
      ...cfmm.methods
        .addLiquidity(
          args.owner,
          args.minLqtMinted,
          args.maxTokensDeposited * 1e6,
          args.maxTokensDeposited * 1e6,
          args.deadline.toISOString(),
        )
        .toTransferParams(),
    },
    {
      kind: OpKind.TRANSACTION,
      ...token.methods
        .update_operators([
          {
            remove_operator: {
              owner: args.owner,
              operator: CFMM_ADDRESS,
              token_id: FA2_TOKEN_ID,
            },
          },
        ])
        .toTransferParams(),
    },
  ]);
  const hash = await batch.send();
  return hash.opHash;
};

export const removeLiquidity = async (
  args: RemoveLiquidityParams,
  userAddress: string,
): Promise<string> => {
  const tezos = getTezosInstance();
  const LQTFa12 = await getLQTContract();
  const batchOps: WalletParamsWithKind[] = await getTokenAllowanceOps(
    LQTFa12,
    userAddress,
    args.lqtBurned,
    'lqt',
  );
  const batch = tezos.wallet.batch([
    ...batchOps,
    {
      kind: OpKind.TRANSACTION,
      ...cfmm.methods
        .removeLiquidity(
          args.to,
          args.lqtBurned,
          args.minCashWithdrawn * 1e6,
          args.minTokensWithdrawn * 1e6,
          args.deadline.toISOString(),
        )
        .toTransferParams(),
    },
    {
      kind: OpKind.TRANSACTION,
      ...LQTFa12.methods.approve(CFMM_ADDRESS, 0).toTransferParams(),
    },
  ]);
  const hash = await batch.send();
  return hash.opHash;
};

export const cashToToken = async (args: CashToTokenParams): Promise<string> => {
  const tezos = getTezosInstance();
  const CTezFa12 = await getCTezFa12Contract();
  const batchOps: WalletParamsWithKind[] = await getTokenAllowanceOps(
    CTezFa12,
    args.to,
    args.amount,
  );
  console.log(args.to, args.minTokensBought * 1e6, args.amount * 1e6, args.deadline.toISOString());
  const batch = tezos.wallet.batch([
    ...batchOps,
    {
      kind: OpKind.TRANSACTION,
      ...cfmm.methods
        .cashToToken(
          args.to,
          Math.floor(args.minTokensBought * 1e6),
          Math.floor(args.amount * 1e6),
          args.deadline.toISOString(),
        )
        .toTransferParams(),
    },
    {
      kind: OpKind.TRANSACTION,
      ...CTezFa12.methods.approve(CFMM_ADDRESS, 0).toTransferParams(),
    },
  ]);
  const hash = await batch.send();
  return hash.opHash;
};

export const tokenToCash = async (
  args: TokenToCashParams,
  userAddress: string,
): Promise<string> => {
  const tezos = getTezosInstance();

  const batch = tezos.wallet.batch([
    {
      kind: OpKind.TRANSACTION,
      ...token.methods
        .update_operators([
          {
            add_operator: {
              owner: userAddress,
              operator: CFMM_ADDRESS,
              token_id: FA2_TOKEN_ID,
            },
          },
        ])
        .toTransferParams(),
    },
    {
      kind: OpKind.TRANSACTION,
      ...cfmm.methods
        .tokenToCash(
          args.to,
          args.tokensSold * 1e6,
          args.minCashBought * 1e6,
          args.deadline.toISOString(),
        )
        .toTransferParams(),
    },
    {
      kind: OpKind.TRANSACTION,
      ...token.methods
        .update_operators([
          {
            remove_operator: {
              owner: userAddress,
              operator: CFMM_ADDRESS,
              token_id: FA2_TOKEN_ID,
            },
          },
        ])
        .toTransferParams(),
    },
  ]);
  const hash = await batch.send();
  return hash.opHash;
};

export const tokenToToken = async (args: TokenToTokenParams): Promise<string> => {
  const hash = await executeMethod(cfmm, 'tokenToToken', [
    args.outputCfmmContract,
    args.minTokensBought * 1e6,
    args.to,
    args.tokensSold * 1e6,
    args.deadline.toISOString(),
  ]);
  return hash;
};

/**
 * TODO: Move errors to translations
 */
export const cfmmError: ErrorType = {
  0: 'Token contract must have a transfer entrypoint',
  1: 'Assertion violated cash bought should be less than tez pool',
  2: 'Pending pool updates must be zero',
  3: 'The current time must be less than the deadline',
  4: 'Max tokens deposited must be greater than or equal to tokens deposited',
  5: 'LQT minted must be greater than min lqt minted',
  7: 'Only new manager can accept',
  8: 'tez bought must be greater than or equal to min tez bought',
  9: 'Invalid to address',
  10: 'Amount must be zero',
  11: 'The amount of tez withdrawn must be greater than or equal to min tez withdrawn',
  12: 'LQT contract must have a mint or burn entrypoint',
  13: 'The amount of tokens withdrawn must be greater than or equal to min tokens withdrawn',
  14: 'Cannot burn more than the total amount of lqt',
  15: 'Token pool minus tokens withdrawn is negative',
  16: 'tez pool minus tez withdrawn is negative',
  17: 'tez pool minus tez bought is negative',
  18: 'Tokens bought must be greater than or equal to min tokens bought',
  19: 'Token pool minus tokens bought is negative',
  20: 'Only manager can set baker',
  21: 'Only manager can set manager',
  22: 'Baker permanently frozen',
  24: 'Lqt address already set',
  25: 'Call not from an implicit account',
  28: 'Invalid fa12 token contract missing getbalance',
  29: 'This entrypoint may only be called by getbalance of tokenaddress',
  31: 'Invalid intermediate contract',
  30: 'This entrypoint may only be called by getbalance of tez address',
  32: 'tez deposit would be burned',
  33: 'Invalid fa12 tez contract missing getbalance',
  34: 'Missing approve entrypoint in tez contract',
  35: 'Cannot get cfmm price entrypoint from consumer',
};
