import { ComponentRoute } from '../interfaces/router';
import { BuySell } from '../pages/BuySell';
import { AddLiquidityPage } from '../pages/BuySell/AddLiquidity';
import { ConversionPage } from '../pages/BuySell/Conversion';
import { RemoveLiquidityPage } from '../pages/BuySell/RemoveLiquidity';
import { Settings } from '../pages/Settings';

export const routes: ComponentRoute[] = [
  {
    component: ConversionPage,
    path: '/buy-sell/token-to-cash',
    props: {
      formType: 'tokenToCash',
    },
  },
  {
    component: ConversionPage,
    path: '/buy-sell/cash-to-token',
    props: {
      formType: 'cashToToken',
    },
  },
  {
    component: RemoveLiquidityPage,
    path: '/buy-sell/remove-liquidity',
  },
  {
    component: AddLiquidityPage,
    path: '/buy-sell/add-liquidity',
  },
  {
    component: Settings,
    path: '/settings',
  },
  {
    component: BuySell,
    path: '/',
  },
];
