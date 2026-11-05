import { useSelector } from 'react-redux';
import PageTitle from '../components/Typography/PageTitle';
import { RootState } from '../stores/globalStore';
import { Link } from 'react-router-dom';
import { Button } from '@windmill/react-ui';
import { useTranslation } from 'react-i18next';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-200">{value}</span>
    </div>
  );
}

function Profile() {
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);

  if (!user) return null;

  const fullName = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ');
  const location = [user.profile?.city, user.profile?.country].filter(Boolean).join(', ');
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user.email?.[0] ?? '?').toUpperCase();

  return (
    <>
      <PageTitle>{t('profile.title')}</PageTitle>

      {/* Header card */}
      <div className="px-6 py-5 mb-4 bg-white rounded-lg shadow-md dark:bg-gray-800 flex items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-customgreen-100 dark:bg-customgreen-900/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-customgreen-600 dark:text-customgreen-400">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
            {fullName || user.name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
          {location && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>location_on</span>
              {location}
            </p>
          )}
        </div>
        <div className="ml-auto flex-shrink-0">
          <Link to="/app/profileEdit">
            <Button>
              <span className="material-symbols-outlined mr-1" style={{ fontSize: '16px', lineHeight: '1' }}>edit</span>
              {t('profile.edit')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Details card */}
      <div className="px-6 py-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
          {t('profile.personalInfo')}
        </h2>
        <InfoRow label={t('profile.firstName')} value={user.profile?.firstName} />
        <InfoRow label={t('profile.lastName')} value={user.profile?.lastName} />
        <InfoRow label={t('profile.phone')} value={user.profile?.phone} />
        <InfoRow label={t('profile.address')} value={user.profile?.address} />
        <InfoRow label={t('profile.city')} value={user.profile?.city} />
        <InfoRow label={t('profile.country')} value={user.profile?.country} />
        <InfoRow
          label={t('profile.memberSince')}
          value={user.profile?.createdAt ? new Date(user.profile.createdAt).toLocaleDateString() : undefined}
        />
      </div>
    </>
  );
}

export default Profile;
