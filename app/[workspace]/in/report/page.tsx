"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { getClientAuthState } from "@/app/utils/client-auth"
import type { User } from "@/app/data/users"
import { Loader2 } from "lucide-react"

// These would typically be fetched from an API
const fetchRevenueData = () =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve([
          { date: "2023-06-07", amount: 1000 },
          { date: "2023-06-14", amount: 1500 },
          { date: "2023-06-21", amount: 2000 },
          { date: "2023-06-28", amount: 2500 },
        ]),
      1000,
    ),
  )

const fetchLearnersData = () =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve([
          { date: "2023-06-07", count: 100 },
          { date: "2023-06-14", count: 120 },
          { date: "2023-06-21", count: 150 },
          { date: "2023-06-28", count: 180 },
        ]),
      1000,
    ),
  )

const fetchCompletionRateData = () =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve([
          { date: "2023-06-07", rate: 65 },
          { date: "2023-06-14", rate: 70 },
          { date: "2023-06-21", rate: 75 },
          { date: "2023-06-28", rate: 78 },
        ]),
      1000,
    ),
  )

const fetchLearnerDemographics = () =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve([
          { country: "United States", count: 500 },
          { country: "India", count: 300 },
          { country: "United Kingdom", count: 200 },
          { country: "Canada", count: 150 },
          { country: "Australia", count: 100 },
        ]),
      1000,
    ),
  )

const fetchRevenueByCoursesData = () =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve([
          { name: "Digital Marketing", revenue: 5000, dateRange: "Jun 1 - Jun 28" },
          { name: "Startup Fundamentals", revenue: 4000, dateRange: "Jun 1 - Jun 28" },
          { name: "Business Analytics", revenue: 3500, dateRange: "Jun 1 - Jun 28" },
        ]),
      1000,
    ),
  )

const fetchPayoutSummary = () =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          availableForPayout: 3750,
          lastPayout: { amount: 3000, date: "June 15, 2023" },
          grossEarnings: 2500,
          platformFees: 250,
          netEarnings: 2250,
          nextPayoutDate: "July 15, 2023",
        }),
      1000,
    ),
  )

export default function ReportPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [revenueData, setRevenueData] = useState([])
  const [learnersData, setLearnersData] = useState([])
  const [completionRateData, setCompletionRateData] = useState([])
  const [learnerDemographics, setLearnerDemographics] = useState([])
  const [revenueByCoursesData, setRevenueByCoursesData] = useState([])
  const [payoutSummary, setPayoutSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "instructor") {
      router.push("/login")
    } else {
      setUser(user)
      fetchData()
    }
  }, [router])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [revenue, learners, completionRate, demographics, revenueByCourses, payout] = await Promise.all([
        fetchRevenueData(),
        fetchLearnersData(),
        fetchCompletionRateData(),
        fetchLearnerDemographics(),
        fetchRevenueByCoursesData(),
        fetchPayoutSummary(),
      ])
      setRevenueData(revenue)
      setLearnersData(learners)
      setCompletionRateData(completionRate)
      setLearnerDemographics(demographics)
      setRevenueByCoursesData(revenueByCourses)
      setPayoutSummary(payout)
    } catch (error) {
      console.error("Error fetching data:", error)
      // Handle error (e.g., show error message to user)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div>Loading...</div>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className=" pt-4 md:pt-8">
      <h1 className="text-3xl font-bold text-primary mb-2">Report</h1>
      <p className="text-muted-foreground mb-8">Performance overview for the last 4 weeks</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Row 1 */}
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Course</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueByCoursesData.map((course) => (
                  <TableRow key={course.name}>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>${course.revenue}</TableCell>
                    <TableCell>{course.dateRange}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Row 2 */}
        <Card>
          <CardHeader>
            <CardTitle>Total Learners</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={learnersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={completionRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="rate" stroke="#ffc658" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Row 3 */}
        <Card>
          <CardHeader>
            <CardTitle>Learner Demographics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Learners</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learnerDemographics.map((item) => (
                  <TableRow key={item.country}>
                    <TableCell>{item.country}</TableCell>
                    <TableCell>{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payout Summary</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            {payoutSummary && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-muted-foreground">Available for Payout</p>
                  <p className="text-3xl font-bold">${payoutSummary.availableForPayout}</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Last Payout ({payoutSummary.lastPayout.date}):</span>
                    <span>${payoutSummary.lastPayout.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gross Earnings (Last 4 Weeks):</span>
                    <span>${payoutSummary.grossEarnings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fees (Last 4 Weeks):</span>
                    <span>${payoutSummary.platformFees}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Earnings (Last 4 Weeks):</span>
                    <span>${payoutSummary.netEarnings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Auto Payout Date:</span>
                    <span>{payoutSummary.nextPayoutDate}</span>
                  </div>
                </div>
                <Button className="w-full">Payout Funds</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

