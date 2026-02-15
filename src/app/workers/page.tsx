import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas'
import { DEMO_USER_ID } from '@/lib/workflow-template'

export default function WorkersPage() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8">
      <div className="mb-5">
        <h1 className="text-3xl font-semibold text-[#FFD700]">Hyperplacity AI Workers</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#C9A483]">
          Manager and Programmer agents coordinate nested workflows, self-modify code blocks, run
          bugtracker loops, and notify WhatsApp.
        </p>
      </div>

      <WorkflowCanvas userId={DEMO_USER_ID} />
    </main>
  )
}
