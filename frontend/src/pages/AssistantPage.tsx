import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { telemetry } from '../services/telemetry.service';
import { RetorikAgent } from '@davi-ai/retorik-framework';
import '../styles/retorik.css';
import { RETORIK_PREFIX, RETORIK_TENANT } from '../assistant';

/* Sans `prefix`, le framework interroge studio.retorik.ai : un tenant qui n'y
   existe pas renvoie une config vide et le loader tourne indéfiniment. Le
   tenant de care2repair.eu demande `preview` tant qu'il n'est pas en
   production. */
const addressData = {
  tenant: RETORIK_TENANT,
  prefix: RETORIK_PREFIX,
};

const config = {
  /* Par défaut le framework se dimensionne en `100vw/100vh` et recouvrirait la
     sidebar et l'en-tête. `fullSize: false` le fait se caler sur son parent. */
  fullSize: false,
  /* Sinon la langue du navigateur passe avant celle choisie dans l'application,
     et le bot répond en anglais à qui a mis le Service Hub en français. */
  locales: { getDefaultFromBrowser: false },
};

/* Seul moyen d'atteindre l'intérieur du shadow root du framework : il corrige
   la hauteur imposée en mobile. Voir public/retorik-embed.css. */
const customCSS = [`${process.env.PUBLIC_URL}/retorik-embed.css`];

function AssistantPage() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage?.slice(0, 2) ?? 'en';

  /* L'agent parle directement à DAVI : sans cette ligne, rien de l'assistant
     n'atteint Kibana. Rejoué à chaque changement de langue, puisque c'est
     aussi ce qui remonte l'agent. */
  useEffect(() => {
    void telemetry.logAction('assistant_opened', { locale: lang });
  }, [lang]);

  /* Le framework ne lit sa langue qu'à l'initialisation, dans `<html lang>` que
     i18n.ts tient à jour. La lui imposer après coup (`setLocale`) laisse le
     loader affiché par-dessus la conversation, devenue inaccessible : la `key`
     le remonte donc pour qu'il reparte dans la nouvelle langue. Une
     conversation en cours est perdue, c'est le prix du changement. */
  return (
    <div className="flex-1 min-h-0">
      <RetorikAgent
        key={lang}
        addressData={addressData}
        config={config}
        customCSS={customCSS}
        width="full"
        height="full"
      />
    </div>
  );
}

export default AssistantPage;
