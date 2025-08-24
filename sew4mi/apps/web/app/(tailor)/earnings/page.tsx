import { TailorPaymentDashboard } from '@/components/features/payments/TailorPaymentDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Earnings Dashboard - Sew4Mi',
  description: 'Track your tailoring earnings, commissions, and payment history',
};

export default function EarningsPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <TailorPaymentDashboard />
    </div>
  );
}