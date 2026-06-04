import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button.jsx';
import { GlassPanel, GlassPanelBody } from '@/components/ui/GlassPanel.jsx';
import { useTranslation } from '@/app/i18n.js';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <GlassPanel strong className="max-w-lg p-8 text-center">
        <GlassPanelBody className="space-y-4">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-200">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-display text-2xl font-semibold text-ink-50">
            {t('forbidden.title')}
          </h1>
          <p className="text-sm text-ink-300">
            {t('forbidden.description')}
          </p>
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/')}>
            {t('forbidden.back')}
          </Button>
        </GlassPanelBody>
      </GlassPanel>
    </div>
  );
}
