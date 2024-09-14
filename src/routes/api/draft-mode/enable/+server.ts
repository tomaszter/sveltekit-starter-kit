import { env } from '$env/dynamic/private';
import { enableDraftMode } from '$lib/draftMode.server';
import { redirect } from '@sveltejs/kit';
import { handleUnexpectedError, invalidRequestResponse } from '../../utils';
import type { RequestHandler } from './$types';

/**
 * This route handler enables Draft Mode and redirects to the given URL.
 */
export const GET: RequestHandler = (event) => {
  const { url, request } = event;

  // Parse query string parameters
  const token = url.searchParams.get('token');
  const redirectUrl = url.searchParams.get('url') || '/';

  // Check for iframe request (either by query parameter or referer)
  const isIframeRequest =
    url.searchParams.has('iframe') || request.headers.get('referer')?.includes('datocms.com');

  try {
    // Ensure that the request is coming from a trusted source
    if (token !== env.PRIVATE_SECRET_API_TOKEN) {
      return invalidRequestResponse('Invalid token', 401);
    }

    // Avoid open redirect vulnerabilities
    if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
      return invalidRequestResponse('URL must be relative!', 422);
    }

    // Enable draft mode (set a cookie)
    enableDraftMode(event);

    // If the request is from an iframe, avoid redirect
    if (isIframeRequest) {
      return new Response('Draft mode enabled', { status: 200 });
    }
  } catch (error) {
    return handleUnexpectedError(error);
  }

  // For regular requests, redirect to the provided URL
  return redirect(307, redirectUrl);
};
