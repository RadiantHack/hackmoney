import { useEffect, useState } from 'react';
import { getSubAccounts } from '../lib/masterAccount';
import { fetchPermissions } from '../lib/spendPermission';

export default function SubAccountDashboard({ masterAddress }: { masterAddress: string }) {
  const [subAccounts, setSubAccounts] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const subs = await getSubAccounts(masterAddress, window.location.origin);
        setSubAccounts(subs);
        const perms = await fetchPermissions({ account: masterAddress });
        setPermissions(perms);
      } catch (e) {
        setError('Failed to load sub account data');
      } finally {
        setLoading(false);
      }
    }
    if (masterAddress) fetchData();
  }, [masterAddress]);

  // ... UI for displaying subaccounts and permissions ...
  return (
    <div>
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
