import { getProvider } from './baseAccount';

export async function sendTransaction({
  from,
  to,
  calls,
  paymasterUrl,
}: {
  from: string;
  to: string;
  calls: any[];
  paymasterUrl: string;
}) {
  const provider = getProvider();
  return provider.request({
    method: 'wallet_sendCalls',
    params: [
      {
        version: '2.0',
        chainId: '0x2105', // Base mainnet
        from,
        calls,
        atomicRequired: true,
        capabilities: {
          paymasterUrl,
        },
      },
    ],
  });
}
