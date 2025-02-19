import type { ReactNode } from "react"
import Header from "./components/Header"
import LeftSidebar from "./components/LeftSidebar"

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { workspace: string }
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <LeftSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header workspace={params.workspace} />
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  )
}

