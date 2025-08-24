'use client';

import { GarmentPricing } from '@sew4mi/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Info } from 'lucide-react';

interface PricingTableProps {
  pricing: GarmentPricing[];
}

export function PricingTable({ pricing }: PricingTableProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getFactorColor = (factor: string) => {
    const colors: Record<string, string> = {
      fabric: 'bg-blue-100 text-blue-800',
      complexity: 'bg-purple-100 text-purple-800',
      urgency: 'bg-red-100 text-red-800',
      embellishments: 'bg-yellow-100 text-yellow-800',
      lining: 'bg-green-100 text-green-800',
      customization: 'bg-indigo-100 text-indigo-800',
      embroidery: 'bg-pink-100 text-pink-800',
      style: 'bg-orange-100 text-orange-800',
      design: 'bg-teal-100 text-teal-800',
    };
    return colors[factor] || 'bg-gray-100 text-gray-800';
  };

  if (!pricing.length) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pricing Information</h3>
          <p className="text-gray-600">
            This tailor hasn't set up their pricing yet. Contact them directly for quotes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activePricing = pricing.filter(p => p.isActive);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Pricing Guide</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Pricing Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Garment Type</th>
                    <th className="text-right py-3 px-4 font-semibold">Starting From</th>
                    <th className="text-right py-3 px-4 font-semibold">Up To</th>
                    <th className="text-center py-3 px-4 font-semibold">Price Factors</th>
                  </tr>
                </thead>
                <tbody>
                  {activePricing.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="font-medium">{item.garmentType}</div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="text-lg font-semibold text-green-600">
                          {formatPrice(item.basePrice)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatPrice(item.maxPrice)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {item.priceFactors.slice(0, 3).map((factor) => (
                            <Badge
                              key={factor}
                              variant="secondary"
                              className={`text-xs ${getFactorColor(factor)}`}
                            >
                              {factor}
                            </Badge>
                          ))}
                          {item.priceFactors.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.priceFactors.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Price Range Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="border-green-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {formatPrice(Math.min(...activePricing.map(p => p.basePrice)))}
                  </div>
                  <div className="text-sm text-gray-600">Lowest Starting Price</div>
                </CardContent>
              </Card>

              <Card className="border-blue-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {formatPrice(
                      activePricing.reduce((sum, p) => sum + p.basePrice, 0) / activePricing.length
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Average Starting Price</div>
                </CardContent>
              </Card>

              <Card className="border-purple-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {formatPrice(Math.max(...activePricing.map(p => p.maxPrice)))}
                  </div>
                  <div className="text-sm text-gray-600">Highest Maximum Price</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Information */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">Pricing Information</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Prices shown are estimates and may vary based on specific requirements</li>
                <li>• Final pricing depends on fabric choice, design complexity, and timeline</li>
                <li>• Rush orders may incur additional fees</li>
                <li>• Contact the tailor directly for accurate quotes on your specific project</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact for Quote */}
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Need a Custom Quote?</h3>
          <p className="text-gray-600 mb-4">
            Contact this tailor directly to discuss your specific requirements and get an accurate price estimate.
          </p>
          <Button className="bg-green-600 hover:bg-green-700">
            Get Custom Quote
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}