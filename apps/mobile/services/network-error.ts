/**
 * Expo/React Native may surface Android DNS failures as ordinary Errors, not
 * only TypeErrors. Convert known connectivity failures to useful, non-sensitive
 * messages without swallowing authentication or provider policy errors.
 */
const networkFailure = /(?:unknownhostexception|unable to resolve host|no address associated with hostname|enotfound|getaddrinfo|err_name_not_resolved|network request failed|failed to fetch|fetch failed|dns lookup failed|econnrefused|econnreset)/i;

export function friendlyNetworkError(cause: unknown): Error | null {
  if (!(cause instanceof Error)) return null;
  const message = cause.message ?? "";
  if (
    networkFailure.test(message) ||
    (cause instanceof TypeError && /fetch|network|load/i.test(message))
  ) {
    return new Error(
      "Cannot reach MONIFlow API. Check your internet connection, then try again.",
      { cause }
    );
  }
  return null;
}
