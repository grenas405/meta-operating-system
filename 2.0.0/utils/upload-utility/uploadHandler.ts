import { ensureDir } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";

// Define upload directory
const uploadDir = join(Deno.cwd(), "public/assets/images");
await ensureDir(uploadDir);

/**
 * Handle uploaded image files from Oak's FormData
 * @param formData - native FormData object with <input type="file" name="image" />
 * @returns Array of saved filenames
 */
export async function handleFileUpload(formData: FormData): Promise<string[]> {
  const savedFilenames: string[] = [];

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const originalName = value.name;
      const ext = getExtension(originalName);
      const uniqueName = `${key}-${Date.now()}-${Math.floor(Math.random() * 1e9)}${ext}`;
      const filePath = join(uploadDir, uniqueName);

      const arrayBuffer = await value.arrayBuffer(); // ✅ safe native API
      const bytes = new Uint8Array(arrayBuffer);
      await Deno.writeFile(filePath, bytes);

      savedFilenames.push(uniqueName);
    }
  }

  return savedFilenames;
}

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex !== -1 ? filename.slice(dotIndex) : "";
}