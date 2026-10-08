export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function apiResponse(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new ApiError(
      "Unable to connect. Check your connection and try again.",
      0,
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail
              .map((item: { msg: string }) =>
                item.msg.replace("Value error, ", ""),
              )
              .join(". ")
          : "The service is unavailable. Please try again.";
    if (response.status === 401 && !path.startsWith("/auth"))
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(message, response.status);
  }
  return response;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await apiResponse(path, options);
  return response.status === 204 ? (undefined as T) : response.json();
}
