# Start local Supabase (Docker) and the Next.js dev server
start:
    supabase start
    npm run dev

# Stop local Supabase containers
stop:
    supabase stop

# Deploy Supabase migrations
deploy-db:
    supabase db push

# Deploy frontend to Vercel
deploy-frontend:
    vercel --prod

# Deploy everything
deploy: deploy-db deploy-frontend
