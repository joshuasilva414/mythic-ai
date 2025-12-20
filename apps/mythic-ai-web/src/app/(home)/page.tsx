import Link from "next/link";
import { Sparkles, Sword, Scroll, Dice5 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <Dice5 className="h-5 w-5" />
          </div>
          <span className="bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
            Mythic AI
          </span>
        </div>
        <nav className="flex gap-4">
          <Link
            href="/session"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            Sign In
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-6 lg:px-8">
        <div className="relative min-h-screen max-w-4xl space-y-8">
          {/* Decorative background blur */}
          <div className="absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[100px]" />
          <div className="absolute top-24 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 translate-y-12 rounded-full bg-purple-500/20 blur-[80px]" />

          {/* Badge */}
          <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-800 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            <span className="opacity-90">
              Experience the next evolution of RPGs
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            Where Stories <br className="hidden sm:block" />
            <span className="bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
              Come Alive
            </span>
          </h1>

          {/* Description */}
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
            Unleash your imagination in a limitless Dungeons & Dragons world
            powered by advanced AI. Craft unique characters, explore generated
            realms, and roll for initiative like never before.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6 pt-4">
            <Link
              href="/session"
              className="group inline-flex h-12 items-center justify-center rounded-lg bg-indigo-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:scale-105 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Start Adventure
              <Sword className="ml-2 h-4 w-4 transition-transform group-hover:rotate-45" />
            </Link>

            <Link
              href="#"
              className="group inline-flex h-12 items-center justify-center rounded-lg border border-input bg-background px-8 text-sm font-semibold shadow-sm transition-all hover:bg-accent hover:text-accent-foreground active:scale-95"
            >
              How It Works
              <Scroll className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid max-w-5xl gap-8 sm:grid-cols-3 text-left">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <Sword className="h-5 w-5" />
            </div>
            <h3 className="mb-2 font-semibold">Dynamic Combat</h3>
            <p className="text-sm text-muted-foreground">
              Engage in tactical battles where the AI adapts to your every move
              and strategy.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Scroll className="h-5 w-5" />
            </div>
            <h3 className="mb-2 font-semibold">Infinite Lore</h3>
            <p className="text-sm text-muted-foreground">
              Explore a world with deep history, generated on the fly as you
              uncover its secrets.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="mb-2 font-semibold">True Agency</h3>
            <p className="text-sm text-muted-foreground">
              No invisible walls. Do anything you can imagine, and the world
              will react.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Mythic AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
