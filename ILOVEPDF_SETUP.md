# iLovePDF API Configuration

## Environment Variables

Add these to your `.env.local` file (for local development) and Vercel environment variables (for production):

```bash
ILOVEPDF_PUBLIC_KEY=your_public_key_here
ILOVEPDF_SECRET_KEY=your_secret_key_here
```

## Getting API Keys

1. Go to https://developer.ilovepdf.com/
2. Sign up for a free account
3. Create a new project
4. Copy your Public Key and Secret Key
5. Add them to your environment variables

## Free Tier Limits

- 250 compressions per month(free)
- If you exceed this, upgrade to paid plan or compression will be skipped

## Testing Without API Keys

If API keys are not configured:
- Compression will be skipped
- Original 40MB PDF will be sent
- Warning logged to console
