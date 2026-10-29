"use client"

import Image from "next/image"
import Link from "next/link"
import { DirLabel } from "@/components/ui/dir-label"
import { FileBox } from "@/components/ui/file-box"
import { NameBlock } from "@/components/ui/name-block"
import { SiteNav } from "@/components/ui/site-nav"
import { useLocale } from "@/lib/locale-context"
import { trackEvent } from "@/lib/analytics"
import { byteLength } from "@/lib/format"
import { cn } from "@/lib/utils"
import { EMAIL, GITHUB, LINKEDIN } from "@/constants/profile"
import type { IExperienceFile, IProjectFile } from "@/constants/dictionary"

/** Part de la hauteur défilable où la photo s'ouvre : le visage, pas le ciel. */
export const PHOTO_START = 0.35

/** Place la photo sur le visage au chargement. */
export function framePhoto(frame: HTMLElement | null): void {
  if (!frame) return
  frame.scrollTop = (frame.scrollHeight - frame.clientHeight) * PHOTO_START
}

/** Grille de 12 colonnes du CV, repliée en une colonne sur mobile. */
const GRID = "grid grid-cols-1 gap-y-3 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-5"

/** Poids affiché d'un fichier, calculé sur tout ce qu'il contient. */
function sizeOf(...parts: Array<string | undefined>): number {
  return byteLength(parts.filter(Boolean).join(""))
}

interface IExperienceBoxProps {
  entry: IExperienceFile
  className?: string
}

interface IProjectBoxProps {
  project: IProjectFile
  className?: string
}

function ExperienceBox({ entry, className }: IExperienceBoxProps) {
  const { t } = useLocale()
  return (
    <FileBox name={entry.file} meta={t.common.fileSize(sizeOf(entry.role, entry.org, entry.period, entry.text, ...(entry.bullets ?? [])))} className={className}>
      <p>
        <strong className="font-bold text-teal-ink">{entry.role}</strong> · {entry.org} · <span className="text-coral-ink">{entry.period}</span>
      </p>
      {entry.bullets && (
        <ul className="mt-2">
          {entry.bullets.map((bullet) => (
            <li key={bullet} className="mt-1 pl-[2ch] -indent-[2ch] before:content-['-_']">
              {bullet}
            </li>
          ))}
        </ul>
      )}
      {entry.text && <p className="mt-2.5">{entry.text}</p>}
    </FileBox>
  )
}

function ProjectBox({ project, className }: IProjectBoxProps) {
  const { t } = useLocale()
  return (
    <FileBox name={project.file} href={project.href} meta={t.common.fileSize(sizeOf(project.name, project.tags, project.text))} className={className}>
      <p>
        <strong className="font-bold text-teal-ink">{project.name}</strong>, <span className="text-coral-ink">{project.tags}</span>
      </p>
      <p className="mt-2.5">{project.text}</p>
    </FileBox>
  )
}

/**
 * Contenu éditorial de la page « à propos », composé comme le CV : un dossier
 * de fichiers posés sur une grille de 12 colonnes, légèrement décalés en
 * hauteur. Pas de bloc de compétences : c'est au double IA d'y répondre.
 *
 * Composant client : tout son texte vient du dictionnaire de la langue courante.
 * Les métadonnées SEO restent côté serveur, dans `src/app/about/page.tsx`.
 */
