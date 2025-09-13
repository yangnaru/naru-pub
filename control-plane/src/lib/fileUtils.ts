import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3Client, getUserHomeDirectory } from "./utils";

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export async function buildFileTree(userLoginName: string): Promise<FileNode[]> {
  const homeDirectory = getUserHomeDirectory(userLoginName);
  
  // Get all objects in the user's directory with pagination support
  const objects: any[] = [];
  let continuationToken: string | undefined;
  
  do {
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: `${homeDirectory}/`,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);
    
    if (response.Contents) {
      objects.push(...response.Contents);
    }
    
    continuationToken = response.NextContinuationToken;
    
    // Log if we're paginating to help debug large directories
    if (continuationToken) {
      console.log(`Paginating file tree for user ${userLoginName}: ${objects.length} objects loaded so far`);
    }
  } while (continuationToken);

  // Convert S3 objects to a tree structure
  const tree: Map<string, FileNode> = new Map();
  
  // Add root directory
  tree.set("", {
    name: "홈",
    path: "",
    isDirectory: true,
    children: []
  });

  // Process each object
  for (const object of objects) {
    const key = object.Key!;
    const relativePath = key.replace(homeDirectory, '').replace(/^\/+/, '');
    
    if (relativePath === '') continue; // Skip the home directory itself
    
    const parts = relativePath.split('/');
    let currentPath = "";
    
    // Create directory structure
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (!tree.has(currentPath)) {
        const isDirectory = i < parts.length - 1 || key.endsWith('/');
        
        tree.set(currentPath, {
          name: part,
          path: currentPath,
          isDirectory,
          children: isDirectory ? [] : undefined
        });
        
        // Add to parent's children
        const parent = tree.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(tree.get(currentPath)!);
        }
      }
    }
  }

  // Sort children recursively
  function sortChildren(node: FileNode) {
    if (node.children) {
      node.children.sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, 'ko');
      });
      
      // Recursively sort children
      node.children.forEach(sortChildren);
    }
  }

  const root = tree.get("");
  if (root) {
    sortChildren(root);
    return root.children || [];
  }
  
  return [];
}