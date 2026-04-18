"use client";

import { MAX_NICKNAME_LENGTH } from "@mundo/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { t, tf } from "../../lib/i18n/messages";
import { getSocket } from "../../lib/socket/client";
import { saveGuestSession } from "../../lib/session/guestSession";

function detectLocale(): "ko" | "en" {
  if (typeof navigator === "undefined") {
    return "ko";
  }

  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export default function GuestPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [locale, setLocale] = useState<"ko" | "en">("ko");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const applyNickname = (value: string) => {
    setNickname(value.slice(0, MAX_NICKNAME_LENGTH));
  };

  useEffect(() => {
    const socket = getSocket();

    const handleEntered = (payload: { guestId: string; nickname: string; locale: "ko" | "en" }) => {
      saveGuestSession(payload);
      setIsSubmitting(false);
      router.push("/rooms");
    };

    const handleError = (payload: { code: string; message: string }) => {
      if (payload.code === "INVALID_NICKNAME" || payload.code === "SESSION_NOT_FOUND") {
        setError(payload.message);
        setIsSubmitting(false);
      }
    };

    socket.on("guest:entered", handleEntered);
    socket.on("system:error", handleError);

    return () => {
      socket.off("guest:entered", handleEntered);
      socket.off("system:error", handleError);
    };
  }, [router]);

  const trimmedNickname = nickname.trim();
  const canSubmit = trimmedNickname.length > 0 && trimmedNickname.length <= MAX_NICKNAME_LENGTH && !isSubmitting;
  const brandName = locale === "ko" ? "문도 피구" : "Mundo Dodgeball";

  const handleSubmit = () => {
    const trimmed = nickname.trim();

    if (!trimmed || trimmed.length > MAX_NICKNAME_LENGTH) {
      setError(tf(locale, "guest.nicknameError", { max: MAX_NICKNAME_LENGTH }));
      return;
    }

    setError("");
    setIsSubmitting(true);

    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("guest:enter", { nickname: trimmed, locale });
  };

  return (
    <main className="page-shell">
      <section className="guest-shell">
        <div className="guest-topbar">
          <div className="guest-brand">
            <span className="guest-brand-mark" />
            <div>
              <p className="guest-kicker">{brandName}</p>
            </div>
          </div>
          <div className="guest-locale-toggle">
            {(["ko", "en"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                className={item === locale ? "guest-locale-button active" : "guest-locale-button"}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="guest-hero">
          <h1 className="guest-title">{t(locale, "guest.title")}</h1>
          <p className="guest-subtitle">{t(locale, "guest.subtitle")}</p>
        </div>

        <div className="guest-card panel">
          <div className="guest-card-header">
            <div>
              <h2 className="guest-card-title">{t(locale, "guest.enter")}</h2>
            </div>
          </div>

          <label className="guest-input-group">
            <span className="guest-input-label">{t(locale, "guest.nickname")}</span>
            <input
              value={nickname}
              maxLength={MAX_NICKNAME_LENGTH}
              onChange={(event) => applyNickname(event.target.value)}
              onInput={(event) => applyNickname(event.currentTarget.value)}
              onCompositionEnd={(event) => applyNickname(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSubmit();
                }
              }}
              placeholder={t(locale, "guest.nicknamePlaceholder")}
              className="guest-input"
            />
          </label>

          <div className="guest-card-footer">
            <p className={error ? "guest-form-hint guest-form-hint-error" : "guest-form-hint"}>
              {error || tf(locale, "guest.nicknameHint", { max: MAX_NICKNAME_LENGTH })}
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="guest-submit"
            >
              {isSubmitting ? t(locale, "guest.entering") : t(locale, "guest.enter")}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
