import { AlertCircle } from "lucide-react";

import { isApiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";

/**
 * The one message shown to a user for a failed request. Server wording wins when there is
 * any, so a slice never has to invent its own copy for a 409 or a validation failure.
 */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error && error.message !== "") {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export interface ErrorStateProps {
  error: unknown;
  title?: string;
  /** Omit for a failure a retry cannot fix, such as a 404 on a detail page. */
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

/**
 * Single visible failure surface: message, server error code and an optional retry.
 * Every data view uses this instead of rendering its own alert.
 */
const ErrorState = ({
  error,
  title = "Something went wrong",
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateProps) => (
  <Alert variant="destructive" className={cn("flex flex-col gap-3", className)}>
    <div className="flex gap-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{errorMessage(error)}</AlertDescription>
        {isApiError(error) ? <p className="text-xs opacity-70">{error.code}</p> : null}
      </div>
    </div>
    {onRetry ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        aria-busy={isRetrying}
        className="self-start"
      >
        {isRetrying ? "Retrying…" : "Try again"}
      </Button>
    ) : null}
  </Alert>
);

export { ErrorState };
