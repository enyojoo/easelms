import { MediaConvertClient, CreateJobCommand, GetJobCommand, JobStatus } from "@aws-sdk/client-mediaconvert"
import { logError, logInfo } from "@/lib/utils/errorHandler"

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!
const AWS_REGION = process.env.AWS_REGION || 'us-east-1'

// MediaConvert client
const mediaConvertClient = new MediaConvertClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/**
 * Get MediaConvert endpoint URL for the region
 * MediaConvert uses regional endpoints
 */
function getMediaConvertEndpoint(region: string): string {
  return `https://${region}.mediaconvert.${region === 'us-east-1' ? 'amazonaws.com' : `${region}.amazonaws.com`}`
}

/**
 * Create HLS output path structure
 * Input: courses/course-18/preview-video-123.mp4
 * Output: courses/course-18/hls/preview-video-123/main.m3u8
 * 
 * Note: MediaConvert creates the master playlist as "main.m3u8" (AWS default)
 */
function getHLSOutputPath(videoKey: string): { hlsPath: string; baseName: string } {
  const lastSlashIndex = videoKey.lastIndexOf('/')
  const videoPath = lastSlashIndex >= 0 ? videoKey.substring(0, lastSlashIndex) : ''
  const filename = lastSlashIndex >= 0 ? videoKey.substring(lastSlashIndex + 1) : videoKey
  const baseName = filename.replace(/\.[^/.]+$/, '')
  const hlsPath = videoPath ? `${videoPath}/hls/${baseName}` : `hls/${baseName}`
  
  return { hlsPath, baseName }
}

/**
 * Create a MediaConvert job to transcode video to HLS format with multiple bitrates
 * @param videoKey - S3 key of the input video
 * @returns MediaConvert job ID
 */
