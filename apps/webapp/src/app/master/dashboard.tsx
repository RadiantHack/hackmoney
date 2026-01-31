import { useEffect, useState } from 'react';
import { getMasterAccountAddress, getSubAccounts, createSubAccount } from '../lib/masterAccount';
import { requestSpendPermission, fetchPermissions, requestRevoke } from '../lib/spendPermission';
import { sendTransaction } from '../lib/transaction';
import { programNfcCard } from '../lib/nfcCard';

export default function MasterDashboard() {
  const [masterAddress, setMasterAddress] = useState<string>('');
  const [subAccounts, setSubAccounts] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const address = await getMasterAccountAddress();
        setMasterAddress(address);
        const subs = await getSubAccounts(address, window.location.origin);
        setSubAccounts(subs);
        const perms = await fetchPermissions({ account: address });
        setPermissions(perms);
      } catch (e) {
        setError('Failed to load master account data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleCreateSubAccount = async () => {
    setLoading(true);
    try {
      const subAddress = await createSubAccount();
      setSubAccounts([...subAccounts, { address: subAddress }]);
    } catch (e) {
      setError('Failed to create sub account');
    } finally {
      setLoading(false);
    }
  };

  // ... UI for displaying subaccounts, permissions, and actions ...
  return (
    <div>
      <h2>Master Account: {masterAddress}</h2>
      <button onClick={handleCreateSubAccount} disabled={loading}>
        Create Sub Account
      </button>
      <h3>Sub Accounts</h3>
      <ul>
        {subAccounts.map((sub) => (
          <li key={sub.address}>{sub.address}</li>
        ))}
      </ul>
      <h3>Permissions</h3>
      <ul>
        {permissions.map((perm: any) => (
          <li key={perm.hash}>{perm.hash} - {perm.allowance}</li>
        ))}
      </ul>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}
