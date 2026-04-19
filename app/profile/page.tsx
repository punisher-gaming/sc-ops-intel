"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { ProfileBrowser } from "@/components/ProfileBrowser";

export default function ProfilePage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading profile…
          </div>
        }
      >
        <ProfileBrowser />
      </Suspense>
    </PageShell>
  );
}
