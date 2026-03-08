# Deploy Supabase migrations
deploy-db:
    npx supabase db push

# Deploy frontend to Vercel
deploy-frontend:
    vercel --prod

# Deploy everything
deploy: deploy-db deploy-frontend
