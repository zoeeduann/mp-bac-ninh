'use client'

import React from 'react'
import { useField, FieldLabel } from '@payloadcms/ui'
import {
  utcIsoToBkkInputValue,
  bkkInputValueToUtcIso,
} from '@/lib/bkk-datetime'

/**
 * Custom Payload field for activity occurrence start/end times. Always
 * presents Bangkok wall-clock regardless of the editor's browser timezone,
 * and uses 24-hour format via the native datetime-local input with
 * lang="zh-CN" (which forces 24-hour on every major browser).
 *
 * Storage stays a UTC ISO string in `activities_occurrences` — no schema
 * change needed.
 */
export default function BkkDateTimeField(props: any) {
  const path: string = props.path
  const fieldConfig: any = props.field || {}
  const labelRaw = fieldConfig.label
  const label =
    typeof labelRaw === 'object' && labelRaw !== null
      ? labelRaw.zh || labelRaw.en || path
      : labelRaw || path
  const required = fieldConfig.required ?? false

  const { value, setValue, showError, errorMessage } = useField<string | null>({
    path,
  })

  const inputValue = utcIsoToBkkInputValue(value)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(bkkInputValueToUtcIso(e.target.value))
  }

  return (
    <div className="field-type" style={{ marginBottom: 24 }}>
      <FieldLabel label={label} required={required} />
      <input
        type="datetime-local"
        // lang="zh-CN" coaxes Chrome / Safari / Edge into 24-hour display
        // even when the OS / browser locale is en-US.
        lang="zh-CN"
        value={inputValue}
        onChange={handleChange}
        required={required}
        style={{
          padding: '10px 12px',
          borderRadius: 4,
          border: `1px solid var(--theme-elevation-${
            showError ? '500, #c52' : '200, #ddd'
          })`,
          fontSize: 14,
          fontFamily: 'inherit',
          background: 'var(--theme-input-bg, white)',
          color: 'var(--theme-elevation-1000, #1a1a1a)',
          width: '100%',
          maxWidth: 300,
        }}
      />
      <p
        style={{
          margin: '4px 0 0',
          fontSize: 12,
          color: 'var(--theme-elevation-600, #777)',
        }}
      >
        泰国时间 (UTC+7) · 24 小时制
      </p>
      {showError && errorMessage && (
        <div
          style={{
            color: 'var(--theme-error-500, #c52)',
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  )
}
