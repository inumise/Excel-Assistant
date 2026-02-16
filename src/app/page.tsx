import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas'
import { DEMO_USER_ID } from '@/lib/workflow-template'

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-4 sm:py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-[#1D4ED8] sm:text-3xl">
          Owner AI Employee Structure Builder
        </h1>
        <p className="mt-1 text-xs text-[#334155] sm:text-sm">
          Build your AI employee organization visually: drag workers into the map, connect roles,
          set prompts, edit code blocks, and run the business workflow without programming complexity.
        </p>
      </div>

      <WorkflowCanvas userId={DEMO_USER_ID} />
    </main>
  )
}
