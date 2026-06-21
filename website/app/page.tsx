"use client";

import {
  categories,
  heroImage,
  howItWorks,
  leankExamples,
  navItems,
  socialProofImages,
} from "@/lib/content";
import {
  ArrowRight,
  Download,
  ExternalLink,
  Heart,
  MapPin,
  Smartphone,
  X,
} from "lucide-react";
import Image from "next/image";
import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";

type Store = "iOS" | "Android";

export default function Home() {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const openComingSoon = (store: Store) => setSelectedStore(store);
  const closeComingSoon = () => setSelectedStore(null);

  return (
    <main className="min-h-screen overflow-hidden bg-white text-ink">
      <Hero onDownload={openComingSoon} />
      <ProductPreview />
      <HowItWorks />
      <LeanksGrid />
      <StoriesSection />
      <Footer onDownload={openComingSoon} />
      <DownloadModal store={selectedStore} onClose={closeComingSoon} />
    </main>
  );
}

function Header() {
  return (
    <header className="absolute left-0 right-0 top-0 z-30">
      <div className="relative mx-auto flex max-w-7xl items-center px-5 py-5 lg:px-8">
        <a href="#top" className="flex items-center gap-3 text-white">
          <Image
            src="/brand/white-icon.png"
            width={28}
            height={35}
            alt=""
            className="h-8 w-auto"
            priority
          />
          <span className="text-lg font-extrabold">Leankly</span>
        </a>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition hover:text-lemon"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Hero({ onDownload }: { onDownload: (store: Store) => void }) {
  return (
    <section
      id="top"
      className="relative min-h-[86svh] overflow-hidden bg-ink text-white"
    >
      <Header />
      <Image
        src={heroImage}
        alt="Friends laughing outside before a meetup"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,19,31,0.88)_0%,rgba(16,19,31,0.62)_43%,rgba(16,19,31,0.16)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,#ffffff_0%,rgba(255,255,255,0)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-[86svh] max-w-7xl flex-col justify-center px-5 pb-16 pt-28 lg:px-8 lg:pb-20">
        <div className="max-w-3xl">
          <p className="mt-5 max-w-2xl text-2xl font-extrabold leading-tight text-white md:text-4xl">
            <AnimatedLetters text="Side Questing For The " />
            <AnimatedLetters
              text="Plot"
              className="text-aqua"
              startDelay={520}
            />
          </p>
          <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/82 md:text-lg">
            Turn your everyday adventures into epic side quests. Connect with
            people nearby who share your interests and create unforgettable
            experiences together.
          </p>
          <StoreButtons onDownload={onDownload} />
        </div>
      </div>
    </section>
  );
}

function StoreButtons({ onDownload }: { onDownload: (store: Store) => void }) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={() => onDownload("iOS")}
        className="flex min-h-14 items-center justify-center gap-3 rounded-full border border-white/35 bg-white/10 px-6 text-sm font-extrabold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/18"
      >
        <Image src="/brand/apple.svg" width={20} height={20} alt="" />
        Get it on the App Store
      </button>
    </div>
  );
}

