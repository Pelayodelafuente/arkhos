"use client"

interface HighlightTextProps {
  text: string
  query: string
}

export function HighlightText({ text, query }: HighlightTextProps) {
  if (!query) return <>{text}</>

  let parts: string[] = [text]
  let regex: RegExp | null = null
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    regex = new RegExp(`(${escaped})`, 'gi')
    parts = text.split(regex)
  } catch {
    // invalid regex, use original text
  }

  return (
    <>
      {parts.map((part, i) =>
        regex && regex.test(part) ? (
          <mark
            key={i}
            className="bg-accent/20 text-inherit rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}
