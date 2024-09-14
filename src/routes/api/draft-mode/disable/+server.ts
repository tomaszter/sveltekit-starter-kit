import { disableDraftMode } from '$lib/draftMode.server';
import { redirect } from '@sveltejs/kit';
import { handleUnexpectedError, invalidRequestResponse } from '../../utils';
import type { RequestHandler } from './$types';

/**
 * This route handler disables Draft Mode and redirects to the given URL.
 */
export const GET: RequestHandler = (event) => {
  const { url, request } = event;

  // Parse query string parameters
  const redirectUrl = url.searchParams.get('url') || '/';

  // Check for iframe request (either by query parameter or referer)
  const isIframeRequest =
    url.searchParams.has('iframe') || request.headers.get('referer')?.includes('datocms.com');

  try {
    // Avoid open redirect vulnerabilities
    if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
      return invalidRequestResponse('URL must be relative!', 422);
    }

    // Disable draft mode (clear the cookie)
    disableDraftMode(event);

    // If the request is from an iframe, avoid redirect
    if (isIframeRequest) {
      return new Response('Draft mode disabled', { status: 200 });
    }
  } catch (error) {
    return handleUnexpectedError(error);
  }

  // For regular requests, redirect to the provided URL
  return redirect(307, redirectUrl);
};
