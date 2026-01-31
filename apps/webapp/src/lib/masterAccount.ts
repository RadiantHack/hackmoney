import { getProvider } from './baseAccount';

export async function getMasterAccountAddress() {
  const provider = getProvider();
  const [address] = await provider.request({ method: 'eth_requestAccounts', params: [] });
  return address;
}

export async function getSubAccounts(masterAddress: string, domain: string) {
  const provider = getProvider();
  const result = await provider.request({
    method: 'wallet_getSubAccounts',
    params: [{ account: masterAddress, domain }],
  });
  return result.subAccounts;
}

export async function createSubAccount() {
  const provider = getProvider();
  const result = await provider.request({
    method: 'wallet_addSubAccount',
    params: [{ account: { type: 'create' } }],
  });
  return result.address;
}
