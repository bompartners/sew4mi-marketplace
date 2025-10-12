'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardTestPage() {
  const [sessionTest, setSessionTest] = useState<any>(null);
  const [apiTest, setApiTest] = useState<any>(null);
  const { user, userRole } = useAuth();

  useEffect(() => {
    testSession();
    testAPI();
  }, []);

  const testSession = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();

    setSessionTest({
      hasSession: !!data.session,
      userId: data.session?.user?.id,
      email: data.session?.user?.email,
      accessToken: data.session?.access_token?.substring(0, 20) + '...',
      error: error?.message
    });
  };

  const testAPI = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setApiTest({ error: 'No session found' });
      return;
    }

    try {
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      setApiTest({
        status: response.status,
        ok: response.ok,
        data: data,
      });
    } catch (err) {
      setApiTest({
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard Debug Test</h1>

      <div className="space-y-6">
        {/* Auth Context */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="font-bold mb-3">Auth Context</h2>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify({
              hasUser: !!user,
              userId: user?.id,
              email: user?.email,
              userRole
            }, null, 2)}
          </pre>
        </div>

        {/* Session Test */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="font-bold mb-3">Session Test</h2>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(sessionTest, null, 2)}
          </pre>
        </div>

        {/* API Test */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="font-bold mb-3">API Test (/api/dashboard/stats)</h2>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(apiTest, null, 2)}
          </pre>
        </div>

        <button
          onClick={() => {
            testSession();
            testAPI();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Re-test
        </button>
      </div>
    </div>
  );
}
