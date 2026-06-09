import { AdminInput } from '@/src/features/admin/components/admin-input'

type AdminPhoneInputProps = {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    error?: string
    hint?: string
    compact?: boolean
}

function onlyDigits(value: string) {
    return value.replace(/\D/g, '')
}

export function formatChilePhoneInput(value: string) {
    let digits = onlyDigits(value)

    if (digits.startsWith('56')) {
        digits = digits.slice(2)
    }

    if (digits.startsWith('9')) {
        digits = digits.slice(1)
    }

    digits = digits.slice(0, 8)

    if (digits.length <= 4) {
        return digits
    }

    return `${digits.slice(0, 4)} ${digits.slice(4)}`
}

export function getChilePhoneForStorage(value: string) {
    const digits = onlyDigits(value)

    if (!digits) return ''

    if (digits.startsWith('569')) {
        return digits
    }

    if (digits.startsWith('56')) {
        return digits
    }

    if (digits.startsWith('9')) {
        return `56${digits}`
    }

    return `569${digits}`
}

export function validateChilePhone(value: string) {
    const storagePhone = getChilePhoneForStorage(value)

    if (!storagePhone) {
        return 'Ingresa el teléfono'
    }

    if (!/^569\d{8}$/.test(storagePhone)) {
        return 'Ingresa un celular chileno válido'
    }

    return ''
}

export function AdminPhoneInput({
    id,
    label,
    value,
    onChange,
    disabled = false,
    error = '',
    hint = 'Formato Chile. Se guardará como +56 9 XXXX XXXX.',
    compact = false,
}: AdminPhoneInputProps) {
    return (
        <AdminInput
            id={id}
            label={label}
            type="tel"
            value={formatChilePhoneInput(value)}
            onChange={(nextValue) => onChange(formatChilePhoneInput(nextValue))}
            placeholder="1234 5678"
            disabled={disabled}
            error={error}
            hint={hint}
            prefix="+56 9"
            compact={compact}
        />
    )
}