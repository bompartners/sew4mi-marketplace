'use client';

import { useRouter } from 'next/navigation';
import { AdminDisputeDashboard } from '@/components/features/admin/AdminDisputeDashboard';

export default function AdminDisputesPage() {
  const router = useRouter();

  const handleDisputeSelect = (disputeId: string) => {
    // Navigate to dispute detail page
    router.push(`/admin/disputes/${disputeId}`);
  };

  const handleAssignDispute = async (disputeId: string, adminId: string) => {
    try {
      const response = await fetch(`/api/disputes/${disputeId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign dispute');
      }

      // Refresh the dashboard after assignment
      window.location.reload();
    } catch (error) {
      console.error('Error assigning dispute:', error);
      throw error;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AdminDisputeDashboard
        onDisputeSelect={handleDisputeSelect}
        onAssignDispute={handleAssignDispute}
      />
    </div>
  );
}