export async function createMediaConvertJob(videoKey: string): Promise<string> {
  try {
    const { hlsPath, baseName } = getHLSOutputPath(videoKey)
    const inputS3Url = `s3://${BUCKET_NAME}/${videoKey}`
    const outputS3Url = `s3://${BUCKET_NAME}/${hlsPath}/`

    logInfo("Creating MediaConvert job", {
      videoKey,
      inputS3Url,
      outputS3Url,
      hlsPath,
    })

    // Get IAM role ARN for MediaConvert
    // MediaConvert needs an IAM role with permissions to read from S3 and write to S3
    const roleArn = process.env.AWS_MEDIACONVERT_ROLE_ARN
    if (!roleArn) {
      throw new Error(
        "AWS_MEDIACONVERT_ROLE_ARN environment variable is required. " +
        "Create an IAM role with MediaConvert service permissions and S3 read/write access."
      )
    }

    // MediaConvert job settings for HLS with multiple bitrates
    const jobSettings = {
      Role: roleArn,
      Settings: {
        Inputs: [
          {
            FileInput: inputS3Url,
            VideoSelector: {},
            AudioSelectors: {
              "Audio Selector 1": {
                DefaultSelection: "DEFAULT",
              },
            },
          },
        ],
        OutputGroups: [
          {
            Name: "HLS Output Group",
            OutputGroupSettings: {
              Type: "HLS_GROUP_SETTINGS",
              HlsGroupSettings: {
                ManifestDurationFormat: "INTEGER",
                SegmentLength: 10,
                Destination: outputS3Url,
                MinSegmentLength: 0,
                ManifestCompression: "NONE",
                StreamInfResolution: "INCLUDE",
                CaptionLanguageSetting: "OMIT",
                // Don't include CaptionLanguageMappings when CaptionLanguageSetting is OMIT
                OutputSelection: "MANIFESTS_AND_SEGMENTS",
                ProgramDateTime: "EXCLUDE",
                TimedMetadataId3Frame: "NONE",
                TimedMetadataId3Period: 10,
                // Don't include AdMarkers if not using ads
              },
              DestinationSettings: {
                S3Settings: {
                  AccessControl: {
                    CannedAcl: "PUBLIC_READ",
                  },
                },
              },
            },
            Outputs: [
              // 1080p @ 5 Mbps
              {
                NameModifier: "_1080p",
                VideoDescription: {
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      RateControlMode: "QVBR",
                      QvbrSettings: {
                        QvbrQualityLevel: 7,
                        QvbrQualityLevelFineTune: 0,
                      },
                      MaxBitrate: 5000000,
                      GopSize: 60,
                      GopSizeUnits: "FRAMES",
                      InterlaceMode: "PROGRESSIVE",
                      ParControl: "INITIALIZE_FROM_SOURCE",
                      SceneChangeDetect: "TRANSITION_DETECTION",
                      QualityTuningLevel: "SINGLE_PASS",
                      CodecProfile: "HIGH",
                      CodecLevel: "LEVEL_4",
                    },
                  },
                  Width: 1920,
                  Height: 1080,
                  RespondToAfd: "NONE",
                  ScalingBehavior: "DEFAULT",
                  Sharpness: 50,
                },
                AudioDescriptions: [
                  {
                    AudioSelectorName: "Audio Selector 1",
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: {
                        Bitrate: 192000,
                        CodingMode: "CODING_MODE_2_0",
                        SampleRate: 48000,
                        CodecProfile: "LC",
                      },
                    },
                  },
                ],
                ContainerSettings: {
                  Container: "M3U8",
                  M3u8Settings: {
                    AudioFramesPerPes: 4,
                    PcrControl: "PCR_EVERY_PES_PACKET",
                    PmtInterval: 0,
                    TimedMetadata: "NONE",
                  },
                },
              },
              // 720p @ 3 Mbps
              {
                NameModifier: "_720p",
                VideoDescription: {
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      RateControlMode: "QVBR",
                      QvbrSettings: {
                        QvbrQualityLevel: 7,
                        QvbrQualityLevelFineTune: 0,
                      },
                      MaxBitrate: 3000000,
                      GopSize: 60,
                      GopSizeUnits: "FRAMES",
                      InterlaceMode: "PROGRESSIVE",
                      ParControl: "INITIALIZE_FROM_SOURCE",
                      SceneChangeDetect: "TRANSITION_DETECTION",
                      QualityTuningLevel: "SINGLE_PASS",
                      CodecProfile: "HIGH",
                      CodecLevel: "LEVEL_3_1",
                    },
                  },
                  Width: 1280,
                  Height: 720,
                  RespondToAfd: "NONE",
                  ScalingBehavior: "DEFAULT",
                  Sharpness: 50,
                },
                AudioDescriptions: [
                  {
                    AudioSelectorName: "Audio Selector 1",
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: {
                        Bitrate: 128000,
                        CodingMode: "CODING_MODE_2_0",
                        SampleRate: 48000,
                        CodecProfile: "LC",
                      },
                    },
                  },
                ],
                ContainerSettings: {
                  Container: "M3U8",
                  M3u8Settings: {
                    AudioFramesPerPes: 4,
                    PcrControl: "PCR_EVERY_PES_PACKET",
                    PmtInterval: 0,
                    TimedMetadata: "NONE",
                  },
                },
              },
              // 480p @ 1.5 Mbps
              {
                NameModifier: "_480p",
                VideoDescription: {
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      RateControlMode: "QVBR",
                      QvbrSettings: {
                        QvbrQualityLevel: 7,
                        QvbrQualityLevelFineTune: 0,
                      },
                      MaxBitrate: 1500000,
                      GopSize: 60,
                      GopSizeUnits: "FRAMES",
                      InterlaceMode: "PROGRESSIVE",
                      ParControl: "INITIALIZE_FROM_SOURCE",
                      SceneChangeDetect: "TRANSITION_DETECTION",
                      QualityTuningLevel: "SINGLE_PASS",
                      CodecProfile: "MAIN",
                      CodecLevel: "LEVEL_3_1",
                    },
                  },
                  Width: 854,
                  Height: 480,
                  RespondToAfd: "NONE",
                  ScalingBehavior: "DEFAULT",
                  Sharpness: 50,
                },
                AudioDescriptions: [
                  {
                    AudioSelectorName: "Audio Selector 1",
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: {
                        Bitrate: 96000,
                        CodingMode: "CODING_MODE_2_0",
                        SampleRate: 48000,
                        CodecProfile: "LC",
                      },
                    },
                  },
                ],
                ContainerSettings: {
                  Container: "M3U8",
                  M3u8Settings: {
                    AudioFramesPerPes: 4,
                    PcrControl: "PCR_EVERY_PES_PACKET",
                    PmtInterval: 0,
                    TimedMetadata: "NONE",
                  },
                },
              },
            ],
          },
        ],
      },
      AccelerationSettings: {
        Mode: "DISABLED", // Use "PREFERRED" for faster processing (costs more)
      },
    }

    const command = new CreateJobCommand(jobSettings)
    const response = await mediaConvertClient.send(command)

    if (!response.Job?.Id) {
      throw new Error("Failed to create MediaConvert job: No job ID returned")
    }

    logInfo("MediaConvert job created successfully", {
      jobId: response.Job.Id,
      videoKey,
      status: response.Job.Status,
    })

    return response.Job.Id
  } catch (error: any) {
    logError("Failed to create MediaConvert job", error, { videoKey })
    throw error
  }
}

/**
 * Get MediaConvert job status
 * @param jobId - MediaConvert job ID
 * @returns Job status and details
 */
export async function getMediaConvertJobStatus(jobId: string): Promise<{
  status: JobStatus | string
  progress?: number
  errorMessage?: string
}> {
  try {
    const command = new GetJobCommand({ Id: jobId })
    const response = await mediaConvertClient.send(command)

    return {
      status: response.Job?.Status || "UNKNOWN",
      progress: response.Job?.JobPercentComplete,
      errorMessage: response.Job?.ErrorMessage,
    }
  } catch (error: any) {
    logError("Failed to get MediaConvert job status", error, { jobId })
    throw error
  }
}
