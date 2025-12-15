export interface Lesson {
  id?: string | number
  title: string
  type?: string
  content?: {
    url?: string // Video URL (for non-Vimeo videos or legacy support)
    vimeoVideoId?: string // Vimeo video ID
    text?: string // For text-based lessons
    [key: string]: any // Allow other content properties
  }
  quiz?: {
    questions: QuizQuestion[]
  }
  resources?: Resource[]
  settings?: {
    isRequired?: boolean
    videoProgression?: boolean
    allowSkip?: boolean
    timeLimit?: number
  }
}

export interface Module {
  id: number
  title: string
  description: string
  image: string // Supabase Storage URL for course thumbnail
  lessons: Lesson[]
  price?: number
  currency?: string
  enrolledStudents?: number
  requirements?: string
  whoIsThisFor?: string
  previewVideo?: string // Video URL (for non-Vimeo videos or legacy support)
  vimeoVideoId?: string // Vimeo video ID for preview video
  settings?: {
    isPublished?: boolean
    requiresSequentialProgress?: boolean
    minimumQuizScore?: number
    enrollment?: {
      enrollmentMode: "open" | "free" | "buy" | "recurring" | "closed"
      price?: number
      recurringPrice?: number
    }
    certificate?: {
      certificateEnabled?: boolean
      certificateTemplate?: string
      certificateTitle?: string
      certificateDescription?: string
      signatureImage?: string // Supabase Storage URL
      signatureTitle?: string
      additionalText?: string
      certificateType?: "completion" | "achievement" | "participation"
    }
    currency?: string
  }
}

export interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

export interface Resource {
  type: "document" | "link"
  title: string
  url: string // Supabase Storage URL for documents, external URL for links
}

export const modules: Module[] = [
  {
    id: 1,
    title: "Digital Marketing & Social Media",
    description: "Learn the fundamentals of digital marketing, social media strategies, and online branding.",
    image:
      "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1474&q=80",
    lessons: [
      {
        title: "Intro to Digital Marketing",
        quiz: {
          questions: [
            {
              question: "What is digital marketing?",
              options: ["Traditional advertising", "Online marketing", "Print media", "Radio advertising"],
              correctAnswer: 1,
            },
          ],
        },
        resources: [
          { type: "document", title: "Digital Marketing Basics", url: "/documents/digital-marketing-basics.pdf" },
          { type: "link", title: "Top Digital Marketing Trends", url: "https://example.com/digital-marketing-trends" },
        ],
      },
      {
        title: "Online Branding",
        quiz: {
          questions: [
            {
              question: "What is a key component of online branding?",
              options: [
                "Offline advertising",
                "Consistent visual identity",
                "Ignoring social media",
                "Avoiding customer feedback",
              ],
              correctAnswer: 1,
            },
          ],
        },
        resources: [
          { type: "document", title: "Branding Essentials", url: "/documents/branding-essentials.pdf" },
          { type: "link", title: "Case Studies in Online Branding", url: "https://example.com/branding-case-studies" },
        ],
      },
      {
        title: "Content Marketing Strategies",
        quiz: {
          questions: [
            {
              question: "What is the primary goal of content marketing?",
              options: ["Immediate sales", "Brand awareness", "Website traffic", "All of the above"],
              correctAnswer: 3,
            },
          ],
        },
        resources: [
          { type: "document", title: "Content Marketing Guide", url: "/documents/content-marketing-guide.pdf" },
          { type: "link", title: "Successful Content Campaigns", url: "https://example.com/content-campaigns" },
        ],
      },
      { title: "Social Media Platforms Overview" },
      { title: "SEO and SEM Basics" },
      { title: "Analytics Tracking" },
      { title: "Advertising and Paid Campaigns" },
      { title: "Ethics and Digital Responsibility" },
    ],
    price: 199,
    currency: "USD",
    enrolledStudents: 1250,
  },
  {
    id: 2,
    title: "Startup Fundamentals",
    description: "Discover the essentials of entrepreneurship, from idea generation to scaling your business.",
    image:
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    lessons: [
      {
        title: "Intro to Entrepreneurship",
        quiz: {
          questions: [
            {
              question: "What is a startup?",
              options: ["A large corporation", "A new business venture", "A government organization", "A non-profit"],
              correctAnswer: 1,
            },
          ],
        },
        resources: [
          { type: "document", title: "Startup Checklist", url: "/documents/startup-checklist.pdf" },
          { type: "link", title: "Top Startup Incubators", url: "https://example.com/startup-incubators" },
        ],
      },
      {
        title: "Idea Generation and Validation",
        quiz: {
          questions: [
            {
              question: "What is the first step in idea validation?",
              options: ["Building a product", "Market research", "Seeking funding", "Hiring employees"],
              correctAnswer: 1,
            },
          ],
        },
        resources: [
          { type: "document", title: "Idea Validation Techniques", url: "/documents/idea-validation.pdf" },
          { type: "link", title: "Successful Startup Ideas", url: "https://example.com/successful-startup-ideas" },
        ],
      },
      {
        title: "Business Planning",
        quiz: {
          questions: [
            {
              question: "What is the purpose of a business plan?",
              options: [
                "To impress investors",
                "To guide business operations",
                "To fulfill legal requirements",
                "All of the above",
              ],
              correctAnswer: 3,
            },
          ],
        },
        resources: [
          { type: "document", title: "Business Plan Template", url: "/documents/business-plan-template.pdf" },
          { type: "link", title: "Sample Business Plans", url: "https://example.com/sample-business-plans" },
        ],
      },
      { title: "Market Analysis" },
      { title: "Business Models and Revenue" },
      { title: "Legal Basics for Startups" },
      { title: "Operations and Management" },
      { title: "Scaling and Growth Strategies" },
    ],
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
