export const buildState = (
  logs: any[],
  wf: Record<string, string[]>
) => {

  const state: Record<string, string> = {};

  const steps = Object.keys(wf);

  for (const step of steps) {

    const stepLogs = logs.filter(
      l => l.step_name === step
    );

    const hasStart = stepLogs.some(
      l => l.event_type === "START"
    );

    const hasEnd = stepLogs.some(
      l => l.event_type === "END"
    );

    if (hasEnd) {
      state[step] = "DONE";
    } else if (hasStart) {
      state[step] = "ACTIVE";
    } else {
      state[step] = "NOT_STARTED";
    }
  }

  return state;
};