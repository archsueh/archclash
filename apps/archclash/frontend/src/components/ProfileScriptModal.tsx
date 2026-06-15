import { useTranslation } from 'react-i18next'

import { MonacoYamlEditor } from '../MonacoYamlEditor'

import type { ProfileModalTarget } from './ProfileMergeModal'

export function ProfileScriptModal({
  target,
  value,
  onChange,
  onResetScaffold,
  onClose,
  onSave,
}: {
  target: ProfileModalTarget | null
  value: string
  onChange: (next: string) => void
  onResetScaffold: () => void
  onClose: () => void
  onSave: (id: string) => void
}) {
  const { t } = useTranslation()
  if (!target) return null
  return (
    <div
      className="modalOverlay"
      role="presentation"
      style={{ zIndex: 70 }}
      onClick={onClose}
    >
      <div
        className="modalCard modalCardWide yamlModalCard modalCardFullscreen vergeModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scriptTplTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vergeModalHead">
          <h3 id="scriptTplTitle" className="modalTitle vergeModalTitle">
            {t('ui.profiles.scriptModal.title')}
          </h3>
        </div>
        <p className="muted small yamlModalBlurb">
          {t('ui.profiles.scriptModal.blurb')}
        </p>
        <label className="field modalField">
          <span className="fieldLab">
            {target.name}{' '}
            <span className="optional">
              {t('ui.profiles.scriptModal.editor')}
            </span>
          </span>
          <MonacoYamlEditor
            className="modalMonacoWrap"
            value={value}
            onChange={onChange}
            height="48vh"
            language="javascript"
          />
        </label>
        <div className="modalFooter">
          <button
            type="button"
            className="btn btnModalSecondary"
            onClick={onResetScaffold}
          >
            {t('ui.profiles.scriptModal.resetScaffold')}
          </button>
          <div className="modalFooterRight">
            <button type="button" className="btn ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => onSave(target.id)}
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
