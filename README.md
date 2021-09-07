# Flat CFMM UI

## How to start

0. Create `.env` file with required environment variables
1. `yarn install` to install dependencies
2. `yarn start` to start the app

## Environment Variables

- REACT_APP_APP_NAME: Title for the app. Will be used with taquito/Beacon
- REACT_APP_CFMM_CONTRACT: CFMM Contract Address
- REACT_APP_FA2_TOKEN_ID: Token id to use for FA2 Contract
- REACT_APP_NETWORK_TYPE: Network to use
- REACT_APP_RPC_URL: Node RPC URL
- REACT_APP_RPC_PORT: Node Port
- REACT_APP_TOKEN_SYMBOL: Token symbol to use in UI
- REACT_APP_CASH_SYMBOL: Cash symbol to use in UI

## Assumptions

1. Token is a single-asset FA2 Contract.
2. Cash is a FA1.2 contract.
3. Token and Cash both use `6` decimals.
