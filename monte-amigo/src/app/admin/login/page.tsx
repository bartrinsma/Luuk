import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Inloggen" };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin/");
  return (
    <main className="adm-login">
      <div className="adm-card">
        <div className="adm-card-body">
          <div className="adm-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo.png" alt="" />
            <span>
              Monte Amigo
              <small>Beheer</small>
            </span>
          </div>
          <LoginForm configured={adminConfigured()} />
        </div>
      </div>
    </main>
  );
}
