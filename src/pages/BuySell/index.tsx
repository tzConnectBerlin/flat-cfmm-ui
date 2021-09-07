import React from 'react';
import { useTranslation } from 'react-i18next';
import { LinkList, LinkListProps } from '../../components/LinkList/LinkList';
import Page from '../../components/Page';
import { CASH_SYMBOL, TOKEN_SYMBOL } from '../../utils/globals';

export const BuySell: React.FC = () => {
  const { t } = useTranslation(['common', 'header']);

  const listItem: LinkListProps = {
    list: [
      {
        primary: t('addLiquidity'),
        to: '/buy-sell/add-liquidity',
      },
      {
        primary: t('removeLiquidity'),
        to: '/buy-sell/remove-liquidity',
      },
      {
        primary: `${CASH_SYMBOL} to ${TOKEN_SYMBOL}`,
        to: '/buy-sell/cash-to-token',
      },
      {
        primary: `${TOKEN_SYMBOL} to ${CASH_SYMBOL}`,
        to: '/buy-sell/token-to-cash',
      },
    ],
  };

  return (
    <Page>
      <LinkList {...listItem} />
    </Page>
  );
};
