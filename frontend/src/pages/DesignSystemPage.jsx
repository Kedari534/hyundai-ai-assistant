import { useState } from 'react'
import Shell from '../components/Shell'
import { Badge, Button, EmptyState, ErrorState, Skeleton, TextInput } from '../components/ui'

export default function DesignSystemPage() {
  const [value, setValue] = useState('')
  return (
    <Shell title="Design system" description="Components used across the dealership desk.">
      <div className="space-y-10">
        <section>
          <h2 className="font-heading text-xl">Buttons</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Saving</Button>
          </div>
        </section>
        <section>
          <h2 className="font-heading text-xl">Status</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {['UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED'].map((status) => <Badge key={status} status={status} />)}
          </div>
        </section>
        <section className="max-w-sm">
          <h2 className="font-heading text-xl">Field</h2>
          <TextInput className="mt-3" placeholder="Brochure name" value={value} onChange={(event) => setValue(event.target.value)} />
        </section>
        <section className="space-y-3">
          <Skeleton className="h-10 w-1/2" />
          <EmptyState title="Nothing here" body="Empty states explain the next action." />
          <ErrorState body="Error states offer a retry." onRetry={() => {}} />
        </section>
      </div>
    </Shell>
  )
}
