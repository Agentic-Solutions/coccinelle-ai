import { useState, useEffect } from 'react';

export function useTenant() {
  const [tenantId, setTenantId] = useState<string>('tenant_demo_001');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const tenantData = localStorage.getItem('tenant');
      if (tenantData) {
        const tenant = JSON.parse(tenantData);
        setTenantId(tenant.id || 'tenant_demo_001');
      }
    } catch (error) {
      console.error('Error loading tenant:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { tenantId, loading };
}
