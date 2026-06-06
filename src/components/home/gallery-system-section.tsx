"use client";

import { Camera, Cloud, Mail, PenLine, ShieldCheck } from "lucide-react";
import Image from "next/image";

import type { HomeCopy } from "@/components/home/copy";
import { HoverLift, Reveal } from "@/components/home/motion-primitives";
import type { StorageStatus } from "@/components/home/types";
import { Button } from "@/components/ui/button";

type GallerySystemSectionProps = {
  gallery: string[];
  storage: StorageStatus;
  t: HomeCopy;
};

export function GallerySystemSection({
  gallery,
  storage,
  t,
}: GallerySystemSectionProps) {
  return (
    <section
      id="gallery"
      className="relative z-10 mx-auto mt-6 grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-12"
    >
      <Reveal className="glass-panel p-6 lg:col-span-5">
        <div className="flex items-center gap-3">
          <Camera className="size-7 text-coral-500" />
          <div>
            <p className="text-sm font-bold text-coral-700 dark:text-coral-200">
              {t.photoWall}
            </p>
            <h2 className="text-3xl font-black tracking-[0]">
              {t.galleryPreview}
            </h2>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {gallery.map((image, index) => (
            <Reveal key={image} delay={0.08 + index * 0.1}>
              <HoverLift className="overflow-hidden rounded-3xl">
                <Image
                  src={image}
                  alt={`Gallery ${index + 1}`}
                  width={300}
                  height={375}
                  className="aspect-[4/5] object-cover shadow-lg shadow-slate-900/10 transition-transform duration-500 ease-out hover:scale-105"
                />
              </HoverLift>
            </Reveal>
          ))}
        </div>
      </Reveal>

      <Reveal className="glass-panel p-6 lg:col-span-7">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Better Auth",
              body: t.cards.auth,
            },
            {
              icon: Cloud,
              title: storage.provider,
              body: storage.configured
                ? `${t.cards.r2Ready} ${storage.bucket}.`
                : t.cards.r2Pending,
            },
            {
              icon: PenLine,
              title: "Creator Studio",
              body: t.cards.studio,
            },
          ].map((item, index) => (
            <Reveal key={item.title} delay={0.08 + index * 0.1}>
              <HoverLift className="rounded-3xl border border-white/45 bg-white/35 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10">
                <item.icon className="size-7 text-slate-800 dark:text-white" />
                <h3 className="mt-4 text-lg font-black tracking-[0]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {item.body}
                </p>
              </HoverLift>
            </Reveal>
          ))}
        </div>

        <HoverLift className="mt-6 flex flex-col gap-3 rounded-3xl border border-white/45 bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/20 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-200">{t.newsletter}</p>
            <h3 className="mt-1 text-2xl font-black tracking-[0]">
              {t.newsletterTitle}
            </h3>
          </div>
          <Button variant="soft">
            <Mail className="size-4" />
            {t.subscribe}
          </Button>
        </HoverLift>
      </Reveal>
    </section>
  );
}
