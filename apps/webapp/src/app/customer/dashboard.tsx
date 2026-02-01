import { useEffect, useState } from 'react';
import { getMasterAccountAddress } from '../lib/masterAccount';
import { fetchPermissions } from '../lib/spendPermission';

export default function CustomerDashboard() {
  const [masterAddress, setMasterAddress] = useState('');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const address = await getMasterAccountAddress();
        setMasterAddress(address);
        const perms = await fetchPermissions({ account: address });
        setPermissions(perms);
      } catch (e) {
        setError('Failed to load customer data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div>
      <h2>Customer Dashboard</h2>
      <div>Master Account: {masterAddress}</div>
      <h3>Spend Permissions</h3>
      <ul>
        {permissions.map((perm: any) => (
          <li key={perm.hash}>{perm.hash} - {perm.allowance}</li>
        ))}
      </ul>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}
