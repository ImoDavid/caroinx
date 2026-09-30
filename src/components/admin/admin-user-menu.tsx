"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** First letters of the first two words, e.g. "Ada Lovelace" -> "AL". */
function initialsOf(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("");

  return letters.toUpperCase() || "A";
}

export type AdminUserMenuProps = {
  name: string;
  email: string;
  role: string;
  /** `id` of the sign-out <form> rendered by the topbar. */
  signOutFormId: string;
};

export function AdminUserMenu({ name, email, role, signOutFormId }: AdminUserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account menu" className="size-11">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-primary text-label-sm font-bold text-primary-foreground"
          >
            {initialsOf(name)}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="grid gap-0.5">
            <span className="truncate text-body-sm font-semibold">{name}</span>
            {/* Full value stays in the DOM; `truncate` is visual only. */}
            <span className="truncate text-label-sm font-normal text-muted-foreground">
              {email}
            </span>
            <span className="pt-1 text-label-badge font-bold tracking-widest uppercase">
              {role}
            </span>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/*
          The <form> lives in the topbar, outside this dropdown. HTML's `form`
          attribute lets a submit button drive a form anywhere in the document,
          so this keeps real `menuitem` semantics AND keeps sign-out a plain
          form action that re-verifies with requireAdmin() — no auth-client.ts,
          no server-action import inside a client component.
        */}
        <DropdownMenuItem asChild>
          <button type="submit" form={signOutFormId} className="w-full gap-2">
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
