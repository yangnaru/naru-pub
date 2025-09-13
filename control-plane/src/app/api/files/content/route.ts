import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { validateRequest } from "@/lib/auth";
import { getUserHomeDirectory, s3Client } from "@/lib/utils";
import { EDITABLE_FILE_EXTENSIONS } from "@/lib/const";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const filePath = url.searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

    // Security check: ensure the file is editable
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    if (!EDITABLE_FILE_EXTENSIONS.includes(extension)) {
      return NextResponse.json({ error: "File type not editable" }, { status: 400 });
    }

    const actualFilename = path.join(getUserHomeDirectory(user.loginName), filePath);

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: actualFilename,
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
    return NextResponse.json(
      { error: "Failed to fetch file content" }, 
      { status: 500 }
    );
  }
}