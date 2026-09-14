# Security Policy

## Supported version

Security updates are applied to the latest version on the `main` branch.

## Reporting a vulnerability

Please report vulnerabilities privately through the repository's Security tab using a private vulnerability report.

Do not publish customer data, credentials, calendar URLs, proof-of-concept attacks, or active vulnerabilities in a public issue.

Include the affected page or API route, clear reproduction steps, expected impact, and a safe proof of concept when possible.

## Secrets

Production secrets belong only in the Render and Vercel environment settings.

Never commit `.env` files, MongoDB connection strings, admin credentials, Resend API keys, or private iCal URLs.