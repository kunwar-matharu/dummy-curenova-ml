import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-[calc(100vh-4.25rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--color-surface-ground)]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0284c7] text-white shadow-md shadow-[#0284c7]/20">
            <Activity className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Reset Password
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Enter your institutional email address to receive password reset instructions
          </p>
        </div>

        <Card elevation="raised" className="p-6 space-y-4">
          {submitted ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="w-10 h-10 text-[#059669] mx-auto" />
              <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Verification Link Dispatched</h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                If an account exists under <strong>{email}</strong>, a secure credential recovery link has been delivered.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284c7] hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <Input
                label="Institutional Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@curenova.ai"
                icon={Mail}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
              >
                Send Password Reset Instructions
              </Button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-[var(--color-brand-primary)] hover:underline font-semibold">
                  Remember password? Sign In
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
