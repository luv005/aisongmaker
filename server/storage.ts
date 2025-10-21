import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

let s3Client: S3Client | null = null;

const normalizeKey = (relKey: string) => relKey.replace(/^\/+/, "");

const toBuffer = (data: Buffer | Uint8Array | string) => {
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === "string") return Buffer.from(data);
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
};

const buildPublicUrl = (key: string) => {
  if (ENV.s3PublicBaseUrl) {
    return `${ENV.s3PublicBaseUrl.replace(/\/+$/, "")}/${key}`;
  }
  const encoded = key
    .split("/")
    .map(segment => encodeURIComponent(segment))
    .join("/");
  return `https://${ENV.s3Bucket}.s3.${ENV.awsRegion}.amazonaws.com/${encoded}`;
};

const ensureConfig = () => {
  if (!ENV.s3Bucket || !ENV.awsRegion) {
    throw new Error(
      "S3 storage is not configured. Set S3_BUCKET and AWS_REGION (and credentials if required)."
    );
  }
};

const ensureClient = () => {
  if (s3Client) return s3Client;
  ensureConfig();
  const credentials =
    ENV.awsAccessKeyId && ENV.awsSecretAccessKey
      ? {
          accessKeyId: ENV.awsAccessKeyId,
          secretAccessKey: ENV.awsSecretAccessKey,
          sessionToken: ENV.awsSessionToken || undefined,
        }
      : undefined;
  s3Client = new S3Client({
    region: ENV.awsRegion,
    credentials,
  });
  return s3Client;
};

export const isStorageConfigured = () => Boolean(ENV.s3Bucket && ENV.awsRegion);

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  ensureConfig();
  const client = ensureClient();
  const key = normalizeKey(relKey);
  const body = toBuffer(data);

  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return {
    key,
    url: buildPublicUrl(key),
  };
}

export async function storageGet(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  ensureConfig();
  const key = normalizeKey(relKey);
  if (ENV.s3PublicBaseUrl) {
    return { key, url: buildPublicUrl(key) };
  }
  const client = ensureClient();
  const command = new GetObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
  });
  const url = await getSignedUrl(client, command, { expiresIn });
  return { key, url };
}
