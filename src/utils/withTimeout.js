export const withTimeout = (promise, timeout = 8000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('⏱️ Temps écoulé : la requête a expiré')), timeout)
    )
  ]);
};

export default withTimeout;
