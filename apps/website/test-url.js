// Quick test to verify URL construction
const testUrlConstruction = () => {
  // Simulate environment variables with trailing slashes
  const envWithTrailingSlash = "https://test-app.vercel.app/";
  const envWithoutTrailingSlash = "https://test-app.vercel.app";

  const sanitizeUrl = (url) => url.replace(/\/$/, '');

  const url1 = sanitizeUrl(envWithTrailingSlash);
  const url2 = sanitizeUrl(envWithoutTrailingSlash);

  console.log("With trailing slash:", `${url1}/auth/learner/login`);
  console.log("Without trailing slash:", `${url2}/auth/learner/login`);

  // Both should produce: https://test-app.vercel.app/auth/learner/login
};

testUrlConstruction();