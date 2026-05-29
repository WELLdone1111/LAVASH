import { ExternalLink } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { openExternalUrl } from "@/lib/openExternalUrl";
import { listFreeTierProvidersWithSignup } from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { ConstructChatProviderMark } from "@/features/lavashconstruct/chat/ui/ConstructChatProviderMark";

export default function ConstructFreeApiKeysGuide() {
  const { t } = useI18n();
  const providers = listFreeTierProvidersWithSignup();

  if (providers.length === 0) return null;

  return (
    <section className="lc-free-api-guide" aria-labelledby="lc-free-api-guide-title">
      <h4 id="lc-free-api-guide-title" className="lc-free-api-guide__title">
        {t("construct.model.freeApi.title")}
      </h4>
      <p className="lc-free-api-guide__lead">{t("construct.model.freeApi.lead")}</p>
      <ol className="lc-free-api-guide__steps">
        <li>{t("construct.model.freeApi.step1")}</li>
        <li>{t("construct.model.freeApi.step2")}</li>
        <li>{t("construct.model.freeApi.step3")}</li>
      </ol>
      <ul className="lc-free-api-guide__links" aria-label={t("construct.model.freeApi.linksAria")}>
        {providers.map((def) => (
          <li key={def.id}>
            <a
              className="lc-free-api-guide__link"
              href={def.signupUrl}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(event) => {
                event.preventDefault();
                void openExternalUrl(def.signupUrl!);
              }}
            >
              <ConstructChatProviderMark provider={def.id} className="lc-free-api-guide__mark" />
              <span>{def.label}</span>
              <ExternalLink size={12} strokeWidth={2.25} aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      <p className="lc-free-api-guide__note">{t("construct.model.freeApi.ollamaNote")}</p>
      <p className="lc-free-api-guide__disclaimer">{t("construct.model.freeApi.disclaimer")}</p>
    </section>
  );
}
