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
    // Extract the token from custom header 'x-auth-token'
    const token = request.headers.get('x-auth-token');

    console.log('request:', request);
    console.log('Extracted Token from Header:', token);

    // Validate the token
    if (token !== privateEnv.PRIVATE_SECRET_API_TOKEN) {
      return invalidRequestResponse('Invalid token', 401);
    }

    // Continue with your existing logic
    const { item, itemType, locale } = await request.json();
    const recordUrl = await recordToWebsiteRoute(item, itemType.attributes.api_key, locale);
    const response: WebPreviewsResponse = { previewLinks: [] };

    if (recordUrl) {
      if (item.meta.status !== 'published') {
        response.previewLinks.push({
          label: 'Draft version',
          url: new URL(`/api/draft-mode/enable?url=${recordUrl}`, request.url).toString(),
        });
      }
      if (item.meta.status !== 'draft') {
        response.previewLinks.push({
          label: 'Published version',
          url: new URL(`/api/draft-mode/disable?url=${recordUrl}`, request.url).toString(),
        });
      }
    }

    return json(response, withCORS());
  } catch (error) {
    return handleUnexpectedError(error);
  }
};
