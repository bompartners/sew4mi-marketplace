import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { OrderCreationWizard } from '@/components/features/orders/OrderCreationWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, MapPin, Clock } from 'lucide-react';

interface CreateOrderWithTailorPageProps {
  params: Promise<{
    tailorId: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Create Order | Sew4Mi',
  description: 'Create a new custom garment order with your chosen tailor',
  keywords: 'custom clothing, tailor order, Ghana fashion, bespoke garments',
};

export default async function CreateOrderWithTailorPage({ 
  params 
}: CreateOrderWithTailorPageProps) {
  const { tailorId } = await params;
  const supabase = createServerComponentClient({ cookies });
  
  // Get tailor information
  const { data: tailorProfile, error: tailorError } = await supabase
    .from('tailor_profiles')
    .select(`
      id,
      user_id,
      business_name,
      business_description,
      location,
      specializations,
      years_experience,
      total_orders,
      average_rating,
      profile_image_url,
      is_active
    `)
    .eq('user_id', tailorId)
    .eq('is_active', true)
    .single();

  if (tailorError || !tailorProfile) {
    notFound();
  }

  // Get recent reviews count
  const { count: reviewsCount } = await supabase
    .from('tailor_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('tailor_id', tailorId);

  const handleOrderCreated = (orderId: string) => {
    // Redirect to order confirmation or order details page
    window.location.href = `/customer/orders/${orderId}`;
  };

  return (
    <main className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Tailor Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Creating Order With</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                {tailorProfile.profile_image_url ? (
                  <img 
                    src={tailorProfile.profile_image_url} 
                    alt={tailorProfile.business_name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-semibold">
                    {tailorProfile.business_name.charAt(0)}
                  </span>
                )}
              </div>
              
              <div className="flex-1 space-y-2">
                <div>
                  <h2 className="text-xl font-semibold">{tailorProfile.business_name}</h2>
                  <p className="text-muted-foreground text-sm">
                    {tailorProfile.business_description}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-current text-yellow-400" />
                    <span>{tailorProfile.average_rating?.toFixed(1) || 'N/A'}</span>
                    <span>({reviewsCount || 0} reviews)</span>
                  </div>
                  
                  {tailorProfile.location && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{tailorProfile.location}</span>
                      </div>
                    </>
                  )}
                  
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{tailorProfile.years_experience} years experience</span>
                  </div>
                </div>
                
                {tailorProfile.specializations && tailorProfile.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tailorProfile.specializations.map((specialization: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {specialization}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Creation Wizard */}
        <OrderCreationWizard 
          initialTailorId={tailorId}
          onOrderCreated={handleOrderCreated}
        />
      </div>
    </main>
  );
}