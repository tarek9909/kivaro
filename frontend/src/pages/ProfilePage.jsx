import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, Save, UserCog } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useTranslation } from '@/app/i18n.js';
import {
  Button,
  GlassPanel,
  GlassPanelBody,
  GlassPanelHeader,
  Input,
  PageHeader
} from '@/components/ui/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';

function profileState(user) {
  return {
    full_name: user?.full_name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || ''
  };
}

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const { t } = useTranslation();
  const [profile, setProfile] = useState(() => profileState(user));
  const [password, setPassword] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    setProfile(profileState(user));
    setProfileErrors({});
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: (payload) => api.auth.updateMe(payload),
    onSuccess: async () => {
      await refreshUser();
      toast.success(t('profile.updated'));
    },
    onError: (error) => {
      setProfileErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not update profile.'));
    }
  });

  const passwordMutation = useMutation({
    mutationFn: (payload) => api.auth.updatePassword(payload),
    onSuccess: () => {
      setPassword({ current_password: '', new_password: '', confirm_password: '' });
      toast.success(t('profile.passwordUpdated'));
    },
    onError: (error) => {
      setPasswordErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not update password.'));
    }
  });

  function setProfileField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function setPasswordField(field, value) {
    setPassword((current) => ({ ...current, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function validateProfile() {
    const next = {};
    if (!profile.full_name.trim()) next.full_name = t('profile.requiredName');
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      next.email = t('profile.invalidEmail');
    }
    setProfileErrors(next);
    return Object.keys(next).length === 0;
  }

  function validatePassword() {
    const next = {};
    if (!password.current_password) next.current_password = t('profile.currentPassword');
    if (!password.new_password || password.new_password.length < 8) {
      next.new_password = t('profile.passwordMin');
    }
    if (password.confirm_password && password.confirm_password !== password.new_password) {
      next.confirm_password = t('profile.passwordMismatch');
    }
    setPasswordErrors(next);
    return Object.keys(next).length === 0;
  }

  function submitProfile(event) {
    event.preventDefault();
    if (!validateProfile()) return;
    profileMutation.mutate({
      full_name: profile.full_name.trim(),
      username: profile.username.trim() || null,
      email: profile.email.trim() || null,
      phone: profile.phone.trim() || null
    });
  }

  function submitPassword(event) {
    event.preventDefault();
    if (!validatePassword()) return;
    passwordMutation.mutate(password);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.description')}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassPanel>
          <GlassPanelHeader icon={UserCog} title={t('profile.details')} />
          <GlassPanelBody>
            <form onSubmit={submitProfile} className="space-y-4" noValidate>
              <Input
                label={t('profile.fullName')}
                value={profile.full_name}
                onChange={(event) => setProfileField('full_name', event.target.value)}
                error={profileErrors.full_name}
                autoComplete="name"
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={t('profile.username')}
                  value={profile.username}
                  onChange={(event) => setProfileField('username', event.target.value)}
                  error={profileErrors.username}
                  autoComplete="username"
                />
                <Input
                  label={t('profile.email')}
                  type="email"
                  value={profile.email}
                  onChange={(event) => setProfileField('email', event.target.value)}
                  error={profileErrors.email}
                  autoComplete="email"
                />
              </div>
              <Input
                label={t('profile.phone')}
                value={profile.phone}
                onChange={(event) => setProfileField('phone', event.target.value)}
                error={profileErrors.phone}
                autoComplete="tel"
              />
              <div className="flex justify-end">
                <Button type="submit" leftIcon={Save} isLoading={profileMutation.isPending}>
                  {t('profile.saveProfile')}
                </Button>
              </div>
            </form>
          </GlassPanelBody>
        </GlassPanel>

        <GlassPanel>
          <GlassPanelHeader icon={KeyRound} title={t('profile.password')} />
          <GlassPanelBody>
            <form onSubmit={submitPassword} className="space-y-4" noValidate>
              <Input
                label={t('profile.currentPassword')}
                type="password"
                value={password.current_password}
                onChange={(event) => setPasswordField('current_password', event.target.value)}
                error={passwordErrors.current_password}
                autoComplete="current-password"
              />
              <Input
                label={t('profile.newPassword')}
                type="password"
                value={password.new_password}
                onChange={(event) => setPasswordField('new_password', event.target.value)}
                error={passwordErrors.new_password}
                autoComplete="new-password"
              />
              <Input
                label={t('profile.confirmPassword')}
                type="password"
                value={password.confirm_password}
                onChange={(event) => setPasswordField('confirm_password', event.target.value)}
                error={passwordErrors.confirm_password}
                autoComplete="new-password"
              />
              <div className="flex justify-end">
                <Button type="submit" leftIcon={KeyRound} isLoading={passwordMutation.isPending}>
                  {t('profile.savePassword')}
                </Button>
              </div>
            </form>
          </GlassPanelBody>
        </GlassPanel>
      </div>
    </div>
  );
}
