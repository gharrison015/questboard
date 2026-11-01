import { Button } from '../primitives/Button'

/** Shown when the saved data could not be opened. Nothing was changed, so trying again is safe. */
export function LoadError({ onRetry }: { onRetry(): void }) {
  return (
    <main className="qb-load-error" role="alert">
      <h1 className="qb-load-error-title">QuestBoard could not open its saved data</h1>
      <p className="qb-load-error-copy">Nothing was changed. Close other QuestBoard tabs, then try again.</p>
      <Button onClick={onRetry}>Try again</Button>
    </main>
  )
}
