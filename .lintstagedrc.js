module.exports = {
  // Run type-check on changes to TypeScript files
  "**/*.ts?(x)": () => "npm run lint",
  
  // Run ESLint on changes to JavaScript/TypeScript files
  "**/*.(ts|js)?(x)": (filenames) => 
    `next lint --fix --file ${filenames
      .map((f) => f.split(process.cwd())[1])
      .join(" --file ")}`,
  
  // Format TS, JS, and various config files
  "**/*.(ts|js|mjs|jsx|tsx|json|md)": (filenames) => 
    `prettier --write ${filenames.join(" ")}`,
};

