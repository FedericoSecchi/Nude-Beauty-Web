export const BUILD_ID: string =
  process.env.NEXT_PUBLIC_BUILD_ID ||
  process.env.COMMIT_REF ||
  process.env.GITHUB_SHA ||
  'dev';
