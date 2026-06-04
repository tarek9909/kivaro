import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button.jsx';
import { GlassPanel, GlassPanelBody } from '@/components/ui/GlassPanel.jsx';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <GlassPanel strong className="max-w-lg p-8 text-center">
        <GlassPanelBody className="space-y-4">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brand-200">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-display text-2xl font-semibold text-ink-50">Page not found</h1>
          <p className="text-sm text-ink-300">
            We couldn&apos;t find what you were looking for. Use the navigation to get back on track.
          </p>
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/')}>
            Back to dashboard
          </Button>
        </GlassPanelBody>
      </GlassPanel>
    </div>
  );
}
