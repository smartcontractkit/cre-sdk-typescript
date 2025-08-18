export const errorBoundary = (e: any) => {
  console.log("ErrorBoundary: TS error thrown.");
  if (e instanceof Error) {
    console.log(e.message);
    console.log(e.stack);
  } else {
    console.log(e);
  }
};
