import 'server-only'

import {
    Environment,
    IntegrationApiKeys,
    IntegrationCommerceCodes,
    Options,
    WebpayPlus,
} from 'transbank-sdk'

export type WebpayEnvironment =
    | 'integration'
    | 'production'

export function getWebpayEnvironment():
    WebpayEnvironment {
    return process.env.TRANSBANK_ENV ===
        'production'
        ? 'production'
        : 'integration'
}

export function getWebpayTransaction() {
    const environment =
        getWebpayEnvironment()

    if (environment === 'production') {
        const commerceCode =
            process.env
                .TRANSBANK_COMMERCE_CODE
                ?.trim()

        const apiKey =
            process.env
                .TRANSBANK_API_KEY
                ?.trim()

        if (!commerceCode || !apiKey) {
            throw new Error(
                'TRANSBANK_PRODUCTION_CREDENTIALS_MISSING'
            )
        }

        return new WebpayPlus.Transaction(
            new Options(
                commerceCode,
                apiKey,
                Environment.Production
            )
        )
    }

    return new WebpayPlus.Transaction(
        new Options(
            IntegrationCommerceCodes
                .WEBPAY_PLUS,
            IntegrationApiKeys.WEBPAY,
            Environment.Integration
        )
    )
}