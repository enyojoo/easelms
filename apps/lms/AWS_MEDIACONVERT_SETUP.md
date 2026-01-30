# AWS MediaConvert Setup Guide

This guide explains how to set up AWS MediaConvert for video transcoding to HLS format.

## Prerequisites

1. AWS Account with MediaConvert access
2. S3 bucket for storing videos
3. IAM role with MediaConvert permissions

## Step 1: Create IAM Role for MediaConvert

MediaConvert needs an IAM role with permissions to:
- Read videos from your S3 bucket
- Write HLS output files to your S3 bucket

### Option A: Use AWS Console

1. Go to **IAM Console** → **Roles** → **Create Role**
2. Select **AWS Service** → **MediaConvert**
3. AWS may suggest `AmazonAPIGatewayInvokeFullAccess` - **you can ignore/remove this** (not needed for our use case)
4. Attach the following policies:
   - `AmazonS3FullAccess` - **Required** (allows MediaConvert to read input videos and write HLS output files)
   - Optionally, you can use more restrictive custom policies:
     - S3 read access to your bucket (for input videos)
     - S3 write access to your bucket (for HLS output files)
5. Click **Next** → Name the role: `MediaConvert_Default_Role`
6. Click **Create Role**
7. Copy the **Role ARN** (e.g., `arn:aws:iam::123456789012:role/MediaConvert_Default_Role`)

**Note:** If AWS suggests `AmazonAPIGatewayInvokeFullAccess`, you don't need it. MediaConvert only needs S3 permissions to read input videos and write output files.

### Option B: Use AWS CLI

```bash
# Create trust policy
cat > mediaconvert-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "mediaconvert.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name MediaConvert_Default_Role \
  --assume-role-policy-document file://mediaconvert-trust-policy.json

# Attach S3 policy (MediaConvert needs full S3 access to read inputs and write outputs)
aws iam attach-role-policy \
  --role-name MediaConvert_Default_Role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Get role ARN
aws iam get-role --role-name MediaConvert_Default_Role --query 'Role.Arn' --output text
```

**Note:** `AmazonS3FullAccess` is sufficient. MediaConvert needs to:
- Read video files from S3 (input)
- Write HLS files to S3 (output)

## Step 2: Grant IAM User Permission to Pass Role

**IMPORTANT:** Your IAM user (the one with `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`) needs permission to pass the MediaConvert role to the MediaConvert service.

### Option A: Add Policy via AWS Console

1. Go to **IAM Console** → **Users** → Select your user (e.g., `euniversity`)
2. Click **Add permissions** → **Create inline policy**
3. Click **JSON** tab and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::YOUR_ACCOUNT_ID:role/MediaConvert_Default_Role"
    }
  ]
}
```

Replace `YOUR_ACCOUNT_ID` with your AWS account ID (e.g., `795708378684`)

4. Click **Review policy** → Name it: `PassMediaConvertRole` → **Create policy**

### Option B: Add Policy via AWS CLI

```bash
# Create policy document
cat > pass-mediaconvert-role-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::795708378684:role/MediaConvert_Default_Role"
    }
  ]
}
EOF

# Attach policy to user
aws iam put-user-policy \
  --user-name euniversity \
  --policy-name PassMediaConvertRole \
  --policy-document file://pass-mediaconvert-role-policy.json
```

**Note:** Replace `795708378684` with your AWS account ID and `euniversity` with your IAM user name.

## Step 3: Configure Environment Variables

Add the following to your `.env.local` file (or Vercel environment variables):

```env
# AWS Credentials (already configured)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name

# MediaConvert IAM Role ARN (REQUIRED)
AWS_MEDIACONVERT_ROLE_ARN=arn:aws:iam::795708378684:role/MediaConvert_Default_Role

# Optional: AWS Account ID (if not using default role name)
AWS_ACCOUNT_ID=795708378684
```

**Important:** Replace `795708378684` with your actual AWS account ID.

## Step 4: Verify MediaConvert Access

MediaConvert is available in most AWS regions. Make sure your `AWS_REGION` supports MediaConvert.

## Step 5: Test the Integration

1. Upload a video through your application
2. Check the console logs for MediaConvert job creation
3. Monitor the job status using: `GET /api/videos/transcode/status?jobId=<job-id>`

## How It Works

1. **Video Upload**: When a video is uploaded to S3, the transcoding API is called
2. **Job Creation**: A MediaConvert job is created with HLS output settings (1080p, 720p, 480p)
3. **Processing**: MediaConvert processes the video asynchronously
4. **Output**: HLS files are written to S3 at: `{video-path}/hls/{video-name}/`
5. **Playback**: The video player automatically detects and uses HLS when available

## Output Structure

MediaConvert creates the following structure:

```
s3://bucket/
  courses/
    course-18/
      preview-video-123.mp4          (original)
      hls/
        preview-video-123/
          master.m3u8                (master playlist)
          preview-video-123_1080p.m3u8
          preview-video-123_720p.m3u8
          preview-video-123_480p.m3u8
          segment files (.ts)
```

## Cost Considerations

- **MediaConvert Pricing**: Pay per minute of video processed
- **S3 Storage**: Additional storage for HLS files (~2-3x original file size)
- **Data Transfer**: Standard S3/CloudFront data transfer costs

## Troubleshooting

### Error: "IAM role not configured"
- Ensure `AWS_MEDIACONVERT_ROLE_ARN` is set in environment variables
- Verify the role has correct S3 permissions

### Error: "Access Denied" or "iam:PassRole"
- **Most Common:** Your IAM user needs `iam:PassRole` permission for the MediaConvert role
- Go to IAM → Users → Your User → Add inline policy with `iam:PassRole` permission
- See Step 2 above for detailed instructions
- Check IAM role permissions
- Verify S3 bucket policies allow MediaConvert access

### Job Status: "ERROR"
- Check MediaConvert job details in AWS Console
- Review CloudWatch logs for detailed error messages

### HLS Files Not Appearing
- MediaConvert jobs are async - wait for job completion
- Check job status: `GET /api/videos/transcode/status?jobId=<job-id>`
- Verify output path matches expected structure

## Monitoring

- **AWS Console**: MediaConvert → Jobs
- **API Endpoint**: `GET /api/videos/transcode/status?jobId=<job-id>`
- **CloudWatch**: MediaConvert metrics and logs

## Next Steps

- Set up SNS notifications for job completion (optional)
- Configure CloudWatch alarms for failed jobs
- Implement retry logic for failed transcoding jobs
