"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <nav className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-brand-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">N</span>
          NaijaArtisans
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <Link href="/browse" className="btn-ghost">Find Artisans</Link>
          <Link href="/services" className="btn-ghost">Services</Link>
          <Link href="/jobs" className="btn-ghost">Job Board</Link>
          <Link href="/pricing" className="btn-ghost">Pricing</Link>
          <Link href="/help" className="btn-ghost">Help</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="btn-ghost">Dashboard</Link>
              <span className="ml-2 hidden text-sm text-gray-500 lg:inline">Hi, {user.name.split(" ")[0]}</span>
              <button onClick={handleLogout} className="btn-outline ml-1">Log out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-outline ml-2">Log in</Link>
              <Link href="/register" className="btn-primary">Sign up</Link>
            </>
          )}
        </div>

        <button className="btn-ghost md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          ☰
        </button>
      </nav>

      {open && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            <Link href="/browse" className="btn-ghost justify-start" onClick={() => setOpen(false)}>Find Artisans</Link>
            <Link href="/services" className="btn-ghost justify-start" onClick={() => setOpen(false)}>Services</Link>
            <Link href="/jobs" className="btn-ghost justify-start" onClick={() => setOpen(false)}>Job Board</Link>
            <Link href="/pricing" className="btn-ghost justify-start" onClick={() => setOpen(false)}>Pricing</Link>
            <Link href="/help" className="btn-ghost justify-start" onClick={() => setOpen(false)}>Help</Link>
            {user ? (
              <>
                <Link href="/dashboard" className="btn-ghost justify-start" onClick={() => setOpen(false)}>Dashboard</Link>
                <button onClick={handleLogout} className="btn-outline justify-start">Log out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-outline justify-start" onClick={() => setOpen(false)}>Log in</Link>
                <Link href="/register" className="btn-primary justify-start" onClick={() => setOpen(false)}>Sign up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
