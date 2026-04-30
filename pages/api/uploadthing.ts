import { createRouteHandler } from 'uploadthing/next-legacy';
import { weddingFileRouter } from '../../server/uploadthing';

export default createRouteHandler({ router: weddingFileRouter });
