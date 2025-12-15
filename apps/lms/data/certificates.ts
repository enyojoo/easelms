export interface Certificate {
  id: string
  userId: string
  courseId: number
  courseTitle: string
  issuedAt: Date
  certificateNumber: string
  certificateUrl?: string
  template?: string
}

export const certificates: Certificate[] = [
  {
    id: "1",
    userId: "2",
    courseId: 1,
    courseTitle: "Digital Marketing & Social Media",
    issuedAt: new Date("2024-01-25"),
    certificateNumber: "CERT-2024-001",
    certificateUrl: "/certificates/cert-2024-001.pdf",
  },
  {
    id: "2",
    userId: "1",
    courseId: 3,
    courseTitle: "Basic Money Management",
    issuedAt: new Date("2024-01-15"),
    certificateNumber: "CERT-2024-002",
    certificateUrl: "/certificates/cert-2024-002.pdf",
  },
]

export function getCertificatesByUser(userId: string): Certificate[] {
  return certificates.filter((c) => c.userId === userId)
}

export function getCertificatesByCourse(courseId: number): Certificate[] {
  return certificates.filter((c) => c.courseId === courseId)
}

export function getCertificateById(id: string): Certificate | undefined {
  return certificates.find((c) => c.id === id)
}

