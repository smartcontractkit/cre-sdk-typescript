export const getTypeUrl = (schema: { typeName: string }): string =>
  `type.googleapis.com/${schema.typeName}`;
