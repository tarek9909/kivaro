import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Image, Loader2, Save, Trash2, Upload } from 'lucide-react';
import { api, httpClient } from '@/api/index.js';
import {
  Button,
  GlassPanel,
  GlassPanelBody,
  GlassPanelHeader,
  Input,
  Textarea,
  LoadingState,
  ErrorState
} from '@/components/ui/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';

const FIELDS = [
  { name: 'company_name', label: 'Company name', required: true },
  { name: 'currency_code', label: 'Currency code', placeholder: 'USD', maxLength: 10 },
  { name: 'phone', label: 'Phone' },
  { name: 'email', label: 'Email', type: 'email' }
];
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const LOGO_ACCEPT = ALLOWED_LOGO_TYPES.join(',');

export function CompanyProfileCard({ canEdit = false }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => api.settings.companyProfile.get()
  });

  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  const profile = profileQuery.data?.data?.company_profile;

  useEffect(() => {
    if (profile) {
      setForm({
        company_name: profile.company_name || '',
        phone: profile.phone || '',
        email: profile.email || '',
        address: profile.address || '',
        logo_url: profile.logo_url || '',
        currency_code: profile.currency_code || 'USD'
      });
    } else if (profileQuery.isSuccess) {
      setForm({
        company_name: '',
        phone: '',
        email: '',
        address: '',
        logo_url: '',
        currency_code: 'USD'
      });
    }
  }, [profile, profileQuery.isSuccess]);

  const mutation = useMutation({
    mutationFn: (payload) => api.settings.companyProfile.update(payload),
    onSuccess: () => {
      toast.success('Company profile saved');
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save profile.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, WEBP, or GIF image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      
      setIsUploading(true);
      try {
        const response = await httpClient.post('/upload', {
          filename: file.name,
          content: base64Data
        });
        
        if (response?.url) {
          handleChange('logo_url', response.url);
          toast.success('Logo uploaded successfully');
        } else {
          toast.error('Upload failed: missing URL in response');
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(getErrorMessage(error, 'Could not upload logo.'));
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  function validate() {
    const next = {};
    if (!form.company_name?.trim()) next.company_name = 'Company name is required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Invalid email address.';
    }
    if (form.logo_url && !/^https?:\/\//i.test(form.logo_url)) {
      next.logo_url = 'Logo URL must start with http:// or https://';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const payload = {};
    for (const [key, value] of Object.entries(form)) {
      payload[key] = value === '' ? null : value;
    }
    mutation.mutate(payload);
  }

  return (
    <GlassPanel>
      <GlassPanelHeader
        icon={Building2}
        title="Company profile"
        subtitle="Branding and contact details that appear on receipts and reports."
      />
      <GlassPanelBody>
        {profileQuery.isPending ? (
          <LoadingState label="Loading company profile..." />
        ) : profileQuery.isError ? (
          <ErrorState
            title="Could not load company profile"
            description={getErrorMessage(profileQuery.error)}
            onRetry={() => profileQuery.refetch()}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 md:grid-cols-2">
              {FIELDS.map((field) => (
                <Input
                  key={field.name}
                  label={field.label}
                  type={field.type || 'text'}
                  value={form[field.name] ?? ''}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  error={errors[field.name]}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  disabled={!canEdit}
                  required={field.required}
                />
              ))}
            </div>

            {/* Custom Logo Upload Area */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-300">Company Logo</label>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                {/* Logo Preview */}
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20 overflow-hidden group">
                  {form.logo_url ? (
                    <>
                      <img src={form.logo_url} alt="Logo preview" className="h-full w-full object-contain" />
                      {canEdit && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleChange('logo_url', '')}
                            className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-200 transition-colors"
                            title="Remove logo"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-ink-400">
                      <Image className="h-8 w-8 opacity-40" />
                      <span className="text-[10px] mt-1">No Logo</span>
                    </div>
                  )}
                </div>

                {/* Upload Action controls */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="text-xs text-ink-300">
                    <p className="font-semibold text-ink-50">Upload your brand logo</p>
                    <p className="text-[10px] text-ink-400 mt-0.5">Supports PNG, JPG, WEBP, or GIF. Max size 2MB.</p>
                  </div>
                  
                  {canEdit && (
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept={LOGO_ACCEPT}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        leftIcon={isUploading ? Loader2 : Upload}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={isUploading ? 'animate-pulse' : ''}
                      >
                        {isUploading ? 'Uploading...' : 'Choose file'}
                      </Button>
                      {form.logo_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          leftIcon={Trash2}
                          onClick={() => handleChange('logo_url', '')}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {errors.logo_url && (
                <p className="text-xs text-red-400">{errors.logo_url}</p>
              )}
            </div>

            <Textarea
              label="Address"
              value={form.address ?? ''}
              onChange={(event) => handleChange('address', event.target.value)}
              error={errors.address}
              disabled={!canEdit}
              rows={3}
            />
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <Button
                type="submit"
                leftIcon={Save}
                isLoading={mutation.isPending}
                disabled={!canEdit}
              >
                Save changes
              </Button>
            </div>
            {!canEdit && (
              <p className="text-xs text-ink-400">
                You can view this profile but the settings.manage permission is required to edit.
              </p>
            )}
          </form>
        )}
      </GlassPanelBody>
    </GlassPanel>
  );
}
