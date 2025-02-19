"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Check, Info, CreditCard, Edit, Trash2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

const plansData = {
  Core: {
    tiers: {
      "1-50": { monthly: 70, yearly: 756 },
      "51-100": { monthly: 110, yearly: 1188 },
    },
    features: [
      "Unlimited courses",
      "Unlimited email support",
      "Custom homepage",
      "Basic reporting",
      "Single sign-on support",
      "Custom domain & SSL",
      "TalentCards",
      "Consultation call",
    ],
  },
  Grow: {
    tiers: {
      "101-200": { monthly: 210, yearly: 2268 },
      "201-400": { monthly: 250, yearly: 2700 },
    },
    features: [
      "Everything in Core",
      "Onboarding",
      "Custom reports",
      "Videoconference",
      "LinkedIn Learning integration",
    ],
  },
  Pro: {
    tiers: {
      "401-800": { monthly: 360, yearly: 3888 },
      "801-1000": { monthly: 460, yearly: 4968 },
    },
    features: [
      "Everything in Grow",
      "Priority email support",
      "Live chat support",
      "Customer success manager",
      "Automations",
      "Remove TalentLMS branding",
      "TalentCraft premium",
      "Skills (Coming soon)",
    ],
    popular: true,
  },
  Enterprise: {
    price: "Custom",
    users: "Starts at 1000 users",
    features: ["Everything in Pro", "Account manager", "Phone support", "TalentCraft unlimited"],
  },
}

interface SavedCard {
  last4: string
  expiryDate: string
  name: string
}

export default function SubscriptionManagement() {
  const [isYearly, setIsYearly] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvc: "",
    name: "",
  })
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null)
  const [selectedTiers, setSelectedTiers] = useState({
    Core: "1-50",
    Grow: "101-200",
    Pro: "401-800",
    Enterprise: "1000+",
  })

  const plans = useMemo(() => Object.keys(plansData).map((name) => ({ name, ...plansData[name] })), [])

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate saving the card (in a real app, you'd send this to your payment processor)
    const last4 = cardDetails.cardNumber.slice(-4)
    setSavedCard({
      last4,
      expiryDate: cardDetails.expiryDate,
      name: cardDetails.name,
    })
    setIsPaymentModalOpen(false)
    toast({
      title: "Payment method added",
      description: `Card ending in ${last4} has been saved.`,
    })
    // Reset card details
    setCardDetails({
      cardNumber: "",
      expiryDate: "",
      cvc: "",
      name: "",
    })
  }

  const handleEditCard = () => {
    if (savedCard) {
      setCardDetails({
        cardNumber: `************${savedCard.last4}`,
        expiryDate: savedCard.expiryDate,
        cvc: "",
        name: savedCard.name,
      })
      setIsPaymentModalOpen(true)
    }
  }

  const handleDeleteCard = () => {
    setSavedCard(null)
    toast({
      title: "Payment method removed",
      description: "Your saved card has been deleted.",
    })
  }

  return (
    <Card className="border">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card className="bg-blue-50 dark:bg-blue-900/20 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2 px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded">FREE</span>
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Up to 5 users</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Unlimited email support</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Up to 10 courses</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Test generative AI</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" /> Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savedCard ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Card ending in {savedCard.last4}</p>
                    <p className="text-sm text-muted-foreground">Expires {savedCard.expiryDate}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon" onClick={handleEditCard}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleDeleteCard}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add a payment method to upgrade your plan or make purchases.
                  </p>
                  <Button onClick={() => setIsPaymentModalOpen(true)}>Add Payment Method</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Upgrade Your Plan</h2>
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${!isYearly ? "font-bold" : ""}`}>Monthly</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm ${isYearly ? "font-bold" : ""}`}>Yearly (Save 10%)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} className={`flex flex-col ${plan.popular ? "border-primary" : ""}`}>
              {plan.name === "Pro" && (
                <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">Popular</div>
              )}
              <CardHeader className="space-y-4">
                <CardTitle className="mb-2">{plan.name}</CardTitle>
                {plan.price !== "Custom" ? (
                  <div className="space-y-4">
                    {plan.name !== "Enterprise" && (
                      <Select
                        value={selectedTiers[plan.name]}
                        onValueChange={(tier) => setSelectedTiers((prev) => ({ ...prev, [plan.name]: tier }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={selectedTiers[plan.name] + " users"} />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(plan.tiers).map((tier) => (
                            <SelectItem key={tier} value={tier}>
                              {tier} users
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="space-y-1">
                      <p className="text-3xl font-bold">
                        $
                        {isYearly
                          ? plan.tiers[selectedTiers[plan.name]].yearly
                          : plan.tiers[selectedTiers[plan.name]].monthly}
                        <span className="text-lg font-normal">/{isYearly ? "year" : "month"}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">Billed {isYearly ? "Yearly" : "Monthly"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-xl font-bold mt-4">Custom pricing</div>
                )}
                <div className="text-sm text-muted-foreground">{plan.users}</div>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="p-6 pt-0 mt-auto">
                <Button className="w-full">
                  {plan.price === "Custom" ? "Contact Sales" : `Upgrade to ${plan.name}`}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <TooltipProvider>
          <div className="flex items-center justify-end mt-4">
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Prices in USD, no hidden costs</p>
              </TooltipContent>
            </Tooltip>
            <span className="ml-2 text-sm text-muted-foreground">Prices in USD, no hidden costs</span>
          </div>
        </TooltipProvider>
      </CardContent>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{savedCard ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCard} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.cardNumber}
                onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={cardDetails.expiryDate}
                  onChange={(e) => setCardDetails({ ...cardDetails, expiryDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  value={cardDetails.cvc}
                  onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name on Card</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={cardDetails.name}
                onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {savedCard ? "Update Card" : "Add Card"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