export function AboutContent() {
  const { t } = useLocale()
  const { about } = t
  const [lead, ...others] = about.experience

  return (
    <article className="relative mx-auto flex w-full max-w-[1248px] flex-col text-[14px] leading-[1.55] lg:text-[15px] lg:leading-[1.6]">
      <p aria-hidden="true" className="absolute top-[116px] -right-14 hidden text-[13px] font-bold tracking-[0.2em] text-teal-ink [writing-mode:vertical-rl] xl:block">
        LEAD TECH
      </p>

      <SiteNav
        current="about"
        analyticsFrom="about"
        brand={
          <Link href="/" className="py-3 font-medium text-ink no-underline transition-colors hover:text-teal-ink">
            {t.common.navHome}
          </Link>
        }
      />

      <header className="mt-10 lg:mt-24">
        <NameBlock className="text-[60px] lg:text-[112px]" />
        <p className="mt-4 text-[14px] font-medium text-ink lg:mt-6 lg:text-[20px]">{t.landing.role}</p>
      </header>

      <div className={cn(GRID, "mt-7 lg:mt-12")}>
        <FileBox name="README.md" meta={t.common.fileSize(byteLength(about.readme))} className="lg:col-span-8">
          <p className="text-[15px] text-ink lg:text-[17px]">{about.readme}</p>
        </FileBox>
        <FileBox name="contact.vcf" meta={t.common.fileSize(sizeOf(EMAIL.label, GITHUB.label, LINKEDIN.label, about.contactLocation, about.contactLanguages))} className="text-ink lg:col-span-4 lg:mt-7">
          <p className="flex flex-col gap-0.5 text-[13px] lg:text-[14px]">
            {[EMAIL, GITHUB, LINKEDIN].map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="file-name w-fit hover:text-ink">
                {link.label}
              </a>
            ))}
            <span>{about.contactLocation}</span>
            <span>{about.contactLanguages}</span>
          </p>
        </FileBox>
      </div>

      <div className={cn(GRID, "mt-3 lg:mt-5")}>
        <FileBox name={about.storyFile} meta={t.common.fileSize(sizeOf(...about.story))} className="lg:col-span-7">
          {about.story.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="mt-2.5 first:mt-0">
              {paragraph}
            </p>
          ))}
        </FileBox>
        <FileBox name={about.photoFile} meta={about.photoScrollHint} className="lg:col-span-5 lg:mt-[18px]">
          {/* Cadre fixe, photo entière : on la fait défiler dedans. Elle s'ouvre
              cadrée sur le visage (35 % de la hauteur), comme l'ancien recadrage. */}
          <div tabIndex={0} role="region" aria-label={about.photoAlt} className="photo-frame h-[260px] overflow-y-auto overscroll-contain focus-visible:outline-1 focus-visible:outline-teal-ink lg:h-[300px]">
            <Image src="/photo-damien.jpg" alt={about.photoAlt} width={640} height={990} sizes="(min-width: 1024px) 500px, 100vw" className="block h-auto w-full" priority onLoad={(event) => framePhoto(event.currentTarget.parentElement)} />
          </div>
        </FileBox>
      </div>

      <section className="mt-10 lg:mt-16">
        <DirLabel name={about.experienceDir} meta={t.common.itemCount(about.experience.length)} />
        <div className={cn(GRID, "mt-3 lg:mt-5")}>
          <ExperienceBox entry={lead} className="lg:col-span-12" />
          {others.map((entry, index) => (
            <ExperienceBox key={entry.file} entry={entry} className={cn("lg:col-span-6", index === 1 && "lg:mt-[18px]")} />
          ))}
        </div>
      </section>

      <section className="mt-10 lg:mt-16">
        <DirLabel name={about.projectsDir} meta={t.common.itemCount(about.projects.length)} />
        <div className={cn(GRID, "mt-3 lg:mt-5")}>
          {about.projects.map((project, index) => (
            <ProjectBox key={project.file} project={project} className={cn("lg:col-span-4", index === 1 && "lg:mt-7", index === 2 && "lg:mt-3")} />
          ))}
        </div>
      </section>

      <div className={cn(GRID, "mt-10 lg:mt-14")}>
        <FileBox name={about.philosophyFile} meta={t.common.fileSize(byteLength(about.philosophy))} className="lg:col-span-7">
          <p className="text-[15px] text-ink lg:text-[17px]">{about.philosophy}</p>
        </FileBox>
        <FileBox name="todo.md" meta={t.common.fileSize(sizeOf(...about.todoDone, about.todoOpen))} tone="accent" className="lg:col-span-5 lg:mt-[22px]">
          <ul>
            {about.todoDone.map((item) => (
              <li key={item} className="mt-1 pl-[2ch] -indent-[2ch] line-through decoration-1 before:content-['-_'] first:mt-0">
                {item}
              </li>
            ))}
            <li className="mt-1 pl-[2ch] font-bold -indent-[2ch] before:content-['-_']">{about.todoOpen}</li>
          </ul>
        </FileBox>
      </div>

      <div className={cn(GRID, "mt-3 lg:mt-5")}>
        <FileBox name={about.educationFile} meta={t.common.fileSize(byteLength(about.education))} className="lg:col-span-5">
          <p>{about.education}</p>
        </FileBox>
        <FileBox name={about.offscreenDir} meta={t.common.itemCount(about.offscreen.length)} className="lg:col-span-4 lg:mt-4">
          <ul className="flex flex-col lg:flex-row lg:flex-wrap lg:gap-x-5 lg:gap-y-0.5">
            {about.offscreen.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </FileBox>
      </div>

      <footer className="mt-14 flex flex-col gap-6 border-t border-rule pt-6 lg:mt-24 lg:flex-row lg:items-end lg:justify-between lg:pt-8">
        <div>
          <p>{about.ctaQuestion}</p>
          <Link href="/" onClick={() => trackEvent("about_cta_clicked")} className="group mt-2.5 inline-block py-1.5 text-[22px] font-bold tracking-[-0.03em] text-teal-ink no-underline lg:mt-3 lg:text-[32px]">
            <span aria-hidden="true" className="mr-[1ch] inline-block transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
            {about.ctaLink}
          </Link>
        </div>
      </footer>
    </article>
  )
}
