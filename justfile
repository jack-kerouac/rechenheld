# Start local Supabase (Docker) and the Next.js dev server
start:
    supabase start
    npm run dev

# Stop local Supabase containers
stop:
    supabase stop

# Run only the Next.js dev server (assumes supabase already running)
dev:
    npm run dev

# Deploy Supabase migrations
deploy-db:
    npx supabase db push

# Deploy frontend to Vercel
deploy-frontend:
    vercel --prod

# Deploy everything
deploy: deploy-db deploy-frontend
