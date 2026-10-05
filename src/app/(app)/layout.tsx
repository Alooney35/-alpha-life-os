import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))] md:ml-56 md:pb-12 md:pl-8 lg:mx-auto">
        {children}
      </main>
    </>
  );
}
