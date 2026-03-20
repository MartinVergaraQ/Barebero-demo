'use client'

import * as AlertDialog from '@radix-ui/react-alert-dialog'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void | Promise<void>
    loading?: boolean
    destructive?: boolean
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    loading = false,
    destructive = false,
}: Props) {
    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[1px]" />

                <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[91] w-[calc(100%-24px)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border border-[#e7dfcf] bg-[#f8f5ee] p-0 shadow-2xl outline-none">
                    <div className="border-b border-[#e7dfcf] px-5 py-4 md:px-6">
                        <AlertDialog.Title className="text-[20px] font-bold text-[#1f1f1f]">
                            {title}
                        </AlertDialog.Title>

                        <AlertDialog.Description className="mt-2 text-[15px] leading-7 text-[#5d584f]">
                            {description}
                        </AlertDialog.Description>
                    </div>

                    <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:justify-end md:px-6">
                        <AlertDialog.Cancel asChild>
                            <button
                                type="button"
                                className="h-[46px] rounded-[8px] border border-[#d7cfbf] bg-white px-5 text-sm font-semibold text-[#2d2a26]"
                            >
                                {cancelText}
                            </button>
                        </AlertDialog.Cancel>

                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={loading}
                            className={`h-[46px] rounded-[8px] px-5 text-sm font-semibold text-white disabled:opacity-50 ${destructive ? 'bg-red-700' : 'bg-black'
                                }`}
                        >
                            {loading ? 'Procesando...' : confirmText}
                        </button>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    )
}