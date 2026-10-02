import { Header } from "@/components/Header";
import { ToastProvider } from "@/components/share/Toast";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <ToastProvider>
        <main className="flex flex-1 flex-col">{children}</main>
      </ToastProvider>
      <footer className="px-6 pb-8 pt-16 text-center text-xs leading-relaxed text-ink/30">
        Luuk.si — indicaties, geen financieel advies. Al heeft Luuk meestal gelijk. Sí.
        <br />
        We bewaren wat er bij Luuk wordt opgezocht (adres, kenteken of website) zonder IP-adres of tracking-cookies, om de dienst te verbeteren.
      </footer>
    </>
  );
}
