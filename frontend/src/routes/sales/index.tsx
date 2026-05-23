import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sales/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/sales/"!</div>
}
