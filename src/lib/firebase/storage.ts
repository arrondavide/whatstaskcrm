import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type UploadMetadata,
} from "firebase/storage";
import { storage } from "./client";

export async function uploadFile(
  tenantId: string,
  recordId: string,
  fieldId: string,
  file: File
): Promise<{ url: string; path: string }> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `tenants/${tenantId}/records/${recordId}/${fieldId}/${timestamp}_${safeName}`;
  const fileRef = ref(storage, filePath);

  const metadata: UploadMetadata = {
    contentType: file.type,
    customMetadata: {
      tenant_id: tenantId,
      record_id: recordId,
      field_id: fieldId,
      original_name: file.name,
    },
  };

  await uploadBytes(fileRef, file, metadata);
  const url = await getDownloadURL(fileRef);

  return { url, path: filePath };
}

export async function deleteFile(filePath: string): Promise<void> {
  const fileRef = ref(storage, filePath);
  await deleteObject(fileRef);
}

export function getFileRef(filePath: string) {
  return ref(storage, filePath);
}
