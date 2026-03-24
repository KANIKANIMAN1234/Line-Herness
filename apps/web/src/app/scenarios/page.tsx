'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Scenario, ScenarioTriggerType, Tag } from '@line-crm/shared'
import { api } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'
import ScenarioList from '@/components/scenarios/scenario-list'
import CcPromptButton from '@/components/cc-prompt-button'

type ScenarioWithCount = Scenario & { stepCount?: number }

const ccPrompts = [
  {
    title: 'シナリオ設計',
    prompt: `LINE ステップ配信シナリオの設計を支援してください。
1. トリガー（友だち追加 / タグ付与 / 手動）に応じたステップの流れ
2. 各ステップの遅延時間とメッセージ種別の提案
3. コンバージョンにつながる文面のヒント
具体的なステップ案をリスト形式で示してください。`,
  },
  {
    title: 'シナリオ改善',
    prompt: `既存シナリオの改善点を洗い出してください。
1. 離脱が起きやすいステップの特定
2. タイミング・文面の A/B 案
3. タグ連携や分岐の活用案
改善レポート形式で出力してください。`,
  },
]

export default function ScenariosPage() {
  const { selectedAccountId } = useAccount()
  const [scenarios, setScenarios] = useState<ScenarioWithCount[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState<{
    name: string
    description: string
    triggerType: ScenarioTriggerType
    triggerTagId: string
    isActive: boolean
  }>({
    name: '',
    description: '',
    triggerType: 'friend_add',
    triggerTagId: '',
    isActive: true,
  })

  const loadTags = useCallback(async () => {
    try {
      const res = await api.tags.list()
      if (res.success) setTags(res.data)
    } catch {
      // non-blocking
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.scenarios.list({ accountId: selectedAccountId || undefined })
      if (res.success) setScenarios(res.data)
      else setError(res.error)
    } catch {
      setError('シナリオの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  useEffect(() => {
    load()
  }, [load])

  const handleToggleActive = async (id: string, current: boolean) => {
    setLoading(true)
    try {
      const res = await api.scenarios.update(id, { isActive: !current })
      if (res.success) await load()
      else setError(res.error)
    } catch {
      setError('更新に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    try {
      const res = await api.scenarios.delete(id)
      if (res.success) await load()
      else setError(res.error)
    } catch {
      setError('削除に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) {
      setFormError('シナリオ名を入力してください。')
      return
    }
    if (form.triggerType === 'tag_added' && !form.triggerTagId) {
      setFormError('タグ付与トリガーの場合はタグを選択してください。')
      return
    }
    setSaving(true)
    try {
      const res = await api.scenarios.create({
        name: form.name.trim(),
        description: form.description.trim() || null,
        triggerType: form.triggerType,
        triggerTagId: form.triggerType === 'tag_added' ? form.triggerTagId : null,
        isActive: form.isActive,
        lineAccountId: selectedAccountId || undefined,
      })
      if (res.success) {
        setShowCreate(false)
        setForm({
          name: '',
          description: '',
          triggerType: 'friend_add',
          triggerTagId: '',
          isActive: true,
        })
        await load()
      } else {
        setFormError(res.error)
      }
    } catch {
      setFormError('作成に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Header title="シナリオ配信" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <CcPromptButton prompts={ccPrompts} />
        <button
          type="button"
          onClick={() => {
            setShowCreate((v) => !v)
            setFormError('')
          }}
          className="text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 min-h-[44px] transition-colors"
        >
          {showCreate ? '閉じる' : '新規シナリオ'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold text-gray-800">新規シナリオ</h2>
          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">名前</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="例: ウェルカムシナリオ"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">説明（任意）</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[72px]"
              placeholder="メモ・目的など"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">トリガー</label>
            <select
              value={form.triggerType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  triggerType: e.target.value as ScenarioTriggerType,
                  triggerTagId: e.target.value === 'tag_added' ? f.triggerTagId : '',
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="friend_add">友だち追加時</option>
              <option value="tag_added">タグ付与時</option>
              <option value="manual">手動</option>
            </select>
          </div>
          {form.triggerType === 'tag_added' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">タグ</label>
              <select
                value={form.triggerTagId}
                onChange={(e) => setForm((f) => ({ ...f, triggerTagId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            作成後すぐに有効にする
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 disabled:opacity-50"
            >
              {saving ? '作成中...' : '作成'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {loading && scenarios.length === 0 ? (
        <div className="p-8 text-center text-gray-500">読み込み中...</div>
      ) : (
        <ScenarioList
          scenarios={scenarios}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
          loading={loading}
        />
      )}
    </div>
  )
}
