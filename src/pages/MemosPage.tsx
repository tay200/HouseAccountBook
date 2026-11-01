import { useState } from 'react'
import { memosApi } from '../api/tables'
import { Field, FormBox, inputCls } from '../components/FormFields'
import { toDateString } from '../lib/format'
import { matchesMemo, sortMemos } from '../lib/memos'
import type { Memo } from '../lib/types'

/**
 * 메모 게시판: 고정비 리스트, 용돈 입금 계좌처럼 부부가 같이 보는 글.
 * 자주 보는 글은 고정(📌)해서 맨 위에 둔다.
 */
export default function MemosPage() {
  const { data: memos = [], isPending } = memosApi.useList()
  const saveMemo = memosApi.useSave()
  const deleteMemo = memosApi.useDelete()
  const [search, setSearch] = useState('')
  // 'new' = 새 글 쓰는 중, id = 그 글 고치는 중
  const [editing, setEditing] = useState<string | null>(null)

  const shown = sortMemos(memos).filter((m) => matchesMemo(m, search))

  function handleSave(values: Pick<Memo, 'title' | 'content'>, id?: string) {
    // 고친 시각을 함께 보내서 최근에 고친 글이 위로 오게 한다
    saveMemo.mutate({ id, ...values, updated_at: new Date().toISOString() }, { onSuccess: () => setEditing(null) })
  }

  function handleDelete(m: Memo) {
    if (confirm(`‘${m.title}’ 메모를 삭제할까요?`)) deleteMemo.mutate(m.id)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">메모</h2>
        {editing !== 'new' && (
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + 새 메모
          </button>
        )}
      </div>

      <input className="input w-full sm:w-72" placeholder="제목·내용으로 찾기" value={search} onChange={(e) => setSearch(e.target.value)} />

      {editing === 'new' && <MemoForm saving={saveMemo.isPending} onSave={(values) => handleSave(values)} onCancel={() => setEditing(null)} />}

      {isPending ? (
        <p className="py-8 text-center text-sm text-slate-400">불러오는 중…</p>
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          {search ? '찾는 메모가 없어요.' : '아직 메모가 없어요. 고정비 리스트나 용돈 입금 계좌 같은 걸 적어 두세요.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {shown.map((m) =>
            editing === m.id ? (
              <MemoForm key={m.id} memo={m} saving={saveMemo.isPending} onSave={(values) => handleSave(values, m.id)} onCancel={() => setEditing(null)} />
            ) : (
              <article key={m.id} className={`card space-y-2 ${m.pinned ? 'border-amber-300 bg-amber-50/40' : ''}`}>
                <div className="flex items-start gap-2">
                  <h3 className="min-w-0 flex-1 font-semibold break-words">{m.title}</h3>
                  <button
                    className={`shrink-0 rounded px-1.5 text-lg leading-none ${m.pinned ? '' : 'opacity-30 grayscale hover:opacity-70'}`}
                    title={m.pinned ? '고정 풀기' : '맨 위에 고정'}
                    aria-label={m.pinned ? '고정 풀기' : '맨 위에 고정'}
                    // 고정은 글을 고친 게 아니라서 고친 시각은 그대로 둔다
                    onClick={() => saveMemo.mutate({ id: m.id, pinned: !m.pinned })}
                  >
                    📌
                  </button>
                </div>
                {m.content && <p className="text-sm whitespace-pre-wrap break-words text-slate-700">{m.content}</p>}
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                  <span className="mr-auto">{toDateString(new Date(m.updated_at))} 고침</span>
                  <button className="btn btn-text" onClick={() => setEditing(m.id)}>
                    수정
                  </button>
                  <button className="btn btn-danger-text" onClick={() => handleDelete(m)}>
                    삭제
                  </button>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  )
}

function MemoForm({
  memo,
  saving,
  onSave,
  onCancel,
}: {
  memo?: Memo
  saving: boolean
  onSave: (values: Pick<Memo, 'title' | 'content'>) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(memo?.title ?? '')
  const [content, setContent] = useState(memo?.content ?? '')

  return (
    <FormBox
      title={memo ? '메모 수정' : '새 메모'}
      gridClass="grid-cols-1"
      problem={title.trim() ? null : '제목을 입력하세요'}
      saving={saving}
      onSave={() => onSave({ title: title.trim(), content: content.trim() })}
      onCancel={onCancel}
    >
      <Field label="제목" required>
        <input className={inputCls} value={title} placeholder="예: 고정비 리스트" onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>
      <Field label="내용">
        <textarea
          className={`${inputCls} min-h-48 resize-y`}
          value={content}
          placeholder={'예:\n월세 50만원 (25일, 국민 123-45-6789)\n용돈 입금: 신한 110-…'}
          onChange={(e) => setContent(e.target.value)}
        />
      </Field>
    </FormBox>
  )
}
