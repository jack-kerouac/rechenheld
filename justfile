# Start local Supabase (Docker)
start-db:
    supabase start

# Stop local Supabase containers
stop-db:
    supabase stop

# Start the Next.js dev server
start:
    npm run dev

# Deploy Supabase migrations
deploy-db:
    supabase db push

# Deploy frontend to Vercel
deploy-frontend:
    vercel --prod

# Deploy everything
deploy: deploy-db deploy-frontend
