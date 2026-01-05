# S3 Folder Structure Documentation

This document describes the organized folder structure for files stored in the S3 bucket `euniversity`.

## Bucket Structure

```
euniversity/
├── courses/
│   └── course-{id}/
│       ├── thumbnail-{id}-{filename}
│       ├── preview-video-{id}-{filename}
│       ├── lessons/
│       │   └── lesson-{id}/
│       │       ├── video-{id}-{filename}
│       │       └── resources/
│       │           └── resource-{id}-{filename}
│       ├── resources/
│       │   └── resource-{id}-{filename}
│       ├── quiz-images/
│       │   └── quiz-{id}-{filename}
│       └── certificate/
│           └── certificate-{id}-{filename}
└── profile/
    └── user-{id}/
        └── avatar-{id}-{filename}
```

## File Path Patterns

### Course Files

All course-related files are stored under `courses/course-{id}/` where `{id}` is the course ID.

#### Course Thumbnail
- **Path:** `courses/course-{courseId}/thumbnail-{fileId}-{hash}-{filename}`
- **Example:** `courses/course-12/thumbnail-123-abc12345-course-image.jpg`
- **Type:** `thumbnail`

#### Course Preview Video
- **Path:** `courses/course-{courseId}/preview-video-{fileId}-{hash}-{filename}`
- **Example:** `courses/course-12/preview-video-456-def67890-intro.mp4`
- **Type:** `video`

#### Lesson Video
- **Path:** `courses/course-{courseId}/lessons/lesson-{lessonId}/video-{fileId}-{hash}-{filename}`
- **Example:** `courses/course-12/lessons/lesson-5/video-789-ghi11121-lesson1.mp4`
- **Type:** `video`
- **Requires:** `courseId` and `lessonId`

#### Lesson Resources
- **Path:** `courses/course-{courseId}/lessons/lesson-{lessonId}/resources/resource-{resourceId}-{hash}-{filename}`
- **Example:** `courses/course-12/lessons/lesson-5/resources/resource-101-jkl22232-worksheet.pdf`
- **Type:** `document`
- **Requires:** `courseId` and `lessonId`

#### Course-Level Resources
- **Path:** `courses/course-{courseId}/resources/resource-{resourceId}-{hash}-{filename}`
- **Example:** `courses/course-12/resources/resource-202-mno33343-syllabus.pdf`
- **Type:** `document`
- **Requires:** `courseId`

#### Quiz Images
- **Path:** `courses/course-{courseId}/quiz-images/quiz-{quizId}-{hash}-{filename}`
- **Example:** `courses/course-12/quiz-images/quiz-303-pqr44454-diagram.png`
- **Type:** `quiz-image`
- **Requires:** `courseId`

#### Certificate Files
- **Path:** `courses/course-{courseId}/certificate/certificate-{certificateId}-{hash}-{filename}`
- **Example:** `courses/course-12/certificate/certificate-404-stu55565-template.pdf`
- **Type:** `certificate`
- **Requires:** `courseId`

### Profile Files

Profile-related files are stored under `profile/user-{userId}/`.

#### User Avatar
- **Path:** `profile/user-{userId}/avatar-{fileId}-{hash}-{filename}`
- **Example:** `profile/user-789/avatar-505-vwx66676-profile.jpg`
- **Type:** `avatar`

## File Naming Convention

Each file follows this naming pattern:
```
{type}-{fileId}-{hash}-{sanitizedFilename}
```

Where:
- **type**: File type identifier (thumbnail, video, resource, etc.)
- **fileId**: Optional file ID for better identification (falls back to timestamp if not provided)
- **hash**: Optional 8-character hash prefix for deduplication
- **sanitizedFilename**: Original filename with special characters replaced by underscores

## Usage in Code

### Uploading Files

When uploading files, pass the appropriate identifiers:

```typescript
<FileUpload
  type="video"
  courseId={courseId}
  lessonId={lessonId}
  fileId={fileId}
  onUploadComplete={(files, urls) => {
    // Handle uploaded files
  }}
/>
```

### API Upload Endpoint

The upload API accepts these parameters:

```typescript
POST /api/upload
FormData:
  - file: File
  - type: "video" | "thumbnail" | "document" | "avatar" | "certificate" | "quiz-image"
  - courseId?: string | number
  - lessonId?: string | number
  - resourceId?: string | number
  - fileId?: string | number
  - additionalPath?: string (for backward compatibility)
```

### Presigned URL Endpoint

For large files, use the presigned URL endpoint:

```typescript
POST /api/upload/presigned-s3
Body:
{
  filename: string
  fileType: "video" | "thumbnail" | "document" | "avatar" | "certificate" | "quiz-image"
  contentType: string
  courseId?: string | number
  lessonId?: string | number
  resourceId?: string | number
  fileId?: string | number
  additionalPath?: string
}
```

## Benefits of This Structure

1. **Organization**: All course files are grouped by course ID, making it easy to find and manage files
2. **Scalability**: Clear separation between courses, lessons, and resources
3. **Identification**: File IDs and hashes help identify and deduplicate files
4. **Maintenance**: Easy to locate and delete files when courses are removed
5. **Backward Compatibility**: `additionalPath` parameter still works for legacy code

## Migration Notes

- Existing files using the old structure will continue to work
- New uploads will use the new structure when `courseId` is provided
- Files without `courseId` will be stored in `courses/temp-{userId}/` folders
- The `additionalPath` parameter is still supported for backward compatibility

## Example File Paths

### Complete Course Structure Example

For course ID 12 with lesson ID 5:

```
courses/course-12/
├── thumbnail-123-abc12345-intro.jpg
├── preview-video-456-def67890-overview.mp4
├── lessons/
│   └── lesson-5/
│       ├── video-789-ghi11121-introduction.mp4
│       └── resources/
│           ├── resource-101-jkl22232-worksheet.pdf
│           └── resource-102-mno33343-slides.pdf
├── resources/
│   └── resource-201-pqr44454-syllabus.pdf
├── quiz-images/
│   ├── quiz-301-stu55565-diagram1.png
│   └── quiz-302-vwx66676-chart.png
└── certificate/
    └── certificate-401-yza77787-template.pdf
```

This structure makes it easy to:
- Find all files for a specific course
- Organize lesson-specific content
- Manage resources at course or lesson level
- Locate quiz images and certificate templates
- Clean up files when a course is deleted
