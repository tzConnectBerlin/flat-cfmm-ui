import React, { Suspense, useEffect, useState } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { LocalizationProvider } from '@material-ui/pickers';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastProvider, DefaultToastContainer } from 'react-toast-notifications';
import DateFnsUtils from '@material-ui/pickers/adapter/date-fns';
import { WalletProvider } from './wallet/walletContext';
import { WalletInterface } from './interfaces';
import { initTezos, setWalletProvider } from './contracts/client';
import { APP_NAME, NETWORK, RPC_URL, RPC_PORT } from './utils/globals';
import { getBeaconInstance, isWalletConnected } from './wallet';
import { AppRouter } from './router';
import { initContracts } from './contracts/cfmm';
import { logger } from './utils/logger';
import { getNodePort, getNodeURL } from './utils/settingUtils';

const queryClient = new QueryClient();

/**
 * Hack to show errors above drawer
 */
const AppToastContainer: React.FC = (props: any) => {
  const newProps = { ...props, style: { zIndex: 9999 } };
  return <DefaultToastContainer {...newProps} />;
};

const App: React.FC = () => {
  const [wallet, setWallet] = useState<Partial<WalletInterface>>({});
  const checkWalletConnection = async () => {
    const prevUsedWallet = isWalletConnected();
    if (prevUsedWallet) {
      const walletData = await getBeaconInstance(APP_NAME, true, NETWORK);
      walletData?.wallet && setWalletProvider(walletData.wallet);
      walletData && setWallet(walletData);
    }
  };

  const nodeUrl = wallet.pkh ? getNodeURL(wallet.pkh) : RPC_URL;
  const nodePort = wallet.pkh ? getNodePort(wallet.pkh) : RPC_PORT;

  useEffect(() => {
    const setup = async () => {
      try {
        initTezos(nodeUrl ?? RPC_URL, nodePort ?? RPC_PORT);
        await checkWalletConnection();
        await initContracts();
      } catch (error) {
        logger.error(error);
      }
    };
    setup();
  }, [wallet.pkh, nodeUrl, nodePort]);

  return (
    <Suspense fallback="Loading...">
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <LocalizationProvider dateAdapter={DateFnsUtils}>
            <WalletProvider value={{ wallet, setWallet }}>
              <ToastProvider
                placement="bottom-right"
                components={{ ToastContainer: AppToastContainer }}
              >
                <AppRouter />
              </ToastProvider>
            </WalletProvider>
          </LocalizationProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </Suspense>
  );
};

export default App;
