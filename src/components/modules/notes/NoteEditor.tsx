'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, EditorContent, type Editor, ReactRenderer } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import Placeholder from '@tiptap/extension-placeholder'
import type { EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { common, createLowlight } from 'lowlight'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link2,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code2,
  Table as TableIcon,
  Minus,
} from 'lucide-react'
import { markdownToHtml } from '@/lib/notes/markdown-to-html'
import { MentionList } from './canvas/MentionList'
import type { MentionListRef } from './canvas/MentionList'
import { useNotesStore } from '@/stores/notes-store'
import type { Note } from '@/types/notes'

const lowlight = createLowlight(common)

// ─── Slash Commands ──────────────────────────────────────

interface SlashCommand {
  id: string
  label: string
  description: string
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  action: (editor: Editor) => void
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'h1',
    label: 'Encabezado 1',
    description: 'Título grande',
    Icon: Heading1,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Encabezado 2',
    description: 'Título mediano',
    Icon: Heading2,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Encabezado 3',
    description: 'Título pequeño',
    Icon: Heading3,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'bullet',
    label: 'Lista con viñetas',
    description: 'Lista sin orden',
    Icon: List,
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: 'Lista numerada',
    description: 'Lista ordenada',
    Icon: ListOrdered,
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'todo',
    label: 'Lista de tareas',
    description: 'Checkboxes',
    Icon: CheckSquare,
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'quote',
    label: 'Cita',
    description: 'Bloque de cita',
    Icon: Quote,
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: 'Bloque de código',
    description: 'Código con resaltado',
    Icon: Code2,
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'table',
    label: 'Tabla',
    description: 'Tabla 3×3',
    Icon: TableIcon,
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'divider',
    label: 'Separador',
    description: 'Línea horizontal',
    Icon: Minus,
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
]

// ─── Slash Menu State ────────────────────────────────────

interface SlashMenuState {
  visible: boolean
  query: string
  selectedIndex: number
  position: { top: number; left: number; flipUp?: boolean }
}

// ─── NoteEditor Props ────────────────────────────────────

interface NoteEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

// ─── BubbleMenu shouldShow type ─────────────────────────

interface BubbleMenuShouldShowProps {
  editor: Editor
  element: HTMLElement
  view: EditorView
  state: EditorState
  oldState?: EditorState
  from: number
  to: number
}

// ─── Mention Extension Factory ──────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SuggestionPropsAny = any

function createMentionExtension(notesRef: React.MutableRefObject<Note[]>) {
  return Mention.configure({
    HTMLAttributes: {
      class: 'note-mention-chip',
    },
    renderLabel: ({ node }) => `[[${node.attrs.label as string}]]`,
    suggestion: {
      char: '[[',
      allowSpaces: true,
      items: ({ query }: { query: string }) =>
        notesRef.current
          .filter(n => n.title.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8),
      render: () => {
        let component: ReactRenderer<MentionListRef>
        let containerEl: HTMLDivElement

        return {
          onStart: (props: SuggestionPropsAny) => {
            containerEl = document.createElement('div')
            document.body.appendChild(containerEl)
            component = new ReactRenderer(MentionList, {
              props,
              editor: props.editor,
            })
            containerEl.appendChild(component.element)

            const rect = props.clientRect?.()
            if (rect) {
              (component.element as HTMLElement).style.position = 'fixed';
              (component.element as HTMLElement).style.zIndex = '9999';
              (component.element as HTMLElement).style.top = `${rect.bottom + 8}px`;
              (component.element as HTMLElement).style.left = `${rect.left}px`
            }
          },
          onUpdate: (props: SuggestionPropsAny) => {
            component.updateProps(props)
            const rect = props.clientRect?.()
            if (rect && component.element) {
              (component.element as HTMLElement).style.top = `${rect.bottom + 8}px`;
              (component.element as HTMLElement).style.left = `${rect.left}px`
            }
          },
          onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'Escape') {
              return false
            }
            return component.ref?.onKeyDown(event) ?? false
          },
          onExit: () => {
            component.destroy()
            containerEl?.remove()
          },
        }
      },
    },
  })
}

// ─── NoteEditor ──────────────────────────────────────────

