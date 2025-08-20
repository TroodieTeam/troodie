export function debugComponent(componentName: string, props: any) {
  console.log(`[DEBUG] Rendering ${componentName} with props:`, props);
  
  // Check for undefined values in props
  Object.keys(props).forEach(key => {
    if (props[key] === undefined) {
      console.warn(`[WARNING] ${componentName} has undefined prop: ${key}`);
    }
  });
}