import type { TanStackRouterOptions } from 'react-on-rails-pro/tanstack-router';

type TanStackRouter = ReturnType<TanStackRouterOptions['createRouter']>;

type MutableTanStackRouter = TanStackRouter & {
  __store?: {
    setState: (updater: (state: Record<string, unknown>) => Record<string, unknown>) => void;
  };
  state: Record<string, unknown>;
  stores?: {
    isLoading?: { set: (value: unknown) => void };
    location?: { set: (value: unknown) => void };
    redirect?: { set: (value: unknown) => void };
    resolvedLocation?: { set: (value: unknown) => void };
    setMatches?: (matches: unknown[]) => void;
    status?: { set: (value: unknown) => void };
    statusCode?: { set: (value: unknown) => void };
  };
};

export const installRouterStoreShim = (router: TanStackRouter) => {
  const mutableRouter = router as MutableTanStackRouter;

  mutableRouter.__store ??= {
    setState: (updater) => {
      const nextState = updater(mutableRouter.state);
      if ('status' in nextState) mutableRouter.stores?.status?.set(nextState.status);
      if ('isLoading' in nextState) mutableRouter.stores?.isLoading?.set(nextState.isLoading);
      if ('location' in nextState) mutableRouter.stores?.location?.set(nextState.location);
      if ('resolvedLocation' in nextState) {
        mutableRouter.stores?.resolvedLocation?.set(nextState.resolvedLocation);
      }
      if ('statusCode' in nextState) mutableRouter.stores?.statusCode?.set(nextState.statusCode);
      if ('redirect' in nextState) mutableRouter.stores?.redirect?.set(nextState.redirect);
      if (Array.isArray(nextState.matches)) mutableRouter.stores?.setMatches?.(nextState.matches);
    },
  };

  return router;
};
