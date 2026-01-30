# AWS MediaConvert Setup Guide

This guide explains how to set up AWS MediaConvert for video transcoding to HLS format.

## Prerequisites

1. AWS Account with MediaConvert access
2. S3 bucket for storing videos
3. IAM role with MediaConvert permissions
4. S3 bucket policy allowing public read access (see Step 0)

## Step 0: Configure S3 Bucket for Public Video Access (REQUIRED)

**IMPORTANT:** This step is required for HLS video playback to work. Without it, you'll get 403 Forbidden errors.

### Why This Is Needed

When MediaConvert transcodes videos to HLS format, it creates `.m3u8` playlist files and `.ts` segment files in your S3 bucket. For the video player (and Azure Front Door CDN) to access these files, they must be publicly readable.

Simply turning off "Block all public access" is **not enough** - you also need a bucket policy.

### Configure S3 Bucket

1. **Disable "Block all public access"** (if not already done):
   - Go to **S3 Console** → Your Bucket → **Permissions** → **Block public access**
   - Click **Edit** and uncheck all options
   - Save changes

2. **Enable ACLs** (recommended for MediaConvert):
   - Go to **S3 Console** → Your Bucket → **Permissions** → **Object Ownership**
   - Click **Edit**
   - Select **"ACLs enabled"** → **"Bucket owner preferred"**
   - Save changes

