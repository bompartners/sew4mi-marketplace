import { TailorPaymentDashboard } from '@/components/features/payments/TailorPaymentDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Earnings Dashboard - Sew4Mi',
  description: 'Track your tailoring earnings, commissions, and payment history',
};

export default function EarningsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TailorPaymentDashboard />
    </div>
  );
}