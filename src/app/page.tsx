import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas'
import { DEMO_USER_ID } from '@/lib/workflow-template'

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-4 sm:py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-[#1D4ED8] sm:text-3xl">
          CEO AI Worker Drawboard
        </h1>
        <p className="mt-1 text-xs text-[#334155] sm:text-sm">
          Design any company structure, tools, and functions like a strategy game board with
          drag-drop agents and live connections.
        </p>
      </div>

      <WorkflowCanvas userId={DEMO_USER_ID} />
    </main>
  )
}
