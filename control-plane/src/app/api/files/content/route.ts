import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { validateRequest } from "@/lib/auth";
import { getUserHomeDirectory, s3Client } from "@/lib/utils";
import { EDITABLE_FILE_EXTENSIONS } from "@/lib/const";

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Log environment info for production debugging (safe logging)
    if (process.env.NODE_ENV === 'production') {
      console.log('Production file content request:', {
        hasS3Bucket: !!process.env.S3_BUCKET_NAME,
        hasAwsKeys: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY,
        hasR2AccountId: !!process.env.R2_ACCOUNT_ID,
        userExists: !!user?.loginName,
        nodeEnv: process.env.NODE_ENV
      });
    }

    const url = new URL(request.url);
    const filePath = url.searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

    // Security check: prevent path traversal attacks
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Security check: ensure the file is editable
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    
    if (!EDITABLE_FILE_EXTENSIONS.includes(extension)) {
      return NextResponse.json({ error: `File type '${extension}' not editable` }, { status: 400 });
    }

    // Use proper path construction for S3 keys (always use forward slashes)
    const userDir = getUserHomeDirectory(user.loginName);
    const s3Key = `${userDir}/${filePath}`.replaceAll("//", "/");

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    const content = await response.Body?.transformToString() || "";

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Error fetching file content:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Log production-safe debugging info for NoSuchKey errors
    if (error instanceof Error && error.name === 'NoSuchKey') {
      console.error('NoSuchKey error - file not found in S3');
    }

    return NextResponse.json(
      { error: "Failed to fetch file content" }, 
      { status: 500 }
    );
  }
}