3. **Add Bucket Policy for public read access**:
   - Go to **S3 Console** → Your Bucket → **Permissions** → **Bucket policy**
   - Click **Edit** and paste:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadForCourses",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/courses/*"
        },
        {
            "Sid": "PublicReadForHLS",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*/hls/*"
        }
    ]
}
```

**Important:** Replace `YOUR-BUCKET-NAME` with your actual S3 bucket name.

### What This Policy Does

- Allows anyone to **read** (GET) files under the `courses/` prefix
- Allows anyone to **read** HLS files in any `/hls/` subfolder
- Does NOT allow write/delete access (only you can upload/delete via IAM credentials)

### Verify the Configuration

After adding the bucket policy, test by:
1. Opening an HLS file URL directly in your browser (e.g., `https://your-bucket.s3.region.amazonaws.com/courses/course-18/hls/preview-video-123/master.m3u8`)
2. You should see the M3U8 playlist content (not a 403 error)

If you're using Azure Front Door:
1. Test the CDN URL: `https://your-cdn.azurefd.net/courses/course-18/hls/preview-video-123/master.m3u8`
2. Purge the CDN cache if needed: Azure Portal → Front Door → Purge

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

## Step 2: Grant IAM User MediaConvert Permissions

**IMPORTANT:** Your IAM user (the one with `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`) needs two types of permissions:

1. **MediaConvert permissions** - to create and manage transcoding jobs
2. **IAM PassRole permission** - to pass the MediaConvert role to the service

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
      "Action": [
        "mediaconvert:CreateJob",
        "mediaconvert:GetJob",
        "mediaconvert:ListJobs"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::795708378684:role/MediaConvert_Default_Role"
    }
  ]
}
```

**Important:** Replace `795708378684` with your AWS account ID.

4. Click **Review policy** → Name it: `MediaConvertAccess` → **Create policy**

### Option B: Add Policy via AWS CLI

```bash
# Create policy document
cat > mediaconvert-user-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "mediaconvert:CreateJob",
        "mediaconvert:GetJob",
        "mediaconvert:ListJobs"
      ],
      "Resource": "*"
    },
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
  --policy-name MediaConvertAccess \
  --policy-document file://mediaconvert-user-policy.json
```

**Note:** Replace `795708378684` with your AWS account ID and `euniversity` with your IAM user name.

### What These Permissions Do:

- **`mediaconvert:CreateJob`** - Allows creating transcoding jobs
- **`mediaconvert:GetJob`** - Allows checking job status (for the status endpoint)
- **`mediaconvert:ListJobs`** - Allows listing jobs (optional, for monitoring)
- **`iam:PassRole`** - Allows passing the MediaConvert role to the service

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
          preview-video-123.m3u8     (master playlist)
          preview-video-123_1080p.m3u8
          preview-video-123_720p.m3u8
          preview-video-123_480p.m3u8
          segment files (.ts)
```

**Note:** The master playlist is named `{baseName}.m3u8`, NOT `master.m3u8`.

## Cost Considerations

- **MediaConvert Pricing**: Pay per minute of video processed
- **S3 Storage**: Additional storage for HLS files (~2-3x original file size)
- **Data Transfer**: Standard S3/CloudFront data transfer costs

## Troubleshooting

### Error: "IAM role not configured"
- Ensure `AWS_MEDIACONVERT_ROLE_ARN` is set in environment variables
- Verify the role has correct S3 permissions

### Error: "Access Denied" or "mediaconvert:CreateJob" or "iam:PassRole"
- **Most Common:** Your IAM user needs MediaConvert and IAM PassRole permissions
- Go to IAM → Users → Your User → Add inline policy with:
  - `mediaconvert:CreateJob`, `mediaconvert:GetJob`, `mediaconvert:ListJobs`
  - `iam:PassRole` for the MediaConvert role
- See Step 2 above for complete policy JSON
- Check IAM role permissions (MediaConvert role needs S3 access)
- Verify S3 bucket policies allow MediaConvert access

### Job Status: "ERROR"
- Check MediaConvert job details in AWS Console
- Review CloudWatch logs for detailed error messages

### HLS Files Not Appearing
- MediaConvert jobs are async - wait for job completion
- Check job status: `GET /api/videos/transcode/status?jobId=<job-id>`
- Verify output path matches expected structure

### 403 Errors in Browser Console (HLS Segments)
If you see `403 (Forbidden)` errors for HLS segments (`.m3u8`, `.ts` files) in the browser console, but direct URL access works:

**Problem:** Azure Front Door CORS rules might not be configured for HLS segment requests.

**Solution:** Ensure Azure Front Door CORS rules allow requests for:
- `.m3u8` files (HLS manifests)
- `.ts` files (HLS video segments)

**Steps:**
1. Go to Azure Portal → Front Door → Your Front Door → Rules Engine
2. Edit your `video-delivery-rules` rule set
3. Add a new rule for HLS files (or update existing CORS rule to include HLS):

**Rule Name:** `Allow HLS CORS`

**Match Conditions:**
- `Request URL Path` contains `.m3u8` OR
- `Request URL Path` contains `.ts`

**Actions (Add all CORS headers):**
1. **Modify Response Header:**
   - Header Name: `Access-Control-Allow-Origin`
   - Value: `https://www.enthronementuniversity.org` (your website domain)
   - Operation: `Add` or `Overwrite`

2. **Modify Response Header:**
   - Header Name: `Access-Control-Allow-Methods`
   - Value: `GET, HEAD, OPTIONS`
   - Operation: `Add` or `Overwrite`

3. **Modify Response Header:**
   - Header Name: `Access-Control-Allow-Headers`
   - Value: `Range, Content-Type, Accept`
   - Operation: `Add` or `Overwrite`

4. **Modify Response Header:**
   - Header Name: `Access-Control-Expose-Headers`
   - Value: `Content-Length, Content-Range, Accept-Ranges`
   - Operation: `Add` or `Overwrite`

5. **Modify Response Header:**
   - Header Name: `Access-Control-Max-Age`
   - Value: `86400` (24 hours)
   - Operation: `Add` or `Overwrite`

**Note:** You can also combine this with your existing video CORS rule by adding `.m3u8` and `.ts` to the match conditions of your existing rule, rather than creating a separate rule.

**Alternative:** If CORS is properly configured but still getting 403s:
- **Most Common:** S3 bucket policy is missing - see Step 0 above
- Check if "Block all public access" is disabled on your S3 bucket
- Verify ACLs are enabled on your S3 bucket (Object Ownership setting)
- Check Azure Front Door origin group configuration
- Purge Azure Front Door cache after updating rules

### 403 Forbidden on ALL video files (MP4 and HLS)

**Step 1: Verify S3 Direct Access**
Test if S3 is accessible directly (without CDN):
```
https://YOUR-BUCKET.s3.YOUR-REGION.amazonaws.com/courses/course-18/preview-video-123.mp4
```

If this returns 403:
- Check S3 bucket policy (see Step 0)
- Verify "Block all public access" is OFF

If S3 works but Azure Front Door returns 403, the issue is with Azure Front Door.

**Step 2: Verify Azure Front Door Configuration**

1. **Check Origin Settings:**
   - Go to Azure Portal → Front Door → Origins
   - Origin host name should be: `YOUR-BUCKET.s3.YOUR-REGION.amazonaws.com`
   - Origin host header should be: `YOUR-BUCKET.s3.YOUR-REGION.amazonaws.com` (same as host name)
   - Origin path should be: empty (no leading slash, no path)

2. **Check Origin Group:**
   - Health probe should use HTTPS, port 443
   - Health probe path can be `/` or a known file path

3. **Purge the Cache:**
   - Go to Azure Portal → Front Door → Purge
   - Enter `/*` to purge all
   - Click Purge and wait 1-2 minutes

4. **Check Routing Rules:**
   - Patterns to match should include `/*`
   - Route should forward to the correct origin group
   - Forwarding protocol: HTTPS only

**Step 3: Verify CORS Headers (for browser playback)**

Azure Front Door needs to add CORS headers for HLS playback to work:
1. Go to Azure Portal → Front Door → Rule sets
2. Create/edit rules to add these response headers:
   - `Access-Control-Allow-Origin`: `*` (or your specific domain)
   - `Access-Control-Allow-Methods`: `GET, HEAD, OPTIONS`
   - `Access-Control-Allow-Headers`: `Range, Content-Type, Accept`
   - `Access-Control-Expose-Headers`: `Content-Length, Content-Range, Accept-Ranges`

**Common Azure Front Door Issues:**

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| 403 on all files | Wrong origin host header | Set origin host header same as host name |
| 403 on specific files | Cached error | Purge cache |
| CORS errors in browser | Missing CORS headers | Add CORS rule set |
| Intermittent 403 | Origin health probe failing | Check health probe settings |

## Monitoring

- **AWS Console**: MediaConvert → Jobs
- **API Endpoint**: `GET /api/videos/transcode/status?jobId=<job-id>`
- **CloudWatch**: MediaConvert metrics and logs

## Next Steps

- Set up SNS notifications for job completion (optional)
- Configure CloudWatch alarms for failed jobs
- Implement retry logic for failed transcoding jobs
