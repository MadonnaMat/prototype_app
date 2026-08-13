// TypeScript definitions for CSS modules.
// css-loader here is configured for named exports per class (no default export),
// so these are typed for namespace import usage: `import * as styles from "./x.module.css"`.
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export = classes;
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export = classes;
}

declare module "*.module.sass" {
  const classes: { readonly [key: string]: string };
  export = classes;
}