"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import { updateProfile } from "@/lib/actions/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileFormProps {
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string | null;
  };
}

const initialState = {
  error: undefined as string | undefined,
  success: undefined as string | undefined,
};

type ProfileFormState = typeof initialState;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> => {
      const result = await updateProfile(formData);
      return result ?? initialState;
    },
    initialState
  );

  const displayName = profile.display_name ?? profile.username;

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Profilvorschau</CardTitle>
          <CardDescription>So sehen andere dein Profil in der App.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/50 bg-muted/20 p-6 text-center">
            <Avatar className="h-24 w-24">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-2xl font-semibold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{displayName}</h2>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              <p className="text-sm text-muted-foreground">
                {profile.status || "Noch kein Status gesetzt"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Profil bearbeiten</CardTitle>
          <CardDescription>
            Aktualisiere Name, Avatar und deinen aktuellen Status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-5">
            {state.error ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </div>
            ) : null}
            {state.success ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                {state.success}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Kontoname</Label>
                <Input
                  key={`username:${profile.username}`}
                  id="username"
                  name="username"
                  defaultValue={profile.username}
                  required
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Anzeigename</Label>
                <Input
                  key={`display_name:${profile.display_name ?? ""}`}
                  id="display_name"
                  name="display_name"
                  defaultValue={profile.display_name ?? ""}
                  required
                  className="bg-muted/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input
                key={`status:${profile.status ?? ""}`}
                id="status"
                name="status"
                defaultValue={profile.status ?? ""}
                placeholder="Gerade online, im Meeting, am Coden ..."
                className="bg-muted/30"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url">Profilbild URL</Label>
              <Input
                key={`avatar_url:${profile.avatar_url ?? ""}`}
                id="avatar_url"
                name="avatar_url"
                type="url"
                defaultValue={profile.avatar_url ?? ""}
                placeholder="https://example.com/avatar.png"
                className="bg-muted/30"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Speichern
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
