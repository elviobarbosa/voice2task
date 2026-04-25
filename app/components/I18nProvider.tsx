"use client";

import { useState, useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

type Locale = "en" | "pt";

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("locale") as Locale | null;
  if (stored === "pt" || stored === "en") return stored;
  const lang = navigator.language || "";
  return lang.startsWith("pt") ? "pt" : "en";
}

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const detected = detectLocale();
    setLocale(detected);
    localStorage.setItem("locale", detected);
  }, []);

  const messages = locale === "pt" ? pt : en;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
