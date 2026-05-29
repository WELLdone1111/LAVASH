/** Відкрити drawer «Модель» у лівому rail (усі налаштування моделей). */
export const CONSTRUCT_OPEN_MODELS_SECTION_EVENT = "lavash:construct:open-models-section";

export function dispatchConstructOpenModelsSection(): void {
  window.dispatchEvent(new CustomEvent(CONSTRUCT_OPEN_MODELS_SECTION_EVENT));
}
