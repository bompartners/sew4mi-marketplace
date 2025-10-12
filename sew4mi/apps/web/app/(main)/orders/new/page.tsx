import { Metadata } from 'next';
import { OrderCreationWizard } from '@/components/features/orders/OrderCreationWizard';

export const metadata: Metadata = {
  title: 'Create Order | Sew4Mi',
  description: 'Create a new custom garment order with your chosen tailor',
  keywords: 'custom clothing, tailor order, Ghana fashion, bespoke garments',
};

export default function CreateOrderPage() {
  return (
    <main className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <OrderCreationWizard />
      </div>
    </main>
  );
}