export function NoteEditor({
  content,
  onChange,
  placeholder = 'Escribe aquí... usa / para insertar bloques',
  className = '',
  autoFocus = false,
}: NoteEditorProps) {
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
    visible: false,
    query: '',
    selectedIndex: 0,
    position: { top: 0, left: 0 },
  })
  const [linkInput, setLinkInput] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  // Word count state — initialized once editor is ready (onCreate)
  const [editorText, setEditorText] = useState('')
  const slashMenuRef = useRef<HTMLDivElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const slashStartPos = useRef<number | null>(null)
  const slashMenuVisibleRef = useRef(false)

  // Keep notes up to date for mention autocomplete without recreating extensions
  const storeNotes = useNotesStore((s) => s.notes)
  const notesRef = useRef<Note[]>(storeNotes)
  useEffect(() => { notesRef.current = storeNotes }, [storeNotes])
  // Create mention extension once — it reads from notesRef.current at query time
  // eslint-disable-next-line react-hooks/refs
  const mentionExt = useMemo(() => createMentionExtension(notesRef), [])

  const filteredCommands = SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(slashMenu.query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(slashMenu.query.toLowerCase()),
  )

  const executeSlashCommand = useCallback(
    (cmd: SlashCommand, editor: Editor) => {
      const pos = slashStartPos.current
      if (pos !== null) {
        const currentPos = editor.state.selection.from
        editor.chain().focus().deleteRange({ from: pos, to: currentPos }).run()
      }
      slashStartPos.current = null
      slashMenuVisibleRef.current = false
      setSlashMenu((prev) => ({ ...prev, visible: false, query: '' }))
      cmd.action(editor)
    },
    [],
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      TaskList,
      TaskItem.configure({ nested: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Highlight.configure({ multicolor: true }),
      Typography,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      HorizontalRule,
      Placeholder.configure({ placeholder }),
      mentionExt,
    ],
    content: markdownToHtml(content),
    autofocus: autoFocus ? 'end' : false,
    onCreate: ({ editor: ed }) => {
      setEditorText(ed.getText())
    },
    onUpdate: ({ editor: ed }) => {
      setEditorText(ed.getText())
      onChange(ed.getHTML())

      // Slash command detection via text pattern
      const { from } = ed.state.selection
      const $pos = ed.state.doc.resolve(from)
      const lineText = $pos.parent.textContent.slice(0, $pos.parentOffset)

      const slashMatch = /\/(\w*)$/.exec(lineText)
      if (slashMatch) {
        const slashIdx = from - slashMatch[0].length
        slashStartPos.current = slashIdx
        const query = slashMatch[1] ?? ''

        // Get cursor position for popup — use viewport coords for fixed positioning
        const coords = ed.view.coordsAtPos(from)
        const menuHeight = 280 // approx max height
        const flipUp = coords.bottom + menuHeight > window.innerHeight - 8

        slashMenuVisibleRef.current = true
        setSlashMenu({
          visible: true,
          query,
          selectedIndex: 0,
          position: {
            top: flipUp ? coords.top - 4 : coords.bottom + 4,
            left: Math.min(coords.left, window.innerWidth - 232),
            flipUp,
          },
        })
      } else {
        if (slashMenuVisibleRef.current) {
          slashStartPos.current = null
          slashMenuVisibleRef.current = false
          setSlashMenu((prev) => ({ ...prev, visible: false, query: '' }))
        }
      }
    },
  })

  // Sync external content changes
  const prevContentRef = useRef(content)
  useEffect(() => {
    if (!editor) return
    if (prevContentRef.current !== content) {
      prevContentRef.current = content
      const currentHtml = editor.getHTML()
      const incoming = markdownToHtml(content)
      if (currentHtml !== incoming) {
        editor.commands.setContent(incoming)
        // onUpdate fires automatically after setContent — editorText updates there
      }
    }
  }, [content, editor])

  // Keyboard handler for slash menu
  useEffect(() => {
    if (!slashMenu.visible || !editor) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashMenu((prev) => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % filteredCommands.length,
        }))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashMenu((prev) => ({
          ...prev,
          selectedIndex:
            (prev.selectedIndex - 1 + filteredCommands.length) % filteredCommands.length,
        }))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const cmd = filteredCommands[slashMenu.selectedIndex]
        if (cmd) executeSlashCommand(cmd, editor)
      } else if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        // Delete the "/" trigger character from the editor content
        const pos = slashStartPos.current
        if (pos !== null && editor) {
          const currentPos = editor.state.selection.from
          editor.chain().focus().deleteRange({ from: pos, to: currentPos }).run()
        }
        slashStartPos.current = null
        slashMenuVisibleRef.current = false
        setSlashMenu((prev) => ({ ...prev, visible: false, query: '' }))
      }
    }

    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [slashMenu.visible, slashMenu.selectedIndex, filteredCommands, editor, executeSlashCommand])

  // Close slash menu on click outside — also remove the "/" trigger
  useEffect(() => {
    if (!slashMenu.visible) return
    const handler = (e: MouseEvent) => {
      if (slashMenuRef.current && e.target instanceof Node && !slashMenuRef.current.contains(e.target)) {
        const pos = slashStartPos.current
        if (pos !== null && editor) {
          const currentPos = editor.state.selection.from
          editor.chain().focus().deleteRange({ from: pos, to: currentPos }).run()
        }
        slashStartPos.current = null
        slashMenuVisibleRef.current = false
        setSlashMenu((prev) => ({ ...prev, visible: false, query: '' }))
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [slashMenu.visible, editor])

  // Focus link input when shown
  useEffect(() => {
    if (showLinkInput) linkInputRef.current?.focus()
  }, [showLinkInput])

  const handleSetLink = () => {
    if (!editor) return
    const url = linkInput.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    setShowLinkInput(false)
    setLinkInput('')
  }

  const handleLinkButtonClick = () => {
    if (!editor) return
    if (editor.isActive('link')) {
      const attrs = editor.getAttributes('link') as { href?: string }
      setLinkInput(attrs.href ?? '')
    } else {
      setLinkInput('')
    }
    setShowLinkInput((prev) => !prev)
  }

  // Word / char count — uses editorText state (set on onCreate + onUpdate)
  // Falls back to stripping HTML from content prop before editor is ready
  const plainText = editorText || content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length
  const charCount = plainText.replace(/\s/g, '').length
  const readingMin = Math.max(1, Math.round(wordCount / 200))

  const shouldShowBubble = ({ editor: ed, state }: BubbleMenuShouldShowProps) => {
    const { selection } = state
    const { empty } = selection
    return !empty && !ed.isActive('codeBlock') && !ed.isActive('image')
  }

  return (
    <div className={`tiptap-editor-wrap relative flex flex-col ${className}`}>
      {/* BubbleMenu */}
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={shouldShowBubble}
        >
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card px-1.5 py-1 shadow-md">
            <BubbleBtn
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Negrita"
            >
              <Bold size={13} strokeWidth={2} />
            </BubbleBtn>
            <BubbleBtn
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Cursiva"
            >
              <Italic size={13} strokeWidth={2} />
            </BubbleBtn>
            <BubbleBtn
              active={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="Subrayado"
            >
              <UnderlineIcon size={13} strokeWidth={2} />
            </BubbleBtn>
            <BubbleBtn
              active={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Tachado"
            >
              <Strikethrough size={13} strokeWidth={2} />
            </BubbleBtn>

            <span className="mx-0.5 h-4 w-px bg-border" />

            <BubbleBtn
              active={editor.isActive('code')}
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="Código"
            >
              <Code size={13} strokeWidth={2} />
            </BubbleBtn>
            <BubbleBtn
              active={editor.isActive('highlight')}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              title="Resaltar"
            >
              <Highlighter size={13} strokeWidth={2} />
            </BubbleBtn>

            <span className="mx-0.5 h-4 w-px bg-border" />

            <BubbleBtn
              active={editor.isActive('link') || showLinkInput}
              onClick={handleLinkButtonClick}
              title="Enlace"
            >
              <Link2 size={13} strokeWidth={2} />
            </BubbleBtn>

            {showLinkInput && (
              <div className="flex items-center gap-1 ml-1">
                <input
                  ref={linkInputRef}
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSetLink()
                    if (e.key === 'Escape') {
                      setShowLinkInput(false)
                      setLinkInput('')
                    }
                  }}
                  placeholder="https://..."
                  className="w-40 rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground outline-none focus:border-[#B07A3A]"
                />
                <button
                  type="button"
                  onClick={handleSetLink}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[#B07A3A] text-white hover:bg-[#5a7a56] transition-colors"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </BubbleMenu>
      )}

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="tiptap-content flex-1 text-sm text-foreground focus:outline-none"
      />

      {/* Slash Command Menu — rendered via portal to escape transform containing blocks */}
      {slashMenu.visible && filteredCommands.length > 0 && typeof document !== 'undefined' && createPortal(
        <div
          ref={slashMenuRef}
          style={
            slashMenu.position.flipUp
              ? { position: 'fixed', bottom: window.innerHeight - slashMenu.position.top, left: slashMenu.position.left, top: 'auto' }
              : { position: 'fixed', top: slashMenu.position.top, left: slashMenu.position.left }
          }
          className="z-[9999] w-56 rounded-lg border border-border bg-card py-1 shadow-md"
        >
          {filteredCommands.map((cmd, idx) => {
            const Icon = cmd.Icon
            return (
              <button
                key={cmd.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (editor) executeSlashCommand(cmd, editor)
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                  idx === slashMenu.selectedIndex
                    ? 'bg-sand text-foreground'
                    : 'text-text-secondary hover:bg-sand/60'
                }`}
              >
                <Icon size={14} strokeWidth={1.75} />
                <div>
                  <div className="text-xs font-medium leading-tight">{cmd.label}</div>
                  <div className="text-[10px] text-text-tertiary leading-tight">
                    {cmd.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>,
        document.body
      )}

      {/* Stats footer */}
      <div className="flex items-center gap-3 pt-2 border-t border-border mt-2">
        <span className="font-mono text-[10px] text-text-tertiary">
          {wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}
        </span>
        <span className="font-mono text-[10px] text-text-tertiary">{charCount} caracteres</span>
        <span className="font-mono text-[10px] text-text-tertiary">{readingMin} min lectura</span>
      </div>
    </div>
  )
}

// ─── BubbleMenu Button ───────────────────────────────────

function BubbleBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        active
          ? 'bg-[#B07A3A]/10 text-[#B07A3A]'
          : 'text-text-secondary hover:text-foreground hover:bg-sand/60'
      }`}
    >
      {children}
    </button>
  )
}
