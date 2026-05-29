import type { FileAsset } from "@/lib/storage";

// 2MB limit (base64 bo'lganda yanada kattalashadi, shuning uchun demo uchun shart)
const MAX_BYTES_FOR_DATAURL = 2 * 1024 * 1024;

export async function fileToAsset(file: File): Promise<{ asset: FileAsset; tooLarge: boolean }> {
  // Katta fayl bo'lsa: faqat metadata qaytaramiz
  if (file.size > MAX_BYTES_FOR_DATAURL) {
    return {
      tooLarge: true,
      asset: {
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: undefined,
      },
    };
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

  return {
    tooLarge: false,
    asset: {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      dataUrl,
    },
  };
}