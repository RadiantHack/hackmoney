import { useEffect, useState } from 'react';
import { fetchPermissions, requestRevoke } from '../lib/spendPermission';

export default function PermissionManager({ masterAddress }: { masterAddress: string }) {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const perms = await fetchPermissions({ account: masterAddress });
        setPermissions(perms);
      } catch (e) {
        setError('Failed to load permissions');
      } finally {
        setLoading(false);
      }
    }
    if (masterAddress) fetchData();
  }, [masterAddress]);

  const handleRevoke = async (hash: string) => {
    setLoading(true);
    try {
      await requestRevoke(hash);
      setPermissions(permissions.filter((p: any) => p.hash !== hash));
    } catch (e) {
      setError('Failed to revoke permission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Spend Permissions</h3>
      <ul>
        {permissions.map((perm: any) => (
          <li key={perm.hash}>
            {perm.hash} - {perm.allowance}
            <button onClick={() => handleRevoke(perm.hash)} disabled={loading}>
              Revoke
            </button>
          </li>
        ))}
      </ul>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}
