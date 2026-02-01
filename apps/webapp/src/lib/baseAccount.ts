import { createBaseAccountSDK } from '@base-org/account';
import { base } from 'viem/chains';

// Lazy SDK instance for master account management
let sdkInstance: any = null;

function initializeSDK() {
  if (typeof window === 'undefined') return null;
  if (sdkInstance) return sdkInstance;
  
  sdkInstance = createBaseAccountSDK({
    appName: 'Family Crypto Cards',
    appLogoUrl: 'https://app.familycards.io/logo.png',
    appChainIds: [base.id],
    subAccounts: {
      creation: 'manual',
      defaultAccount: 'universal',
      funding: 'spend-permissions',
    },
  });
  
  return sdkInstance;
}

export const getProvider = () => {
  const sdk = initializeSDK();
  if (!sdk) return null;
  return sdk.getProvider();
};
