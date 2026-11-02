"use client"

import Image from "next/image"
import Link from "next/link"
import { DirLabel } from "@/components/ui/dir-label"
import { FileBox } from "@/components/ui/file-box"
import { SiteNav } from "@/components/ui/site-nav"
import { useLocale } from "@/lib/locale-context"
import { trackEvent } from "@/lib/analytics"
import { byteLength, sizeOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { IProjectShowcase } from "@/constants/dictionary"

/** Grille de 12 colonnes du CV, repliée en une colonne sur mobile. */
const GRID = "grid grid-cols-1 gap-y-3 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-5"

/** Décalage des fiches d'une colonne à l'autre, comme les fichiers du CV. */
const PROJECT_PLACEMENT = ["lg:col-span-11", "lg:col-start-2 lg:col-span-11"]

interface IProjectArticleProps {
  project: IProjectShowcase
  index: number
  className?: string
}

/**
 * Fiche d'un projet : un fichier dont la bannière occupe toute la largeur,
 * entre l'en-tête (adresse, numéro, nom) et le texte (résumé, points clés,
 * stack, lien d'action).
 */
function ProjectArticle({ project, index, className }: IProjectArticleProps) {
  const { t } = useLocale()
  const { common, projects } = t
  const { banner } = project
  const titleId = `${project.id}-title`

  return (
    <article id={project.id} aria-labelledby={titleId} className={cn("scroll-mt-6 self-start border border-rule", className)}>
      <p className="px-4 pt-3 text-[12px] lg:px-5 lg:pt-4 lg:text-[13px]">
        <a href={project.href} target="_blank" rel="noopener noreferrer" className="file-name hover:text-ink">
          {project.file}
        </a>{" "}
        <span className="text-coral-ink">{common.fileSize(sizeOf(project.name, project.tags, project.summary, ...project.bullets))}</span>
      </p>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 pt-2 pb-4 lg:px-5 lg:pb-5">
        <span className="font-bold text-coral-ink">{String(index + 1).padStart(2, "0")}</span>
        <h3 id={titleId} className="text-[32px] leading-[1.05] font-bold tracking-[-0.04em] text-ink lg:text-[44px]">
          {project.name}
        </h3>
        <span className="text-[13px] text-coral-ink lg:text-[14px]">{project.tags}</span>
      </div>

      {banner && (
        <figure className="border-y border-rule">
          <Image src={banner.src} alt={banner.alt} width={banner.width} height={banner.height} sizes="(min-width: 1248px) 1100px, 100vw" preload={index === 0} className="block h-auto w-full" />
          <figcaption className="border-t border-rule px-4 py-2 text-[12px] lg:px-5">
            <span className="text-teal-ink">{banner.file}</span> <span className="text-coral-ink">{common.fileSize(banner.bytes)}</span> · {banner.width} × {banner.height} · {banner.caption}
          </figcaption>
        </figure>
      )}

      <div className={cn(GRID, "px-4 pt-4 pb-[18px] lg:px-5 lg:pt-5 lg:pb-[22px]")}>
        <div className="lg:col-span-7">
          <p className="text-[15px] text-ink lg:text-[17px]">{project.summary}</p>
          <ul className="mt-3">
            {project.bullets.map((bullet) => (
              <li key={bullet} className="mt-1 pl-[2ch] -indent-[2ch] before:content-['-_']">
                {bullet}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-2 lg:col-span-4 lg:col-start-9 lg:mt-1">
          <p className="mb-2 text-[12px] lg:text-[13px]">
            <span className="file-name">{projects.stackFile}</span> <span className="text-coral-ink">{common.fileSize(sizeOf(...project.stack))}</span>
          </p>
          <ul className="text-[13px] text-ink lg:text-[14px]">
            {project.stack.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <a
            href={project.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("project_link_clicked", { project: project.id })}
            className="group mt-5 inline-block py-1.5 text-[20px] font-bold tracking-[-0.03em] text-teal-ink no-underline lg:mt-6 lg:text-[22px]"
          >
            <span aria-hidden="true" className="mr-[1ch] inline-block transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
            {project.action}
          </a>
        </div>
      </div>
    </article>
  )
}

/**
 * Contenu de la page « projets » : les projets personnels mis en avant, chacun
 * en fiche avec sa bannière. Même dossier de fichiers et même grille que
 * « à propos ».
 *
 * Composant client : tout son texte vient du dictionnaire de la langue courante.
 * Les métadonnées SEO restent côté serveur, dans `src/app/projects/page.tsx`.
 */
export function ProjectsContent() {
  const { t } = useLocale()
  const { common, landing, projects } = t

  return (
    <article className="relative mx-auto flex w-full max-w-[1248px] flex-col text-[14px] leading-[1.55] lg:text-[15px] lg:leading-[1.6]">
      <p aria-hidden="true" className="absolute top-[116px] -right-14 hidden text-[13px] font-bold tracking-[0.2em] text-teal-ink uppercase [writing-mode:vertical-rl] xl:block">
        {projects.title}
      </p>

      <SiteNav
        current="projects"
        analyticsFrom="projects"
        brand={
          <Link href="/" className="py-3 font-medium text-ink no-underline transition-colors hover:text-teal-ink">
            {common.navHome}
          </Link>
        }
      />

      <header className="mt-10 lg:mt-24">
        {/* Même bloc que le nom (`NameBlock`) : minuscules serrées, carré corail dessiné. */}
        <h1 className="-ml-[0.05em] text-[60px] leading-[0.86] font-bold tracking-[-0.06em] text-ink lg:text-[112px]">
          {projects.title}
          <span aria-hidden="true" className="ml-[0.12em] inline-block size-[0.2em] bg-dot" />
        </h1>
        <p className="mt-4 text-[14px] font-medium text-ink lg:mt-6 lg:text-[20px]">{landing.role}</p>
      </header>

      <div className={cn(GRID, "mt-7 lg:mt-12")}>
        <FileBox name="README.md" meta={common.fileSize(byteLength(projects.readme))} className="lg:col-span-8">
          <p className="text-[15px] text-ink lg:text-[17px]">{projects.readme}</p>
        </FileBox>
        <FileBox name={projects.indexFile} meta={common.itemCount(projects.entries.length)} className="lg:col-span-4 lg:mt-7">
          <ol className="text-[13px] text-ink lg:text-[14px]">
            {projects.entries.map((project, index) => (
              <li key={project.id} className="mt-1 first:mt-0">
                <a href={`#${project.id}`} className="no-underline transition-colors hover:text-teal-ink">
                  <span className="text-coral-ink">{String(index + 1).padStart(2, "0")}</span> {project.name}
                </a>
              </li>
            ))}
          </ol>
        </FileBox>
      </div>

      <section className="mt-10 lg:mt-16">
        <DirLabel name={projects.projectsDir} meta={common.itemCount(projects.entries.length)} />
        <div className={cn(GRID, "mt-3 gap-y-6 lg:mt-5 lg:gap-y-14")}>
          {projects.entries.map((project, index) => (
            <ProjectArticle key={project.id} project={project} index={index} className={PROJECT_PLACEMENT[index % PROJECT_PLACEMENT.length]} />
          ))}
        </div>
      </section>

      <footer className="mt-14 border-t border-rule pt-6 lg:mt-24 lg:pt-8">
        <p>{projects.ctaQuestion}</p>
        <Link href="/" onClick={() => trackEvent("projects_cta_clicked")} className="group mt-2.5 inline-block py-1.5 text-[22px] font-bold tracking-[-0.03em] text-teal-ink no-underline lg:mt-3 lg:text-[32px]">
          <span aria-hidden="true" className="mr-[1ch] inline-block transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
          {projects.ctaLink}
        </Link>
      </footer>
    </article>
  )
}
