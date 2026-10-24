/**
 * Pure client-side boundary for MONIFlow's authenticated practice workspace.
 * A backend response may not be applied after sign-out, account change, new
 * sign-in, or a newer read. Server JWT + user_id constraints remain authoritative.
 */
export type SandboxScope = { userId: string | null; revision: number };

const sameUser = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a && b && a.toLowerCase() === b.toLowerCase());

export function canApplySandboxResponse(args: {
  requestedOwner: string;
  responseOwner: string;
  requestedAuthRevision: number;
  activeScope: SandboxScope;
  requestedSequence: number;
  latestSequence: number;
  currentScreenOwner: string;
}) {
  return sameUser(args.requestedOwner, args.responseOwner) &&
    sameUser(args.requestedOwner, args.activeScope.userId) &&
    sameUser(args.requestedOwner, args.currentScreenOwner) &&
    args.requestedAuthRevision === args.activeScope.revision &&
    args.requestedSequence === args.latestSequence;
}

export function canApplySandboxFailure(args: Omit<Parameters<typeof canApplySandboxResponse>[0], "responseOwner">) {
  return canApplySandboxResponse({ ...args, responseOwner: args.requestedOwner });
}

export function mutationRecoveryMessage(cause: unknown): {
  outcomeUnknown: boolean;
  message: string;
} {
  const maybe = cause && typeof cause === "object" ? cause as {
    httpStatus?: unknown; code?: unknown;
  } : null;
  const status = maybe?.httpStatus;
  if (typeof status === "number" &&
      [400, 401, 403, 404, 409, 422].includes(status)) {
    return {
      outcomeUnknown: false,
      message: "The sandbox rejected this request. Check the latest saved state using the read-only refresh before taking another action."
    };
  }
  return {
    outcomeUnknown: true,
    message: "The connection stopped before MONIFlow could confirm this simulated action. It may already be saved. Do not tap the action again. Use the read-only refresh to check the authoritative result."
  };
}
