"use client"

import { FileBox } from "@/components/ui/file-box"
import { useLocale } from "@/lib/locale-context"
import { byteLength } from "@/lib/format"
import { cn } from "@/lib/utils"

interface IReadmeCardProps {
  /** Texte du message d'accueil. */
  content: string
  className?: string
}

/**
 * Message d'accueil présenté comme le README.md du CV. Le même rendu sert sur
 * la landing (dans le bouton d'ouverture), dans le clone qui glisse à
 * l'ouverture et en tête de la conversation : le passage de l'un à l'autre
 * reste donc continu.
 */
export function ReadmeCard({ content, className }: IReadmeCardProps) {
  const { t } = useLocale()

  return (
    <FileBox name={t.chat.welcomeFile} meta={t.common.fileSize(byteLength(content))} className={cn("bg-paper", className)}>
      <p data-testid="readme-content" className="text-[14px] leading-[1.55] text-ink lg:text-[16px] lg:leading-[1.6]">
        {content}
      </p>
    </FileBox>
  )
}
