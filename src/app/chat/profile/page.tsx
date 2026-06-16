import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileWithStatus, error: profileWithStatusError } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, status")
    .eq("id", user.id)
    .single();

  let profile = profileWithStatus;

  if (!profile && profileWithStatusError) {
    const { data: profileWithoutStatus } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .single();

    profile = profileWithoutStatus
      ? {
          ...profileWithoutStatus,
          status: null,
        }
      : null;
  }

  if (!profile) {
    redirect("/chat");
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6 lg:p-8">
        <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary">Mein Profil</p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Dein Profil anpassen
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Verwalte hier deinen Kontonamen, Anzeigenamen, dein Profilbild
                und einen kurzen Status.
              </p>
            </div>
          </div>
        </div>

        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
