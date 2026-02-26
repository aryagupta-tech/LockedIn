import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getConfig } from "../config";

let _client: S3Client | null = null;

export function getS3(): S3Client {
  if (_client) return _client;

  const cfg = getConfig();
  _client = new S3Client({
    region: cfg.S3_REGION,
    ...(cfg.S3_ENDPOINT && {
      endpoint: cfg.S3_ENDPOINT,
      forcePathStyle: true, // required for MinIO
    }),
    ...(cfg.S3_ACCESS_KEY &&
      cfg.S3_SECRET_KEY && {
        credentials: {
          accessKeyId: cfg.S3_ACCESS_KEY,
          secretAccessKey: cfg.S3_SECRET_KEY,
        },
      }),
  });

  return _client;
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const cfg = getConfig();
  await getS3().send(
    new PutObjectCommand({
      Bucket: cfg.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  if (cfg.S3_ENDPOINT) {
    return `${cfg.S3_ENDPOINT}/${cfg.S3_BUCKET}/${key}`;
  }
  return `https://${cfg.S3_BUCKET}.s3.${cfg.S3_REGION}.amazonaws.com/${key}`;
}
