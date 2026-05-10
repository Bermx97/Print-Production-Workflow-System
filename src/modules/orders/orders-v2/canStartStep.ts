export const canStartStep = (
  step: string,
  state: Record<string, string>,
  wf: Record<string, string[]>
) => {

  if (state[step] === "ACTIVE") return false;
  if (state[step] === "DONE") return false;

  const deps = wf[step] ?? [];

  return deps.every(dep =>
    state[dep] === "DONE"
  );
};