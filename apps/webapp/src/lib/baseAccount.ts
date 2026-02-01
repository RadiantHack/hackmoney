import { createBaseAccountSDK } from '@base-org/account';
import { base } from 'viem/chains';

// Singleton SDK instance for master account management
export const sdk = createBaseAccountSDK({
  appName: 'Family Crypto Cards',
  appLogoUrl: 'https://app.familycards.io/logo.png',
  appChainIds: [base.id],
  subAccounts: {
    creation: 'manual',
    defaultAccount: 'universal',
    funding: 'spend-permissions',
  },
});

export const getProvider = () => sdk.getProvider();
