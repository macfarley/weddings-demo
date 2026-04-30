import { createUploadthing, type FileRouter } from 'uploadthing/next-legacy';
import { neon } from '@neondatabase/serverless';

const f = createUploadthing();

type PhotoInput = { name: string; familyName: string; shortCaption: string; longCaption: string };

// Inline schema that satisfies UploadThing's ParserZodEsque<TInput, TParsedInput> shape.
function parsePhotoInput(data: unknown): PhotoInput {
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    name: typeof d.name === 'string' ? d.name.trim().slice(0, 50) : '',
    familyName: typeof d.familyName === 'string' ? d.familyName.trim().slice(0, 50) : '',
    shortCaption: typeof d.shortCaption === 'string' ? d.shortCaption.trim().slice(0, 120) : '',
    longCaption: typeof d.longCaption === 'string' ? d.longCaption.trim().slice(0, 500) : '',
  };
}

const photoInputSchema = {
  _input: {} as PhotoInput,
  _output: {} as PhotoInput,
  parseAsync: async (data: unknown) => parsePhotoInput(data),
};

function toLabelSlug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '-')
    .slice(0, 60);
  return cleaned || `photo-${Date.now()}`;
}

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL');
  return neon(url);
}

export const weddingFileRouter = {
  weddingPhotoUpload: f({ image: { maxFileSize: '8MB', maxFileCount: 1 } })
    .input(photoInputSchema)
    .middleware(async ({ input }) => {
      const typedInput = input as PhotoInput;
      return {
        name: typedInput.name,
        familyName: typedInput.familyName,
        shortCaption: typedInput.shortCaption,
        longCaption: typedInput.longCaption,
        weddingSlug: (process.env.NEXT_PUBLIC_WEDDING_SLUG || 'default').trim(),
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const sql = getDb();

      const labelRaw = metadata.shortCaption;
      const labelSlug = toLabelSlug(labelRaw);
      const uploaderName = `${metadata.name} ${metadata.familyName}`.trim();

      await sql`
        INSERT INTO photos
          (wedding_slug, storage_path, file_url, label_raw, label_slug, original_filename, uploader_name, caption, status, is_visible)
        VALUES
          (${metadata.weddingSlug}, ${file.key}, ${file.ufsUrl}, ${labelRaw}, ${labelSlug}, ${file.name}, ${uploaderName}, ${metadata.longCaption || labelRaw}, 'pending', false)
      `;

      return { ok: true };
    }),
} satisfies FileRouter;

export type WeddingFileRouter = typeof weddingFileRouter;
