import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · jon-finance" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const next = typeof params.next === "string" ? params.next : "/";
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">jon-finance</h1>
          <p className="text-sm text-muted-foreground">Private. Read-only. One allowed email.</p>
        </div>
        <LoginForm next={next} error={error} />
      </div>
    </main>
  );
}
