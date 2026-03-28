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
      <section
        className="panel"
        style={{
          maxWidth: 540,
          margin: "48px auto",
          padding: 32,
          display: "grid",
          gap: 16
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>Mundo Dodgeball</span>
          <div style={{ display: "flex", gap: 8 }}>
            {(["ko", "en"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: item === locale ? "1px solid transparent" : "1px solid rgba(255,255,255,0.14)",
                  background: item === locale ? "rgba(185,255,102,0.18)" : "transparent",
                  color: "var(--text)"
                }}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: 40 }}>{t(locale, "guest.title")}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t(locale, "guest.subtitle")}
        </p>
        <label style={{ display: "grid", gap: 8 }}>
          <span>{t(locale, "guest.nickname")}</span>
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
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text)"
            }}
          />
        </label>
        <p style={{ margin: 0, color: error ? "#ff9388" : "var(--muted)", fontSize: 14 }}>
          {error || tf(locale, "guest.nicknameHint", { max: MAX_NICKNAME_LENGTH })}
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            marginTop: 8,
            padding: "14px 16px",
            border: 0,
            borderRadius: 14,
            background: canSubmit ? "linear-gradient(135deg, var(--blue), #77f0ff)" : "rgba(255,255,255,0.12)",
            color: canSubmit ? "#07111b" : "var(--muted)",
            fontWeight: 700,
            cursor: canSubmit ? "pointer" : "not-allowed"
          }}
        >
          {isSubmitting ? t(locale, "guest.entering") : t(locale, "guest.enter")}
        </button>
      </section>
    </main>
  );
}
