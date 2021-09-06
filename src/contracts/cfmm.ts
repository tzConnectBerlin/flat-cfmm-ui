import { OpKind, WalletContract, WalletParamsWithKind } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import {
  AddLiquidityParams,
  CashToTokenParams,
  CfmmStorage,
  ErrorType,
  RemoveLiquidityParams,
  TokenToCashParams,
  UserBalance,
} from '../interfaces';
import { CFMM_ADDRESS, FA2_TOKEN_ID } from '../utils/globals';
import { getCfmmContract } from '../utils/settingUtils';
import { getTezosInstance } from './client';
import { initContract } from './utils';

let cfmm: WalletContract;
let LQTFa12: WalletContract | null = null;
let TokenFA2: WalletContract | null = null;
let CashFA12: WalletContract | null = null;

type FA12TokenType = 'ctez' | 'lqt';

export const getCfmmStorage = async (): Promise<CfmmStorage> => {
  const storage = await cfmm.storage<any>();
  return storage;
};

export const initContracts = async (address: string): Promise<void> => {
  cfmm = await initContract(address);
  const { tokenAddress, cashAddress, lqtAddress } = await getCfmmStorage();
  LQTFa12 = await initContract(lqtAddress);
  CashFA12 = await initContract(cashAddress);
  TokenFA2 = await initContract(tokenAddress);
};

export const getLQTContractStorage = async (): Promise<any> => {
  if (!LQTFa12) {
    throw new Error('LQT contract not initialized');
  }
  const storage: any = await LQTFa12.storage();
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
  const batchOps: WalletParamsWithKind[] = await getTokenAllowanceOps(
    CashFA12!,
    args.owner,
    args.maxTokensDeposited,
  );
  const batch = tezos.wallet.batch([
    ...batchOps,
    {
      kind: OpKind.TRANSACTION,
      ...TokenFA2!.methods
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
          args.amount * 1e6,
          args.deadline.toISOString(),
        )
        .toTransferParams(),
    },
    {
      kind: OpKind.TRANSACTION,
      ...TokenFA2!.methods
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
  const batchOps: WalletParamsWithKind[] = await getTokenAllowanceOps(
    LQTFa12!,
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
      ...LQTFa12!.methods.approve(CFMM_ADDRESS, 0).toTransferParams(),
    },
  ]);
  const hash = await batch.send();
  return hash.opHash;
};

export const cashToToken = async (args: CashToTokenParams): Promise<string> => {
  const tezos = getTezosInstance();
  const batchOps: WalletParamsWithKind[] = await getTokenAllowanceOps(
    CashFA12!,
    args.to,
    args.amount,
  );
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
      ...CashFA12!.methods.approve(CFMM_ADDRESS, 0).toTransferParams(),
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
      ...TokenFA2!.methods
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
      ...TokenFA2!.methods
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

export const getUserBalance = async (userAddress: string): Promise<UserBalance> => {
  const tezos = getTezosInstance();
  const cashFa12Storage: any = await CashFA12!.storage();
  const tokenFA2Storage: any = await TokenFA2!.storage();
  const cash = (new BigNumber(await cashFa12Storage.tokens.get(userAddress)) ?? 0)
    .shiftedBy(-6)
    .toNumber();
  const token = (new BigNumber(await tokenFA2Storage.assets.ledger.get(userAddress)) ?? 0)
    .shiftedBy(-6)
    .toNumber();
  const xtz = (new BigNumber(await tezos.tz.getBalance(userAddress)) ?? 0).shiftedBy(-6).toNumber();
  return {
    xtz,
    cash,
    token,
  };
};

export const cfmmError: ErrorType = {
  0: 'Token contract must have a transfer entrypoint',
  1: 'Assertion violated cash bought should be less than cash pool',
  2: 'Pending pool updates must be zero',
  3: 'The current time must be less than the deadline',
  4: 'Max tokens deposited must be greater than or equal to tokens deposited',
  5: 'LQT minted must be greater than min lqt minted',
  7: 'Only new manager can accept',
  8: 'Cash bought must be greater than or equal to min cash bought',
  9: 'Invalid "to" address',
  10: 'Amount must be zero',
  11: 'The amount of cash withdrawn must be greater than or equal to min cash withdrawn',
  12: 'LQT contract must have a mint or burn entrypoint',
  13: 'The amount of tokens withdrawn must be greater than or equal to min tokens withdrawn',
  14: 'Cannot burn more than the total amount of lqt',
  15: 'Token pool minus tokens withdrawn is negative',
  16: 'Cash pool minus Cash withdrawn is negative',
  17: 'Cash pool minus Cash bought is negative',
  18: 'Tokens bought must be greater than or equal to min tokens bought',
  19: 'Token pool minus tokens bought is negative',
  20: 'Only manager can set baker',
  21: 'Only manager can set manager',
  22: 'Baker permanently frozen',
  24: 'Lqt address already set',
  25: 'Call not from an implicit account',
  28: 'Invalid fa2 token contract missing balance_of',
  29: 'This entrypoint may only be called by getbalance of tokenaddress',
  30: 'This entrypoint may only be called by getbalance of cash address',
  31: 'Invalid intermediate contract',
  32: 'tez deposit would be burned',
  33: 'Invalid fa12 cash contract missing getbalance',
  34: 'Missing approve entrypoint in cash contract',
};
