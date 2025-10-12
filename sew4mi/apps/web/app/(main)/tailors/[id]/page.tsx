import { notFound } from 'next/navigation';
import { TailorProfilePage } from '@/components/features/tailors/TailorProfilePage';
import { tailorProfileService } from '@/lib/services/tailor-profile.service';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const profile = await tailorProfileService.getCompleteProfile(id);
    
    if (!profile) {
      return {
        title: 'Tailor Not Found',
      };
    }

    return {
      title: `${profile.businessName} - Expert Tailor | Sew4Mi`,
      description: profile.bio || `Expert tailor specializing in ${profile.specializations.slice(0, 3).join(', ')}. ${profile.rating}/5 stars from ${profile.totalReviews} reviews.`,
      keywords: [
        profile.businessName,
        ...profile.specializations,
        'tailor',
        'Ghana',
        profile.city,
        profile.region,
        'custom clothing',
        'tailoring services',
      ].join(', '),
      openGraph: {
        title: `${profile.businessName} - Expert Tailor`,
        description: profile.bio || `Expert tailor specializing in ${profile.specializations.slice(0, 3).join(', ')}`,
        images: profile.profilePhoto ? [profile.profilePhoto] : undefined,
        type: 'profile',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${profile.businessName} - Expert Tailor`,
        description: profile.bio || `Expert tailor specializing in ${profile.specializations.slice(0, 3).join(', ')}`,
        images: profile.profilePhoto ? [profile.profilePhoto] : undefined,
      },
    };
  } catch (error) {
    return {
      title: 'Tailor Profile',
    };
  }
}

export default async function TailorProfilePageRoute({ params }: PageProps) {
  try {
    const { id } = await params;
    const profile = await tailorProfileService.getCompleteProfile(id);

    if (!profile) {
      notFound();
    }

    // Check if tailor is verified
    if (profile.verificationStatus !== 'VERIFIED') {
      return (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
            <div className="text-yellow-600 text-6xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Profile Under Review
            </h1>
            <p className="text-gray-600 mb-6">
              This tailor's profile is currently being verified. Please check back later.
            </p>
            <a
              href="/tailors"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Tailors
            </a>
          </div>
        </div>
      );
    }

    return <TailorProfilePage tailorId={id} initialData={profile} />;
  } catch (error) {
    console.error('Error loading tailor profile:', error);
    notFound();
  }
}