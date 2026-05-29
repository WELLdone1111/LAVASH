import type { ConstructChatProvider } from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { cn } from "@/lib/utils";

type ConstructChatProviderMarkProps = {
  provider: ConstructChatProvider;
  className?: string;
};

/**
 * Візуальні марки провайдерів чату (спрощені SVG, без зовнішніх URL).
 */
export function ConstructChatProviderMark(props: ConstructChatProviderMarkProps) {
  const { provider, className } = props;
  const base = "lc-chat-panel__provider-mark";

  if (provider === "groq") {
    return (
      <span className={cn(base, className)} aria-hidden>
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <rect width="24" height="24" rx="5" fill="#f55000" />
          <path
            fill="#fff"
            d="M7.2 7.4h6.4c2.6 0 4.2 1.7 4.2 4.1 0 2.5-1.7 4.1-4.3 4.1H7.2V7.4zm2.3 2v4.2h4c1.3 0 2-.7 2-2.1 0-1.3-.7-2.1-2-2.1h-4z"
          />
        </svg>
      </span>
    );
  }

  if (provider === "gemini") {
    return (
      <span className={cn(base, className)} aria-hidden>
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <path d="M12 2 L20 12 12 12 Z" fill="#4285f4" />
          <path d="M20 12 L12 22 12 12 Z" fill="#ea4335" />
          <path d="M12 22 L4 12 12 12 Z" fill="#fbbc04" />
          <path d="M4 12 L12 2 12 12 Z" fill="#34a853" />
        </svg>
      </span>
    );
  }

  if (provider === "anthropic") {
    return (
      <span className={cn(base, className)} aria-hidden>
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <rect width="24" height="24" rx="5" fill="#d97757" />
          <path
            fill="#fff"
            d="M12 5.5c2.8 0 4.5 1.8 4.5 4.2 0 1.6-.8 2.8-2.2 3.4 1.5.6 2.5 1.9 2.5 3.5 0 2.2-1.8 3.8-4.3 3.8-1.4 0-2.6-.5-3.5-1.3l1.1-1.3c.7.6 1.5.9 2.4.9 1.3 0 2-.6 2-1.7 0-1.1-.8-1.7-2.3-1.7h-1.2V9.2h1.1c1.2 0 1.9-.5 1.9-1.5 0-1-.7-1.5-1.9-1.5-.7 0-1.4.3-2 .8L7.6 6c.8-.8 2-1.3 3.4-1.3z"
          />
        </svg>
      </span>
    );
  }

  if (provider === "xai") {
    return (
      <span className={cn(base, className)} aria-hidden>
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <rect width="24" height="24" rx="5" fill="#0a0a0a" />
          <path
            fill="#fff"
            d="M7.2 7.5h3.4l2.1 3.4 2.1-3.4H18l-3.6 5.5L18.2 18h-3.3l-2.3-3.6-2.3 3.6H7.1l3.7-5-3.6-5.5z"
          />
        </svg>
      </span>
    );
  }

  if (provider === "moonshot") {
    return (
      <span className={cn(base, className)} aria-hidden>
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <rect width="24" height="24" rx="5" fill="#16a34a" />
          <path
            fill="#fff"
            d="M14.2 6.5c2.8 1.2 4.5 3.8 4.2 6.8-.2 2.2-1.4 4-3.2 5.1-1.1.7-2.4 1.1-3.8 1.1-3.6 0-6.4-2.8-6.4-6.3 0-3.2 2.3-5.8 5.4-6.4.8-.1 1.6-.1 2.4.1-.5.9-.8 1.9-.8 2.9 0 .5.1 1 .2 1.5z"
          />
        </svg>
      </span>
    );
  }

  if (provider === "openai") {
    return (
      <span className={cn(base, className)} aria-hidden>
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <rect width="24" height="24" rx="5" fill="#0d0d0d" />
          <path
            fill="#fff"
            d="M12 5.2c2.8 0 4.3 1.5 4.3 3.4 0 1.5-.9 2.6-2.4 3.1 1.6.5 2.7 1.8 2.7 3.6 0 2.3-1.9 3.9-4.6 3.9-1.5 0-2.8-.5-3.7-1.4l1.2-1.4c.7.7 1.6 1.1 2.5 1.1 1.4 0 2.2-.7 2.2-1.8 0-1.2-.9-1.9-2.6-1.9h-1.4V9.4h1.3c1.3 0 2-.6 2-1.6 0-1-.8-1.6-2.1-1.6-.8 0-1.6.3-2.2.9L7.4 5.8c.9-.9 2.2-1.4 3.7-1.4z"
          />
        </svg>
      </span>
    );
  }

  if (provider === "openrouter") {
    return (
      <span className={cn(base, className)} aria-hidden>
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <rect width="24" height="24" rx="5" fill="#6366f1" />
          <path
            fill="#fff"
            d="M6 8h12v2.2H11.4v5.6H9V10.2H6V8zm3.8 7.4c2.4 0 3.9-1.2 3.9-3.1S12.2 9.2 9.8 9.2 6 10.4 6 12.3s1.4 3.1 3.8 3.1zm0-1.8c-1.1 0-1.7-.6-1.7-1.3s.6-1.3 1.7-1.3 1.7.6 1.7 1.3-.6 1.3-1.7 1.3z"
          />
        </svg>
      </span>
    );
  }

  if (provider === "mistral") {
    return (
      <span className={cn(base, className)} aria-hidden>
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <rect width="24" height="24" rx="5" fill="#f97316" />
          <path fill="#fff" d="M5 7h3.2v10H5V7zm5.4 0H14v2.2h-1.2v1.4H14v2h-1.2v1.4H14V17h-3.6V7zm5.8 0H19v10h-3.2l2.6-5-2.6-5z" />
        </svg>
      </span>
    );
  }

  if (provider === "deepseek") {
    return (
      <span className={cn(base, className)} aria-hidden>
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <rect width="24" height="24" rx="5" fill="#1d4ed8" />
          <path
            fill="#fff"
            d="M7 7.5h4.2c2.5 0 4 1.4 4 3.6 0 1.5-.8 2.6-2.1 3.1l2.4 3.8h-2.6l-2.1-3.4H9.2V17H7V7.5zm2.2 2v2.5h1.8c1.1 0 1.7-.5 1.7-1.2s-.6-1.3-1.7-1.3H9.2z"
          />
        </svg>
      </span>
    );
  }

  if (provider === "together") {
    return (
      <span className={cn(base, className)} aria-hidden>
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <rect width="24" height="24" rx="5" fill="#0ea5e9" />
          <circle cx="8" cy="12" r="2.2" fill="#fff" />
          <circle cx="16" cy="12" r="2.2" fill="#fff" />
          <path stroke="#fff" strokeWidth="1.6" d="M10.2 12h3.6" />
        </svg>
      </span>
    );
  }

  if (provider === "cerebras") {
    return (
      <span className={cn(base, className)} aria-hidden>
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <rect width="24" height="24" rx="5" fill="#f59e0b" />
          <path
            fill="#111"
            d="M12 6l5.5 9.5H6.5L12 6zm0 2.2L9.4 14h5.2L12 8.2z"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className={cn(base, className)} aria-hidden>
      <svg viewBox="0 0 24 24" width={18} height={18}>
        <rect width="24" height="24" rx="5" fill="#1f1f1f" />
        <ellipse cx="12" cy="14" rx="5.2" ry="6" fill="#fafafa" />
        <circle cx="9.4" cy="12.2" r="1.15" fill="#1f1f1f" />
        <circle cx="14.6" cy="12.2" r="1.15" fill="#1f1f1f" />
        <path
          fill="none"
          stroke="#1f1f1f"
          strokeWidth="1.1"
          strokeLinecap="round"
          d="M9.8 16.2c1 .85 2.4 1.1 3.6.35"
        />
        <path
          fill="#fafafa"
          d="M7.8 7.2c.9-2.1 2.6-3.4 4.2-3.4s3.3 1.3 4.2 3.4l-1.3 1.1c-.6-1.3-1.7-2-2.9-2s-2.3.7-2.9 2L7.8 7.2z"
        />
      </svg>
    </span>
  );
}
