import { ForbiddenIcon } from '../icons';
import { useTranslation } from 'react-i18next';

function Page404() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center">
      <ForbiddenIcon className="w-12 h-12 mt-8 text-customgreen-200" aria-hidden="true" />
      <h1 className="text-6xl font-semibold text-gray-700 dark:text-gray-200">{t('notFound.title')}</h1>
      <p className="text-gray-700 dark:text-gray-300">
        {t('notFound.message')}{' '}
        <a className="text-customgreen-600 hover:underline dark:text-customgreen-300" href="/app/home">
          {t('notFound.goBack')}
        </a>
        .
      </p>
    </div>
  );
};

export default Page404;