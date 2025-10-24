'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye
} from 'lucide-react';

export interface ApplicationStatus {
  status: string;
  hasProfile: boolean;
  hasApplication: boolean;
  applicationId?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  message: string;
}

interface ApplicationStatusCardProps {
  status: ApplicationStatus;
}

export function ApplicationStatusCard({ status }: ApplicationStatusCardProps) {
  switch (status.status) {
    case 'NO_APPLICATION':
      return (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <CardTitle className="text-blue-900">Complete Your Tailor Application</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-blue-800">
              Welcome! To start accepting orders and showcase your work, please complete your tailor application.
            </CardDescription>
            
            <div className="bg-white rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm text-blue-900">What you'll need:</h4>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                <li>Business information and experience details</li>
                <li>Specializations and portfolio description</li>
                <li>Workspace photos (1-5 images)</li>
                <li>Professional references</li>
                <li>Business registration (optional)</li>
              </ul>
            </div>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Application review typically takes 2-3 business days
              </AlertDescription>
            </Alert>

            <Button asChild className="w-full" size="lg">
              <Link href="/apply-tailor">
                <FileText className="mr-2 h-5 w-5" />
                Complete Application
              </Link>
            </Button>
          </CardContent>
        </Card>
      );

    case 'PENDING':
    case 'UNDER_REVIEW':
      return (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-yellow-600 animate-pulse" />
              <CardTitle className="text-yellow-900">Application Under Review</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-yellow-800">
              {status.message}
            </CardDescription>

            <div className="bg-white rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-900 font-medium">Application ID:</span>
                <span className="text-yellow-700">{status.applicationId?.slice(0, 8)}</span>
              </div>
              {status.submittedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-yellow-900 font-medium">Submitted:</span>
                  <span className="text-yellow-700">
                    {new Date(status.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>What happens next?</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <p>Our team is reviewing your application. You'll receive an email notification once the review is complete.</p>
                <p className="text-sm">Typical review time: 2-3 business days</p>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/dashboard">
                  <Eye className="mr-2 h-4 w-4" />
                  Browse Marketplace
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/support">
                  Contact Support
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      );

    case 'REJECTED':
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-8 w-8 text-red-600" />
              <CardTitle className="text-red-900">Application Not Approved</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-red-800">
              Unfortunately, your tailor application was not approved at this time.
            </CardDescription>

            {status.rejectionReason && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Reason for rejection:</AlertTitle>
                <AlertDescription className="mt-2">
                  {status.rejectionReason}
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-white rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm text-red-900">What you can do:</h4>
              <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                <li>Review the feedback provided</li>
                <li>Address any concerns mentioned</li>
                <li>Submit a new application with improvements</li>
                <li>Contact support if you have questions</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href="/apply-tailor">
                  <FileText className="mr-2 h-4 w-4" />
                  Reapply
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/support">
                  Contact Support
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      );

    default:
      return (
        <Card>
          <CardHeader>
            <CardTitle>Application Status Unknown</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Unable to determine application status. Please contact support.
            </CardDescription>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/support">Contact Support</Link>
            </Button>
          </CardContent>
        </Card>
      );
  }
}

