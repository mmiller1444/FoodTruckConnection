## GitHub Actions + Vercel CI/CD

This project is configured to deploy through GitHub Actions instead of the default Vercel Git integration.

### Required GitHub Secrets
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID

### Deployment Flow
- Pull requests create Preview deployments
- Pushes to the production branch create Production deployments

### Local setup
1. Run: npm install
2. Run: npm run lint
3. Run: npm run build

### Notes
- Runtime environment variables should be configured in Vercel Project Settings
- Keep .env files out of Git