function AnimatedLetters({
  text,
  className = "",
  startDelay = 0,
}: {
  text: string;
  className?: string;
  startDelay?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const tokens = text.split(/(\s+)/);

  return (
    <span ref={ref} aria-label={text} className={className}>
      {tokens.map((token, tokenIndex) => {
        const previousLength = tokens.slice(0, tokenIndex).join("").length;

        if (/^\s+$/.test(token)) {
          return (
            <span key={`space-${tokenIndex}`} aria-hidden="true">
              {token}
            </span>
          );
        }

        const letters = Array.from(token);
        return (
          <span
            key={`${token}-${tokenIndex}`}
            aria-hidden="true"
            className="inline-block whitespace-nowrap"
          >
            {letters.map((letter, letterIndex) => {
              const style = {
                animationDelay: `${startDelay + (previousLength + letterIndex) * 28}ms`,
              } satisfies CSSProperties;

              return (
                <span
                  key={`${letter}-${letterIndex}`}
                  style={style}
                  className={`letter-fade ${isVisible ? "letter-fade-visible" : ""}`}
                >
                  {letter}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}

function ImageReveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`image-rise ${isVisible ? "image-rise-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

function ProductPreview() {
  return (
    <section className="relative bg-white px-5 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <p className="text-sm font-extrabold uppercase text-coral">
            Do First, Talk Later
          </p>
          <h2 className="mt-3 max-w-xl text-4xl font-extrabold leading-tight md:text-6xl">
            <AnimatedLetters text="Find your crew. Do whatever you want." />
          </h2>
          <p className="mt-5 max-w-xl text-base font-medium leading-7 text-muted md:text-lg">
            Leankly turns your phone into a feed of invitations... study
            sessions, runs, food crawls, museum days, gaming nights, volunteer
            shifts, and whatever else makes a good side quest.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[680px]">
          <div className="relative mx-auto grid max-w-[560px] grid-cols-[1fr_0.72fr] items-end gap-4">
            <PhonePreview />
            <div className="mb-8 hidden gap-4 sm:grid">
              <MiniRequestCard />
              <ChatPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhonePreview() {
  const leank = leankExamples[0];

  return (
    <div className="relative mx-auto w-full max-w-[330px] rounded-[2rem] border border-ink/12 bg-ink p-3 shadow-soft">
      <div className="overflow-hidden rounded-[1.45rem] bg-white">
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <div>
            <p className="text-xs font-extrabold uppercase text-muted">
              Discover
            </p>
            <p className="text-lg font-extrabold">Today&apos;s Leanks</p>
          </div>
          <Image
            src="/brand/gradient-icon.png"
            width={30}
            height={38}
            alt=""
            className="h-9 w-auto"
          />
        </div>
        <div className="flex gap-2 overflow-hidden px-4 pb-3">
          {["Location", "Food", "Today"].map((filter, index) => (
            <span
              key={filter}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-extrabold ${
                index === 0 ? "bg-aqua text-white" : "bg-aqua/10 text-ink"
              }`}
            >
              {filter}
            </span>
          ))}
        </div>
        <div className="px-4 pb-4">
          <div className="overflow-hidden rounded-lg bg-white shadow-lift">
            <div className="relative h-64 overflow-hidden">
              <ImageReveal className="absolute inset-0">
                <Image
                  src={leank.image}
                  alt=""
                  fill
                  sizes="310px"
                  className="object-cover"
                />
              </ImageReveal>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_20%,rgba(0,0,0,0.84)_100%)]" />
              <div className="absolute left-3 right-3 top-3 flex justify-end">
                <span className="rounded-full bg-black/45 px-3 py-2 text-xs font-extrabold text-white backdrop-blur">
                  {leank.category}
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-2xl font-extrabold leading-7 text-white">
                  {leank.title}
                </p>
                <p className="mt-1 text-sm font-bold text-white/82">
                  Hosted by {leank.host}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3">
              <div className="rounded-lg bg-aqua/10 p-3">
                <p className="text-xs font-bold text-muted">When</p>
                <p className="mt-1 text-sm font-extrabold">{leank.time}</p>
              </div>
              <div className="rounded-lg bg-coral/10 p-3">
                <p className="text-xs font-bold text-muted">Needed</p>
                <p className="mt-1 text-sm font-extrabold">2 people</p>
              </div>
              <div className="col-span-2 flex items-center gap-2 rounded-lg bg-ink/5 p-3">
                <MapPin size={16} className="text-coral" />
                <p className="text-sm font-extrabold">{leank.place}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-center gap-6">
            <button
              type="button"
              aria-label="Skip"
              className="grid size-16 place-items-center rounded-full bg-white shadow-lift"
            >
              <X size={26} />
            </button>
            <button
              type="button"
              aria-label="Like"
              className="grid size-16 place-items-center rounded-full bg-white shadow-lift"
            >
              <Heart size={27} className="fill-coral text-coral" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniRequestCard() {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <ImageReveal className="relative size-12 overflow-hidden rounded-full">
          <Image
            src={socialProofImages[1]}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        </ImageReveal>
        <div>
          <p className="text-sm font-extrabold">Nina wants to join</p>
          <p className="text-xs font-semibold text-muted">Quick 5k run...</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          className="rounded-full bg-ink/6 py-2 text-xs font-extrabold"
          type="button"
        >
          Decline
        </button>
        <button
          className="rounded-full bg-ink py-2 text-xs font-extrabold text-white"
          type="button"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="rounded-lg bg-ink p-4 text-white shadow-soft">
      <div className="flex items-center gap-2">
        <Smartphone size={18} className="text-aqua" />
        <p className="text-sm font-extrabold">Leank chat</p>
      </div>
      <div className="mt-4 space-y-2">
        <p className="w-fit max-w-[90%] rounded-lg bg-white/12 px-3 py-2 text-xs font-semibold">
          Meet by the front entrance?
        </p>
        <p className="ml-auto w-fit max-w-[90%] rounded-lg bg-aqua px-3 py-2 text-xs font-extrabold text-ink">
          Bet. I&apos;ll bring snacks.
        </p>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white px-5 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 pb-16 md:grid-cols-2 md:items-start">
          <p className="text-sm font-extrabold uppercase tracking-wide text-muted">
            HOW IT WORKS
          </p>
          <h2 className="max-w-2xl text-2xl font-extrabold leading-tight md:text-3xl">
            <AnimatedLetters text="Find a sidekick for your next adventure" />
          </h2>
        </div>

        <div className="border-t border-ink/10">
          {howItWorks.map((item, index) => (
            <article
              key={item.title}
              className="grid gap-8 border-b border-ink/10 py-12 md:grid-cols-[0.3fr_0.36fr_0.34fr] md:items-start lg:py-14"
            >
              <div>
                <p className="text-lg font-semibold text-muted">0{index + 1}</p>
                <h3 className="mt-12 text-2xl font-semibold leading-tight md:text-3xl">
                  {item.title}
                </h3>
              </div>
              <p className="max-w-lg text-base font-medium leading-8 text-muted md:pt-14">
                {item.body}
              </p>
              <HowItWorksVisual index={index} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-cloud p-3">
        {leankExamples.map((example, imageIndex) => (
          <ImageReveal
            key={`${example.title}-${imageIndex}`}
            className="relative aspect-square overflow-hidden rounded-md bg-ink"
          >
            <Image
              src={example.image}
              alt=""
              fill
              sizes="90px"
              className="object-cover"
            />
          </ImageReveal>
        ))}
      </div>
    );
  }

  if (index === 1) {
    const avatarImages = [
      socialProofImages[0],
      socialProofImages[1],
      socialProofImages[2],
      socialProofImages[0],
      socialProofImages[1],
      socialProofImages[2],
    ];
    const positions = [
      "left-[9%] top-[18%]",
      "left-[18%] bottom-[16%]",
      "left-[36%] top-[10%]",
      "right-[35%] bottom-[12%]",
      "right-[18%] top-[16%]",
      "right-[8%] bottom-[20%]",
    ];

    return (
      <div className="relative h-56 overflow-hidden rounded-lg bg-cloud">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 640 224"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <path
            d="M36 54 C116 20 172 118 320 112 C468 106 526 28 604 58"
            fill="none"
            stroke="#00BFFF"
            strokeOpacity="0.32"
            strokeWidth="3"
          />
          <path
            d="M48 176 C126 142 188 170 320 112 C452 54 514 148 594 116"
            fill="none"
            stroke="#00BFFF"
            strokeOpacity="0.28"
            strokeWidth="3"
          />
          <path
            d="M92 108 C154 66 218 78 320 112 C422 146 490 176 562 176"
            fill="none"
            stroke="#00BFFF"
            strokeOpacity="0.22"
            strokeWidth="2"
          />
          <path
            d="M128 206 C196 174 238 124 320 112 C402 100 454 52 526 20"
            fill="none"
            stroke="#00BFFF"
            strokeOpacity="0.18"
            strokeWidth="2"
          />
        </svg>

        <div className="absolute left-1/2 top-1/2 z-10 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-soft ring-8 ring-aqua/10">
          <Image
            src="/brand/gradient-icon.png"
            width={32}
            height={40}
            alt=""
            className="h-10 w-auto"
          />
        </div>

        {avatarImages.map((image, avatarIndex) => (
          <ImageReveal
            key={`${image}-${avatarIndex}`}
            className={`absolute ${positions[avatarIndex]} z-10 size-12 overflow-hidden rounded-full border-4 border-white bg-white shadow-lift`}
          >
            <Image
              src={image}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          </ImageReveal>
        ))}
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="rounded-lg bg-cloud p-5">
        <div className="w-fit max-w-[86%] rounded-lg bg-white px-4 py-3 text-sm text-ink shadow-sm">
          I&apos;m in. What time should we meet?
        </div>
        <div className="ml-auto mt-3 w-fit max-w-[86%] rounded-lg bg-aqua text-white px-4 py-3 text-sm  text-ink shadow-sm">
          6:30 works. Bringing snacks.
        </div>
        <div className="mt-4 flex -space-x-2">
          {socialProofImages.slice(0, 3).map((image) => (
            <ImageReveal
              key={image}
              className="relative size-8 overflow-hidden rounded-full border-2 border-white bg-white"
            >
              <Image
                src={image}
                alt=""
                fill
                sizes="32px"
                className="object-cover"
              />
            </ImageReveal>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-ink p-5 text-white">
      <p className="text-sm font-extrabold">Sunset picnic at the park</p>
      <p className="mt-2 text-xs font-semibold text-white/65">
        Accepted requests move into one focused Leank chat.
      </p>
      <div className="mt-5 rounded-full bg-white/10 px-4 py-3 text-center text-xs font-extrabold">
        Group ready
      </div>
    </div>
  );
}

function LeanksGrid() {
  return (
    <section id="leanks" className="bg-white px-5 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-extrabold uppercase text-coral">
              Find your kind of leank
            </p>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight md:text-6xl">
              <AnimatedLetters text="From quick hangs to full plot episodes" />
            </h2>
          </div>
          <p className="max-w-md text-base font-medium leading-7 text-muted">
            Everything you need to turn spontaneous ideas into real adventures.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <article
              key={category.title}
              className="group relative min-h-64 overflow-hidden rounded-lg bg-ink"
            >
              <ImageReveal className="absolute inset-0">
                <Image
                  src={category.image}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </ImageReveal>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,19,31,0)_20%,rgba(16,19,31,0.86)_100%)]" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h3 className="text-2xl font-extrabold">{category.title}</h3>
                <p className="mt-1 text-sm font-semibold text-white/78">
                  {category.label}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function StoriesSection() {
  return (
    <section className=" px-5 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="grid grid-cols-3 gap-3">
          {socialProofImages.map((image, index) => (
            <ImageReveal
              key={image}
              className={`relative overflow-hidden rounded-lg bg-ink ${index === 1 ? "mt-10 h-80" : "h-64"}`}
            >
              <Image
                src={image}
                alt=""
                fill
                sizes="(min-width:1024px) 22vw, 33vw"
                className="object-cover"
              />
            </ImageReveal>
          ))}
        </div>

        <div>
          <p className="text-sm font-extrabold uppercase text-coral">
            Designed for real life
          </p>
          <h2 className="mt-3 text-4xl font-extrabold leading-tight md:text-6xl">
            <AnimatedLetters text="Build meaningful connections through shared experiences" />
          </h2>
          <div className="mt-8 border-l-4 border-aqua pl-5">
            <p className="text-xl font-semibold leading-8">
              “I don’t need another vague ‘what are you up to?’ chat. I need
              someone who is already down for the leank.”
            </p>
            <p className="mt-3 text-sm font-bold text-muted">~ O. Famosa</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ onDownload }: { onDownload: (store: Store) => void }) {
  return (
    <footer className="bg-ink px-5 py-12 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 border-b border-white/12 pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/brand/gradient-icon.png"
                width={34}
                height={43}
                alt=""
                className="h-10 w-auto"
              />
              <p className="text-2xl font-extrabold">Leankly</p>
            </div>
            <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-white/65">
              Sidequests unlocked.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDownload("iOS")}
            className="w-fit rounded-lg transition hover:-translate-y-0.5"
            aria-label="Download on the App Store"
          >
            <img
              src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
              alt="Download on the App Store"
              className="h-12 w-auto"
            />
          </button>
        </div>

        <div className="flex flex-col gap-5 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-white/55">
            © 2026 Leankly. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-5 text-sm font-extrabold text-white">
            <a
              href="https://leankly.com/privacy"
              className="inline-flex items-center gap-1 text-white/75 hover:text-aqua"
            >
              Privacy <ExternalLink size={14} />
            </a>
            <a
              href="https://leankly.com/contact"
              className="inline-flex items-center gap-1 text-white/75 hover:text-aqua"
            >
              Contact <ExternalLink size={14} />
            </a>
            <a
              href="https://x.com/leanklyapp"
              className="inline-flex items-center gap-1 text-white/75 hover:text-aqua"
            >
              X <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function DownloadModal({
  store,
  onClose,
}: {
  store: Store | null;
  onClose: () => void;
}) {
  if (!store) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/70 px-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-title"
    >
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-soft">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-ink/6 hover:bg-ink/10"
        >
          <X size={18} />
        </button>
        <div className="grid size-14 place-items-center rounded-lg bg-aqua/12 text-aqua">
          <Download size={25} />
        </div>
        <h2
          id="download-title"
          className="mt-5 mb-5 text-2xl text-center font-extrabold"
        >
          {store} download is coming soon
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-extrabold text-white hover:bg-aqua"
        >
          Got it
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
