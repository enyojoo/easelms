/**
 * Test script to verify S3 integration
 * Run with: npx tsx scripts/test-s3-integration.ts
 */

import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getPublicUrl, getS3StoragePath, uploadFileToS3, deleteFileFromS3 } from "../lib/aws/s3"

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

async function testS3Connection() {
  console.log("🔍 Testing S3 Connection...\n")

  try {
    // Test 1: List buckets
    console.log("1. Testing bucket access...")
    const command = new ListBucketsCommand({})
    const response = await s3Client.send(command)
    console.log("✅ S3 connection successful!")
    console.log(`   Available buckets: ${response.Buckets?.map(b => b.Name).join(", ") || "None"}\n`)

    // Test 2: Check if configured bucket exists
    const bucketName = process.env.AWS_S3_BUCKET_NAME
    if (!bucketName) {
      console.error("❌ AWS_S3_BUCKET_NAME environment variable not set")
      return
    }

    const bucketExists = response.Buckets?.some(b => b.Name === bucketName)
    if (!bucketExists) {
      console.error(`❌ Bucket "${bucketName}" not found in your account`)
      console.log("   Please create the bucket first or check the bucket name in .env.local")
      return
    }
    console.log(`✅ Bucket "${bucketName}" found\n`)

    // Test 3: Test path generation
    console.log("2. Testing path generation...")
    const testPath = getS3StoragePath("video", "test-user-id", "test-video.mp4", "course-123/lesson-456")
    console.log(`✅ Generated path: ${testPath}\n`)

    // Test 4: Test public URL generation
    console.log("3. Testing URL generation...")
    const testUrl = getPublicUrl(testPath)
    console.log(`✅ Generated URL: ${testUrl}\n`)

    // Test 5: Test file upload (small test file)
    console.log("4. Testing file upload...")
    const testContent = Buffer.from("This is a test file for S3 integration")
    const uploadPath = getS3StoragePath("video", "test-user-id", "test-upload.txt", "test-course")
    
    try {
      const { key, url } = await uploadFileToS3(testContent, uploadPath, "text/plain")
      console.log(`✅ File uploaded successfully!`)
      console.log(`   Key: ${key}`)
      console.log(`   URL: ${url}\n`)

      // Test 6: Verify file is accessible
      console.log("5. Testing file access...")
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
      const fileResponse = await s3Client.send(getCommand)
      console.log(`✅ File is accessible!`)
      console.log(`   Content-Type: ${fileResponse.ContentType}\n`)

      // Test 7: Clean up test file
      console.log("6. Cleaning up test file...")
      await deleteFileFromS3(key)
      console.log(`✅ Test file deleted\n`)

    } catch (uploadError: any) {
      console.error(`❌ Upload failed: ${uploadError.message}`)
      if (uploadError.message?.includes("Access Denied")) {
        console.log("   Check your IAM user permissions")
      }
      return
    }

    // Test 8: Environment variables check
    console.log("7. Checking environment variables...")
    const requiredVars = [
      "AWS_REGION",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_S3_BUCKET_NAME",
    ]
    const missingVars = requiredVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      console.error(`❌ Missing environment variables: ${missingVars.join(", ")}`)
      console.log("   Please add them to your .env.local file")
      return
    }
    console.log("✅ All required environment variables are set\n")

    // Test 9: CloudFront check (optional)
    if (process.env.AWS_CLOUDFRONT_DOMAIN) {
      console.log("8. CloudFront configuration detected...")
      const cloudfrontUrl = getPublicUrl(testPath)
      if (cloudfrontUrl.includes(process.env.AWS_CLOUDFRONT_DOMAIN)) {
        console.log(`✅ CloudFront URL generation working`)
        console.log(`   CloudFront domain: ${process.env.AWS_CLOUDFRONT_DOMAIN}\n`)
      }
    } else {
      console.log("8. CloudFront not configured (optional)")
      console.log("   Videos will be served directly from S3\n")
    }

    console.log("🎉 All S3 integration tests passed!")
    console.log("\nNext steps:")
    console.log("1. Test video upload in the course builder")
    console.log("2. Verify video playback in the learning interface")
    console.log("3. Check CloudWatch for any errors")

  } catch (error: any) {
    console.error("❌ S3 connection failed:", error.message)
    if (error.message?.includes("credentials")) {
      console.log("\n💡 Tips:")
      console.log("   - Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
      console.log("   - Verify the IAM user has S3 permissions")
    }
    if (error.message?.includes("region")) {
      console.log("\n💡 Tips:")
      console.log("   - Check your AWS_REGION environment variable")
      console.log("   - Ensure the region matches your bucket region")
    }
  }
}

// Run the test
testS3Connection()
