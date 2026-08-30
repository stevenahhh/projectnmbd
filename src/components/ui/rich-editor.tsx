'use client';

import { useEffect, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { TableKit } from '@tiptap/extension-table';
import { Bold, Code, Heading1, Heading2, List, ListOrdered, Quote, Table } from 'lucide-react';
import { docToMarkdown, markdownToHtml } from '@/lib/markdown-doc';

interface RichEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  /** 본문 최소 높이 — 회의록은 넉넉히, 문서는 화면을 채운다. */
  className?: string;
  ariaLabel: string;
  /** 다른 사람이 편집 중이면 읽기 전용으로 연다. */
  editable?: boolean;
}

interface ToolProps {
  editor: Editor;
  icon: typeof Bold;
  label: string;
  active: boolean;
  onClick: () => void;
}

function Tool({ icon: Icon, label, active, onClick }: ToolProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      // 누를 때 편집 영역의 선택이 풀리면 명령이 엉뚱한 곳에 걸린다
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`hover:bg-muted flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors ${
        active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground'
      }`}
    >
      <Icon className="size-4" />
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="bg-muted/40 flex items-center gap-0.5 border-b px-1.5 py-1">
      <Tool
        editor={editor}
        icon={Heading1}
        label="큰 제목"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <Tool
        editor={editor}
        icon={Heading2}
        label="제목"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <span className="bg-border mx-1 h-4 w-px" />
      <Tool
        editor={editor}
        icon={List}
        label="글머리 목록"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <Tool
        editor={editor}
        icon={ListOrdered}
        label="번호 목록"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <Tool
        editor={editor}
        icon={Quote}
        label="인용"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <span className="bg-border mx-1 h-4 w-px" />
      <Tool
        editor={editor}
        icon={Bold}
        label="굵게"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <Tool
        editor={editor}
        icon={Code}
        label="코드"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <Tool
        editor={editor}
        icon={Table}
        label="표"
        active={editor.isActive('table')}
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      />
      <span className="text-muted-foreground ml-auto pr-1 text-[11px]">
        <code className="bg-background rounded px-1"># </code> · <code className="bg-background rounded px-1">- </code>{' '}
        로도 됩니다
      </span>
    </div>
  );
}

/**
 * 노션처럼 그 자리에서 서식이 잡히는 편집기.
 * `# ` 를 치면 그 줄이 곧바로 제목이 되고, `#` 만 치면 그냥 글자로 남는다.
 * 저장 형식은 마크다운 그대로다 — 읽기 화면과 기존 문서가 계속 같은 형식을 쓴다.
 */
export function RichEditor({ value, onChange, placeholder, className, ariaLabel, editable = true }: RichEditorProps) {
  // 내가 올려보낸 마크다운이 되돌아온 것인지 구분한다. 아니면 커서가 매 타이핑마다 튄다.
  const emitted = useRef(value);

  const editor = useEditor({
    // SSR 에서 즉시 렌더하면 하이드레이션이 어긋난다
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false, horizontalRule: false }),
      // 열 너비 조절은 끈다 — 저장 형식이 마크다운이라 너비를 담을 자리가 없다
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: markdownToHtml(value),
    editorProps: { attributes: { class: 'rich-editor-content outline-none', 'aria-label': ariaLabel } },
    onUpdate: ({ editor: instance }) => {
      const markdown = docToMarkdown(instance.getJSON());
      emitted.current = markdown;
      onChange(markdown);
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || value === emitted.current) return;
    emitted.current = value;
    editor.commands.setContent(markdownToHtml(value));
  }, [editor, value]);

  return (
    <div
      className={`border-input bg-background focus-within:ring-ring/40 overflow-hidden rounded-md border focus-within:ring-2 ${className ?? ''}`}
    >
      {editor && editable ? <Toolbar editor={editor} /> : null}
      <EditorContent editor={editor} className="rich-editor max-h-[46vh] overflow-auto px-3 py-2.5" />
    </div>
  );
}
