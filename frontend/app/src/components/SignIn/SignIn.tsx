import { Box, Button, Grid } from '@material-ui/core';
import styled from '@emotion/styled';
import { GiWallet } from 'react-icons/gi';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setWalletProvider } from '../../contracts/client';
import { APP_NAME, NETWORK } from '../../utils/globals';
import { getBeaconInstance } from '../../wallet';
import { useWallet } from '../../wallet/hooks';
import Identicon from '../Identicon';
import ProfilePopover from '../ProfilePopover';
import { useUserBalance, useUserLqtData } from '../../api/queries';

const SignedInBoxStyled = styled(Box)`
  cursor: pointer;
`;

export const SignIn: React.FC = () => {
  const { t } = useTranslation(['header']);
  const [{ wallet, pkh: userAddress, network }, setWallet, disconnectWallet] = useWallet();
  const [isOpen, setOpen] = useState(false);
  const { data: balance } = useUserBalance(userAddress);
  const { data: userLqtData } = useUserLqtData(userAddress);
  const connectWallet = async () => {
    const newWallet = await getBeaconInstance(APP_NAME, true, NETWORK);
    newWallet?.wallet && setWalletProvider(newWallet.wallet);
    newWallet && setWallet(newWallet);
  };

  const onWalletDisconnect = () => {
    setOpen(false);
    disconnectWallet();
  };

  return (
    <div>
      <Grid container direction="row" style={{ flexWrap: 'nowrap' }} spacing={1}>
        {!wallet ? (
          <Grid item>
            <Button
              variant="outlined"
              onClick={connectWallet}
              sx={{ textTransform: 'none' }}
              endIcon={<GiWallet />}
            >
              {t('signIn')}
            </Button>
          </Grid>
        ) : (
          <Grid item>
            <SignedInBoxStyled>
              <Identicon seed={userAddress ?? ''} onClick={() => setOpen(true)} type="tzKtCat" />
              <ProfilePopover
                isOpen={isOpen}
                onClose={() => setOpen(false)}
                handleAction={onWalletDisconnect}
                address={userAddress ?? ''}
                network={network ?? ''}
                actionText={t('signOut')}
                balance={balance}
                lqt={userLqtData?.lqt || 0}
                lqtShare={userLqtData?.lqtShare || 0}
              />
            </SignedInBoxStyled>
          </Grid>
        )}
      </Grid>
    </div>
  );
};
