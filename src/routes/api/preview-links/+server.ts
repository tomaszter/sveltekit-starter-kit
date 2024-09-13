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
    // Log the incoming URL and request headers for debugging
    console.log('Incoming URL:', url.href);
    console.log('Request Headers:', request.headers);

    // Parse query string parameters
    const token = url.searchParams.get('token');
    console.log('Extracted Token:', token);

    // Verify environment token for security
    console.log('Expected Token:', privateEnv.PRIVATE_SECRET_API_TOKEN);

    // Ensure that the token is provided and matches the expected value
    // if (!token) {
    //   return invalidRequestResponse('Token is missing', 401);
    // }
    // if (token !== privateEnv.PRIVATE_SECRET_API_TOKEN) {
    //   return invalidRequestResponse('Invalid token', 401);
    // }

    // Parse request body
    const { item, itemType, locale } = await request.json();

    // Generate frontend URL for the item based on the provided information
    const recordUrl = await recordToWebsiteRoute(item, itemType.attributes.api_key, locale);

    // Initialize response object
    const response: WebPreviewsResponse = { previewLinks: [] };

    // If a valid record URL is generated
    if (recordUrl) {
      // Handle draft version
      if (item.meta.status !== 'published') {
        response.previewLinks.push({
          label: 'Draft version',
          url: new URL(
            `/api/draft-mode/enable?url=${recordUrl}&token=${token}`,
            request.url,
          ).toString(),
        });
      }

      // Handle published version
      if (item.meta.status !== 'draft') {
        response.previewLinks.push({
          label: 'Published version',
          url: new URL(`/api/draft-mode/disable?url=${recordUrl}`, request.url).toString(),
        });
      }
    }

    // Respond in the expected format with CORS headers
    return json(response, withCORS());
  } catch (error) {
    console.error('Error handling request:', error);
    return handleUnexpectedError(error);
  }
};
