import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(req) {
  try {
    const { file_name, content_type, client_id } = await req.json();
    const key = `${client_id}/${Date.now()}_${file_name}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: content_type || "application/octet-stream",
    });

    // 6 hours — long enough for very large files on slow upload connections
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 21600 });
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return Response.json({ uploadUrl, publicUrl });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}