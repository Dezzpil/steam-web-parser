export const Loop = (round: number, fn: (round: number) => Promise<void>) => {
  fn(round++)
    .then(() => {})
    .catch((e) => {
      console.error(e);
    })
    .finally(() => {
      if (round > 100) round = 0;
      setImmediate(() => Loop(round, fn));
    });
};
