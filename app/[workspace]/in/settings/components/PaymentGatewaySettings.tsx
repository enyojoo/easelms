"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import Image from "next/image"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface PaymentGateway {
  name: string
  enabled: boolean
  apiKey?: string
  secretKey?: string
}

export default function PaymentGatewaySettings() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([
    { name: "Stripe", enabled: false },
    { name: "Flutterwave", enabled: false },
    { name: "Paystack", enabled: false },
    { name: "Yoomoney", enabled: false },
  ])
  const [customIntegration, setCustomIntegration] = useState(false)
  const [customApiEndpoint, setCustomApiEndpoint] = useState("")

  const handleGatewayToggle = (index: number) => {
    const updatedGateways = [...gateways]
    updatedGateways[index].enabled = !updatedGateways[index].enabled
    setGateways(updatedGateways)
  }

  const handleApiKeyChange = (index: number, key: "apiKey" | "secretKey", value: string) => {
    const updatedGateways = [...gateways]
    updatedGateways[index][key] = value
    setGateways(updatedGateways)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Gateway Integrations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {gateways.map((gateway, index) => (
            <div key={gateway.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Image
                  src={`/images/${gateway.name.toLowerCase()}-logo.png`}
                  alt={`${gateway.name} logo`}
                  width={32}
                  height={32}
                />
                <span>{gateway.name}</span>
              </div>
              <div className="flex items-center space-x-4">
                <Switch checked={gateway.enabled} onCheckedChange={() => handleGatewayToggle(index)} />
                {gateway.enabled && (
                  <>
                    <Input
                      placeholder="API Key"
                      value={gateway.apiKey || ""}
                      onChange={(e) => handleApiKeyChange(index, "apiKey", e.target.value)}
                      className="w-48"
                    />
                    <Input
                      placeholder="Secret Key"
                      value={gateway.secretKey || ""}
                      onChange={(e) => handleApiKeyChange(index, "secretKey", e.target.value)}
                      className="w-48"
                    />
                  </>
                )}
              </div>
            </div>
          ))}

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <Label htmlFor="custom-integration">Custom Integration</Label>
              <Switch id="custom-integration" checked={customIntegration} onCheckedChange={setCustomIntegration} />
            </div>
            {customIntegration && (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-api-endpoint">Custom API Endpoint</Label>
                  <Input
                    id="custom-api-endpoint"
                    value={customApiEndpoint}
                    onChange={(e) => setCustomApiEndpoint(e.target.value)}
                    placeholder="https://api.your-payment-gateway.com"
                  />
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Custom Integration</AlertTitle>
                  <AlertDescription>
                    Ensure your custom payment gateway API adheres to our integration standards. Refer to the
                    documentation for more details on implementing a custom payment gateway.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

