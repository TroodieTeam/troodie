# Troodie Agent Operations Guide

Rules and patterns for AI agents working on this project.

## Project Structure

```
app/                    # Expo Router file-based screens
components/             # Reusable UI components
contexts/               # React contexts (Auth, App, Onboarding)
hooks/                  # Custom React hooks
services/               # Business logic and Supabase operations
lib/supabase.ts        # Supabase client + TypeScript types
supabase/migrations/   # Database migrations
types/                 # TypeScript type definitions
```

## Code Style

- TypeScript strict mode everywhere
- No `any` types - use `unknown` or proper typing from `lib/supabase.ts`
- Services return `{ data, error }` - always check both
- Functional components with hooks
- Path alias: `@/*` maps to project root

## Common Commands

```bash
npm run typecheck    # TypeScript type checking (REQUIRED)
npm run lint         # ESLint (REQUIRED)
npm test             # Jest unit tests
npm start            # Start Expo dev server
```

## Service Patterns

All services must follow this pattern:

```typescript
import { supabase } from '@/lib/supabase';

export async function myServiceFunction(param: string) {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('column', param);

  if (error) {
    console.error('Error:', error);
    return { data: null, error };
  }

  return { data, error: null };
}
```

## Database Changes

- Create migrations in `supabase/migrations/` with timestamp prefix
- Format: `YYYYMMDDHHMMSS_description.sql`
- Include both up and down migrations when possible
- Test migrations locally before committing

## Git Commits

- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Reference ticket numbers: `feat(TRO-145): add creator browse filters`
- Co-author line for AI commits

## What NOT to Do

- Don't add dependencies without approval
- Don't modify `app.config.js` or environment files
- Don't change database types in `lib/supabase.ts` manually (regenerate from Supabase)
- Don't leave console.log statements (use proper error handling)
- Don't skip typecheck/lint validation
- Don't modify unrelated files
- Don't hardcode environment values

## Validation Required

Before marking any task complete:

```bash
npm run typecheck  # Must pass
npm run lint       # Must pass
npm test           # Should pass (if tests exist for the feature)
```
