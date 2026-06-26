import 'server-only'

import nodemailer, {
    type Transporter,
} from 'nodemailer'

let cachedTransporter:
    Transporter | null = null

function requireEnvironmentVariable(
    name: string
): string {
    const value =
        process.env[name]?.trim()

    if (!value) {
        throw new Error(
            `Falta la variable de entorno ${name}`
        )
    }

    return value
}

function getSmtpPort(): number {
    const rawPort =
        requireEnvironmentVariable(
            'SMTP_PORT'
        )

    const port =
        Number(rawPort)

    if (
        !Number.isInteger(port) ||
        port <= 0 ||
        port > 65535
    ) {
        throw new Error(
            'SMTP_PORT no es válido'
        )
    }

    return port
}

export function getSmtpTransporter():
    Transporter {
    if (cachedTransporter) {
        return cachedTransporter
    }

    const host =
        requireEnvironmentVariable(
            'SMTP_HOST'
        )

    const port =
        getSmtpPort()

    const user =
        requireEnvironmentVariable(
            'SMTP_USER'
        )

    const password =
        requireEnvironmentVariable(
            'SMTP_PASSWORD'
        )

    const secure =
        process.env.SMTP_SECURE
            ?.trim()
            .toLowerCase() ===
        'true'

    cachedTransporter =
        nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
                user,
                pass: password,
            },
        })

    return cachedTransporter
}

export function getDefaultEmailSender() {
    const email =
        requireEnvironmentVariable(
            'SMTP_FROM_EMAIL'
        )

    const name =
        process.env
            .SMTP_FROM_NAME
            ?.trim() ||
        'BarberTurn'

    return {
        name,
        email,
        formatted:
            `"${name.replace(/"/g, '')}" <${email}>`,
    }
}

export async function verifySmtpConnection() {
    const transporter =
        getSmtpTransporter()

    await transporter.verify()

    return {
        ok: true as const,
    }
}