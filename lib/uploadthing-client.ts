// Client-side UploadThing helpers.
// `useUploadThing` is the React hook used in the guest photo upload form.
// `uploadFiles` is a non-hook alternative (not currently used).
// Both are typed against WeddingFileRouter so input/output types are inferred.
import { generateReactHelpers } from '@uploadthing/react';
import type { WeddingFileRouter } from '../server/uploadthing';

export const { useUploadThing, uploadFiles } = generateReactHelpers<WeddingFileRouter>();
