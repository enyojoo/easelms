"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { getClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import { Download, Calendar as CalendarIcon } from "lucide-react"
import AdminReportsSkeleton from "@/components/AdminReportsSkeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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


interface RevenueDataPoint {
  date: string
  amount: number
}

interface LearnersDataPoint {
  date: string
  count: number
}

interface CompletionRateDataPoint {
  date: string
  rate: number
}

interface LearnerDemographic {
  country: string
  count: number
}

interface RevenueByCourse {
  name: string
  revenue: number
  dateRange: string
}


export default function ReportPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([])
  const [learnersData, setLearnersData] = useState<LearnersDataPoint[]>([])
  const [completionRateData, setCompletionRateData] = useState<CompletionRateDataPoint[]>([])
  const [learnerDemographics, setLearnerDemographics] = useState<LearnerDemographic[]>([])
  const [revenueByCoursesData, setRevenueByCoursesData] = useState<RevenueByCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  // Track mount state to prevent flash of content
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "admin") {
      router.push("/auth/admin/login")
    } else {
      setUser(user)
      fetchData()
    }
  }, [router])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [revenue, learners, completionRate, demographics, revenueByCourses] = await Promise.all([
        fetchRevenueData(),
        fetchLearnersData(),
        fetchCompletionRateData(),
        fetchLearnerDemographics(),
        fetchRevenueByCoursesData(),
      ])
      setRevenueData(revenue as RevenueDataPoint[])
      setLearnersData(learners as LearnersDataPoint[])
      setCompletionRateData(completionRate as CompletionRateDataPoint[])
      setLearnerDemographics(demographics as LearnerDemographic[])
      setRevenueByCoursesData(revenueByCourses as RevenueByCourse[])
    } catch (error) {
      console.error("Error fetching data:", error)
      // Handle error (e.g., show error message to user)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = (format: "csv" | "pdf") => {
    // Mock export - in real app, this would generate and download the file
    toast.success(`Exporting report as ${format.toUpperCase()}...`)
    // In real implementation, this would call an API endpoint to generate the file
  }

  const handleDateFilterApply = () => {
    if (dateFrom && dateTo) {
      // In real app, this would filter the data based on date range
      fetchData()
      toast.success("Date filter applied")
    } else {
      toast.error("Please select both start and end dates")
    }
  }

  const handleDateFilterReset = () => {
    setDateFrom(undefined)
    setDateTo(undefined)
    fetchData()
    toast.success("Date filter reset")
  }

  // Show skeleton until mounted and data is loaded
  if (!mounted || !user || loading) {
    return <AdminReportsSkeleton />
  }

  return (
    <div className=" pt-4 md:pt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Reports</h1>
          <p className="text-muted-foreground">Performance overview and analytics</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom && dateTo
                  ? `${format(dateFrom, "MMM dd")} - ${format(dateTo, "MMM dd")}`
                  : "Select Date Range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDateFilterApply} size="sm" className="flex-1">
                    Apply
                  </Button>
                  <Button onClick={handleDateFilterReset} variant="outline" size="sm" className="flex-1">
                    Reset
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport("csv")} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport("pdf")} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

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

      </div>
    </div>
  )
}
