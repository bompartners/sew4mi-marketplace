'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

/**
 * Ultra-simple login page for debugging
 * No complex components, just raw HTML and direct Supabase calls
 */
export default function SimpleLoginPage() {
  const [email, setEmail] = useState('customer1@example.com');
  const [password, setPassword] = useState('password123');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🚀 SIMPLE LOGIN - Starting...');
    setLoading(true);
    setStatus('Logging in...');

    try {
      console.log('📧 Email:', email);
      console.log('🔑 Password length:', password.length);

      const supabase = createClient();
      console.log('✅ Supabase client created');

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      console.log('📦 Response received');
      console.log('✅ Success:', !error);
      console.log('❌ Error:', error?.message);
      console.log('👤 User:', data?.user?.email);

      if (error) {
        setStatus(`❌ Error: ${error.message}`);
        console.error('Login failed:', error);
      } else if (data.user) {
        setStatus(`✅ Success! Logged in as ${data.user.email}`);
        console.log('🎉 Login successful, redirecting...');

        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setStatus(`💥 Exception: ${msg}`);
      console.error('Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>
          🔐 Ultra-Simple Login Test
        </h1>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: loading ? '#999' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {status && (
          <div style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: status.includes('✅') ? '#d4edda' : '#f8d7da',
            border: `1px solid ${status.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {status}
          </div>
        )}

        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Test Credentials:</p>
          <p>Email: customer1@example.com</p>
          <p>Password: password123</p>
          <p style={{ marginTop: '10px', color: '#666' }}>
            Open browser console (F12) to see detailed logs
          </p>
        </div>
      </div>
    </div>
  );
}
