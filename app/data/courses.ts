export interface Lesson {
  title: string
  quiz?: {
    questions: QuizQuestion[]
  }
  resources?: Resource[]
}

export interface Module {
  id: number
  title: string
  description: string
  image: string
  lessons: Lesson[]
  workshops?: number
  price?: number
  currency?: string
  enrolledStudents?: number
}

export interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

export interface Resource {
  type: "document" | "link"
  title: string
  url: string
}

export const modules: Module[] = [
  {
    id: 1,
    title: "Digital Marketing & Social Media",
    description: "Learn the fundamentals of digital marketing and social media strategies.",
    image:
      "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1474&q=80",
    lessons: [
      { title: "Introduction to Digital Marketing" },
      { title: "Social Media Platforms Overview" },
      { title: "Content Marketing Strategies" },
    ],
    workshops: 3,
    price: 199,
    currency: "USD",
    enrolledStudents: 1250,
  },
  {
    id: 2,
    title: "Startup Fundamentals",
    description: "Discover the essentials of entrepreneurship and starting a business.",
    image:
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    lessons: [
      { title: "Idea Generation and Validation" },
      { title: "Business Planning Basics" },
      { title: "Funding and Financial Management" },
    ],
    workshops: 2,
    price: 249,
    currency: "USD",
    enrolledStudents: 980,
  },
  {
    id: 3,
    title: "Basic Money Management",
    description: "Master the basics of financial literacy, budgeting, and money management for young entrepreneurs.",
    image: "/placeholder.svg?height=200&width=300",
    lessons: [
      { title: "Intro to Financial Literacy" },
      { title: "Budgeting Basics" },
      { title: "Understanding Finance" },
      { title: "Saving and Investing" },
      { title: "Intro to Banking and Credit" },
      { title: "Fundraising Options" },
      { title: "Financial Planning" },
      { title: "Taxes and Compliance" },
    ],
    enrolledStudents: 550,
  },
  {
    id: 4,
    title: "Public Speaking & Communication",
    description:
      "Develop essential communication skills, including public speaking and effective presentation techniques.",
    image: "/placeholder.svg?height=200&width=300",
    lessons: [
      { title: "Intro to Communication" },
      { title: "Public Speaking Essentials" },
      { title: "Non-Verbal Communication" },
      { title: "Active Listening Skills" },
      { title: "Persuasive Communication" },
      { title: "Effective Storytelling" },
      { title: "Presentation Skills with Tech" },
      { title: "Handling Q&A and Feedback" },
    ],
    enrolledStudents: 720,
  },
  {
    id: 5,
    title: "Building Side Hustles",
    description: "Learn how to identify opportunities, manage time, and scale your side projects effectively.",
    image: "/placeholder.svg?height=200&width=300",
    lessons: [
      { title: "Intro to Side Hustles" },
      { title: "Identifying Opportunities" },
      { title: "Time Management" },
      { title: "Setting Goals and Milestones" },
      { title: "Basic Marketing for Side Hustles" },
      { title: "Monetization Strategies" },
      { title: "Customer Engagement" },
      { title: "Scaling Side Hustles" },
    ],
    enrolledStudents: 380,
  },
  {
    id: 6,
    title: "Tech Skills (No-code, AI Basics)",
    description: "Explore no-code development, AI basics, and other essential tech skills for modern entrepreneurs.",
    image: "/placeholder.svg?height=200&width=300",
    lessons: [
      { title: "Intro to No-Code Development" },
      { title: "Building Websites with No-Code" },
      { title: "Develop App Without Coding" },
      { title: "Automation Tools for Businesses" },
      { title: "Intro to Artificial Intelligence" },
      { title: "Leveraging AI for Marketing" },
      { title: "Data Analytics and Visualization" },
      { title: "Future Trends for Entrepreneurs" },
    ],
    enrolledStudents: 610,
  },
]

