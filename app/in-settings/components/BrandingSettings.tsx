import CustomDomainSettings from "./CustomDomainSettings"
import LogoManagement from "./LogoManagement"
import { Separator } from "@/components/ui/separator"

export default function BrandingSettings() {
  return (
    <div className="space-y-6">
      <CustomDomainSettings />
      <Separator />
      <LogoManagement />
    </div>
  )
}
