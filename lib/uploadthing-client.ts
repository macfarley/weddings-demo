import { generateReactHelpers } from '@uploadthing/react';
import type { WeddingFileRouter } from '../server/uploadthing';

export const { useUploadThing, uploadFiles } = generateReactHelpers<WeddingFileRouter>();
