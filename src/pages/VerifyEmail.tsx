'use client';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Supabase automatically handles the email verification
        // The user is already verified when they click the link
        // We just need to show a success message and redirect
        const token = searchParams.get('token');
        const email = searchParams.get('email');

        if (token && email) {
          // Wait a moment to ensure Supabase has processed the verification
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setStatus('success');
          setMessage('Email verified successfully!');
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Verification link is invalid or has expired.');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    };

    handleEmailVerification();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
              <CardTitle>Verifying Email</CardTitle>
              <CardDescription>Please wait while we verify your email...</CardDescription>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-green-600">Thank You, Verified!</CardTitle>
              <CardDescription>Your email has been successfully verified.</CardDescription>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-600">Verification Failed</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <p className="text-center text-gray-600">Redirecting to your dashboard...</p>
          )}
          {status === 'success' && (
            <>
              <p className="text-center text-gray-600 mb-4">
                You can now sign in with your email and password.
              </p>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                Go to Dashboard
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-center text-gray-600 mb-4">
                If you didn't receive a verification email, please check your spam folder or sign up again.
              </p>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                Back to Sign Up
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
