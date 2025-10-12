'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Debug page to test authentication
 * Navigate to /test-auth to use this page
 */
export default function TestAuthPage() {
  const [email, setEmail] = useState('customer1@example.com');
  const [password, setPassword] = useState('password123');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const supabase = createClient();

      console.log('🔐 Testing login with:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setResult({
          success: false,
          error: error.message,
          details: error,
        });
        console.error('❌ Login failed:', error);
      } else {
        setResult({
          success: true,
          user: {
            id: data.user?.id,
            email: data.user?.email,
            role: data.user?.role,
          },
          session: {
            hasAccessToken: !!data.session?.access_token,
            expiresAt: data.session?.expires_at,
          },
        });
        console.log('✅ Login successful:', data);
      }
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      console.error('💥 Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const testLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setResult({ success: true, message: 'Logged out' });
  };

  const checkSession = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();

    setResult({
      hasSession: !!data.session,
      session: data.session ? {
        userId: data.session.user.id,
        email: data.session.user.email,
        expiresAt: data.session.expires_at,
      } : null,
      error: error?.message,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">🔐 Auth Debug Page</h1>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={testLogin}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Login'}
          </button>

          <button
            onClick={checkSession}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Check Session
          </button>

          <button
            onClick={testLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {result && (
          <div className={`p-4 rounded ${result.success === false ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <h3 className="font-bold mb-2">Result:</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded">
          <h3 className="font-bold mb-2">Test Credentials:</h3>
          <ul className="text-sm space-y-1">
            <li>• <strong>Customer:</strong> customer1@example.com / password123</li>
            <li>• <strong>Tailor:</strong> adwoa@example.com / password123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
