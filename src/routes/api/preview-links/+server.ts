import { env as privateEnv } from '$env/dynamic/private';
import { recordToWebsiteRoute } from '$lib/datocms/recordInfo';
import { json } from '@sveltejs/kit';
import { handleUnexpectedError, invalidRequestResponse, withCORS } from '../utils';
import type { RequestHandler } from './$types';

export const OPTIONS: RequestHandler = ({ request }) => {
  return new Response('OK', withCORS());
};

type PreviewLink = {
  label: string;
  url: string;
  reloadPreviewOnRecordUpdate?: boolean | { delayInMs: number };
};

type WebPreviewsResponse = {
  previewLinks: PreviewLink[];
};

/**
 * This route handler implements the Previews webhook required for the "Web
 * Previews" plugin:
 *
 * https://www.datocms.com/marketplace/plugins/i/datocms-plugin-web-previews#the-previews-webhook
 */

export const POST: RequestHandler = async ({ url, request }) => {
  try {
    // Parse query string parameters
    const token = url.searchParams.get('token');

    console.log('token', token);
    console.log('token', privateEnv.PRIVATE_SECRET_API_TOKEN);

    // Ensure that the request is coming from a trusted source
    if (token !== privateEnv.PRIVATE_SECRET_API_TOKEN) {
      return invalidRequestResponse('Invalid token', 401);
    }

    /**
     * The plugin sends the record and model for which the user wants a preview,
     * along with information about which locale they are currently viewing in
     * the interface
     */
    const { item, itemType, locale } = await request.json();

    // We can use this info to generate the frontend URL associated
    const recordUrl = await recordToWebsiteRoute(item, itemType.attributes.api_key, locale);

    const response: WebPreviewsResponse = { previewLinks: [] };

    if (recordUrl) {
      /**
       * If status is not published, it means that it has a current version that's
       * different from the published one, so it has a draft version!
       */
      if (item.meta.status !== 'published') {
        /**
         * Generate a URL that initially enters Draft Mode, and then
         * redirects to the desired URL
         */
        response.previewLinks.push({
          label: 'Draft version',
          url: new URL(
            /*
             * We generate the URL in a way that it first passes through the
             * endpoint that enables the Draft Mode.
             */
            `/api/draft-mode/enable?url=${recordUrl}&token=${token}`,
            request.url,
          ).toString(),
        });
      }

      /** If status is not draft, it means that it has a published version! */
      if (item.meta.status !== 'draft') {
        /**
         * Generate a URL that first exits from Draft Mode, and then
         * redirects to the desired URL.
         */
        response.previewLinks.push({
          label: 'Published version',
          url: new URL(
            /*
             * We generate the URL in a way that it first passes through the
             * endpoint that disables the Draft Mode.
             */
            `/api/draft-mode/disable?url=${recordUrl}`,
            request.url,
          ).toString(),
        });
      }
    }

    // Respond in the format expected by the plugin
    return json(response, withCORS());
  } catch (error) {
    return handleUnexpectedError(error);
  }
};
