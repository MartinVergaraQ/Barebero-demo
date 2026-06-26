import 'server-only'

import {
    getDefaultEmailSender,
    getSmtpTransporter,
} from '@/src/lib/email/smtp'

type SendTransactionalEmailInput = {
    to: string
    subject: string
    html: string
    text: string
    replyTo?: string | null
}

export async function sendTransactionalEmail(
    input: SendTransactionalEmailInput
) {
    const recipient =
        input.to
            ?.trim()
            .toLowerCase()

    const subject =
        input.subject?.trim()

    if (!recipient) {
        throw new Error(
            'El destinatario del correo es obligatorio'
        )
    }

    if (!subject) {
        throw new Error(
            'El asunto del correo es obligatorio'
        )
    }

    if (
        !input.html?.trim() ||
        !input.text?.trim()
    ) {
        throw new Error(
            'El contenido del correo es obligatorio'
        )
    }

    const transporter =
        getSmtpTransporter()

    const sender =
        getDefaultEmailSender()

    const result =
        await transporter.sendMail({
            from:
                sender.formatted,

            to:
                recipient,

            subject,

            text:
                input.text,

            html:
                input.html,

            replyTo:
                input.replyTo
                    ?.trim() ||
                undefined,
        })

    return {
        messageId:
            result.messageId,

        accepted:
            result.accepted
                .map(String),

        rejected:
            result.rejected
                .map(String),
    }
}