export interface Lesson {
  id?: string | number
  title: string
  type?: string
  content?: {
    url?: string // Video URL (S3)
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
  previewVideo?: string // Video URL (S3)
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
      certificateType?: "completion" | "participation"
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
    title: "Self Discovery Course",
    description: "Embark on a transformative journey to understand your true self, discover your passions, strengths, and purpose in life.",
    image: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Introduction to Self Discovery" },
      { title: "Understanding Your Core Values" },
      { title: "Identifying Your Strengths and Talents" },
      { title: "Exploring Your Passions" },
      { title: "Overcoming Self-Limiting Beliefs" },
      { title: "Building Self-Awareness" },
      { title: "Creating Your Personal Vision" },
      { title: "Living Authentically" },
    ],
    enrolledStudents: 1245,
    settings: {
      enrollment: {
        enrollmentMode: "free",
      },
    },
  },
  {
    id: 2,
    title: "Successful Marriage Course",
    description: "Learn the essential principles and practices for building a strong, healthy, and fulfilling marriage relationship.",
    image: "https://images.pexels.com/photos/2253879/pexels-photo-2253879.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Foundations of a Successful Marriage" },
      { title: "Effective Communication in Marriage" },
      { title: "Understanding Your Spouse" },
      { title: "Conflict Resolution Strategies" },
      { title: "Building Trust and Intimacy" },
      { title: "Financial Management in Marriage" },
      { title: "Maintaining Romance and Connection" },
      { title: "Growing Together Through Challenges" },
    ],
    enrolledStudents: 1890,
    settings: {
      enrollment: {
        enrollmentMode: "buy",
        price: 49,
      },
    },
  },
  {
    id: 3,
    title: "Before You Marry Course",
    description: "Essential preparation for marriage covering important topics to consider before saying 'I do'.",
    image: "https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Are You Ready for Marriage?" },
      { title: "Understanding Compatibility" },
      { title: "Financial Planning Before Marriage" },
      { title: "Family and Cultural Considerations" },
      { title: "Setting Expectations" },
      { title: "Pre-Marital Counseling Essentials" },
      { title: "Building a Strong Foundation" },
      { title: "Preparing for Life Together" },
    ],
    enrolledStudents: 1567,
    settings: {
      enrollment: {
        enrollmentMode: "buy",
        price: 39,
      },
    },
  },
  {
    id: 4,
    title: "Public Speaking and Communication Course",
    description: "Master the art of public speaking and effective communication to confidently express yourself in any setting.",
    image: "https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Overcoming Public Speaking Fear" },
      { title: "Crafting Compelling Messages" },
      { title: "Body Language and Non-Verbal Communication" },
      { title: "Voice Projection and Articulation" },
      { title: "Engaging Your Audience" },
      { title: "Handling Questions and Feedback" },
      { title: "Speaking in Different Contexts" },
      { title: "Advanced Presentation Techniques" },
    ],
    enrolledStudents: 2134,
    settings: {
      enrollment: {
        enrollmentMode: "free",
      },
    },
  },
  {
    id: 5,
    title: "Purpose Discovery and Fulfilment Course",
    description: "Discover your God-given purpose and learn how to live a life of meaning, impact, and fulfillment.",
    image: "https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Understanding Purpose" },
      { title: "Discovering Your Unique Calling" },
      { title: "Aligning Your Life with Purpose" },
      { title: "Overcoming Purpose Obstacles" },
      { title: "Living with Intentionality" },
      { title: "Making an Impact" },
      { title: "Sustaining Purpose Through Challenges" },
      { title: "Legacy and Generational Impact" },
    ],
    enrolledStudents: 1789,
    settings: {
      enrollment: {
        enrollmentMode: "recurring",
        recurringPrice: 29,
      },
    },
  },
  {
    id: 6,
    title: "Female in Ministry Academy (Basic Certificate Course)",
    description: "A foundational course designed to equip women with essential knowledge and skills for effective ministry service.",
    image: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Introduction to Ministry" },
      { title: "Biblical Foundation for Women in Ministry" },
      { title: "Understanding Your Ministry Calling" },
      { title: "Essential Ministry Skills" },
      { title: "Preaching and Teaching Basics" },
      { title: "Pastoral Care Fundamentals" },
      { title: "Ministry Administration" },
      { title: "Building Your Ministry Team" },
    ],
    enrolledStudents: 892,
    settings: {
      enrollment: {
        enrollmentMode: "buy",
        price: 199,
      },
      certificate: {
        certificateEnabled: true,
        certificateType: "completion",
      },
    },
  },
  {
    id: 7,
    title: "Female in Ministry Academy (Advanced Certificate Course)",
    description: "An advanced program for women in ministry seeking to deepen their knowledge and expand their ministry impact.",
    image: "https://images.pexels.com/photos/3184306/pexels-photo-3184306.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Advanced Ministry Leadership" },
      { title: "Strategic Ministry Planning" },
      { title: "Advanced Preaching and Teaching" },
      { title: "Church Planting and Growth" },
      { title: "Ministry Finance and Stewardship" },
      { title: "Handling Complex Ministry Challenges" },
      { title: "Mentoring and Discipleship" },
      { title: "Global Ministry Perspectives" },
    ],
    enrolledStudents: 456,
    settings: {
      enrollment: {
        enrollmentMode: "recurring",
        recurringPrice: 39,
      },
      certificate: {
        certificateEnabled: true,
        certificateType: "completion",
      },
    },
  },
  {
    id: 8,
    title: "School of The Prophets Course",
    description: "Deep dive into prophetic ministry, learning to hear God's voice and operate in prophetic gifts with wisdom and integrity.",
    image: "https://images.pexels.com/photos/3184357/pexels-photo-3184357.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Understanding Prophetic Ministry" },
      { title: "Hearing God's Voice" },
      { title: "Discerning True Prophecy" },
      { title: "Operating in Prophetic Gifts" },
      { title: "Delivering Prophetic Words" },
      { title: "Prophetic Intercession" },
      { title: "Prophetic Worship" },
      { title: "Building Prophetic Character" },
    ],
    enrolledStudents: 723,
    settings: {
      enrollment: {
        enrollmentMode: "buy",
        price: 79,
      },
    },
  },
  {
    id: 9,
    title: "Exceptional Ministry Course",
    description: "Learn how to build and lead an exceptional ministry that transforms lives and impacts communities.",
    image: "https://images.pexels.com/photos/3184405/pexels-photo-3184405.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Vision for Exceptional Ministry" },
      { title: "Building Strong Ministry Foundations" },
      { title: "Excellence in Ministry Operations" },
      { title: "Creating Impactful Programs" },
      { title: "Developing Ministry Leaders" },
      { title: "Innovation in Ministry" },
      { title: "Measuring Ministry Effectiveness" },
      { title: "Sustaining Long-Term Impact" },
    ],
    enrolledStudents: 567,
    settings: {
      enrollment: {
        enrollmentMode: "free",
      },
    },
  },
  {
    id: 10,
    title: "Hearing God Course",
    description: "Develop your ability to hear and recognize God's voice in your daily life through practical biblical principles.",
    image: "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "The Importance of Hearing God" },
      { title: "How God Speaks" },
      { title: "Recognizing God's Voice" },
      { title: "Discerning God's Will" },
      { title: "Prayer and Hearing God" },
      { title: "Scripture and God's Voice" },
      { title: "Overcoming Obstacles to Hearing" },
      { title: "Walking in Obedience" },
    ],
    enrolledStudents: 1456,
    settings: {
      enrollment: {
        enrollmentMode: "buy",
        price: 59,
      },
    },
  },
  {
    id: 11,
    title: "Emotional Intelligence Course",
    description: "Master emotional intelligence to improve relationships, leadership skills, and personal well-being.",
    image: "https://images.pexels.com/photos/3184416/pexels-photo-3184416.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Understanding Emotional Intelligence" },
      { title: "Self-Awareness and Self-Regulation" },
      { title: "Empathy and Social Awareness" },
      { title: "Managing Emotions Effectively" },
      { title: "Building Emotional Resilience" },
      { title: "Emotional Intelligence in Relationships" },
      { title: "Leadership and Emotional Intelligence" },
      { title: "Developing Your EQ" },
    ],
    enrolledStudents: 1123,
    settings: {
      enrollment: {
        enrollmentMode: "recurring",
        recurringPrice: 19,
      },
    },
  },
  {
    id: 12,
    title: "Adaptability Intelligence Course",
    description: "Learn to thrive in change and uncertainty by developing adaptability skills for personal and professional success.",
    image: "https://images.pexels.com/photos/3184302/pexels-photo-3184302.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Understanding Adaptability" },
      { title: "Embracing Change" },
      { title: "Building Resilience" },
      { title: "Flexible Thinking" },
      { title: "Navigating Uncertainty" },
      { title: "Adapting to New Environments" },
      { title: "Learning Agility" },
      { title: "Thriving in Transition" },
    ],
    enrolledStudents: 789,
    settings: {
      enrollment: {
        enrollmentMode: "buy",
        price: 89,
      },
    },
  },
  {
    id: 13,
    title: "Book Writing Course",
    description: "From concept to publication, learn the complete process of writing and publishing your book successfully.",
    image: "https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Getting Started with Your Book" },
      { title: "Developing Your Book Concept" },
      { title: "Creating Your Writing Plan" },
      { title: "Writing Techniques and Styles" },
      { title: "Overcoming Writer's Block" },
      { title: "Editing and Revision" },
      { title: "Publishing Options" },
      { title: "Marketing Your Book" },
    ],
    enrolledStudents: 634,
    settings: {
      enrollment: {
        enrollmentMode: "free",
      },
    },
  },
  {
    id: 14,
    title: "Shattering Limiting Beliefs Course",
    description: "Break free from limiting beliefs that hold you back and unlock your full potential for success and fulfillment.",
    image: "https://images.pexels.com/photos/3184460/pexels-photo-3184460.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Identifying Limiting Beliefs" },
      { title: "Understanding Belief Formation" },
      { title: "Challenging False Beliefs" },
      { title: "Replacing Limiting Beliefs" },
      { title: "Building Empowering Beliefs" },
      { title: "Overcoming Fear and Doubt" },
      { title: "Breaking Through Barriers" },
      { title: "Living Without Limits" },
    ],
    enrolledStudents: 987,
    settings: {
      enrollment: {
        enrollmentMode: "buy",
        price: 69,
      },
    },
  },
  {
    id: 15,
    title: "Women in Leadership Course",
    description: "Empower yourself with leadership skills, strategies, and confidence to excel as a woman in leadership positions.",
    image: "https://images.pexels.com/photos/3184301/pexels-photo-3184301.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Women in Leadership Today" },
      { title: "Developing Leadership Identity" },
      { title: "Leadership Styles and Approaches" },
      { title: "Building Confidence as a Leader" },
      { title: "Navigating Leadership Challenges" },
      { title: "Mentoring and Being Mentored" },
      { title: "Work-Life Balance for Leaders" },
      { title: "Creating Your Leadership Legacy" },
    ],
    enrolledStudents: 1234,
    settings: {
      enrollment: {
        enrollmentMode: "recurring",
        recurringPrice: 24,
      },
    },
  },
  {
    id: 16,
    title: "Generational Influence Course",
    description: "Learn how to create lasting impact that transcends generations and builds a legacy of positive influence.",
    image: "https://images.pexels.com/photos/2253879/pexels-photo-2253879.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Understanding Generational Impact" },
      { title: "Building Generational Wealth" },
      { title: "Passing Down Values and Principles" },
      { title: "Mentoring the Next Generation" },
      { title: "Creating Family Legacy" },
      { title: "Breaking Negative Generational Patterns" },
      { title: "Building Generational Connections" },
      { title: "Planning for Future Generations" },
    ],
    enrolledStudents: 678,
    settings: {
      enrollment: {
        enrollmentMode: "buy",
        price: 99,
      },
    },
  },
  {
    id: 17,
    title: "Financial Intelligence Course",
    description: "Master financial principles and strategies to build wealth, achieve financial freedom, and create generational prosperity.",
    image: "https://images.pexels.com/photos/6801874/pexels-photo-6801874.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Financial Intelligence Fundamentals" },
      { title: "Understanding Money and Wealth" },
      { title: "Budgeting and Money Management" },
      { title: "Saving and Investment Strategies" },
      { title: "Building Multiple Income Streams" },
      { title: "Debt Management and Elimination" },
      { title: "Financial Planning for the Future" },
      { title: "Creating Generational Wealth" },
    ],
    enrolledStudents: 1890,
  },
  {
    id: 18,
    title: "Personal Development Course",
    description: "A comprehensive program for personal growth, self-improvement, and achieving your highest potential in all areas of life.",
    image: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Introduction to Personal Development" },
      { title: "Setting Personal Goals" },
      { title: "Building Positive Habits" },
      { title: "Time Management and Productivity" },
      { title: "Developing a Growth Mindset" },
      { title: "Building Self-Confidence" },
      { title: "Improving Relationships" },
      { title: "Creating Your Personal Development Plan" },
    ],
    enrolledStudents: 2345,
    settings: {
      enrollment: {
        enrollmentMode: "free",
      },
    },
  },
  {
    id: 19,
    title: "Basic Certificate Course - Enthronement Bible Institute",
    description: "Foundational biblical studies and theological training for those beginning their journey in biblical education.",
    image: "https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Introduction to Biblical Studies" },
      { title: "Old Testament Survey" },
      { title: "New Testament Survey" },
      { title: "Biblical Hermeneutics" },
      { title: "Christian Doctrine Basics" },
      { title: "Church History Overview" },
      { title: "Practical Ministry Skills" },
      { title: "Biblical Worldview" },
    ],
    enrolledStudents: 567,
    settings: {
      enrollment: {
        enrollmentMode: "buy",
        price: 149,
      },
      certificate: {
        certificateEnabled: true,
        certificateType: "completion",
      },
    },
  },
  {
    id: 20,
    title: "Advanced Certificate Course - Enthronement Bible Institute",
    description: "Advanced theological training and biblical studies for those seeking deeper knowledge and ministry preparation.",
    image: "https://images.pexels.com/photos/159751/book-address-book-learning-learn-159751.jpeg?auto=compress&cs=tinysrgb&w=800",
    lessons: [
      { title: "Advanced Biblical Interpretation" },
      { title: "Systematic Theology" },
      { title: "Advanced Old Testament Studies" },
      { title: "Advanced New Testament Studies" },
      { title: "Apologetics and Defense of Faith" },
      { title: "Advanced Church History" },
      { title: "Theology and Ministry Practice" },
      { title: "Research and Writing in Theology" },
    ],
    enrolledStudents: 234,
    settings: {
      enrollment: {
        enrollmentMode: "recurring",
        recurringPrice: 49,
      },
      certificate: {
        certificateEnabled: true,
        certificateType: "completion",
      },
    },
  },
]
