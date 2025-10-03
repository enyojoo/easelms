export interface Workshop {
  id: number
  title: string
  date: string
  time: string
  attendees: number
  isOnline: boolean
  address?: string
  description: string
  price: number
  courseId: number
}

export const workshops: Workshop[] = [
  {
    id: 1,
    title: "Digital Marketing Strategies",
    date: "2023-07-15",
    time: "14:00",
    attendees: 25,
    isOnline: true,
    description: "Learn cutting-edge digital marketing techniques from industry experts.",
    price: 99,
    courseId: 1,
  },
  {
    id: 2,
    title: "A Guide to Startup Funding",
    date: "2023-07-22",
    time: "13:00",
    attendees: 30,
    isOnline: false,
    address: "123 Business St, New York, NY 10001",
    description: "Discover various funding options for your startup and how to approach investors.",
    price: 149,
    courseId: 2,
  },
  {
    id: 3,
    title: "Social Media Marketing Masterclass",
    date: "2023-08-05",
    time: "15:00",
    attendees: 40,
    isOnline: true,
    description: "Master the art of social media marketing across multiple platforms.",
    price: 199,
    courseId: 1,
  },
  {
    id: 4,
    title: "E-commerce Optimization Workshop",
    date: "2023-08-20",
    time: "10:00",
    attendees: 35,
    isOnline: true,
    description: "Learn how to optimize your e-commerce store for better conversions and sales.",
    price: 129,
    courseId: 3,
  },
]
